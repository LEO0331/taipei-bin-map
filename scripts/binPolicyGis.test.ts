import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inPolygon, normalizeXY, parseShp, unzip } from './binPolicyGis';
import { buildPolicySnapshot } from './convertBinPolicySources';
describe('policy source GIS validation', () => {
  it('transforms TWD97 TM2 with a known control point', () => { const p=normalizeXY(302655,2775585);expect(p.longitude).toBeCloseTo(121.5220125,5);expect(p.latitude).toBeCloseTo(25.0876265,5); });
  it('does not project already geographic coordinates a second time', () => { expect(normalizeXY(121.566541,25.08235).longitude).toBe(121.566541); });
  it('rejects reversed and zero coordinates', () => { expect(()=>normalizeXY(25,121)).toThrow();expect(()=>normalizeXY(0,0)).toThrow(); });
  it('uses polygon containment with holes', () => { const rings=[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[2,1],[2,2],[1,2],[1,1]]];expect(inPolygon(3,3,rings)).toBe(true);expect(inPolygon(1.5,1.5,rings)).toBe(false); });
  it('rejects truncated SHP and malformed ZIP inputs', () => { expect(()=>parseShp(Buffer.alloc(100))).toThrow();expect(()=>unzip(Buffer.alloc(100))).toThrow(); });
  it('reproduces validated official snapshot and preserves provenance', () => { const published=JSON.parse(readFileSync('public/data/bin-policy/analysis.json','utf8'));const result=buildPolicySnapshot(`data/raw/bin-policy/${published.snapshotId}`);expect(result.snapshotId).toBe(published.snapshotId);expect(result.references).toEqual(published.references);expect(result.bins).toEqual(published.bins);expect(result.quality.referenceEvidence).toHaveLength(result.quality.referenceSourceRows); });
  it('fails unavailable input instead of generating fake points', () => { expect(()=>buildPolicySnapshot('missing-policy-input')).toThrow(); });
});
