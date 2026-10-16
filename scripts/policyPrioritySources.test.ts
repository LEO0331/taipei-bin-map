import { describe, expect, it } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { boundRawPath, normalizeAttractions, normalizeMrt, buildPrioritySnapshot } from './convertPolicyPrioritySources';
import { fetchAttractionPages } from './fetchPolicyPrioritySources';
import type { PrioritySourceArchive } from './policyPrioritySources';

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
  it('preserves a blocked official API response without accepting it as tourist data', async () => {
    const fetcher = (async () => new Response('Forbidden', { status: 403 })) as typeof fetch;
    expect((await fetchAttractionPages(fetcher)).blocked).toBe(true);
  });
  it('fetches every attraction page until the declared population is complete', async () => {
    let calls = 0;
    const fetcher = (async () => new Response(JSON.stringify({ Total: 2, data: [{ id: ++calls }] }))) as typeof fetch;
    expect((await fetchAttractionPages(fetcher)).pages).toHaveLength(2);
  });
  it('rejects pagination changes instead of mixing two source populations', async () => {
    let calls = 0;
    const fetcher = (async () => new Response(JSON.stringify({ Total: ++calls === 1 ? 2 : 3, data: [{ id: calls }] }))) as typeof fetch;
    await expect(fetchAttractionPages(fetcher)).rejects.toThrow('population changed');
  });
  it('marks the entire attraction acquisition blocked when a later page fails', async () => {
    let calls = 0;
    const fetcher = (async () => ++calls === 1 ? new Response(JSON.stringify({ Total: 2, data: [{ id: 1 }] })) : new Response('Forbidden', { status: 403 })) as typeof fetch;
    expect((await fetchAttractionPages(fetcher)).blocked).toBe(true);
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
  it('reproduces the research snapshot without adopting the newer bus comparison', async () => {
    const published = JSON.parse(readFileSync('public/data/bin-policy/priority-references.json', 'utf8'));
    const approved = JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8'));
    const result = await buildPrioritySnapshot(join('data/raw/bin-policy-priority', published.snapshotId), 'data/raw/bin-policy/v1-14c24bcdbade/districts.zip', approved);
    expect({ id: result.snapshotId, bus: result.busSourceVersion, counts: result.quality.includedByCategory, status: result.approvalStatus }).toEqual({ id: published.snapshotId, bus: approved.sources.find((s: { id: string }) => s.id === 'bus').sha256, counts: published.quality.includedByCategory, status: 'review_required' });
    // Validation is an actual event; all source-backed reference content must otherwise reproduce.
    const stable = (points: typeof result.references) => points.map(point => ({ ...point, latitude: point.latitude.toFixed(9), longitude: point.longitude.toFixed(9), validatedAt: null }));
    expect(stable(result.references)).toEqual(stable(published.references));
  });
});
