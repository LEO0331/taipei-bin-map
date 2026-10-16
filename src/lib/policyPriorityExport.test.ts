import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { preparePolicyCoverage, allocatePolicyPriority, analyzePolicySensitivity } from './policyBalancedCoverage';
import { POLICY_CATEGORIES, type PrioritySnapshot, type PolicyReference } from './policyPriorityTypes';
import { priorityBriefing, priorityCsv, priorityCoverageScores } from './policyPriorityExport';

const point: PolicyReference = { id: 'b1', canonicalId: 'b1', category: 'bus', sourceId: 'bus', sourceVersion: 'bus-original', sourceRecord: 'b1', name: '=HYPERLINK("unsafe")', district: '中正區', latitude: 25.04, longitude: 121.52, precision: 'official point', limitations: ['Field review required'] };
const snapshot: PrioritySnapshot = {
  schemaVersion: 1, snapshotId: 'priority-test', baseSnapshotId: 'base-test', busSourceVersion: 'bus-original', approvalStatus: 'review_required', generatedAt: '2026-10-15T00:00:00Z', references: [point],
  sources: [{ id: 'bus', resourceId: 'official', sourceVersion: 'bus-original', name: 'Bus', provider: 'Official', datasetUrl: '', resourceUpdatedAt: '2021-04-11T00:00:00Z', fetchedAt: '2026-10-15T00:00:00Z', sha256: 'a'.repeat(64), encoding: '', crs: 'WGS84', license: '', licenseUrl: '', caveat: '' }],
  categoryStatus: Object.fromEntries(POLICY_CATEGORIES.map(category => [category, { status: category === 'bus' ? 'available' : 'unavailable', reason: 'Test fixture' }])) as PrioritySnapshot['categoryStatus'], quality: { exclusions: [] },
};
const prepared = preparePolicyCoverage([], [point], { district: '', radius: 300, count: 1, separation: 0, unitCost: null, budget: null });
const result = allocatePolicyPriority(prepared);
const sensitivity = analyzePolicySensitivity(prepared);
describe('weighted briefing exports', () => {
  it('keeps weighted before/after values in the same scenario units', () => {
    const coverage = priorityCoverageScores(result);
    expect(coverage.post - coverage.baseline).toBeCloseTo(result.incrementalScore, 12);
  });
  it('reports covered baseline entities without calling them incremental gain', () => {
    const covered = allocatePolicyPriority(preparePolicyCoverage([point], [point], prepared.parameters));
    expect(priorityCoverageScores(covered)).toEqual({ baseline: 1, post: 1, incremental: 0 });
  });
  it('preserves the bus source version separately from weight and method versions', () => {
    const report = priorityBriefing(snapshot, result, sensitivity, snapshot.generatedAt);
    expect([report.busSourceVersion, report.weightConfiguration, report.methodology]).toEqual(['bus-original', 'policy-priority-weights-v1', 'policy-balanced-coverage-v1']);
  });
  it('describes score units as reference coverage rather than observed policy effectiveness', () => {
    expect(priorityBriefing(snapshot, result, sensitivity, snapshot.generatedAt).scoreUnit).toContain('not persons, waste volume or policy effectiveness');
  });
  it('exports consistent CSV columns for summary, category and candidate records', () => {
    const parsed = Papa.parse(priorityCsv(snapshot, result, sensitivity, snapshot.generatedAt), { header: true });
    expect(parsed.errors).toEqual([]);
  });
  it('keeps source provenance in CSV even when no candidates are selected', () => {
    const zero = allocatePolicyPriority({ ...prepared, parameters: { ...prepared.parameters, count: 0 } });
    expect(priorityCsv(snapshot, zero, sensitivity, snapshot.generatedAt)).toContain('bus-original');
  });
  it('neutralizes formula-like source names in CSV', () => {
    const parsed = Papa.parse<Record<string, string>>(priorityCsv(snapshot, result, sensitivity, snapshot.generatedAt), { header: true });
    expect(parsed.data.find(row => row.row_type === 'candidate')?.name).toBe(`'${point.name}`);
  });
});
