import { validPoint, type PolicyPoint } from './binPolicyDecision';

export interface PolicySource {
  id: string; name: string; provider: string; datasetUrl: string; resourceId: string;
  resourceUpdatedAt: string; fetchedAt: string; sha256: string; encoding: string; crs: string;
  license: string; licenseUrl: string; caveat: string;
}
export interface PolicySnapshot {
  schemaVersion: number; snapshotId: string; generatedAt: string;
  sources: PolicySource[]; bins: PolicyPoint[]; references: PolicyPoint[];
  quality: { binSourceRows: number; validBins: number; referenceSourceRows: number; validReferences: number; duplicateBins: number; duplicateReferences: number; excluded: Array<{ source: string; row: number; reason: string }>; previousBinSnapshot: { records: number; sourceRowDifference: number; metadata: { generatedAt: string } } };
}
export function validatePolicySnapshot(input: unknown): PolicySnapshot {
  const data = input as PolicySnapshot;
  if (!data || data.schemaVersion !== 1 || typeof data.snapshotId !== 'string' || !Array.isArray(data.sources) || !Array.isArray(data.bins) || !Array.isArray(data.references) || !data.quality) throw new Error('Policy data unavailable or schema mismatch');
  for (const points of [data.bins, data.references]) {
    if (points.some(p => !p || !validPoint(p) || typeof p.id !== 'string' || typeof p.district !== 'string' || !data.sources.some(s => s.id === p.sourceId)) || new Set(points.map(p => p.id)).size !== points.length) throw new Error('Invalid analysis-ready coordinates or provenance');
  }
  if (data.sources.some(s => !s.resourceId || !s.resourceUpdatedAt || !s.fetchedAt || !s.sha256)) throw new Error('Missing policy source provenance');
  return data;
}
