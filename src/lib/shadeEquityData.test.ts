import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateShadeEquitySnapshot, shadeDataUrl, loadShadeEquitySnapshot } from './shadeEquityData';

const empty = () => ({ schemaVersion: 1, methodologyVersion: 'shade-equity-evidence-review-v1', configurationVersion: '1.0.0', snapshotId: 'test-only', generatedAt: '2026-10-20T00:00:00Z', sources: [], segments: [], limitations: ['Required sources unavailable'], comparability: { eligible: false, reasons: ['Unavailable'] } });
afterEach(() => vi.unstubAllGlobals());
describe('shade snapshot runtime contract', () => {
  it('retains an explicitly unavailable snapshot without fabricating candidates', () => {
    expect(validateShadeEquitySnapshot(empty()).segments).toEqual([]);
  });
  it('rejects a different method version', () => {
    expect(() => validateShadeEquitySnapshot({ ...empty(), methodologyVersion: 'other' })).toThrow();
  });
  it('rejects comparable coverage without source evidence', () => {
    expect(() => validateShadeEquitySnapshot({ ...empty(), comparability: { eligible: true, reasons: [] } })).toThrow();
  });
  it('rejects source provenance without a valid hash for analysis use', () => {
    expect(() => validateShadeEquitySnapshot({ ...empty(), sources: [{ id: 'roadside', suitability: 'verified_analysis' }] })).toThrow();
  });
  it('rejects malformed segment records instead of displaying a blank application', () => {
    expect(() => validateShadeEquitySnapshot({ ...empty(), segments: [{}] })).toThrow();
  });
  it('resolves shade data relative to the configured application base', () => {
    expect(shadeDataUrl('snapshot.json', '/taipei-bin-map/')).toBe('/taipei-bin-map/data/shade-equity/snapshot.json');
  });
  it('rejects traversal in a requested static filename', () => {
    expect(() => shadeDataUrl('../bin-policy/analysis.json')).toThrow();
  });
  it('does not fetch district details for the citywide inventory view', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ ...empty(), districtChunks: { 中正區: 'district-63000050.json' } }) }));
    vi.stubGlobal('fetch', fetcher);
    await loadShadeEquitySnapshot();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects a district chunk from a different snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ ...empty(), districtChunks: { 中正區: 'district-63000050.json' } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ schemaVersion: 1, snapshotId: 'wrong-version', district: '中正區', segments: [] }) });
    vi.stubGlobal('fetch', fetcher);
    await expect(loadShadeEquitySnapshot(undefined, '中正區')).rejects.toThrow('identity');
  });
  it('rejects a failed district response rather than treating missing records as zero trees', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ ...empty(), districtChunks: { 中正區: 'district-63000050.json' } }) }).mockResolvedValueOnce({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetcher);
    await expect(loadShadeEquitySnapshot(undefined, '中正區')).rejects.toThrow('503');
  });
});
