export const SHADE_METHODOLOGY_VERSION = 'shade-equity-evidence-review-v1' as const;
export const SHADE_CONFIGURATION_VERSION = '1.0.0' as const;

export type ShadeEquitySuitability = 'verified_analysis' | 'context_only' | 'limited' | 'unavailable' | 'excluded';
export type ShadeEquityConfidence = 'high' | 'medium' | 'low';
export type ShadeEquityTier = 'A' | 'B' | 'C' | 'insufficient';
export interface ShadeEquityQuestion {
  dimension: string;
  causeId: string;
  material: boolean;
  reason: string;
  scope?: 'segment' | 'global';
}
export interface ShadeEquitySource {
  id: string;
  name: string;
  provider: string;
  datasetId: string;
  resourceId: string | null;
  url: string;
  sha256: string | null;
  suitability: ShadeEquitySuitability;
  population?: 'roadside_trees' | 'sidewalks' | 'tree_pits' | 'park_context' | 'protected_trees' | 'heat_context' | 'historical_context';
  sourceUpdatedAt?: string | null;
  retrievedAt?: string | null;
  processedAt?: string | null;
  rawCount?: number | null;
  acceptedCount?: number | null;
  duplicateCount?: number | null;
  invalidGeometryCount?: number | null;
  missingCoordinateCount?: number | null;
  crs?: string | null;
  transformation?: string | null;
  geographicCoverage?: string;
  temporalCoverage?: string;
  limitations?: string[];
}
export interface ShadeEquitySegment {
  id: string;
  district: string;
  road: string;
  lengthM: number | null;
  widthM: number | null;
  latitude: number;
  longitude: number;
  geometryValid: boolean;
  sourceVerified: boolean;
  measurementVerified: boolean;
  treeCount: number;
  pitCount: number;
  ambiguousTreeCount: number;
  ambiguousPitCount: number;
  unresolvedAssociation?: boolean;
  questions: ShadeEquityQuestion[];
  confidence: ShadeEquityConfidence;
  surveyDate: string | null;
  treeSourceId: string;
  pitSourceId: string | null;
  sidewalkSourceId: string;
}
export interface ShadeEquityInventory {
  rawTreeRows: number;
  acceptedTrees: number;
  rawSidewalkFeatures: number;
  acceptedSidewalks: number;
  rawPitFeatures: number;
  acceptedPits: number;
  matchedTrees: number;
  unmatchedTrees: number;
  ambiguousTrees: number;
  matchedPits: number;
  unmatchedPits: number;
  ambiguousPits: number;
  eligibleDensityLengthM: number | null;
}
export interface ShadeEquityDistrictSummary {
  district: string;
  sidewalkSegments: number;
  treeObservations: number;
  pitObservations: number;
  matchedTrees: number;
  matchedPits: number;
  ambiguousTrees: number;
  ambiguousPits: number;
  eligibleLengthM: number | null;
  comparable: boolean;
}
export interface ShadeEquitySnapshot {
  schemaVersion: 1;
  methodologyVersion: typeof SHADE_METHODOLOGY_VERSION;
  configurationVersion: typeof SHADE_CONFIGURATION_VERSION;
  snapshotId: string;
  generatedAt: string;
  associationToleranceM?: number;
  eligiblePopulation?: string;
  sources: ShadeEquitySource[];
  segments: ShadeEquitySegment[];
  limitations: string[];
  comparability: { eligible: boolean; reasons: string[] };
  inventory?: ShadeEquityInventory;
  districtSummary?: ShadeEquityDistrictSummary[];
  spatialQuality?: Record<string, unknown>;
  districtChunks?: Record<string, string>;
  segmentCoverage?: string;
}
export type ShadeEquityStrategy = 'evidence' | 'balanced' | 'low-recorded';
export interface ShadeEquityParameters {
  district: string;
  strategy: ShadeEquityStrategy;
  capacity: number;
  minLengthM: number;
  includeAmbiguous: boolean;
  toleranceM?: number;
}
export interface ShadeEquityCandidate {
  segment: ShadeEquitySegment;
  tier: Exclude<ShadeEquityTier, 'insufficient'>;
  independentQuestionCount: number;
  questions: ShadeEquityQuestion[];
  recordedTreesPerKm: number;
  recordedPitsPerKm: number | null;
}
export interface ShadeEquityExclusion { id: string; reasons: string[] }
export interface ShadeEquityScenario {
  methodologyVersion: typeof SHADE_METHODOLOGY_VERSION;
  configurationVersion: typeof SHADE_CONFIGURATION_VERSION;
  snapshotId: string;
  parameters: ShadeEquityParameters;
  eligible: ShadeEquityCandidate[];
  selected: ShadeEquityCandidate[];
  excluded: ShadeEquityExclusion[];
  summary: {
    eligibleCount: number;
    selectedCount: number;
    districtsRepresented: number;
    auditedLengthM: number;
    treeObservations: number;
    pitObservations: number;
    ambiguousTreeAssociations: number;
    ambiguousPitAssociations: number;
    independentQuestions: number;
  };
  limitations: string[];
}
export interface ShadeEquityComparison {
  scope: 'same_evidence_scope' | 'different_evidence_scope';
  reasons: string[];
  retainedIds: string[];
  addedIds: string[];
  removedIds: string[];
  rankChanges: { id: string; before: number; after: number }[];
  identicalSelection: boolean;
  left: ShadeEquityScenario;
  right: ShadeEquityScenario;
}
