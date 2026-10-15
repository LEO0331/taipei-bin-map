import { calculateDistanceMeters } from '../utils/facilityUtils';

export const METHOD = 'greedy-equal-reference-coverage-v1';
export interface PolicyPoint {
  id: string; name: string; district: string; latitude: number; longitude: number;
  sourceId: string; sourceRecord: string; precision: string;
}
export interface PolicyParameters {
  district: string; radius: number; count: number; separation: number;
  unitCost: number | null; budget: number | null;
}
export interface CandidateEvidence {
  point: PolicyPoint; nearestBinMeters: number | null; newlyCoveredIds: string[];
  overlapPreviouslySelected: number; incrementalCoverage: number;
}
export const distance = (a: Pick<PolicyPoint, 'latitude' | 'longitude'>, b: Pick<PolicyPoint, 'latitude' | 'longitude'>) => calculateDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude);
export function validPoint(point: { latitude: unknown; longitude: unknown }) {
  return typeof point.latitude === 'number' && typeof point.longitude === 'number' && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && point.latitude >= 24.85 && point.latitude <= 25.3 && point.longitude >= 121.3 && point.longitude <= 121.8;
}
export function allocateBins(binsInput: PolicyPoint[], referencesInput: PolicyPoint[], parameters: PolicyParameters) {
  if (!Number.isFinite(parameters.radius) || parameters.radius <= 0 || !Number.isInteger(parameters.count) || parameters.count < 0 || parameters.count > 50 || !Number.isFinite(parameters.separation) || parameters.separation < 0 || (parameters.unitCost !== null && (!Number.isFinite(parameters.unitCost) || parameters.unitCost <= 0)) || (parameters.budget !== null && (!Number.isFinite(parameters.budget) || parameters.budget < 0))) throw new Error('Invalid scenario parameters');
  // Keep bins across district edges: an adjacent district's listed bin can cover a reference.
  const bins = binsInput.filter(validPoint);
  const references = referencesInput.filter(validPoint).filter(p => !parameters.district || p.district === parameters.district).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const nearest = (point: PolicyPoint) => bins.length ? Math.min(...bins.map(bin => distance(point, bin))) : null;
  const within = (a: PolicyPoint, b: PolicyPoint) => distance(a, b) <= parameters.radius + 1e-7;
  const baseline = new Set(references.filter(point => bins.some(bin => within(point, bin))).map(p => p.id));
  const uncovered = references.filter(p => !baseline.has(p.id));
  const covered = new Set(baseline);
  const newlyCovered = new Set<string>();
  const candidateCoordinates = new Set<string>();
  const exclusions: Array<{ id: string; reason: string }> = [];
  const candidates = uncovered.filter(point => {
    const meters = nearest(point);
    if (meters !== null && meters < parameters.separation) { exclusions.push({ id: point.id, reason: 'minimum_separation' }); return false; }
    const key = `${point.latitude.toFixed(7)},${point.longitude.toFixed(7)}`;
    if (candidateCoordinates.has(key)) { exclusions.push({ id: point.id, reason: 'duplicate_candidate_coordinate' }); return false; }
    candidateCoordinates.add(key); return true;
  });
  const budgetLimit = parameters.budget !== null && parameters.unitCost !== null ? Math.floor(parameters.budget / parameters.unitCost) : parameters.count;
  const limit = Math.min(parameters.count, budgetLimit);
  // Neighbour sets are computed once per scenario; selection only subtracts covered IDs.
  const neighbours = candidates.map(point => ({ point, ids: uncovered.filter(ref => within(point, ref)).map(ref => ref.id) }));
  const selected: CandidateEvidence[] = [];
  const used = new Set<string>();
  while (selected.length < limit) {
    let best: typeof neighbours[number] | undefined;
    let gain: string[] = [];
    for (const candidate of neighbours) {
      if (used.has(candidate.point.id)) continue;
      const next = candidate.ids.filter(id => !covered.has(id));
      if (next.length > gain.length) { best = candidate; gain = next; }
    }
    if (!best || !gain.length) break;
    const overlapPreviouslySelected = best.ids.filter(id => newlyCovered.has(id)).length;
    selected.push({ point: best.point, nearestBinMeters: nearest(best.point), newlyCoveredIds: gain, incrementalCoverage: gain.length, overlapPreviouslySelected });
    used.add(best.point.id);
    gain.forEach(id => { covered.add(id); newlyCovered.add(id); });
  }
  return { methodology: METHOD, parameters, referenceCount: references.length, baselineCovered: baseline.size, baselineCoveredIds: [...baseline], baselineUncoveredIds: uncovered.map(p => p.id), postCovered: covered.size, incrementalCoverage: covered.size - baseline.size, remainingUncovered: references.length - covered.size, selected, candidateCount: candidates.length, exclusions, invalidBins: binsInput.filter(p => !validPoint(p)).length, invalidReferences: referencesInput.filter(p => !validPoint(p)).length, illustrativeCost: parameters.unitCost === null ? null : selected.length * parameters.unitCost, budgetApplied: parameters.budget !== null && parameters.unitCost !== null };
}
