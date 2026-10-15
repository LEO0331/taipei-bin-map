import { mkdtemp, readFile, writeFile, copyFile, mkdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { policySources } from './binPolicySources';
import { buildPolicySnapshot } from './convertBinPolicySources';
import { allocateBins, METHOD, type PolicyParameters } from '../src/lib/binPolicyDecision';
import { validatePolicySnapshot } from '../src/lib/binPolicyData';
import { countAnomaly, rawCount, hash, validateApproval, verifyRawIdentity, type SourceApproval, type Snapshot } from './binPolicyGovernance';

/** Produces a review bundle only. The deployment snapshot is never a write target. */
export async function preparePublication(approval: SourceApproval, output: string, options: { rawDirectory?: string; fetcher?: typeof fetch; previous?: Snapshot } = {}) {
  const destination = resolve(output);
  const protectedRoots = [resolve('public'), resolve('data'), resolve('src'), resolve('.git')];
  const comparable = destination.toLowerCase();
  if (comparable === resolve('.').toLowerCase() || protectedRoots.some(root => comparable === root.toLowerCase() || comparable.startsWith(`${root.toLowerCase()}/`) || comparable.startsWith(`${root.toLowerCase()}\\`))) throw new Error('Review output must be outside production, source and versioned-data directories');
  const stage = await mkdtemp(join(tmpdir(), 'taipei-policy-publication-'));
  try {
    const previous = options.previous ?? JSON.parse(await readFile(resolve('public/data/bin-policy/analysis.json'), 'utf8')) as Snapshot;
    const raw = join(stage, 'raw'); await mkdir(raw);
    if (options.rawDirectory) {
      for (const source of policySources) await copyFile(join(options.rawDirectory, source.filename), join(raw, source.filename));
      await copyFile(join(options.rawDirectory, 'sources.json'), join(raw, 'sources.json'));
    } else {
      if (!approval || !Array.isArray(approval.sources)) throw new Error('Explicit reviewed source approval required');
      const sources = [];
      for (const source of policySources) {
        const approved = approval.sources.find(s => s.source_id === source.id);
        if (!approved || approved.resource_id !== source.resourceId) throw new Error(`Unapproved resource identity: ${source.id}`);
        const response = await (options.fetcher ?? fetch)(source.downloadUrl, { signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 100 || bytes.length > 20_000_000 || hash(bytes) !== approved.sha256) throw new Error(`${source.id}: approved content hash/size mismatch`);
        await writeFile(join(raw, source.filename), bytes);
        sources.push({ ...source, resourceUpdatedAt: approved.source_updated_at, sha256: approved.sha256, fetchedAt: new Date().toISOString(), httpLastModified: response.headers.get('last-modified') });
      }
      await writeFile(join(raw, 'sources.json'), JSON.stringify(sources, null, 2));
    }
    await verifyRawIdentity(raw);
    const snapshot = buildPolicySnapshot(raw);
    validateApproval(approval, previous, snapshot);
    validatePolicySnapshot(snapshot);
    for (const source of snapshot.sources) if (countAnomaly(rawCount(previous, source.id),rawCount(snapshot, source.id))) throw new Error(`Unexpected count change requires a separately reviewed importer/threshold change: ${source.id}`);
    if (snapshot.bins.length < previous.bins.length*.8 || snapshot.references.length < previous.references.length*.8 || snapshot.quality.excluded.length > Math.max(previous.quality.excluded.length, (snapshot.quality.binSourceRows + snapshot.quality.referenceSourceRows)*.02)) throw new Error('Unexpected coordinate completeness loss; retain previous publication and review importer/source scope');
    const parameters: PolicyParameters = { district: '中正區', radius: 300, count: 5, separation: 0, unitCost: null, budget: null };
    const before = allocateBins(previous.bins, previous.references, parameters);
    const after = allocateBins(snapshot.bins, snapshot.references, parameters);
    const report = { schemaVersion: 1, generated_at: new Date().toISOString(), methodology: METHOD, previous_snapshot_id: previous.snapshotId, proposed_snapshot_id: snapshot.snapshotId, approval, sources: snapshot.sources.map(source=>({ source_id: source.id, previous_hash: previous.sources.find(s=>s.id===source.id)?.sha256 ?? null, proposed_hash: source.sha256, source_updated_at: source.resourceUpdatedAt ?? null })), parameters, before, after, interpretation: 'Data-version sensitivity analysis only, not an intervention effect. This smoke scenario does not replace review of all relevant districts and parameters.' };
    await writeFile(join(stage, 'analysis.json'), JSON.stringify(snapshot));
    await writeFile(join(stage, 'source-change-and-impact.json'), JSON.stringify(report, null, 2));
    await writeFile(join(stage, 'approval.json'), JSON.stringify(approval, null, 2));
    // Refuse existing output instead of deleting another run's results.
    await mkdir(destination);
    for (const filename of ['analysis.json','source-change-and-impact.json','approval.json']) await copyFile(join(stage, filename), join(destination, filename));
    await cp(raw, join(destination, 'raw'), { recursive: true, force: false, errorOnExist: true });
    await writeFile(join(destination, 'ready.json'), JSON.stringify({ snapshotId: snapshot.snapshotId, validated: true }));
    return report;
  } finally { await rm(stage, { recursive: true, force: true }); }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [approvalFile, output, rawDirectory] = process.argv.slice(2);
  if (!approvalFile || !output) throw new Error('Usage: prepareBinPolicyPublication.ts <reviewed-approval.json> <new-review-output-directory> [versioned-raw-directory]');
  const report = await preparePublication(JSON.parse(await readFile(resolve(approvalFile), 'utf8')), output, { rawDirectory });
  console.log(JSON.stringify({ state: 'review_bundle_prepared', proposed_snapshot_id: report.proposed_snapshot_id, output: resolve(output), published: false }));
}
