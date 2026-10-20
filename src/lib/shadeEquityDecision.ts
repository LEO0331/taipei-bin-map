import { SHADE_CONFIGURATION_VERSION, SHADE_METHODOLOGY_VERSION, type ShadeEquityQuestion, type ShadeEquitySegment, type ShadeEquitySnapshot, type ShadeEquityTier } from '../types/shadeEquity';

export const SHADE_DISTRICTS = ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'] as const;
export const SHADE_LIMITATIONS = [
  'Registered roadside-tree observations are not measured canopy, pedestrian shade or heat exposure.',
  'Recorded tree pits are not verified vacancies or approved planting sites; occupancy and feasibility require field review.',
  'Survey slots allocate investigation effort, not planting budgets, environmental benefits or verified shade equity.',
  'Zero matched records do not establish absence of physical trees; ambiguous associations are non-additive.',
  'Global missing canopy and feasibility evidence does not inflate segment priorities.',
] as const;

export function stableShadeText(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
const validDate = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day;
};
const dimensions = new Set(['tree_inventory_coverage', 'tree_pit_occupancy', 'sidewalk_geometry', 'spatial_association', 'source_freshness']);

/** Maximum bipartite matching prevents both correlated-source inflation and greedy undercounting. */
export function independentShadeQuestions(questions: ShadeEquityQuestion[]): ShadeEquityQuestion[] {
  const material = questions.filter(q => q.material && q.scope !== 'global' && dimensions.has(q.dimension) && nonempty(q.causeId) && nonempty(q.reason))
    .slice().sort((a, b) => stableShadeText(a.dimension, b.dimension) || stableShadeText(a.causeId, b.causeId) || stableShadeText(a.reason, b.reason));
  const byDimension = new Map<string, ShadeEquityQuestion[]>();
  for (const q of material) byDimension.set(q.dimension, [...(byDimension.get(q.dimension) ?? []), q]);
  const assignedCause = new Map<string, ShadeEquityQuestion>();
  function assign(dimension: string, visited: Set<string>): boolean {
    for (const q of byDimension.get(dimension) ?? []) {
      if (visited.has(q.causeId)) continue;
      visited.add(q.causeId);
      const previous = assignedCause.get(q.causeId);
      if (!previous || assign(previous.dimension, visited)) { assignedCause.set(q.causeId, q); return true; }
    }
    return false;
  }
  for (const dimension of byDimension.keys()) assign(dimension, new Set());
  return [...assignedCause.values()].sort((a, b) => stableShadeText(a.dimension, b.dimension));
}

export function classifyShadeEquitySegment(segment: ShadeEquitySegment): { tier: ShadeEquityTier; questions: ShadeEquityQuestion[]; reasons: string[] } {
  const reasons: string[] = [];
  if (!nonempty(segment.id)) reasons.push('invalid_identity');
  if (!(SHADE_DISTRICTS as readonly string[]).includes(segment.district)) reasons.push('invalid_district');
  if (!segment.geometryValid || !Number.isFinite(segment.latitude) || !Number.isFinite(segment.longitude) || segment.latitude < 24.9 || segment.latitude > 25.3 || segment.longitude < 121.4 || segment.longitude > 121.7) reasons.push('invalid_geometry');
  if (!segment.sourceVerified) reasons.push('unverified_source_identity');
  if (!segment.measurementVerified || segment.lengthM === null || !Number.isFinite(segment.lengthM) || segment.lengthM <= 0) reasons.push('invalid_measurement_definition');
  if (segment.widthM !== null && (!Number.isFinite(segment.widthM) || segment.widthM <= 0)) reasons.push('invalid_measurement_definition');
  const questions = independentShadeQuestions(segment.questions);
  if (reasons.length) return { tier: 'insufficient', questions, reasons };
  const unresolved = segment.unresolvedAssociation || segment.ambiguousTreeCount > 0 || segment.ambiguousPitCount > 0;
  return { tier: questions.length >= 2 ? 'A' : questions.length === 1 || unresolved ? 'B' : 'C', questions, reasons };
}

/** Validate external static JSON before rendering or running scenarios. Ineligible units remain auditable exclusions. */
export function validateShadeEquitySnapshot(value: unknown): asserts value is ShadeEquitySnapshot {
  if (!object(value) || value.schemaVersion !== 1 || value.methodologyVersion !== SHADE_METHODOLOGY_VERSION || value.configurationVersion !== SHADE_CONFIGURATION_VERSION || !nonempty(value.snapshotId) || !validDate(value.generatedAt)) throw new Error('Unsupported Shade Equity snapshot identity or version');
  if (!Array.isArray(value.sources) || !Array.isArray(value.segments) || !Array.isArray(value.limitations) || !value.limitations.every(item => typeof item === 'string') || !object(value.comparability) || typeof value.comparability.eligible !== 'boolean' || !Array.isArray(value.comparability.reasons) || !value.comparability.reasons.every(item => typeof item === 'string')) throw new Error('Invalid Shade Equity snapshot population');
  if (value.associationToleranceM !== undefined && (typeof value.associationToleranceM !== 'number' || !Number.isFinite(value.associationToleranceM) || value.associationToleranceM < 0 || value.associationToleranceM > 10)) throw new Error('Invalid frozen association tolerance');
  const sourceIds = new Set<string>();
  for (const source of value.sources) {
    if (!object(source) || !nonempty(source.id) || sourceIds.has(source.id) || !nonempty(source.name) || !nonempty(source.provider) || !nonempty(source.datasetId) || !nonempty(source.url) || !/^https:\/\//.test(source.url) || !['verified_analysis', 'context_only', 'limited', 'unavailable', 'excluded'].includes(String(source.suitability))) throw new Error('Invalid source identity or suitability');
    if (source.resourceId !== null && !nonempty(source.resourceId)) throw new Error('Invalid source resource identity');
    if (source.population !== undefined && !['roadside_trees', 'sidewalks', 'tree_pits', 'park_context', 'protected_trees', 'heat_context', 'historical_context'].includes(String(source.population))) throw new Error('Invalid source population role');
    if (source.sha256 !== null && (typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(source.sha256))) throw new Error('Invalid source SHA256');
    if (['verified_analysis', 'limited'].includes(String(source.suitability)) && (!nonempty(source.resourceId) || !nonempty(source.sha256))) throw new Error('Analytical source requires original-byte identity and SHA256');
    for (const key of ['sourceUpdatedAt', 'retrievedAt', 'processedAt']) if (source[key] !== undefined && source[key] !== null && !validDate(source[key])) throw new Error('Invalid source date');
    for (const key of ['rawCount', 'acceptedCount', 'duplicateCount', 'invalidGeometryCount', 'missingCoordinateCount']) if (source[key] !== undefined && source[key] !== null && !count(source[key])) throw new Error('Invalid source audit count');
    if (typeof source.rawCount === 'number' && typeof source.acceptedCount === 'number' && source.acceptedCount > source.rawCount) throw new Error('Source accepted count exceeds original population');
    sourceIds.add(source.id);
  }
  const ids = new Set<string>();
  for (const segment of value.segments) {
    if (!object(segment) || !nonempty(segment.id) || ids.has(segment.id) || typeof segment.district !== 'string' || typeof segment.road !== 'string' || !nonempty(segment.treeSourceId) || !nonempty(segment.sidewalkSourceId) || (segment.pitSourceId !== null && !nonempty(segment.pitSourceId))) throw new Error('Invalid or duplicate segment identity');
    if (!Array.isArray(segment.questions) || !segment.questions.every(q => object(q) && nonempty(q.dimension) && nonempty(q.causeId) && typeof q.reason === 'string' && typeof q.material === 'boolean' && (q.scope === undefined || q.scope === 'global' || q.scope === 'segment'))) throw new Error('Invalid segment evidence questions');
    if (!['high', 'medium', 'low'].includes(String(segment.confidence)) || !['geometryValid', 'sourceVerified', 'measurementVerified'].every(key => typeof segment[key] === 'boolean') || !['treeCount', 'pitCount', 'ambiguousTreeCount', 'ambiguousPitCount'].every(key => count(segment[key]))) throw new Error('Invalid segment observation counts or confidence');
    if (segment.unresolvedAssociation !== undefined && typeof segment.unresolvedAssociation !== 'boolean') throw new Error('Invalid association eligibility');
    if (segment.surveyDate !== null && !validDate(segment.surveyDate)) throw new Error('Invalid fixed survey date');
    if (segment.lengthM !== null && (typeof segment.lengthM !== 'number' || !Number.isFinite(segment.lengthM))) throw new Error('Invalid segment length');
    if (segment.widthM !== null && (typeof segment.widthM !== 'number' || !Number.isFinite(segment.widthM))) throw new Error('Invalid segment width');
    if (typeof segment.latitude !== 'number' || typeof segment.longitude !== 'number') throw new Error('Invalid segment representative coordinate');
    ids.add(segment.id);
  }
  if (value.inventory !== undefined) {
    const inventory = value.inventory;
    if (!object(inventory) || !['rawTreeRows', 'acceptedTrees', 'rawSidewalkFeatures', 'acceptedSidewalks', 'rawPitFeatures', 'acceptedPits', 'matchedTrees', 'unmatchedTrees', 'ambiguousTrees', 'matchedPits', 'unmatchedPits', 'ambiguousPits'].every(key => count(inventory[key]))) throw new Error('Invalid optional inventory aggregates');
    if (inventory.eligibleDensityLengthM !== null && (typeof inventory.eligibleDensityLengthM !== 'number' || !Number.isFinite(inventory.eligibleDensityLengthM) || inventory.eligibleDensityLengthM < 0)) throw new Error('Invalid inventory density denominator');
    if ((inventory.acceptedTrees as number) > (inventory.rawTreeRows as number) || (inventory.acceptedSidewalks as number) > (inventory.rawSidewalkFeatures as number) || (inventory.acceptedPits as number) > (inventory.rawPitFeatures as number)) throw new Error('Accepted inventory exceeds raw population');
  }
  if (value.districtSummary !== undefined) {
    if (!Array.isArray(value.districtSummary)) throw new Error('Invalid optional district inventory');
    const districtIds = new Set<string>();
    for (const district of value.districtSummary) {
      if (!object(district) || typeof district.district !== 'string' || !(SHADE_DISTRICTS as readonly string[]).includes(district.district) || districtIds.has(district.district) || typeof district.comparable !== 'boolean' || !['sidewalkSegments', 'treeObservations', 'pitObservations', 'matchedTrees', 'matchedPits', 'ambiguousTrees', 'ambiguousPits'].every(key => count(district[key]))) throw new Error('Invalid district inventory aggregates');
      if (district.eligibleLengthM !== null && (typeof district.eligibleLengthM !== 'number' || !Number.isFinite(district.eligibleLengthM) || district.eligibleLengthM < 0)) throw new Error('Invalid district density denominator');
      if (district.comparable && !(typeof district.eligibleLengthM === 'number' && district.eligibleLengthM > 0)) throw new Error('Comparable district requires a supported denominator');
      districtIds.add(district.district);
    }
  }
  if (value.spatialQuality !== undefined && !object(value.spatialQuality)) throw new Error('Invalid spatial quality evidence');
  if (value.segmentCoverage !== undefined && !nonempty(value.segmentCoverage)) throw new Error('Invalid segment-loading scope');
  if (value.districtChunks !== undefined) {
    if (!object(value.districtChunks) || !Object.entries(value.districtChunks).every(([district, filename]) => (SHADE_DISTRICTS as readonly string[]).includes(district) && typeof filename === 'string' && /^[a-zA-Z0-9_-]+\.json$/.test(filename))) throw new Error('Invalid district static chunk index');
  }
}
