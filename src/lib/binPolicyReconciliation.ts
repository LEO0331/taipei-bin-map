import { distance, validPoint } from './binPolicyDecision';

export const reconciliationClasses = ['confirmed_match', 'probable_match', 'historical_only', 'current_only', 'possible_location_change', 'ambiguous', 'different_scope', 'invalid_source_record', 'unresolved'] as const;
export type ReconciliationClass = typeof reconciliationClasses[number];
export interface ReconciliationInput {
  id: string; sourceId: string; district: string; address: string; latitude: number; longitude: number;
  scope: string; officialId?: string; officialIdNamespace?: string; raw?: unknown;
}
export interface ReconciliationRecord {
  classification: ReconciliationClass; historicalIds: string[]; currentIds: string[];
  evidence: string[]; confidence: 'strong' | 'probable' | 'review_required'; distanceMeters?: number;
}
export interface ReconciliationSource {
  id: string; name: string; source_updated_at: string | null; retrieved_at: string | null;
  sha256: string; recordCount: number; unit: string; scope: string; [key: string]: unknown;
}
export interface ReconciliationReport {
  schemaVersion: 1; reportId: string; generatedAt: string; policySnapshotId: string;
  sources: ReconciliationSource[];
  methodology: { version: string; nearMeters: number; locationChangeMeters: number; identityRules: string[] };
  counts: Record<ReconciliationClass, number>; records: ReconciliationRecord[];
  unresolvedRecords: ReconciliationRecord[]; statisticalDefinitionDifferences: string[];
  agencyQuestions: string[]; aggregateClaims: Array<{ sourceUrl: string; publishedAt: string; groups: number; physicalBins: number; caveat: string }>;
  sourceRecords: ReconciliationInput[];
}

/** Conservative formatting normalization, not geocoding or street-name equivalence. */
export function normalizeBinAddress(value: string): string {
  return value.normalize('NFKC').replace(/臺/g, '台').replace(/[\s(),，、「」]/gu, '').toLowerCase();
}
const ordered = (records: ReconciliationInput[]) => [...records].sort((a, b) => a.id.localeCompare(b.id, 'en'));
const officialKey = (p: ReconciliationInput) => p.officialIdNamespace && p.officialId && /^[\w.-]+$/.test(p.officialId) ? `${p.officialIdNamespace}:${p.officialId}` : null;

/** Each input belongs to exactly one output relationship; unresolved edges are never assigned greedily. */
export function reconcileBinRecords(historicalInput: ReconciliationInput[], currentInput: ReconciliationInput[], options: { nearMeters?: number; locationChangeMeters?: number } = {}): ReconciliationRecord[] {
  const near = options.nearMeters ?? 25, moved = options.locationChangeMeters ?? 50;
  if (!Number.isFinite(near) || !Number.isFinite(moved) || near < 0 || moved < near) throw new Error('Invalid reconciliation thresholds');
  for (const input of [historicalInput, currentInput]) if (new Set(input.map(p => p.id)).size !== input.length) throw new Error('Duplicate reconciliation record IDs');
  const result: ReconciliationRecord[] = []; const historical = new Map<string, ReconciliationInput>(), current = new Map<string, ReconciliationInput>();
  for (const [input, target, side] of [[historicalInput, historical, 'historical'], [currentInput, current, 'current']] as const) for (const p of ordered(input)) {
    if (!p.id || !p.sourceId || !p.scope || !validPoint(p) || (p.officialId !== undefined && !officialKey(p))) {
      result.push({ classification: 'invalid_source_record', historicalIds: side === 'historical' ? [p.id] : [], currentIds: side === 'current' ? [p.id] : [], evidence: ['invalid_coordinate_or_record_identity'], confidence: 'review_required' });
    } else target.set(p.id, p);
  }
  type Edge = { a: ReconciliationInput; b: ReconciliationInput; meters: number };
  const edgesFor = (predicate: (a: ReconciliationInput, b: ReconciliationInput, meters: number) => boolean): Edge[] => {
    const edges: Edge[] = [];
    for (const a of historical.values()) for (const b of current.values()) {
      if (a.scope !== b.scope) continue;
      if (officialKey(a) && officialKey(b) && a.officialIdNamespace === b.officialIdNamespace && officialKey(a) !== officialKey(b)) continue;
      const meters = distance(a, b); if (predicate(a, b, meters)) edges.push({ a, b, meters });
    }
    return edges;
  };
  const claim = (edges: Edge[], rule: string, classify: (edge: Edge) => ReconciliationClass) => {
    const degrees = new Map<string, number>();
    for (const e of edges) { degrees.set(`h:${e.a.id}`, (degrees.get(`h:${e.a.id}`) ?? 0) + 1); degrees.set(`c:${e.b.id}`, (degrees.get(`c:${e.b.id}`) ?? 0) + 1); }
    for (const e of edges) if (degrees.get(`h:${e.a.id}`) === 1 && degrees.get(`c:${e.b.id}`) === 1) {
      const classification = classify(e);
      result.push({ classification, historicalIds: [e.a.id], currentIds: [e.b.id], distanceMeters: e.meters, evidence: [rule], confidence: classification === 'confirmed_match' ? 'strong' : classification === 'probable_match' ? 'probable' : 'review_required' });
      historical.delete(e.a.id); current.delete(e.b.id);
    }
  };
  const officialKeys = new Set([...historical.values(), ...current.values()].map(officialKey).filter((key): key is string => key !== null));
  for (const key of officialKeys) {
    const hs = [...historical.values()].filter(p => officialKey(p) === key), cs = [...current.values()].filter(p => officialKey(p) === key);
    if (hs.length > 1 || cs.length > 1) {
      result.push({ classification: 'ambiguous', historicalIds: hs.map(p => p.id), currentIds: cs.map(p => p.id), evidence: ['duplicated_verified_identifier_requires_review'], confidence: 'review_required' });
      for (const p of hs) historical.delete(p.id); for (const p of cs) current.delete(p.id);
    }
  }
  claim(edgesFor((a, b) => !!officialKey(a) && officialKey(a) === officialKey(b)), 'verified_namespaced_official_identifier', e => e.meters > moved ? 'possible_location_change' : 'confirmed_match');
  const sameAddress = (a: ReconciliationInput, b: ReconciliationInput) => !!a.district && a.district === b.district && !!normalizeBinAddress(a.address) && normalizeBinAddress(a.address) === normalizeBinAddress(b.address);
  claim(edgesFor(sameAddress), 'normalized_address_and_district', e => e.meters > moved ? 'possible_location_change' : e.meters === 0 ? 'confirmed_match' : 'probable_match');
  // Coordinates provide review leads, never proof of identity. Connected components retain one-to-many ambiguity.
  const remainingEdges = edgesFor((a, b, meters) => sameAddress(a, b) || meters <= near);
  const seenH = new Set<string>(), seenC = new Set<string>();
  for (const initial of remainingEdges) {
    if (seenH.has(initial.a.id)) continue;
    const hs = new Set([initial.a.id]), cs = new Set<string>(); let changed = true;
    while (changed) { changed = false; for (const edge of remainingEdges) if (hs.has(edge.a.id) || cs.has(edge.b.id)) { if (!hs.has(edge.a.id)) { hs.add(edge.a.id); changed = true; } if (!cs.has(edge.b.id)) { cs.add(edge.b.id); changed = true; } } }
    for (const id of hs) { seenH.add(id); historical.delete(id); } for (const id of cs) { seenC.add(id); current.delete(id); }
    result.push({ classification: 'ambiguous', historicalIds: [...hs].sort(), currentIds: [...cs].sort(), evidence: ['coordinate_or_competing_address_review_lead_only', `proximity_threshold_meters:${near}`], confidence: 'review_required' });
  }
  const historicalScopes = new Set(historicalInput.map(p => p.scope)), currentScopes = new Set(currentInput.map(p => p.scope));
  for (const [remaining, side, oppositeScopes] of [[historical, 'historical', currentScopes], [current, 'current', historicalScopes]] as const) for (const p of remaining.values()) {
    const different = !oppositeScopes.has(p.scope);
    const incomplete = !p.address.trim() || !p.district.trim();
    result.push({ classification: different ? 'different_scope' : incomplete ? 'unresolved' : side === 'historical' ? 'historical_only' : 'current_only', historicalIds: side === 'historical' ? [p.id] : [], currentIds: side === 'current' ? [p.id] : [], evidence: [different ? 'resource_scope_not_comparable' : incomplete ? 'insufficient_identity_evidence' : 'no_supported_counterpart_not_operational_removal_or_addition'], confidence: 'review_required' });
  }
  return result.sort((a, b) => JSON.stringify([a.historicalIds, a.currentIds]).localeCompare(JSON.stringify([b.historicalIds, b.currentIds]), 'en'));
}
