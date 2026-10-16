import { distance, validPoint, type PolicyParameters, type PolicyPoint } from './binPolicyDecision';
import { POLICY_CATEGORIES, prioritySourceCategory, type CandidatePool, type PolicyReference, type PriorityAllocation, type PriorityCategory, type PrioritySnapshot, type PriorityWeights } from './policyPriorityTypes';
import { DEFAULT_PRIORITY_WEIGHTS, EQUAL_PRIORITY_WEIGHTS, validatePriorityWeights, WEIGHT_BOUNDS, WEIGHT_CONFIGURATION } from './policyPriorityWeights';

export const POLICY_METHOD = 'policy-balanced-coverage-v1' as const;
// Metre comparison tolerance only absorbs floating-point error, not coordinate uncertainty.
const DISTANCE_TOLERANCE = 1e-7;
const emptyCounts = () => Object.fromEntries(POLICY_CATEGORIES.map(category => [category, 0])) as Record<PriorityCategory, number>;
const compareIds = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, 'en');

export function validatePrioritySnapshot(input: unknown, baseSnapshotId: string, busSourceVersion?: string): PrioritySnapshot {
  const data = input as PrioritySnapshot;
  if (!data || data.schemaVersion !== 1 || typeof data.snapshotId !== 'string' || !data.snapshotId.trim() || data.baseSnapshotId !== baseSnapshotId || typeof data.busSourceVersion !== 'string' || !data.busSourceVersion.trim() || (busSourceVersion && data.busSourceVersion !== busSourceVersion) || data.approvalStatus !== 'review_required' || !Array.isArray(data.sources) || !Array.isArray(data.references) || !data.categoryStatus || !data.quality || !Array.isArray(data.quality.exclusions)) throw new Error('Policy priority source/version mismatch');
  const sourceTextFields = ['id', 'name', 'provider', 'datasetUrl', 'resourceId', 'fetchedAt', 'sha256', 'encoding', 'crs', 'license', 'licenseUrl', 'caveat'] as const;
  if (data.sources.some(source => !source || sourceTextFields.some(field => typeof source[field] !== 'string'))) throw new Error('Invalid policy source text fields');
  if (data.analysisValidatedAt !== undefined && !Number.isFinite(Date.parse(data.analysisValidatedAt))) throw new Error('Invalid research validation event');
  if (!Number.isFinite(Date.parse(data.generatedAt)) || new Set(data.sources.map(source => source.id)).size !== data.sources.length || data.sources.some(source => !source.id || !source.resourceId || !/^[a-f0-9]{64}$/i.test(source.sha256) || !Number.isFinite(Date.parse(source.fetchedAt)) || (source.resourceUpdatedAt !== null && !Number.isFinite(Date.parse(source.resourceUpdatedAt))) || (source.validatedAt !== undefined && !Number.isFinite(Date.parse(source.validatedAt))))) throw new Error('Invalid policy priority provenance');
  if (new Set(data.references.map(reference => reference.id)).size !== data.references.length || data.references.some(reference => {
    if (!reference || ['id', 'name', 'district', 'sourceId', 'sourceRecord', 'precision', 'canonicalId', 'sourceVersion'].some(field => typeof reference[field as keyof PolicyReference] !== 'string')) return true;
    const source = data.sources.find(item => item.id === reference.sourceId);
    return !reference.id || !reference.canonicalId || !POLICY_CATEGORIES.includes(reference.category) || !validPoint(reference) || !source ||
      !['review_required', 'existing_baseline'].includes(source.approvalStatus ?? '') ||
      ('acquisitionStatus' in source && source.acquisitionStatus !== 'available') ||
      prioritySourceCategory(source.id) !== reference.category ||
      (reference.geometryType !== undefined && reference.geometryType !== 'Point') ||
      (reference.resourceId !== undefined && reference.resourceId !== source.resourceId) ||
      (reference.sourcePublishedAt !== undefined && reference.sourcePublishedAt !== source.resourceUpdatedAt) ||
      reference.sourceVersion !== (source.sourceVersion ?? source.sha256) || (reference.contentHash && reference.contentHash !== source.sha256) || !Array.isArray(reference.limitations) || reference.limitations.some(value => typeof value !== 'string') || (reference.category === 'bus' && reference.sourceVersion !== data.busSourceVersion);
  })) throw new Error('Invalid policy priority coordinates or source version');
  if (POLICY_CATEGORIES.some(category => !['available', 'unavailable'].includes(data.categoryStatus[category]?.status) || typeof data.categoryStatus[category]?.reason !== 'string')) throw new Error('Missing category availability');
  if (POLICY_CATEGORIES.some(category => (data.categoryStatus[category].status === 'available') !== data.references.some(reference => reference.category === category))) throw new Error('Category availability contradicts eligible references');
  return data;
}

/** Exact Haversine filtering follows conservative geographic grid lookup; no approximation changes coverage. */
function spatialIndex(points: PolicyPoint[]) {
  const cellSize = 0.005;
  const cells = new Map<string, number[]>();
  points.forEach((point, index) => {
    const key = `${Math.floor(point.latitude / cellSize)},${Math.floor(point.longitude / cellSize)}`;
    const indices = cells.get(key) ?? [];
    indices.push(index); cells.set(key, indices);
  });
  return (point: PolicyPoint, radius: number) => {
    const latDelta = radius / 110000;
    const lonDelta = radius / 99000; // Conservative for the validated Taipei extent.
    const results: number[] = [];
    // Very large exploratory radii should scan populated cells, not millions of empty cells.
    if (radius > 20000) return points.map((_, index) => index).filter(index => distance(point, points[index]) <= radius + DISTANCE_TOLERANCE);
    for (let lat = Math.floor((point.latitude - latDelta) / cellSize); lat <= Math.floor((point.latitude + latDelta) / cellSize); lat++) {
      for (let lon = Math.floor((point.longitude - lonDelta) / cellSize); lon <= Math.floor((point.longitude + lonDelta) / cellSize); lon++) {
        for (const index of cells.get(`${lat},${lon}`) ?? []) if (distance(point, points[index]) <= radius + DISTANCE_TOLERANCE) results.push(index);
      }
    }
    return results.sort((a, b) => a - b);
  };
}

export function preparePolicyCoverage(binsInput: PolicyPoint[], referencesInput: PolicyReference[], parameters: PolicyParameters, candidatePool: CandidatePool = 'transport') {
  if (!Number.isFinite(parameters.radius) || parameters.radius <= 0 || !Number.isInteger(parameters.count) || parameters.count < 0 || parameters.count > 50 || !Number.isFinite(parameters.separation) || parameters.separation < 0 || (parameters.unitCost !== null && (!Number.isFinite(parameters.unitCost) || parameters.unitCost <= 0)) || (parameters.budget !== null && (!Number.isFinite(parameters.budget) || parameters.budget < 0)) || !['transport', 'bus_only'].includes(candidatePool)) throw new Error('Invalid scenario parameters');
  const exclusions: Array<{ id: string; reason: string }> = [];
  const bins = binsInput.filter(validPoint).sort(compareIds);
  const canonical = new Set<string>();
  // Verified canonical identities across categories use the explicit category order, never proximity.
  const references = referencesInput.filter(point => validPoint(point) && POLICY_CATEGORIES.includes(point.category) && point.canonicalId)
    .sort((a, b) => POLICY_CATEGORIES.indexOf(a.category) - POLICY_CATEGORIES.indexOf(b.category) || compareIds(a, b))
    .filter(point => {
      if (canonical.has(point.canonicalId)) { exclusions.push({ id: point.id, reason: 'canonical_alias_primary_category' }); return false; }
      canonical.add(point.canonicalId); return true;
    }).filter(point => !parameters.district || point.district === parameters.district).sort(compareIds);
  const counts = emptyCounts(); references.forEach(point => counts[point.category]++);
  const queryReferences = spatialIndex(references);
  const baseline = new Set<number>();
  bins.forEach(bin => queryReferences(bin, parameters.radius).forEach(index => baseline.add(index)));
  const coordinateKeys = new Set<string>();
  const neighbours = references.filter(point => point.category === 'bus' || (candidatePool === 'transport' && point.category === 'mrt')).flatMap(point => {
    const distances = bins.map(bin => ({ id: bin.id, meters: distance(point, bin) })).sort((a, b) => a.meters - b.meters || compareIds(a, b));
    const nearest = distances[0]?.meters ?? null;
    if (nearest !== null && nearest < parameters.separation) { exclusions.push({ id: point.id, reason: 'minimum_separation' }); return []; }
    const key = `${point.latitude},${point.longitude}`;
    if (coordinateKeys.has(key)) { exclusions.push({ id: point.id, reason: 'duplicate_candidate_coordinate' }); return []; }
    coordinateKeys.add(key);
    return [{ point, nearestBinMeters: nearest, nearbyListedBins: distances.filter(bin => bin.meters <= parameters.radius + DISTANCE_TOLERANCE), indices: queryReferences(point, parameters.radius).filter(index => !baseline.has(index)) }];
  });
  return { parameters: { ...parameters }, candidatePool, references, counts, baseline, neighbours, exclusions, invalidBins: binsInput.filter(point => !validPoint(point)).length, invalidReferences: referencesInput.filter(point => !validPoint(point)).length };
}

export type PreparedPolicyCoverage = ReturnType<typeof preparePolicyCoverage>;

export function allocatePolicyPriority(prepared: PreparedPolicyCoverage, weightInput: PriorityWeights = { ...DEFAULT_PRIORITY_WEIGHTS }): PriorityAllocation {
  const weights = validatePriorityWeights(weightInput);
  const { parameters, references, baseline, neighbours, counts } = prepared;
  const covered = new Set(baseline);
  const selected: PriorityAllocation['selected'] = [];
  const used = new Set<string>();
  const budgetApplied = parameters.budget !== null && parameters.unitCost !== null;
  const limit = Math.min(parameters.count, budgetApplied ? Math.floor(parameters.budget! / parameters.unitCost!) : parameters.count);
  while (selected.length < limit) {
    let best: typeof neighbours[number] | undefined;
    let bestIndices: number[] = [];
    let bestScore = 0;
    for (const candidate of neighbours) {
      if (used.has(candidate.point.id)) continue;
      const indices = candidate.indices.filter(index => !covered.has(index));
      const gainCounts = emptyCounts(); indices.forEach(index => gainCounts[references[index].category]++);
      const score = POLICY_CATEGORIES.reduce((sum, category) => sum + (counts[category] ? weights[category] * gainCounts[category] / counts[category] : 0), 0);
      // Relative tolerance preserves rankings when all valid weights are rescaled.
      // Stable-ID ordering decides numerical ties, not an absolute score floor.
      const scoreTolerance = 1e-12 * Math.max(Math.abs(score), Math.abs(bestScore));
      if (score > 0 && (!best || score > bestScore + scoreTolerance)) { best = candidate; bestIndices = indices; bestScore = score; }
    }
    if (!best || bestScore <= 0) break;
    const gainCounts = emptyCounts(); bestIndices.forEach(index => gainCounts[references[index].category]++);
    selected.push({ point: best.point, nearestBinMeters: best.nearestBinMeters, nearbyListedBins: best.nearbyListedBins, newlyCoveredIds: bestIndices.map(index => references[index].id), incrementalCoverage: bestIndices.length, incrementalScore: bestScore, contributions: Object.fromEntries(POLICY_CATEGORIES.map(category => [category, { newlyCovered: gainCounts[category], denominator: counts[category], weight: weights[category], score: counts[category] ? weights[category] * gainCounts[category] / counts[category] : 0 }])) as PriorityAllocation['selected'][number]['contributions'], overlapPreviouslySelected: best.indices.filter(index => covered.has(index)).length, requiresFieldReview: true });
    bestIndices.forEach(index => covered.add(index)); used.add(best.point.id);
  }
  const categories = POLICY_CATEGORIES.map(category => {
    const baselineCovered = [...baseline].filter(index => references[index].category === category).length;
    const postCovered = [...covered].filter(index => references[index].category === category).length;
    return { category, denominator: counts[category], baselineCovered, baselineUncovered: counts[category] - baselineCovered, newlyCovered: postCovered - baselineCovered, postCovered, available: counts[category] > 0, sparse: counts[category] > 0 && counts[category] < 5, weight: weights[category], contribution: counts[category] ? weights[category] * (postCovered - baselineCovered) / counts[category] : 0 };
  });
  return { methodology: POLICY_METHOD, weightConfiguration: WEIGHT_CONFIGURATION, parameters, candidatePool: prepared.candidatePool, weights, categories, referenceCount: references.length, baselineCovered: baseline.size, baselineCoveredIds: [...baseline].map(index => references[index].id), baselineUncoveredIds: references.filter((_, index) => !baseline.has(index)).map(point => point.id), postCovered: covered.size, incrementalCoverage: covered.size - baseline.size, incrementalScore: categories.reduce((sum, category) => sum + category.contribution, 0), remainingUncovered: references.length - covered.size, selected, candidateCount: neighbours.length, exclusions: prepared.exclusions, invalidBins: prepared.invalidBins, invalidReferences: prepared.invalidReferences, illustrativeCost: parameters.unitCost === null ? null : selected.length * parameters.unitCost, budgetApplied };
}

export function analyzePolicySensitivity(prepared: PreparedPolicyCoverage, currentWeights: PriorityWeights = { ...DEFAULT_PRIORITY_WEIGHTS }) {
  const validated = validatePriorityWeights(currentWeights);
  const scenarios: Array<{ id: string; result: PriorityAllocation }> = [
    { id: 'equal', result: allocatePolicyPriority(prepared, { ...EQUAL_PRIORITY_WEIGHTS }) },
    { id: 'proposed', result: allocatePolicyPriority(prepared, { ...DEFAULT_PRIORITY_WEIGHTS }) },
    { id: 'active', result: allocatePolicyPriority(prepared, validated) },
  ];
  const skipped: Array<{ category: PriorityCategory; factor: number; reason: string }> = [];
  for (const category of POLICY_CATEGORIES.filter(category => prepared.counts[category] > 0)) {
    for (const factor of [0.75, 1.25]) {
      const value = DEFAULT_PRIORITY_WEIGHTS[category] * factor;
      if (value < WEIGHT_BOUNDS.min || value > WEIGHT_BOUNDS.max) { skipped.push({ category, factor, reason: 'outside_validated_bounds' }); continue; }
      scenarios.push({ id: `${category}:${factor}`, result: allocatePolicyPriority(prepared, { ...DEFAULT_PRIORITY_WEIGHTS, [category]: value }) });
    }
  }
  const candidateIds = [...new Set(scenarios.flatMap(scenario => scenario.result.selected.map(candidate => candidate.point.id)))].sort();
  const rankings = candidateIds.map(id => {
    const ranks = scenarios.map(scenario => ({ scenario: scenario.id, rank: scenario.result.selected.findIndex(candidate => candidate.point.id === id) + 1 || null }));
    const selectedRanks = ranks.flatMap(item => item.rank === null ? [] : [item.rank]);
    return { id, ranks, selectedScenarios: selectedRanks.length, totalScenarios: scenarios.length, bestRank: Math.min(...selectedRanks), worstSelectedRank: Math.max(...selectedRanks), omittedScenarios: scenarios.length - selectedRanks.length };
  });
  return { scenarios, rankings, skipped, unavailableCategories: POLICY_CATEGORIES.filter(category => !prepared.counts[category]), sparseCategories: POLICY_CATEGORIES.filter(category => prepared.counts[category] > 0 && prepared.counts[category] < 5) };
}
