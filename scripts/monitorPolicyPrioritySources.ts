import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { alertKey, atomicJson, hash, type MonitorReport, type MonitorSource, type Snapshot } from './binPolicyGovernance';
import { isRetiredTravelSource, RETIRED_TRAVEL_SOURCE, validateCurrentPriorityManifest, type PriorityRawManifest } from './policyPrioritySources';
import { priorityMethod, validatePrioritySnapshot } from '../src/lib/policyBalancedCoverage';
import { priorityWeightConfiguration } from '../src/lib/policyPriorityWeights';

type PriorityMonitorSource = MonitorSource & { availability: 'available' | 'recovery_requires_review' | 'unexpected_failure' };
type PriorityMonitorReport = Omit<MonitorReport, 'state' | 'sources'> & {
  state: MonitorReport['state'] | 'warning'; sources: PriorityMonitorSource[];
  research_snapshot_id: string; source_manifest_sha256: string; reference_snapshot_sha256: string;
  methodology_version: string; weight_configuration_version: string; publication_status: 'review_required';
  retired_sources: string[];
};

export function priorityMonitorExitCode(report: Pick<PriorityMonitorReport, 'state'>): 0 | 1 {
  return report.state === 'failure' ? 1 : 0;
}

export function containedSourceFile(directory: string, filename: string) {
  const path = resolve(directory, filename); const relation = relative(resolve(directory), path);
  if (!filename || isAbsolute(filename) || !relation || relation === '..' || relation.startsWith('../') || relation.startsWith('..\\') || isAbsolute(relation)) throw new Error('Invalid contained raw source path');
  return path;
}

/** Frozen provenance is checked independently of remote availability; neither check publishes data. */
export async function verifyFrozenPriority(directory: string, snapshotFile: string, previous: Snapshot) {
  const manifestBytes = await readFile(join(directory, 'sources.json'));
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as PriorityRawManifest;
  if (![1, 2].includes(manifest.schemaVersion) || !manifest.snapshotId || !Array.isArray(manifest.sources) || !manifest.sources.length || new Set(manifest.sources.map(source => source.id)).size !== manifest.sources.length) throw new Error('Invalid research manifest schema');
  if (manifest.schemaVersion === 2) validateCurrentPriorityManifest(manifest);
  const snapshotBytes = await readFile(snapshotFile);
  const bus = previous.sources.find(source => source.id === 'bus');
  if (!bus) throw new Error('Approved bus baseline missing');
  const snapshot = validatePrioritySnapshot(JSON.parse(snapshotBytes.toString('utf8')), previous.snapshotId, bus.sha256);
  if (snapshot.snapshotId !== manifest.snapshotId || snapshot.schemaVersion !== manifest.schemaVersion || (manifest.schemaVersion === 2 && snapshot.generatedAt !== manifest.generatedAt)) throw new Error('Research snapshot identity/version mismatch');
  for (const source of manifest.sources) {
    if (!source.id || !source.resourceId || !/^https:\/\//.test(source.downloadUrl) || !/^[a-f0-9]{64}$/.test(source.sha256) || !source.sourceVersion?.trim() || !Number.isFinite(Date.parse(source.fetchedAt)) || !source.validatedAt || !Number.isFinite(Date.parse(source.validatedAt)) || (source.resourceUpdatedAt !== null && !Number.isFinite(Date.parse(source.resourceUpdatedAt))) || !['available', 'blocked'].includes(source.acquisitionStatus) || !['review_required', 'context_only'].includes(source.approvalStatus ?? '')) throw new Error(`Invalid research identity or provenance dates/status: ${source.id}`);
    if (hash(await readFile(containedSourceFile(directory, source.filename))) !== source.sha256) throw new Error(`Frozen source hash mismatch: ${source.id}`);
    const converted = snapshot.sources.find(item => item.id === source.id);
    if (!converted || converted.resourceId !== source.resourceId || converted.sha256 !== source.sha256 || converted.resourceUpdatedAt !== source.resourceUpdatedAt || converted.fetchedAt !== source.fetchedAt || converted.validatedAt !== source.validatedAt || converted.sourceVersion !== source.sourceVersion || converted.approvalStatus !== source.approvalStatus) throw new Error(`Converted source identity/date/status mismatch: ${source.id}`);
    if (manifest.schemaVersion === 2 && Object.entries(source).some(([key, value]) => (converted as unknown as Record<string, unknown>)[key] !== value)) throw new Error(`Current converted source metadata mismatch: ${source.id}`);
  }
  for (const source of snapshot.sources) {
    if (manifest.sources.some(item => item.id === source.id)) continue;
    const approved = previous.sources.find(item => item.id === source.id);
    if (!approved || source.resourceId !== approved.resourceId || source.sha256 !== approved.sha256 || source.resourceUpdatedAt !== (approved.resourceUpdatedAt ?? null)) throw new Error(`Unbound source identity: ${source.id}`);
  }
  return { snapshot, manifest, snapshotSha256: hash(snapshotBytes), manifestSha256: hash(manifestBytes) };
}

export async function monitorPrioritySources(directory: string, snapshotFile: string, options: { previous?: Snapshot; fetcher?: typeof fetch; now?: string; timeoutMs?: number } = {}) {
  const previous = options.previous ?? JSON.parse(await readFile('public/data/bin-policy/analysis.json', 'utf8')) as Snapshot;
  const checkedAt = options.now ?? new Date().toISOString();
  const frozen = await verifyFrozenPriority(directory, snapshotFile, previous);
  const entries: PriorityMonitorSource[] = [];
  for (const source of frozen.manifest.sources.filter(item => !isRetiredTravelSource(item))) {
    const entry: PriorityMonitorSource = { source_id: source.id, resource_id: source.resourceId, checked_at: checkedAt, http_status: null, previous_hash: source.sha256, current_hash: null, previous_record_count: null, current_record_count: null, content_changed: false, metadata_changes: [], validation_status: 'valid', anomalies: [], required_actions: [], source_updated_at: source.resourceUpdatedAt, metadata_status: 'unavailable', availability: 'available' };
    entries.push(entry);
    if (source.acquisitionStatus === 'blocked') entry.anomalies.push('frozen_source_acquisition_blocked');
    try {
      const response = await (options.fetcher ?? fetch)(source.downloadUrl, { signal: AbortSignal.timeout(options.timeoutMs ?? 20000), redirect: 'error' });
      entry.http_status = response.status;
      if (!response.ok) throw new Error('http_failure');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 20_000_000) throw new Error('unexpected_resource_size');
      entry.current_hash = hash(bytes); entry.retrieved_at = options.now ?? new Date().toISOString();
      entry.content_changed = entry.current_hash !== source.sha256;
      // Changed bytes remain unvalidated and never overwrite frozen sources or source dates.
      if (entry.content_changed) { entry.validation_status = 'warning'; entry.anomalies.push('changed_content_requires_adapter_schema_and_geometry_review'); }
      if (source.acquisitionStatus === 'blocked') {
        entry.availability = 'recovery_requires_review'; entry.validation_status = 'warning';
        entry.anomalies.push('recovered_source_requires_review_before_use');
      }
    } catch (error) {
      entry.validation_status = 'failed';
      entry.availability = 'unexpected_failure';
      entry.anomalies.push(error instanceof Error && ['http_failure', 'unexpected_resource_size'].includes(error.message) ? error.message : 'retrieval_failure');
    }
    if (!source.resourceUpdatedAt) entry.anomalies.push('official_publication_date_unknown');
    else if (Date.parse(checkedAt) - Date.parse(source.resourceUpdatedAt) > 365 * 86400000) entry.anomalies.push('source_older_than_365_days');
    if (entry.validation_status === 'valid' && entry.anomalies.length) entry.validation_status = 'warning';
    if (entry.validation_status !== 'valid' || entry.content_changed) entry.required_actions.push('Retain approved v1.1 baseline; independently review source identity, portal publication dates, adapter schema/geometry, exclusions and decision impact.');
  }
  const report: PriorityMonitorReport = {
    schemaVersion: 1, checked_at: checkedAt, published_snapshot_id: previous.snapshotId, state: entries.some(entry => entry.validation_status === 'failed') ? 'failure' : entries.some(entry => entry.content_changed) ? 'change_detected' : entries.some(entry => entry.validation_status === 'warning') ? 'warning' : 'unchanged', sources: entries, alert_key: alertKey(entries),
    research_snapshot_id: frozen.snapshot.snapshotId, source_manifest_sha256: frozen.manifestSha256, reference_snapshot_sha256: frozen.snapshotSha256,
    methodology_version: priorityMethod(frozen.snapshot.schemaVersion),
    weight_configuration_version: priorityWeightConfiguration(frozen.snapshot.schemaVersion), publication_status: 'review_required',
    retired_sources: [RETIRED_TRAVEL_SOURCE],
    limitations: ['Research-source checks only; no approved analysis or archives were modified.', 'Taipei Travel is intentionally retired from active monitoring; its historical evidence is retained. This does not imply zero tourism demand. Failures from active sources still fail the monitor.', 'Source, retrieval and validation dates remain distinct. HTTP headers and check dates are not publication dates.', 'Remote portal metadata is not revalidated by this byte monitor; frozen audited resource identity/dates are retained and require separate review on any source revision.', 'Blocked or unavailable categories remain unavailable, not zero demand. Changed bytes are not schema-approved.', 'Method, weights and source revisions are independent dimensions; successful ETL is not adoption approval.'],
  };
  return report;
}
export function priorityMonitorSummary(report: Awaited<ReturnType<typeof monitorPrioritySources>>) {
  return `# Policy priority research-source monitor: ${report.state}\n\nApproved fallback: ${report.published_snapshot_id}\nResearch snapshot: ${report.research_snapshot_id}\nMethod: ${report.methodology_version}\nWeights: ${report.weight_configuration_version}\n\n| Source | HTTP | Availability | Changed | Validation |\n|---|---|---|---|---|\n${report.sources.map(source => `| ${source.source_id} | ${source.http_status ?? 'unknown'} | ${source.availability} | ${source.content_changed} | ${source.validation_status}: ${source.anomalies.join(', ')} |`).join('\n')}\n\n${report.limitations.map(text => `- ${text}`).join('\n')}\n`;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [directory, snapshotFile = 'public/data/bin-policy/priority-references-v2.json', output = 'test-results/policy-priority-monitor'] = process.argv.slice(2);
  if (!directory) throw new Error('Usage: monitorPolicyPrioritySources.ts <frozen-raw-directory> [reference-snapshot.json] [report-directory]');
  const report = await monitorPrioritySources(directory, snapshotFile);
  await atomicJson(join(output, 'report.json'), report); await writeFile(join(output, 'summary.md'), priorityMonitorSummary(report));
  console.log(JSON.stringify({ state: report.state, alert_key: report.alert_key, published: false }));
  process.exitCode = priorityMonitorExitCode(report);
}
