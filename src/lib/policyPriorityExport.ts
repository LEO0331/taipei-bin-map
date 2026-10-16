import type { PriorityAllocation, PrioritySnapshot } from './policyPriorityTypes';
import type { analyzePolicySensitivity } from './policyBalancedCoverage';
import { DEFAULT_PRIORITY_WEIGHTS, WEIGHT_BOUNDS } from './policyPriorityWeights';
import { PRIORITY_CATEGORY_LABELS, PRIORITY_LIMITATIONS } from './policyPriorityPresentation';

export type PrioritySensitivity = ReturnType<typeof analyzePolicySensitivity>;
export function priorityCoverageScores(result: PriorityAllocation) {
  const baseline = result.categories.reduce((sum, category) => sum + (category.denominator ? category.weight * category.baselineCovered / category.denominator : 0), 0);
  return { baseline, post: baseline + result.incrementalScore, incremental: result.incrementalScore };
}
export function priorityBriefing(snapshot: PrioritySnapshot, result: PriorityAllocation, sensitivity: PrioritySensitivity, generatedAt: string) {
  return {
    schemaVersion: 1, analysisMode: 'policy_priority', methodology: result.methodology,
    weightConfiguration: result.weightConfiguration, activeWeights: result.weights,
    documentedDefaults: DEFAULT_PRIORITY_WEIGHTS, validatedWeightBounds: WEIGHT_BOUNDS,
    formula: 'sum_k(weight_k * newlyCovered_k / fixedEligibleCategoryPopulation_k)',
    scoreUnit: 'category-balanced reference coverage; not persons, waste volume or policy effectiveness',
    generatedAt, inputValidatedAt: snapshot.analysisValidatedAt ?? null, snapshotId: snapshot.snapshotId, baseSnapshotId: snapshot.baseSnapshotId,
    busSourceVersion: snapshot.busSourceVersion, approvalStatus: snapshot.approvalStatus,
    sourceReferences: snapshot.sources, categoryDefinitions: PRIORITY_CATEGORY_LABELS,
    categoryStatus: snapshot.categoryStatus, parameters: result.parameters, candidatePool: result.candidatePool,
    weightedCoverage: priorityCoverageScores(result),
    activeScenario: result, sensitivity, quality: snapshot.quality, limitations: PRIORITY_LIMITATIONS,
  };
}

export function priorityCsv(snapshot: PrioritySnapshot, result: PriorityAllocation, sensitivity: PrioritySensitivity, generatedAt: string) {
  const headers = ['row_type', 'analysis_mode', 'methodology', 'weight_configuration', 'weights', 'snapshot_id', 'base_snapshot_id', 'bus_source_version', 'approval_status', 'source_hashes', 'parameters', 'candidate_pool', 'analysis_at', 'category', 'candidate_id', 'name', 'latitude', 'longitude', 'precision', 'source_id', 'source_record', 'source_version', 'nearest_bin_m', 'raw_incremental_coverage', 'weighted_incremental_score', 'category_denominator', 'category_baseline', 'category_incremental', 'category_contributions', 'sensitivity_ranks', 'limitations'];
  const common = ['policy_priority', result.methodology, result.weightConfiguration, JSON.stringify(result.weights), snapshot.snapshotId, snapshot.baseSnapshotId, snapshot.busSourceVersion, snapshot.approvalStatus, JSON.stringify(snapshot.sources.map(s => ({ id: s.id, sha256: s.sha256, resourceId: s.resourceId, resourceUpdatedAt: s.resourceUpdatedAt, fetchedAt: s.fetchedAt, validatedAt: s.validatedAt ?? null }))), JSON.stringify(result.parameters), result.candidatePool, generatedAt];
  const blank = Array.from({ length: 18 }, () => '');
  const rows: unknown[][] = [['scenario_summary', ...common, ...blank]];
  rows[0][23] = result.incrementalCoverage; rows[0][24] = result.incrementalScore;
  rows[0][30] = PRIORITY_LIMITATIONS.join(' | ');
  for (const category of result.categories) rows.push(['category_summary', ...common, category.category, '', '', '', '', '', '', '', '', '', '', '', category.denominator, category.baselineCovered, category.newlyCovered, category.contribution, '', category.available ? (category.sparse ? 'Sparse reference population' : '') : 'Unavailable category; not zero demand; weight not redistributed']);
  for (const candidate of result.selected) rows.push(['candidate', ...common, candidate.point.category, candidate.point.id, candidate.point.name, candidate.point.latitude, candidate.point.longitude, candidate.point.precision, candidate.point.sourceId, candidate.point.sourceRecord, candidate.point.sourceVersion, candidate.nearestBinMeters, candidate.incrementalCoverage, candidate.incrementalScore, '', '', '', JSON.stringify(candidate.contributions), JSON.stringify(sensitivity.rankings.find(row => row.id === candidate.point.id)?.ranks ?? []), [...PRIORITY_LIMITATIONS, ...candidate.point.limitations].join(' | ')]);
  const quote = (value: unknown) => {
    let text = String(value ?? '');
    if (/^\s*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const coverage = priorityCoverageScores(result);
  return '\uFEFF' + [[...headers, 'baseline_weighted_coverage', 'post_weighted_coverage'], ...rows.map(row => [...row, coverage.baseline, coverage.post])].map(row => row.map(quote).join(',')).join('\r\n');
}
