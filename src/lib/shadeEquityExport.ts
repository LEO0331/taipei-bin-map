import type { ShadeEquityScenario, ShadeEquitySnapshot } from '../types/shadeEquity';
import type { buildShadeEquitySensitivity } from './shadeEquityScenario';
import { validateShadeEquitySnapshot } from './shadeEquityDecision';

export const SHADE_FIELD_CHECKLIST = [
  'Verify actual tree and pit occupancy; unmatched geometry does not prove vacancy.',
  'Verify current tree condition and survival.',
  'Measure pedestrian clear width and accessibility.',
  'Confirm utility clearance and road-infrastructure conflicts.',
  'Verify land jurisdiction and responsible agency requirements.',
  'Verify soil and rooting suitability.',
  'Confirm feasible species and maintenance responsibilities.',
  'Measure actual pedestrian shade if required; do not infer canopy or heat from inventory counts.',
] as const;
type Comparisons = ReturnType<typeof buildShadeEquitySensitivity>;
export function shadeEquityBriefing(snapshot: ShadeEquitySnapshot, result: ShadeEquityScenario, comparisons: Comparisons = [], generatedAt = snapshot.generatedAt) {
  validateShadeEquitySnapshot(snapshot);
  if (result.snapshotId !== snapshot.snapshotId || result.methodologyVersion !== snapshot.methodologyVersion || result.configurationVersion !== snapshot.configurationVersion) throw new Error('Briefing result and source snapshot identity mismatch');
  return {
    schemaVersion: 1, title: 'Shade Equity Field-Review Briefing',
    policyQuestion: 'Which documented sidewalk segments warrant earlier inventory and field investigation under limited review capacity?',
    snapshotId: snapshot.snapshotId, methodologyVersion: result.methodologyVersion, configurationVersion: result.configurationVersion,
    snapshotGeneratedAt: snapshot.generatedAt, exportedAt: generatedAt, sources: snapshot.sources,
    reviewUnit: 'Official sidewalk feature, not a planting location',
    measurementUnits: { length: 'metres', density: 'registered observations per kilometre of eligible audited sidewalk', capacity: 'documentary or field review slots' },
    eligiblePopulation: snapshot.eligiblePopulation ?? 'Audited sidewalk units satisfying source, geometry, district and measurement validation',
    associationToleranceM: snapshot.associationToleranceM ?? null, comparability: snapshot.comparability,
    inventory: snapshot.inventory ?? null, districtSummary: snapshot.districtSummary ?? null, spatialQuality: snapshot.spatialQuality ?? null,
    segmentCoverage: snapshot.segmentCoverage ?? 'Provided snapshot segment population', districtChunks: snapshot.districtChunks ?? null,
    summaryScope: 'Counts describe selected eligible review units only, not total citywide inventory; zero selected reviews does not mean no trees or pits.',
    inventoryScope: 'Accepted official source observations and all audited inventory units; not representative citywide shade or physical absence.',
    parameters: result.parameters, summary: result.summary, eligibleCandidateIds: result.eligible.map(row => row.segment.id),
    selected: result.selected, exclusions: result.excluded, comparisons,
    fieldReviewChecklist: SHADE_FIELD_CHECKLIST, unsupportedConclusions: result.limitations,
  };
}

export function shadeEquityCsv(snapshot: ShadeEquitySnapshot, result: ShadeEquityScenario, comparisons: Comparisons = [], generatedAt = snapshot.generatedAt): string {
  const briefing = shadeEquityBriefing(snapshot, result, comparisons, generatedAt);
  const headers = ['row_type', 'snapshot_id', 'methodology_version', 'configuration_version', 'source_provenance', 'parameters', 'review_id', 'district', 'road', 'tier', 'independent_questions', 'length_m', 'registered_tree_observations', 'registered_pit_observations', 'ambiguous_tree_associations', 'ambiguous_pit_associations', 'registered_trees_per_km', 'registered_pits_per_km', 'confidence', 'survey_date', 'reasons', 'source_references', 'exported_at'];
  const rows: unknown[][] = [];
  const provenance = JSON.stringify(briefing.sources);
  const base = (kind: string) => [kind, briefing.snapshotId, briefing.methodologyVersion, briefing.configurationVersion, provenance, JSON.stringify(result.parameters)];
  const detail = (kind: string, cells: unknown[]) => rows.push([...base(kind), ...cells, generatedAt]);
  detail('scenario_summary', ['', '', '', '', result.summary.independentQuestions, result.summary.auditedLengthM, result.summary.treeObservations, result.summary.pitObservations, result.summary.ambiguousTreeAssociations, result.summary.ambiguousPitAssociations, '', '', '', '', JSON.stringify({ scope: briefing.summaryScope, segmentCoverage: briefing.segmentCoverage, summary: result.summary }), JSON.stringify(result.limitations)]);
  if (snapshot.inventory) {
    const inventory = snapshot.inventory;
    detail('inventory_summary', ['', '', '', '', '', inventory.eligibleDensityLengthM, inventory.acceptedTrees, inventory.acceptedPits, inventory.ambiguousTrees, inventory.ambiguousPits, '', '', '', '', JSON.stringify({ scope: briefing.inventoryScope, ...inventory }), '']);
  }
  for (const district of snapshot.districtSummary ?? []) detail('district_inventory', ['', district.district, '', '', '', district.eligibleLengthM, district.treeObservations, district.pitObservations, district.ambiguousTrees, district.ambiguousPits, '', '', '', '', JSON.stringify({ scope: briefing.inventoryScope, ...district }), '']);
  if (snapshot.spatialQuality) detail('spatial_quality', ['', '', '', '', '', '', '', '', '', '', '', '', '', '', JSON.stringify(snapshot.spatialQuality), '']);
  for (const candidate of result.selected) {
    const s = candidate.segment;
    detail('review_candidate', [s.id, s.district, s.road, candidate.tier, candidate.independentQuestionCount, s.lengthM, s.treeCount, s.pitCount, s.ambiguousTreeCount, s.ambiguousPitCount, candidate.recordedTreesPerKm, candidate.recordedPitsPerKm, s.confidence, s.surveyDate, JSON.stringify(candidate.questions), JSON.stringify({ treeSourceId: s.treeSourceId, pitSourceId: s.pitSourceId, sidewalkSourceId: s.sidewalkSourceId })]);
  }
  for (const source of snapshot.sources) detail('source', [source.id, '', source.name, '', '', '', '', '', '', '', '', '', '', source.sourceUpdatedAt, source.suitability, JSON.stringify(source)]);
  for (const exclusion of result.excluded) detail('excluded', [exclusion.id, '', '', '', '', '', '', '', '', '', '', '', '', '', JSON.stringify(exclusion.reasons), '']);
  for (const scenario of comparisons) detail('comparison', [scenario.label, '', '', '', '', '', '', '', '', '', '', '', '', '', scenario.comparison.scope, JSON.stringify({ retainedIds: scenario.comparison.retainedIds, addedIds: scenario.comparison.addedIds, removedIds: scenario.comparison.removedIds, rankChanges: scenario.comparison.rankChanges, reasons: scenario.comparison.reasons })]);
  const quote = (value: unknown) => {
    let text = String(value ?? '');
    if (/^\s*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [headers, ...rows].map(row => row.map(quote).join(',')).join('\r\n');
}
