import { SHADE_CONFIGURATION_VERSION, SHADE_METHODOLOGY_VERSION, type ShadeEquityCandidate, type ShadeEquityComparison, type ShadeEquityParameters, type ShadeEquityScenario, type ShadeEquitySnapshot } from '../types/shadeEquity';
import { classifyShadeEquitySegment, SHADE_DISTRICTS, SHADE_LIMITATIONS, stableShadeText, validateShadeEquitySnapshot } from './shadeEquityDecision';

const confidence = { high: 0, medium: 1, low: 2 };
const tier = { A: 0, B: 1, C: 2 };
const freshness = (date: string | null) => date === null ? Infinity : Date.parse(date);
export function compareShadeEquityCandidates(a: ShadeEquityCandidate, b: ShadeEquityCandidate): number {
  return tier[a.tier] - tier[b.tier] || b.independentQuestionCount - a.independentQuestionCount || confidence[a.segment.confidence] - confidence[b.segment.confidence] || (freshness(a.segment.surveyDate) < freshness(b.segment.surveyDate) ? -1 : freshness(a.segment.surveyDate) > freshness(b.segment.surveyDate) ? 1 : 0) || stableShadeText(a.segment.district, b.segment.district) || stableShadeText(a.segment.id, b.segment.id);
}

function validateParameters(snapshot: ShadeEquitySnapshot, params: ShadeEquityParameters) {
  if (!params || !Number.isSafeInteger(params.capacity) || params.capacity < 0 || !Number.isFinite(params.minLengthM) || params.minLengthM < 0 || typeof params.includeAmbiguous !== 'boolean' || typeof params.district !== 'string' || (params.district !== '' && !(SHADE_DISTRICTS as readonly string[]).includes(params.district)) || !['evidence', 'balanced', 'low-recorded'].includes(params.strategy)) throw new Error('Invalid Shade Equity scenario parameters');
  if (params.strategy === 'low-recorded' && !snapshot.comparability.eligible) throw new Error('Comparable source coverage is required for low-recorded representation review');
  if (params.toleranceM !== undefined && (!Number.isFinite(params.toleranceM) || params.toleranceM < 0 || params.toleranceM > 10 || params.toleranceM !== snapshot.associationToleranceM)) throw new Error('Tolerance changes require a separately audited offline spatial snapshot');
}

export function runShadeEquityScenario(snapshot: ShadeEquitySnapshot, parameters: ShadeEquityParameters): ShadeEquityScenario {
  validateShadeEquitySnapshot(snapshot);
  validateParameters(snapshot, parameters);
  const sources = new Map(snapshot.sources.map(source => [source.id, source]));
  const datasets = { roadside_trees: '7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8', sidewalks: '715d3a83-8445-4496-b6bf-b0900538b7e7', tree_pits: '693705fa-4604-4207-bd50-8a9ce9fcfbc6' };
  const analytical = (id: string | null, role: keyof typeof datasets) => {
    const source = id === null ? undefined : sources.get(id);
    return !!source && ['verified_analysis', 'limited'].includes(source.suitability) && (source.population === undefined ? source.datasetId === datasets[role] : source.population === role);
  };
  const excluded: ShadeEquityScenario['excluded'] = [];
  const eligible: ShadeEquityCandidate[] = [];
  for (const segment of snapshot.segments) {
    if (parameters.district && segment.district !== parameters.district) continue;
    const classification = classifyShadeEquitySegment(segment);
    const reasons = [...classification.reasons];
    if (!analytical(segment.treeSourceId, 'roadside_trees')) reasons.push('tree_source_ineligible');
    if (!analytical(segment.sidewalkSourceId, 'sidewalks')) reasons.push('sidewalk_source_ineligible');
    if ((segment.pitSourceId !== null || segment.pitCount > 0 || segment.ambiguousPitCount > 0) && !analytical(segment.pitSourceId, 'tree_pits')) reasons.push('pit_source_ineligible');
    if (segment.lengthM !== null && segment.lengthM < parameters.minLengthM) reasons.push('below_minimum_length');
    if (!parameters.includeAmbiguous && (segment.ambiguousTreeCount > 0 || segment.ambiguousPitCount > 0 || segment.unresolvedAssociation)) reasons.push('ambiguous_association_excluded');
    if (classification.tier === 'insufficient' || reasons.length) { excluded.push({ id: segment.id, reasons }); continue; }
    const lengthM = segment.lengthM!;
    eligible.push({ segment, tier: classification.tier, independentQuestionCount: classification.questions.length, questions: classification.questions, recordedTreesPerKm: segment.treeCount * 1000 / lengthM, recordedPitsPerKm: segment.pitSourceId === null ? null : segment.pitCount * 1000 / lengthM });
  }
  eligible.sort(compareShadeEquityCandidates);
  let ordered = eligible.slice();
  if (parameters.strategy === 'low-recorded') ordered.sort((a, b) => a.recordedTreesPerKm - b.recordedTreesPerKm || compareShadeEquityCandidates(a, b));
  if (parameters.strategy === 'balanced') {
    const districts = [...new Set(eligible.map(row => row.segment.district))].sort(stableShadeText);
    const queues = districts.map(district => eligible.filter(row => row.segment.district === district));
    ordered = [];
    for (let position = 0; ordered.length < eligible.length; position++) for (const queue of queues) if (queue[position]) ordered.push(queue[position]);
  }
  const selected = parameters.capacity === 0 ? ordered : ordered.slice(0, parameters.capacity);
  excluded.sort((a, b) => stableShadeText(a.id, b.id));
  return {
    methodologyVersion: SHADE_METHODOLOGY_VERSION, configurationVersion: SHADE_CONFIGURATION_VERSION, snapshotId: snapshot.snapshotId,
    parameters: { ...parameters }, eligible, selected, excluded,
    summary: { eligibleCount: eligible.length, selectedCount: selected.length, districtsRepresented: new Set(selected.map(row => row.segment.district)).size, auditedLengthM: selected.reduce((sum, row) => sum + row.segment.lengthM!, 0), treeObservations: selected.reduce((sum, row) => sum + row.segment.treeCount, 0), pitObservations: selected.reduce((sum, row) => sum + row.segment.pitCount, 0), ambiguousTreeAssociations: selected.reduce((sum, row) => sum + row.segment.ambiguousTreeCount, 0), ambiguousPitAssociations: selected.reduce((sum, row) => sum + row.segment.ambiguousPitCount, 0), independentQuestions: selected.reduce((sum, row) => sum + row.independentQuestionCount, 0) },
    limitations: [...SHADE_LIMITATIONS, ...snapshot.limitations],
  };
}

export function compareShadeEquityScenarios(snapshot: ShadeEquitySnapshot, leftParameters: ShadeEquityParameters, rightParameters: ShadeEquityParameters, rightSnapshot: ShadeEquitySnapshot = snapshot): ShadeEquityComparison {
  const left = runShadeEquityScenario(snapshot, leftParameters), right = runShadeEquityScenario(rightSnapshot, rightParameters);
  const reasons: string[] = [];
  const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => stableShadeText(a, b))) : item);
  const population = (data: ShadeEquitySnapshot) => canonical({ sources: data.sources.slice().sort((a, b) => stableShadeText(a.id, b.id)), segments: data.segments.slice().sort((a, b) => stableShadeText(a.id, b.id)) });
  if (snapshot.snapshotId !== rightSnapshot.snapshotId || snapshot.methodologyVersion !== rightSnapshot.methodologyVersion || snapshot.configurationVersion !== rightSnapshot.configurationVersion || population(snapshot) !== population(rightSnapshot)) reasons.push('source_population_or_version_changed');
  if (leftParameters.district !== rightParameters.district) reasons.push('geographic_scope_changed');
  if (leftParameters.minLengthM !== rightParameters.minLengthM) reasons.push('minimum_length_changed');
  if (leftParameters.includeAmbiguous !== rightParameters.includeAmbiguous) reasons.push('association_eligibility_changed');
  if (snapshot.associationToleranceM !== rightSnapshot.associationToleranceM) reasons.push('matching_tolerance_changed');
  const leftIds = left.selected.map(row => row.segment.id), rightIds = right.selected.map(row => row.segment.id);
  const leftRanks = new Map(leftIds.map((id, index) => [id, index + 1])), rightRanks = new Map(rightIds.map((id, index) => [id, index + 1]));
  const retainedIds = rightIds.filter(id => leftRanks.has(id));
  return { scope: reasons.length ? 'different_evidence_scope' : 'same_evidence_scope', reasons, retainedIds, addedIds: rightIds.filter(id => !leftRanks.has(id)), removedIds: leftIds.filter(id => !rightRanks.has(id)), rankChanges: retainedIds.filter(id => leftRanks.get(id) !== rightRanks.get(id)).map(id => ({ id, before: leftRanks.get(id)!, after: rightRanks.get(id)! })), identicalSelection: leftIds.length === rightIds.length && leftIds.every(id => rightRanks.has(id)), left, right };
}

export function buildShadeEquitySensitivity(snapshot: ShadeEquitySnapshot, parameters: ShadeEquityParameters): { label: string; comparison: ShadeEquityComparison }[] {
  const evidence = { ...parameters, strategy: 'evidence' as const };
  const scenarios = [
    { label: 'capacity_5_vs_10', comparison: compareShadeEquityScenarios(snapshot, { ...evidence, capacity: 5 }, { ...evidence, capacity: 10 }) },
    { label: 'evidence_vs_balanced', comparison: compareShadeEquityScenarios(snapshot, evidence, { ...evidence, strategy: 'balanced' }) },
    { label: 'strict_vs_permissive', comparison: compareShadeEquityScenarios(snapshot, { ...evidence, includeAmbiguous: false }, { ...evidence, includeAmbiguous: true }) },
    { label: 'minimum_length', comparison: compareShadeEquityScenarios(snapshot, evidence, { ...evidence, minLengthM: evidence.minLengthM === 0 ? 20 : 0 }) },
  ];
  if (snapshot.comparability.eligible) scenarios.push({ label: 'evidence_vs_low_recorded', comparison: compareShadeEquityScenarios(snapshot, evidence, { ...evidence, strategy: 'low-recorded' }) });
  return scenarios;
}
