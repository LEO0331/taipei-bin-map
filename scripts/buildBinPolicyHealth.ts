import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validatePolicySnapshot } from '../src/lib/binPolicyData';
import type { PolicyDataHealth } from '../src/lib/binPolicyGovernance';
import { atomicJson, type MonitorReport } from './binPolicyGovernance';

/** Run validation now; never infer a publication event from a conversion timestamp. */
export function buildDataHealth(input: unknown, now = new Date().toISOString(), report?: MonitorReport): PolicyDataHealth {
  const snapshot = validatePolicySnapshot(input);
  const matchingReport = report?.published_snapshot_id === snapshot.snapshotId ? report : undefined;
  return {
    schemaVersion: 1, snapshotId: snapshot.snapshotId, generatedAt: now, published_at: null,
    last_checked_at: matchingReport?.checked_at ?? null, reconciliation_status: 'unresolved',
    sources: snapshot.sources.map(source => {
      const monitor = matchingReport?.sources.find(s => s.source_id === source.id);
      const timestamp = source.resourceUpdatedAt || null;
      const stale = !timestamp || (Date.parse(now) - Date.parse(timestamp)) > 365 * 86400000;
      const changed = !!monitor?.current_hash && monitor.current_hash !== source.sha256;
      const pendingRevision = changed || !!monitor?.metadata_changes.length;
      const retrievedAt = monitor?.http_status === 200 && monitor.current_hash === source.sha256 && monitor.retrieved_at ? monitor.retrieved_at : source.fetchedAt || null;
      return { source_id: source.id, name: source.name, resource_id: source.resourceId, sha256: source.sha256,
        source_updated_at: timestamp, retrieved_at: retrievedAt, validated_at: now,
        last_checked_at: monitor?.checked_at ?? null,
        last_detected_change_at: pendingRevision ? monitor!.checked_at : null,
        validation_status: pendingRevision || stale || source.id === 'bus' ? 'warning' as const : 'valid' as const, stale,
        known_limitations: [source.caveat, 'Publication event is not recorded; published_at is unknown.', ...(changed ? ['A different remote source hash awaits review; this card describes the retained published hash.'] : []), ...(monitor?.validation_status === 'failed' ? ['Latest remote check failed; local validation is a separate event.'] : []), ...(stale ? ['Source publication date is unknown or more than 365 days old; this threshold is a warning, not proof of inaccuracy.'] : [])] };
    }),
  };
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const snapshot = JSON.parse(await readFile(resolve('public/data/bin-policy/analysis.json'), 'utf8'));
  const report = process.argv[2] ? JSON.parse(await readFile(resolve(process.argv[2]), 'utf8')) as MonitorReport : undefined;
  await atomicJson(resolve('public/data/bin-policy/data-health.json'), buildDataHealth(snapshot, undefined, report));
}
