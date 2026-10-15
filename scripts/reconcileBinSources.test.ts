import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBinReconciliation, reconciliationCsv } from './reconcileBinSources';

describe('reproducible bin source audit', () => {
  it('accounts for every historical, current and supplemental raw row exactly once', () => {
    const report = buildBinReconciliation();
    const actual = report.records.flatMap(r => [...r.historicalIds, ...r.currentIds]).sort();
    expect(actual).toEqual(report.sourceRecords.map(r => r.id).sort());
  });
  it('retains the audited supplemental resource without merging it into main inventory', () => {
    const report = buildBinReconciliation();
    expect(report.sources.find(s => s.id === 'bins-tourist-commercial')?.recordCount).toBe(130);
    expect(report.records.filter(r => r.currentIds.some(id => id.startsWith('tourist:'))).every(r => r.classification === 'different_scope')).toBe(true);
  });
  it('reproduces the published content-addressed report from unchanged raw inputs', () => {
    const actual = buildBinReconciliation();
    const published = JSON.parse(readFileSync('public/data/bin-policy/reconciliation.json', 'utf8'));
    expect({ ...actual, generatedAt: null, sourceRecords: null }).toEqual({ ...published, generatedAt: null, sourceRecords: null });
  });
  it('preserves published announcement units separately from source record totals', () => {
    const report = buildBinReconciliation();
    expect(report.aggregateClaims[0]).toMatchObject({ groups: 806, physicalBins: 1612, publishedAt: '2026-08-10' });
  });
  it('exports audit classifications and report provenance in CSV', () => {
    const report = buildBinReconciliation();
    const csv = reconciliationCsv(report);
    expect(csv).toContain('report_id,classification,confidence');
    expect(csv).toContain(report.reportId);
  });
});
