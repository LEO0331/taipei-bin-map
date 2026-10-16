import type { PolicyParameters, PolicyPoint } from './binPolicyDecision';

export const POLICY_CATEGORIES = ['tourism', 'night_market', 'traditional_market', 'commercial', 'mrt', 'bus'] as const;
export type PriorityCategory = typeof POLICY_CATEGORIES[number];
export type PriorityWeights = Record<PriorityCategory, number>;

/** Audited spatial-source/category bindings. Context-only directories deliberately have no binding. */
export function prioritySourceCategory(sourceId: string): PriorityCategory | null {
  if (/^taipei_travel(?:_page_[1-9]\d*)?$/.test(sourceId)) return 'tourism';
  if (sourceId === 'vendor_concentrations') return 'night_market';
  if (sourceId === 'traditional_markets') return 'traditional_market';
  if (sourceId === 'taipei_mrt_gis') return 'mrt';
  if (sourceId === 'bus') return 'bus';
  return null;
}
export interface PrioritySource {
  id: string; name: string; provider: string; datasetUrl: string; resourceId: string;
  resourceUpdatedAt: string | null; fetchedAt: string; sha256: string;
  encoding: string; crs: string; license: string; licenseUrl: string; caveat: string;
  sourceVersion?: string; validatedAt?: string; approvalStatus?: string;
}
export interface PolicyReference extends PolicyPoint {
  category: PriorityCategory; canonicalId: string; sourceVersion: string; limitations: string[];
  geometryType?: 'Point'; resourceId?: string; sourcePublishedAt?: string | null;
  retrievedAt?: string; validatedAt?: string; contentHash?: string; originalRecordId?: string;
  status?: 'included'; raw?: Record<string, unknown>;
}
export interface PrioritySnapshot {
  schemaVersion: 1; snapshotId: string; baseSnapshotId: string; busSourceVersion: string;
  approvalStatus: 'review_required'; generatedAt: string; sources: PrioritySource[];
  analysisValidatedAt?: string;
  references: PolicyReference[];
  categoryStatus: Record<PriorityCategory, { status: 'available' | 'unavailable'; reason: string }>;
  quality: { exclusions: unknown[]; [key: string]: unknown };
}
export type CandidatePool = 'bus_only' | 'transport';
export interface PriorityCategoryCoverage {
  category: PriorityCategory; denominator: number; baselineCovered: number;
  baselineUncovered: number; newlyCovered: number; postCovered: number;
  available: boolean; sparse: boolean; weight: number; contribution: number;
}
export interface PriorityCandidateEvidence {
  point: PolicyReference; nearestBinMeters: number | null; nearbyListedBins: Array<{ id: string; meters: number }>;
  newlyCoveredIds: string[]; incrementalCoverage: number; incrementalScore: number;
  contributions: Record<PriorityCategory, { newlyCovered: number; denominator: number; weight: number; score: number }>;
  overlapPreviouslySelected: number; requiresFieldReview: true;
}
export interface PriorityAllocation {
  methodology: 'policy-balanced-coverage-v1'; weightConfiguration: 'policy-priority-weights-v1';
  parameters: PolicyParameters; candidatePool: CandidatePool; weights: PriorityWeights;
  categories: PriorityCategoryCoverage[]; referenceCount: number; baselineCovered: number;
  baselineCoveredIds: string[]; baselineUncoveredIds: string[]; postCovered: number;
  incrementalCoverage: number; incrementalScore: number; remainingUncovered: number;
  selected: PriorityCandidateEvidence[]; candidateCount: number;
  exclusions: Array<{ id: string; reason: string }>; invalidBins: number; invalidReferences: number;
  illustrativeCost: number | null; budgetApplied: boolean;
}
