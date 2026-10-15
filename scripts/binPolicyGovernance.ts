import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { policySources } from './binPolicySources';
import { buildPolicySnapshot } from './convertBinPolicySources';

export const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export type Snapshot = ReturnType<typeof buildPolicySnapshot>;
export interface MonitorSource {
  source_id: string; resource_id: string; checked_at: string; http_status: number | null;
  previous_hash: string; current_hash: string | null; previous_record_count: number | null;
  current_record_count: number | null; content_changed: boolean;
  metadata_changes: string[]; validation_status: 'valid' | 'warning' | 'failed';
  anomalies: string[]; required_actions: string[]; source_updated_at: string | null;
  metadata_status?: 'verified' | 'unavailable'; provider_metadata_updated_at?: string | null;
  retrieved_at?: string | null;
}
export interface MonitorReport {
  schemaVersion: 1; checked_at: string; published_snapshot_id: string;
  state: 'unchanged' | 'change_detected' | 'failure'; sources: MonitorSource[];
  alert_key: string | null; limitations: string[];
}
export function rawCount(snapshot: Snapshot, id: string): number | null {
  return id === 'bins' ? snapshot.quality.binSourceRows : id === 'bus' ? snapshot.quality.referenceSourceRows : id === 'districts' ? 12 : null;
}
export function countAnomaly(previous: number | null, current: number | null) {
  return previous !== null && current !== null && (current < previous * .8 || current > previous * 1.5);
}
/** Fingerprint only actionable facts, not execution timestamps or transient error wording. */
export function alertKey(sources: MonitorSource[]) {
  const actionable = sources.filter(s => s.content_changed || s.validation_status !== 'valid' || s.metadata_changes.length);
  return actionable.length ? hash(JSON.stringify(actionable.map(s => ({ id: s.source_id, hash: s.current_hash, status: s.http_status, validation: s.validation_status, anomalies: [...s.anomalies].sort(), metadata: [...s.metadata_changes].sort() })).sort((a,b) => a.id.localeCompare(b.id)))) : null;
}
export async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  try { await writeFile(temporary, JSON.stringify(value, null, 2)); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
}
export interface SourceApproval {
  schemaVersion: 1; reviewed_by: string; reviewed_at: string; review_url: string;
  metadata_reviewed: boolean; schema_reviewed: boolean; spatial_reviewed: boolean;
  completeness_reviewed: boolean; decision_impact_reviewed: boolean;
  previous_snapshot_id: string; approved_snapshot_id: string;
  sources: Array<{ source_id: string; resource_id: string; sha256: string; source_updated_at: string | null }>;
}
export function validateApproval(approval: SourceApproval, previous: Snapshot, proposed: Snapshot) {
  if (!approval || approval.schemaVersion !== 1 || !approval.reviewed_by?.trim() || !Number.isFinite(Date.parse(approval.reviewed_at)) || !/^https:\/\/github\.com\/LEO0331\/taipei-bin-map\/(pull|issues)\/\d+$/.test(approval.review_url ?? '')) throw new Error('Missing explicit reviewer/date/repository review evidence');
  if (![approval.metadata_reviewed, approval.schema_reviewed, approval.spatial_reviewed, approval.completeness_reviewed, approval.decision_impact_reviewed].every(value => value === true)) throw new Error('Metadata, schema, spatial, completeness and decision-impact review required');
  if (approval.previous_snapshot_id !== previous.snapshotId || approval.approved_snapshot_id !== proposed.snapshotId) throw new Error('Approval snapshot mismatch');
  if (!Array.isArray(approval.sources) || approval.sources.length !== proposed.sources.length || new Set(approval.sources.map(s=>s.source_id)).size !== proposed.sources.length) throw new Error('Approval must identify every source exactly once');
  for (const source of proposed.sources) {
    const approved = approval.sources.find(s => s.source_id === source.id);
    if (!approved || approved.resource_id !== source.resourceId || approved.sha256 !== source.sha256 || approved.source_updated_at !== (source.resourceUpdatedAt ?? null)) throw new Error(`Unapproved source revision: ${source.id}`);
  }
}
export async function verifyRawIdentity(directory: string) {
  const sources = JSON.parse(await readFile(join(directory, 'sources.json'), 'utf8')) as Array<Record<string, unknown>>;
  if (!Array.isArray(sources) || sources.length !== policySources.length) throw new Error('Unexpected source registry');
  for (const expected of policySources) {
    const source = sources.find(s => s.id === expected.id);
    if (!source || source.resourceId !== expected.resourceId || source.filename !== expected.filename || !/^[a-f0-9]{64}$/.test(String(source.sha256))) throw new Error(`Source identity mismatch: ${expected.id}`);
    if (hash(await readFile(join(resolve(directory), expected.filename))) !== source.sha256) throw new Error(`Source hash mismatch: ${expected.id}`);
  }
}
