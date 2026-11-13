import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { boundRawPath, normalizeAttractions, normalizeMrt, buildPrioritySnapshot, writePriorityCandidate } from './convertPolicyPrioritySources';
import { acquirePolicyPrioritySources } from './fetchPolicyPrioritySources';
import { stagePolicyPriorityRetirement } from './stagePolicyPriorityRetirement';
import { hash } from './binPolicyGovernance';
import { priorityRawSnapshotId, type PriorityRawManifest, type PrioritySourceArchive } from './policyPrioritySources';
import type { PrioritySnapshot } from '../src/lib/policyPriorityTypes';
import { publicPrioritySnapshot } from '../src/lib/policyPriorityPublic';

const historicalDirectory = 'data/raw/bin-policy-priority/priority-v1-113edf6ed5e09ada';
const approvedFile = 'public/data/bin-policy/analysis.json';
const approvedDistricts = 'data/raw/bin-policy/v1-14c24bcdbade/districts.zip';
const activeFile = 'public/data/bin-policy/priority-references-v2.json';

const source: PrioritySourceArchive = { id: 'test', name: 'Official fixture', provider: 'Taipei', datasetUrl: 'https://data.taipei', resourceId: 'fixture', resourceUpdatedAt: null,
  fetchedAt: '2026-10-15T00:00:00Z', validatedAt: '2026-10-15T00:00:00Z', sha256: 'a'.repeat(64), encoding: 'UTF-8', crs: 'EPSG:3826',
  license: 'Open Government Data License 1.0', licenseUrl: 'https://data.taipei/terms', caveat: 'Reference only', filename: 'fixture.json', downloadUrl: 'https://data.taipei', httpStatus: 200, acquisitionStatus: 'available', metadataUpdatedAt: null };
const feature = (id: number, name: string, coordinates = [302506.90928645316, 2771713.0103202793]) => ({ id, properties: { 'FID CODE': id, NAME: name, LOC: 'Official station intersection' }, geometry: { type: 'Point', coordinates } });
const mrt = (features: unknown[]) => ({ type: 'FeatureCollection', crs: { properties: { name: 'EPSG:3826' } }, features });
describe('official policy priority source adapters', () => {
  it('transforms official MRT TM2 coordinates rather than treating them as geographic', () => {
    const result = normalizeMrt(mrt([feature(17, '中山站')]), source, () => '中山區');
    expect(result.references[0].longitude).toBeCloseTo(121.52, 2);
  });
  it('collapses only the explicitly reviewed interchange source IDs', () => {
    const result = normalizeMrt(mrt([feature(17, '中山站'), feature(109, '中山站')]), source, () => '中山區');
    expect(result.references).toHaveLength(1);
  });
  it('preserves independent nearby stations even when coordinates coincide', () => {
    expect(normalizeMrt(mrt([feature(1, '站一'), feature(2, '站二')]), source, () => '中山區').references).toHaveLength(2);
  });
  it('rejects changed identities in a reviewed interchange pair', () => {
    expect(() => normalizeMrt(mrt([feature(17, '中山站'), feature(109, '其他站')]), source, () => '中山區')).toThrow('alias identity');
  });
  it('retains invalid MRT geometry as an exclusion rather than a fabricated district centroid', () => {
    expect(normalizeMrt(mrt([feature(1, '站一', [0, 0])]), source, () => '中山區').excluded).toHaveLength(1);
  });
  it('excludes MRT stations outside Taipei district polygons', () => {
    expect(normalizeMrt(mrt([feature(1, '外縣市站')]), source, () => null).references).toHaveLength(0);
  });
  it('rejects an undeclared or changed MRT projection', () => {
    expect(() => normalizeMrt({ ...mrt([]), crs: {} }, source, () => null)).toThrow('CRS');
  });
  it('does not silently accept geographic values under a declared projected MRT CRS', () => {
    expect(normalizeMrt(mrt([feature(1, '投影不符站', [121.52, 25.05])]), source, () => '中山區').excluded).toHaveLength(1);
  });
  it('keeps unknown attraction publication dates null', () => {
    const result = normalizeAttractions([{ Total: 1, data: [{ id: 1, name: '景點', east_long: 121.52, nlat: 25.05 }] }], [source], () => '中山區');
    expect(result.references[0].sourcePublishedAt).toBeNull();
  });
  it('excludes attractions with non-geographic coordinates', () => {
    expect(normalizeAttractions([{ Total: 1, data: [{ id: 1, name: '景點', east_long: 0, nlat: 0 }] }], [source], () => '中山區').excluded).toHaveLength(1);
  });
  it('does not reinterpret projected attraction coordinates as declared WGS84', () => {
    expect(normalizeAttractions([{ Total: 1, data: [{ id: 1, name: '景點', east_long: 302506, nlat: 2771713 }] }], [source], () => '中山區').references).toHaveLength(0);
  });
  it('rejects incomplete attraction page populations', () => {
    expect(() => normalizeAttractions([{ Total: 2, data: [] }], [source], () => null)).toThrow('Incomplete');
  });
  it('rejects aliases repeated across attraction pages', () => {
    const row = { id: 1, name: '景點', east_long: 121.52, nlat: 25.05 };
    expect(() => normalizeAttractions([{ Total: 2, data: [row, row] }], [source], () => '中山區')).toThrow('repeated');
  });
  it('acquires only the five active resources and records retirement without a Travel source entry', async () => {
    const output = mkdtempSync(join(tmpdir(), 'priority-acquisition-test-'));
    try {
      const historical = JSON.parse(readFileSync(join(historicalDirectory, 'sources.json'), 'utf8')) as PriorityRawManifest;
      const requested: string[] = [];
      const fetcher = (async (url: string | URL | Request, options?: RequestInit) => {
        requested.push(String(url));
        expect(options?.redirect).toBe('error');
        const source = historical.sources.find(row => row.downloadUrl === String(url));
        if (!source || source.id === 'taipei_travel') throw new Error(`Unexpected active acquisition: ${String(url)}`);
        return new Response(new Uint8Array(readFileSync(join(historicalDirectory, source.filename))));
      }) as typeof fetch;
      const directory = await acquirePolicyPrioritySources(output, fetcher);
      const manifest = JSON.parse(readFileSync(join(directory, 'sources.json'), 'utf8')) as PriorityRawManifest;
      expect(requested).toHaveLength(5);
      expect(manifest.retiredSources).toEqual(['taipei_travel']);
      expect(manifest.sources.map(row => row.id)).toEqual(['taipei_mrt_gis', 'vendor_concentrations', 'traditional_markets', 'commercial_introduction', 'commercial_associations']);
    } finally { rmSync(output, { recursive: true, force: true }); }
  });
  it('rejects source filenames escaping the frozen raw version', () => {
    expect(() => boundRawPath('data/raw', '../secrets')).toThrow('escapes');
  });
});

// The explicit committed version below is updated only when a new research snapshot is reviewed.
describe('frozen policy research snapshot', () => {
  it('rejects district geometry not bound to the approved baseline hash', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'priority-boundary-test-'));
    try {
      const published = JSON.parse(readFileSync('public/data/bin-policy/priority-references.json', 'utf8'));
      const approved = JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8'));
      const changed = join(directory, 'districts.zip');
      writeFileSync(changed, Buffer.concat([readFileSync('data/raw/bin-policy/v1-14c24bcdbade/districts.zip'), Buffer.from('changed')]));
      await expect(buildPrioritySnapshot(join('data/raw/bin-policy-priority', published.snapshotId), changed, approved)).rejects.toThrow(/district|boundary/i);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it.each(['priority-references.json', 'priority-references-v2.json'])('reproduces %s without adopting the newer bus comparison', async (filename) => {
    const published = JSON.parse(readFileSync(join('public/data/bin-policy', filename), 'utf8')) as PrioritySnapshot;
    const approved = JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8'));
    const result = await buildPrioritySnapshot(join('data/raw/bin-policy-priority', published.snapshotId), 'data/raw/bin-policy/v1-14c24bcdbade/districts.zip', approved);
    expect({ id: result.snapshotId, bus: result.busSourceVersion, counts: result.quality.includedByCategory, status: result.approvalStatus }).toEqual({ id: published.snapshotId, bus: approved.sources.find((s: { id: string }) => s.id === 'bus').sha256, counts: published.quality.includedByCategory, status: 'review_required' });
    // Validation is an actual event; all source-backed reference content must otherwise reproduce.
    const stable = (points: typeof result.references) => points.map(point => ({ ...point, latitude: point.latitude.toFixed(9), longitude: point.longitude.toFixed(9), validatedAt: null }));
    const projection = publicPrioritySnapshot(result);
    expect(stable(projection.references)).toEqual(stable(published.references));
    expect(projection.quality).toEqual(published.quality);
  });
});

describe('retirement-only v2 research snapshot', () => {
  it.each(['priority-references.json', 'priority-references-v2.json'])('publishes only aggregate commercial context in %s', (filename) => {
    const published = JSON.parse(readFileSync(join('public/data/bin-policy', filename), 'utf8')) as PrioritySnapshot;
    expect(published.quality.contextualCounts).toEqual({ commercial_introduction: 65, commercial_associations: 170 });
    expect(JSON.stringify(published)).not.toMatch(/"raw":|"contextualRecords":|"組織代表":|"聯絡電話":/);
  });
  it('reuses every nonretired source hash, official date and retrieval history', () => {
    const historical = JSON.parse(readFileSync(join(historicalDirectory, 'sources.json'), 'utf8')) as PriorityRawManifest;
    const active = JSON.parse(readFileSync(activeFile, 'utf8')) as PrioritySnapshot;
    const currentDirectory = join('data/raw/bin-policy-priority', active.snapshotId);
    const current = JSON.parse(readFileSync(join(currentDirectory, 'sources.json'), 'utf8')) as PriorityRawManifest;
    expect(current.sources).toEqual(historical.sources.filter(source => source.id !== 'taipei_travel'));
    expect(current.sources.map(source => hash(readFileSync(join(currentDirectory, source.filename))))).toEqual(current.sources.map(source => source.sha256));
  });
  it('preserves the historical Travel archive bytes', () => {
    expect(hash(readFileSync(join(historicalDirectory, 'travel-page-1.html')))).toBe('841b4d44af64f8c0ea3414887185c97c31da436a981eed5a08d03ff3ed3ad0f1');
  });
  it('preserves the approved production Mode A analysis bytes', () => {
    expect(hash(readFileSync(approvedFile))).toBe('9c5cb3b8890e7395cc15d7c85de11ec2a228d3a4288cff629f250fda99e3f12f');
  });
  it('preserves the 130-record supplementary reconciliation bytes', () => {
    expect(hash(readFileSync('data/raw/bin-policy-reconciliation/tourist-commercial.csv'))).toBe('47b1ddfb4f0ab4d5e57afab538f71da3d41d22e59c984bdd9c10b4248223b066');
  });
  it('does not let the research converter overwrite the active sidecar', () => {
    expect(() => writePriorityCandidate(JSON.parse(readFileSync(activeFile, 'utf8')), 'public/data/bin-policy')).toThrow(/escapes/);
  });
  it.each(['schema', 'geometry'] as const)('does not change the active research sidecar when candidate vendor %s fails', async (failure) => {
    const output = mkdtempSync(join(tmpdir(), 'priority-vendor-candidate-'));
    const before = hash(readFileSync(activeFile));
    try {
      const directory = await stagePolicyPriorityRetirement(output);
      const manifestFile = join(directory, 'sources.json');
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as PriorityRawManifest;
      const vendor = manifest.sources.find(source => source.id === 'vendor_concentrations')!;
      const csv = failure === 'schema' ? 'wrong,columns\n1,2\n' : 'seqno,stitle,xbody,xcreatedDate,xstartTime,xendTime,xAddress,GTag_longitude,GTag_latitude\n1,X,Y,2026,,,,0,0\n';
      writeFileSync(join(directory, vendor.filename), csv);
      vendor.sha256 = hash(csv);
      manifest.snapshotId = priorityRawSnapshotId(2, manifest.sources);
      writeFileSync(manifestFile, JSON.stringify(manifest));
      const candidate = buildPrioritySnapshot(directory, approvedDistricts, JSON.parse(readFileSync(approvedFile, 'utf8')));
      if (failure === 'schema') await expect(candidate).rejects.toThrow(/market schema/);
      else await expect(candidate).resolves.toMatchObject({ approvalStatus: 'review_required', categoryStatus: { night_market: { status: 'unavailable' } } });
      expect(hash(readFileSync(activeFile))).toBe(before);
    } finally { rmSync(output, { recursive: true, force: true }); }
  });
});
