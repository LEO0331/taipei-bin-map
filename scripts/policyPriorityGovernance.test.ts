import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash, type Snapshot } from './binPolicyGovernance';
import { monitorPrioritySources, priorityMonitorSummary, priorityMonitorExitCode, verifyFrozenPriority } from './monitorPolicyPrioritySources';
import { preparePriorityReview, type PriorityReview } from './preparePolicyPriorityReview';
import type { PriorityRawManifest } from './policyPrioritySources';
import type { PrioritySnapshot } from '../src/lib/policyPriorityTypes';
import { POLICY_CATEGORIES } from '../src/lib/policyPriorityTypes';

const directories: string[] = [];
const now = '2026-10-15T12:00:00.000Z';
const approved = JSON.parse(await readFile('public/data/bin-policy/analysis.json', 'utf8')) as Snapshot;
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'priority-governance-test-')); directories.push(directory);
  const bytes = '{"features":[]}';
  const source = { id: 'test-official', name: 'Official fixture', provider: 'Test', datasetUrl: 'https://data.taipei/test', resourceId: 'resource-fixture', resourceUpdatedAt: null, fetchedAt: now, validatedAt: now, sha256: hash(bytes), sourceVersion: hash(bytes), encoding: 'UTF-8', crs: 'WGS84', license: 'test fixture', licenseUrl: 'https://data.taipei/terms', caveat: 'Test only', approvalStatus: 'review_required', filename: 'source.json', downloadUrl: 'https://data.taipei/source.json', httpStatus: 200, metadataUpdatedAt: null, acquisitionStatus: 'available' as const };
  const manifest: PriorityRawManifest = { schemaVersion: 1, snapshotId: 'priority-fixture', generatedAt: now, marketDirectory: '', sources: [source] };
  const snapshot: PrioritySnapshot = { schemaVersion: 1, snapshotId: manifest.snapshotId, baseSnapshotId: approved.snapshotId, busSourceVersion: approved.sources.find(source => source.id === 'bus')!.sha256, generatedAt: now, approvalStatus: 'review_required', sources: [source], references: [], categoryStatus: Object.fromEntries(POLICY_CATEGORIES.map(category => [category, { status: 'unavailable', reason: 'Test fixture has no entities' }])) as PrioritySnapshot['categoryStatus'], quality: { exclusions: [] } };
  await writeFile(join(directory, 'source.json'), bytes);
  await writeFile(join(directory, 'sources.json'), JSON.stringify(manifest));
  const snapshotFile = join(directory, 'references.json'); await writeFile(snapshotFile, JSON.stringify(snapshot));
  const review: PriorityReview = { schemaVersion: 1, status: 'technical_review_complete', reviewer: 'fixture-only', reviewedAt: now, evidenceUrl: 'https://github.com/LEO0331/taipei-bin-map/pull/14', baseSnapshotId: approved.snapshotId, prioritySnapshotId: snapshot.snapshotId, snapshotSha256: hash(await readFile(snapshotFile)), methodologyVersion: 'policy-balanced-coverage-v1', weightConfigurationVersion: 'policy-priority-weights-v1', sourceManifestSha256: hash(await readFile(join(directory, 'sources.json'))), sourceChecks: [{ sourceId: source.id, resourceId: source.resourceId, sha256: source.sha256, sourcePublishedAt: null }], checks: { schema: true, coordinates: true, identities: true, dates: true, exclusions: true, methodology: true, weights: true } };
  return { directory, manifest, snapshot, snapshotFile, review, bytes };
}
async function blockedTravelFixture() {
  const f = await fixture();
  const identity = { id: 'taipei_travel', resourceId: 'Attractions/All:zh-tw', downloadUrl: 'https://travel.taipei/open-api/zh-tw/Attractions/All?page=1', acquisitionStatus: 'blocked' as const, httpStatus: 403 };
  Object.assign(f.manifest.sources[0], identity);
  Object.assign(f.snapshot.sources[0], identity);
  await writeFile(join(f.directory, 'sources.json'), JSON.stringify(f.manifest));
  await writeFile(f.snapshotFile, JSON.stringify(f.snapshot));
  return f;
}
describe('policy priority research governance', () => {
  it('validates a frozen research snapshot without approving its sources', async () => {
    const f = await fixture(); const result = await verifyFrozenPriority(f.directory, f.snapshotFile, approved);
    expect(result.snapshot.approvalStatus).toBe('review_required');
  });
  it('rejects modified raw bytes before any review bundle is written', async () => {
    const f = await fixture(); await writeFile(join(f.directory, 'source.json'), 'changed');
    await expect(verifyFrozenPriority(f.directory, f.snapshotFile, approved)).rejects.toThrow(/hash/);
  });
  it('rejects a changed resource identity even when bytes are unchanged', async () => {
    const f = await fixture(); f.snapshot.sources[0].resourceId = 'other'; await writeFile(f.snapshotFile, JSON.stringify(f.snapshot));
    await expect(verifyFrozenPriority(f.directory, f.snapshotFile, approved)).rejects.toThrow(/identity/);
  });
  it('rejects a snapshot based on a different approved baseline', async () => {
    const f = await fixture(); f.snapshot.baseSnapshotId = 'different'; await writeFile(f.snapshotFile, JSON.stringify(f.snapshot));
    await expect(verifyFrozenPriority(f.directory, f.snapshotFile, approved)).rejects.toThrow(/version/);
  });
  it('rejects invalid coordinates in a derived reference', async () => {
    const f = await fixture(); f.snapshot.references.push({ id: 'bad-point', name: 'Invalid fixture', district: '中正區', latitude: 0, longitude: 0, sourceId: f.manifest.sources[0].id, sourceRecord: 'fixture', precision: 'test', category: 'mrt', canonicalId: 'fixture', sourceVersion: f.manifest.sources[0].sha256, limitations: [] }); await writeFile(f.snapshotFile, JSON.stringify(f.snapshot));
    await expect(verifyFrozenPriority(f.directory, f.snapshotFile, approved)).rejects.toThrow(/coordinates/);
  });
  it('rejects fabricated source publication dates not found in the archive manifest', async () => {
    const f = await fixture(); f.snapshot.sources[0].resourceUpdatedAt = now; await writeFile(f.snapshotFile, JSON.stringify(f.snapshot));
    await expect(verifyFrozenPriority(f.directory, f.snapshotFile, approved)).rejects.toThrow(/date/);
  });
  it('rejects an unsupported reference snapshot schema', async () => {
    const f = await fixture(); await writeFile(f.snapshotFile, JSON.stringify({ ...f.snapshot, schemaVersion: 2 }));
    await expect(verifyFrozenPriority(f.directory, f.snapshotFile, approved)).rejects.toThrow(/version/);
  });
  it('rejects raw paths that escape the frozen source directory', async () => {
    const f = await fixture(); f.manifest.sources[0].filename = '../outside.json'; await writeFile(join(f.directory, 'sources.json'), JSON.stringify(f.manifest));
    await expect(verifyFrozenPriority(f.directory, f.snapshotFile, approved)).rejects.toThrow(/path/);
  });
  it('keeps unknown publication dates unknown after an unchanged response', async () => {
    const f = await fixture(); const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response(f.bytes)) as typeof fetch });
    expect(report.sources[0].source_updated_at).toBeNull();
  });
  it('uses the same alert fingerprint for repeated source failures', async () => {
    const f = await fixture(); const fetcher = (async () => new Response('offline', { status: 503 })) as typeof fetch;
    const first = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher });
    const second = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now: '2026-10-16T12:00:00.000Z', fetcher });
    expect(second.alert_key).toBe(first.alert_key);
  });
  it('preserves approved production bytes when a monitored source fails', async () => {
    const f = await fixture(); const before = await readFile('public/data/bin-policy/analysis.json');
    await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => { throw new Error('offline'); }) as typeof fetch });
    expect(await readFile('public/data/bin-policy/analysis.json')).toEqual(before);
  });
  it('reports a previously audited blocked Travel 403 as attention rather than a new failure', async () => {
    const f = await blockedTravelFixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('forbidden', { status: 403 })) as typeof fetch });
    expect(report.state).toBe('warning');
  });
  it('does not fail the CLI for the explicitly recognized unavailable research source', async () => {
    const f = await blockedTravelFixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('forbidden', { status: 403 })) as typeof fetch });
    expect(priorityMonitorExitCode(report)).toBe(0);
  });
  it('retains the known unavailable Travel source as a warning rather than healthy data', async () => {
    const f = await blockedTravelFixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('forbidden', { status: 403 })) as typeof fetch });
    expect(report.sources[0].availability).toBe('known_unavailable');
    expect(report.sources[0].validation_status).toBe('warning');
  });
  it('keeps an unexpected 403 from a previously available source as a failure', async () => {
    const f = await fixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('forbidden', { status: 403 })) as typeof fetch });
    expect(priorityMonitorExitCode(report)).toBe(1);
  });
  it('does not downgrade a new server error from the known blocked Travel endpoint', async () => {
    const f = await blockedTravelFixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('server error', { status: 503 })) as typeof fetch });
    expect(report.state).toBe('failure');
  });
  it('does not exempt the Travel endpoint when its frozen acquisition was available', async () => {
    const f = await blockedTravelFixture(); f.manifest.sources[0].acquisitionStatus = 'available'; f.manifest.sources[0].httpStatus = 200;
    await writeFile(join(f.directory, 'sources.json'), JSON.stringify(f.manifest));
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('forbidden', { status: 403 })) as typeof fetch });
    expect(report.state).toBe('failure');
  });
  it('does not downgrade a timeout from the known blocked Travel endpoint', async () => {
    const f = await blockedTravelFixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => { throw new Error('timeout'); }) as typeof fetch });
    expect(report.state).toBe('failure');
  });
  it('does not exempt a changed Travel resource URL', async () => {
    const f = await blockedTravelFixture(); f.manifest.sources[0].downloadUrl = 'https://travel.taipei/other';
    await writeFile(join(f.directory, 'sources.json'), JSON.stringify(f.manifest));
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('forbidden', { status: 403 })) as typeof fetch });
    expect(report.state).toBe('failure');
  });
  it('requires review when a previously blocked Travel source starts returning data', async () => {
    const f = await blockedTravelFixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('{"data":[]}')) as typeof fetch });
    expect(report.sources[0].availability).toBe('recovery_requires_review');
    expect(report.publication_status).toBe('review_required');
  });
  it('does not treat an HTTP200 copy of a frozen blocked response as healthy data', async () => {
    const f = await blockedTravelFixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response(f.bytes)) as typeof fetch });
    expect(report.sources[0].validation_status).toBe('warning');
  });
  it('still rejects local frozen hash drift before classifying a known 403', async () => {
    const f = await blockedTravelFixture(); await writeFile(join(f.directory, 'source.json'), 'tampered');
    await expect(monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now })).rejects.toThrow(/hash/);
  });
  it('keeps repeated known-unavailable alerts deduplicated across check dates', async () => {
    const f = await blockedTravelFixture(); const fetcher = (async () => new Response('forbidden', { status: 403 })) as typeof fetch;
    const first = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher });
    const second = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now: '2026-10-16T12:00:00Z', fetcher });
    expect(second.alert_key).toBe(first.alert_key);
  });
  it('keeps known-unavailable warnings visible in the readable summary', async () => {
    const f = await blockedTravelFixture();
    const report = await monitorPrioritySources(f.directory, f.snapshotFile, { previous: approved, now, fetcher: (async () => new Response('forbidden', { status: 403 })) as typeof fetch });
    expect(priorityMonitorSummary(report)).toContain('known_unavailable');
  });
  it('refuses a review bundle without explicit technical-review status', async () => {
    const f = await fixture(); const output = join(f.directory, 'bundle');
    await expect(preparePriorityReview({ ...f.review, status: 'review_required' } as unknown as PriorityReview, f.directory, f.snapshotFile, output, approved)).rejects.toThrow(/review/);
    expect(existsSync(output)).toBe(false);
  });
  it('refuses a review bundle with an unrelated reference-file hash', async () => {
    const f = await fixture(); await expect(preparePriorityReview({ ...f.review, snapshotSha256: '0'.repeat(64) }, f.directory, f.snapshotFile, join(f.directory, 'bundle'), approved)).rejects.toThrow(/hash/);
  });
  it('refuses technical review evidence for a different approved baseline', async () => {
    const f = await fixture(); await expect(preparePriorityReview({ ...f.review, baseSnapshotId: 'different-baseline' }, f.directory, f.snapshotFile, join(f.directory, 'bundle'), approved)).rejects.toThrow(/snapshot mismatch/);
  });
  it('refuses a weight configuration version different from the reviewed defaults', async () => {
    const f = await fixture(); await expect(preparePriorityReview({ ...f.review, weightConfigurationVersion: 'unreviewed-v2' }, f.directory, f.snapshotFile, join(f.directory, 'bundle'), approved)).rejects.toThrow(/weight version/);
  });
  it('refuses a source revision omitted from human technical-review evidence', async () => {
    const f = await fixture(); await expect(preparePriorityReview({ ...f.review, sourceChecks: [] }, f.directory, f.snapshotFile, join(f.directory, 'bundle'), approved)).rejects.toThrow(/every source/);
  });
  it('writes a nonproduction review bundle while retaining research status', async () => {
    const f = await fixture(); const output = join(f.directory, 'bundle'); await preparePriorityReview(f.review, f.directory, f.snapshotFile, output, approved);
    expect(JSON.parse(await readFile(join(output, 'priority-references.json'), 'utf8')).approvalStatus).toBe('review_required');
  });
  it('rejects production-directory review output', async () => {
    const f = await fixture(); await expect(preparePriorityReview(f.review, f.directory, f.snapshotFile, 'public/data/unsafe-bundle', approved)).rejects.toThrow(/nonproduction/);
  });
});
