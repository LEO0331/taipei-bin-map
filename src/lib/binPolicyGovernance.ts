/** Additive governance sidecar; null dates mean unknown, never another event's date. */
export interface SourceHealth {
  source_id: string; name: string; resource_id: string; sha256: string;
  source_updated_at: string | null; retrieved_at: string | null; validated_at: string | null;
  last_checked_at: string | null; last_detected_change_at: string | null;
  validation_status: 'valid' | 'warning' | 'failed' | 'unknown';
  stale: boolean; known_limitations: string[];
}
export interface PolicyDataHealth {
  schemaVersion: 1; snapshotId: string; generatedAt: string;
  published_at: string | null; last_checked_at: string | null;
  reconciliation_status: 'available' | 'unresolved' | 'unknown'; sources: SourceHealth[];
}
