import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { policySources } from './binPolicySources';
import { buildPolicySnapshot } from './convertBinPolicySources';
import { alertKey, atomicJson, countAnomaly, hash, rawCount, type MonitorReport, type MonitorSource, type Snapshot } from './binPolicyGovernance';
import { parsePortalMetadata } from './binPolicyPortalMetadata';
import Papa from 'papaparse';
import iconv from 'iconv-lite';
import { validPoint } from '../src/lib/binPolicyDecision';

export async function monitorSources(previous: Snapshot, options: { fetcher?: typeof fetch; metadataFetcher?: typeof fetch; supplementary?: boolean; timeoutMs?: number; now?: string } = {}): Promise<MonitorReport> {
  const now = options.now ?? new Date().toISOString();
  const stage = await mkdtemp(join(tmpdir(), 'taipei-policy-monitor-'));
  const entries: MonitorSource[] = [];
  const manifests: unknown[] = [];
  try {
    const supplemental = (options.supplementary ?? !options.fetcher) ? JSON.parse(await readFile(resolve('data/raw/bin-policy-reconciliation/tourist-commercial.source.json'), 'utf8')) : null;
    const monitored = [...policySources, ...(supplemental ? [{ ...policySources[0], ...supplemental, datasetId: policySources[0].datasetId, filename: 'tourist-commercial.csv', resourceUpdatedAt: supplemental.source_updated_at, metadataUpdatedAt: null }] : [])];
    for (const source of monitored) {
      const prior = previous.sources.find(s => s.id === source.id) ?? (source.id === supplemental?.id ? { ...supplemental, resourceUpdatedAt: supplemental.source_updated_at } : undefined);
      const entry: MonitorSource = { source_id: source.id, resource_id: source.resourceId, checked_at: now, http_status: null, previous_hash: prior?.sha256 ?? '', current_hash: null, previous_record_count: rawCount(previous, source.id), current_record_count: null, content_changed: false, metadata_changes: [], validation_status: 'valid', anomalies: [], required_actions: [], source_updated_at: source.resourceUpdatedAt || null };
      entries.push(entry);
      if (source.id === supplemental?.id) entry.previous_record_count = 130;
      try {
        const retrieveMetadata = options.metadataFetcher ?? (options.fetcher ? undefined : fetch);
        if (!retrieveMetadata) throw new Error('Metadata retrieval not supplied');
        const response = await retrieveMetadata(source.datasetUrl, { signal: AbortSignal.timeout(options.timeoutMs ?? 60000) });
        if (!response.ok) throw new Error('Metadata HTTP failure');
        const metadata = parsePortalMetadata(await response.text(), source.datasetId, source.resourceId);
        entry.metadata_status = 'verified';
        entry.provider_metadata_updated_at = metadata.metadata_updated_at;
        entry.source_updated_at = metadata.source_updated_at;
        if (!metadata.resource_present) { entry.metadata_changes.push('resource_identity_missing_from_official_dataset'); entry.anomalies.push('resource_identity_unverified'); }
        if (metadata.source_updated_at !== (prior?.resourceUpdatedAt ?? null)) entry.metadata_changes.push('provider_source_timestamp_changed');
        const oldMetadata = prior && 'metadataUpdatedAt' in prior ? String(prior.metadataUpdatedAt) : null;
        if (oldMetadata && metadata.metadata_updated_at !== oldMetadata) entry.metadata_changes.push('provider_metadata_timestamp_changed');
        if (!oldMetadata) entry.anomalies.push('provider_metadata_baseline_unknown');
        if (!metadata.source_updated_at) entry.anomalies.push('missing_source_timestamp');
        else if (Date.parse(now)-Date.parse(metadata.source_updated_at)>365*86400000) entry.anomalies.push('source_older_than_365_days');
      } catch {
        entry.metadata_status = 'unavailable'; entry.source_updated_at = null;
        entry.anomalies.push('provider_metadata_unavailable');
        entry.required_actions.push('Verify resource identity and source timestamps on the official portal; metadata freshness is unknown.');
      }
      try {
        const response = await (options.fetcher ?? fetch)(source.downloadUrl, { signal: AbortSignal.timeout(options.timeoutMs ?? 60000) });
        entry.http_status = response.status;
        if (!response.ok) throw new Error('http_failure');
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length < 100 || bytes.length > 20_000_000) throw new Error('unexpected_resource_size');
        entry.current_hash = hash(bytes);
        entry.retrieved_at = options.now ?? new Date().toISOString();
        entry.content_changed = entry.current_hash !== entry.previous_hash;
        if (prior?.resourceId !== source.resourceId) entry.metadata_changes.push('resource_identity_changed');
        if (prior?.resourceUpdatedAt !== source.resourceUpdatedAt) entry.metadata_changes.push('audited_source_timestamp_changed');
        if (!source.resourceUpdatedAt && !entry.anomalies.includes('missing_source_timestamp')) entry.anomalies.push('missing_source_timestamp');
        // HTTP Last-Modified is transport metadata, not an official publication date.
        const modified = response.headers.get('last-modified');
        if (modified !== (prior?.httpLastModified ?? null)) entry.metadata_changes.push('http_last_modified_changed');
        await writeFile(join(stage, source.filename), bytes);
        if (source.id === supplemental?.id) {
          const parsed = Papa.parse<Record<string,string>>(iconv.decode(bytes,'cp950'), { header: true, skipEmptyLines: true, transformHeader: header=>header.replace(/^\uFEFF/,'').trim() });
          if (parsed.errors.length || !['行政區','地址','經度','緯度','備註'].every(field=>parsed.meta.fields?.includes(field))) throw new Error('Supplementary CSV schema invalid');
          entry.current_record_count = parsed.data.length;
          if (countAnomaly(130, parsed.data.length)) { entry.validation_status='failed'; entry.anomalies.push('unexpected_record_count'); }
          if (parsed.data.some(row=>!validPoint({latitude:Number(row['緯度']),longitude:Number(row['經度'])}))) entry.anomalies.push('supplementary_invalid_coordinates');
        } else manifests.push({ ...source, sha256: entry.current_hash, fetchedAt: now, httpLastModified: modified });
      } catch (error) {
        entry.validation_status = 'failed';
        const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
        entry.anomalies.push(['TimeoutError','AbortError'].includes(errorName) ? 'timeout' : error instanceof Error && ['http_failure','unexpected_resource_size'].includes(error.message) ? error.message : 'retrieval_failure');
        entry.required_actions.push('Inspect source availability; retain the published snapshot.');
      }
    }
    if (entries.every(entry => entry.validation_status !== 'failed')) {
      await writeFile(join(stage, 'sources.json'), JSON.stringify(manifests));
      try {
        const candidate = buildPolicySnapshot(stage);
        for (const entry of entries) {
          if (entry.source_id === supplemental?.id) continue;
          entry.current_record_count = rawCount(candidate, entry.source_id);
          if (countAnomaly(entry.previous_record_count, entry.current_record_count)) entry.anomalies.push('unexpected_record_count');
          if (candidate.quality.excluded.some(item => item.source === entry.source_id)) entry.anomalies.push('excluded_invalid_or_outside_records');
        }
      } catch {
        for (const entry of entries) { entry.validation_status = 'failed'; entry.anomalies.push('schema_spatial_or_completeness_validation_failed'); entry.required_actions.push('Audit downloaded schemas, geometry and completeness before proposing publication.'); }
      }
    }
    for (const entry of entries) {
      if (entry.validation_status === 'valid' && entry.anomalies.length) entry.validation_status = 'warning';
      if (entry.content_changed || entry.metadata_changes.length) entry.required_actions.push('Review exact hashes, resource identity, source dates, reconciliation and decision impact in a publication PR.');
    }
    const state = entries.some(s => s.validation_status === 'failed') ? 'failure' : entries.some(s => s.content_changed || s.metadata_changes.length) ? 'change_detected' : 'unchanged';
    return { schemaVersion: 1, checked_at: now, published_snapshot_id: previous.snapshotId, state, sources: entries, alert_key: alertKey(entries), limitations: ['Provider resource identity and timestamps are parsed from the official portal SSR JSON. Unavailable or changed page structure becomes a warning, not fabricated metadata.', 'HTTP Last-Modified changes are reported separately and never become source publication dates.', 'Three approved policy-analysis sources and the separately scoped tourist/commercial reconciliation resource are monitored. Proposed modern bus adapters are excluded until adoption approval.', 'Validation warnings do not update published data. Record-count thresholds flag <80% or >150% of the published raw count; coordinate exclusions remain visible.'] };
  } finally { await rm(stage, { recursive: true, force: true }); }
}
export function monitorSummary(report: MonitorReport) {
  return `# Bin policy source monitor: ${report.state}\n\nChecked: ${report.checked_at}; published snapshot: ${report.published_snapshot_id}\n\n| Source | HTTP | Content changed | Rows (previous → current) | Validation |\n|---|---|---|---|---|\n${report.sources.map(s=>`| ${s.source_id} | ${s.http_status ?? 'unknown'} | ${s.content_changed} | ${s.previous_record_count ?? 'unknown'} → ${s.current_record_count ?? 'unknown'} | ${s.validation_status}: ${s.anomalies.join(', ')} |`).join('\n')}\n\n${report.limitations.map(l=>`- ${l}`).join('\n')}\n\nNo production snapshot was modified. Changes require explicit review and a separate publication PR.\n`;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const previous = JSON.parse(await readFile(resolve('public/data/bin-policy/analysis.json'), 'utf8')) as Snapshot;
  const report = await monitorSources(previous);
  const output = resolve(process.argv[2] ?? 'test-results/bin-policy-monitor');
  await atomicJson(join(output, 'report.json'), report);
  await writeFile(join(output, 'summary.md'), monitorSummary(report));
  console.log(JSON.stringify({ state: report.state, alert_key: report.alert_key, report: join(output, 'report.json') }));
  if (report.state === 'failure') process.exitCode = 1;
}
