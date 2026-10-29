// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { compareInventoryRows, parseInventoryCsv, safeAuditDirectory } from './reviewBinInventoryRevision';
import iconv from 'iconv-lite';

const row = (address = '測試路1號', longitude = '121.53', note = '備註') => ({ '行政區': '中正區', '地址': address, '經度': longitude, '緯度': '25.03', '備註': note });
describe('isolated bin revision audit glue (synthetic records only)', () => {
  it('counts exact duplicate rows as multiset observations rather than distinct facilities', () => {
    expect(compareInventoryRows([row(), row()], [row()]).exactRawOverlap).toBe(1);
  });
  it('retains competing same-address records as an ambiguous relationship', () => {
    expect(compareInventoryRows([row(), row()], [row()]).counts.ambiguous).toBe(1);
  });
  it('reports a changed remark only for a supported unique pair', () => {
    expect(compareInventoryRows([row()], [row('測試路1號', '121.53', '更新備註')]).modifiedPairs[0].changes.map(item => item.field)).toEqual(['備註']);
  });
  it('keeps invalid coordinate records outside identity matching', () => {
    expect(compareInventoryRows([row('測試路1號', '?121.53')], [row('測試路1號', '?121.53')]).rowCoverage.invalid).toEqual({ old: 1, new: 1 });
  });
  it('distinguishes unmatched source rows without declaring physical removals', () => {
    expect(compareInventoryRows([row()], [row('測試路99號', '121.6')]).rowCoverage.missing).toEqual({ old: 1, new: 0 });
  });
  it('preserves the existing different-scope classification when the opposite population is empty', () => {
    expect(compareInventoryRows([row()], []).rowCoverage.differentScope).toEqual({ old: 1, new: 0 });
  });
  it('rejects a changed CSV schema before comparison', () => {
    expect(() => parseInventoryCsv(iconv.encode('other\nvalue', 'cp950'))).toThrow(/schema/);
  });
  it('prevents audit output from targeting production data', () => {
    expect(() => safeAuditDirectory('public/data/bin-policy')).toThrow(/reports/);
  });
});
