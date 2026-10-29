import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import Papa from 'papaparse';
import iconv from 'iconv-lite';
import { buildPolicySnapshot } from './convertBinPolicySources';
import { policySources } from './binPolicySources';
import { parsePortalMetadata } from './binPolicyPortalMetadata';
import { unzip } from './binPolicyGis';
import { validatePolicySnapshot } from '../src/lib/binPolicyData';
import { allocateBins, METHOD, type PolicyParameters } from '../src/lib/binPolicyDecision';
import { reconcileBinRecords, reconciliationClasses, type ReconciliationInput, type ReconciliationClass } from '../src/lib/binPolicyReconciliation';

type Row = Record<string, string>;
const fields = ['行政區', '地址', '經度', '緯度', '備註'];
const auditRoot = 'reports/audit-issues-22-23-2026-10-29';
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const canonical = (row: Row) => JSON.stringify(Object.entries(row).sort(([a], [b]) => a.localeCompare(b, 'en')));
const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'));

/** This replay is deliberately confined to review evidence, never an adoption/publication tool. */
export function safeAuditDirectory(directory: string) {
  const absolute = resolve(directory), root = resolve('reports');
  if (!absolute.startsWith(root + sep)) throw new Error('Audit input/output must be below reports, outside production and approved archives');
  return absolute;
}
export function parseInventoryCsv(bytes: Buffer): Row[] {
  const result = Papa.parse<Row>(iconv.decode(bytes, 'cp950'), { header: true, skipEmptyLines: true, transformHeader: value => value.replace(/^\uFEFF/, '').trim(), transform: value => value.trim() });
  if (result.errors.length || !fields.every(field => result.meta.fields?.includes(field))) throw new Error('Inventory CSV schema drift');
  return result.data;
}
function inputs(rows: Row[], side: 'old' | 'new'): ReconciliationInput[] {
  return rows.map((row, index) => ({ id: `${side}:${index + 2}`, sourceId: `bins-${side}`, scope: 'pedestrian-bin-main', district: row['行政區'], address: row['地址'], longitude: row['經度'] ? Number(row['經度']) : NaN, latitude: row['緯度'] ? Number(row['緯度']) : NaN, raw: row }));
}
export function compareInventoryRows(oldRows: Row[], newRows: Row[]) {
  const old = inputs(oldRows, 'old'), current = inputs(newRows, 'new');
  const records = reconcileBinRecords(old, current, { nearMeters: 25, locationChangeMeters: 50 });
  const oldById = new Map(old.map(row => [row.id, row])), newById = new Map(current.map(row => [row.id, row]));
  const counts = Object.fromEntries(reconciliationClasses.map(key => [key, records.filter(record => record.classification === key).length])) as Record<ReconciliationClass, number>;
  const paired = records.filter(record => ['confirmed_match', 'probable_match', 'possible_location_change'].includes(record.classification) && record.historicalIds.length === 1 && record.currentIds.length === 1);
  const modifiedPairs = paired.flatMap(record => {
    const before = oldById.get(record.historicalIds[0])!.raw as Row, after = newById.get(record.currentIds[0])!.raw as Row;
    const changes = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().filter(field => before[field] !== after[field]).map(field => ({ field, before: before[field] ?? null, after: after[field] ?? null }));
    return changes.length ? [{ ...record, changes }] : [];
  });
  const remaining = new Map<string, number>(); for (const row of newRows) remaining.set(canonical(row), (remaining.get(canonical(row)) ?? 0) + 1);
  let exactRawOverlap = 0; for (const row of oldRows) { const key = canonical(row), count = remaining.get(key) ?? 0; if (count > 0) { exactRawOverlap++; remaining.set(key, count - 1); } }
  const coverage = (classification: ReconciliationClass) => ({ old: records.filter(record => record.classification === classification).reduce((sum, record) => sum + record.historicalIds.length, 0), new: records.filter(record => record.classification === classification).reduce((sum, record) => sum + record.currentIds.length, 0) });
  for (const [side, expected] of [['historicalIds', old.length], ['currentIds', current.length]] as const) {
    const ids = records.flatMap(record => record[side]); if (ids.length !== expected || new Set(ids).size !== expected) throw new Error('Reconciliation must account for each source row exactly once');
  }
  return { rawRows: { old: oldRows.length, new: newRows.length, difference: newRows.length - oldRows.length }, exactRawOverlap, counts, supportedMatchedPairs: paired.length, unchangedSupportedPairs: paired.length - modifiedPairs.length, modifiedPairs, rowCoverage: { missing: coverage('historical_only'), added: coverage('current_only'), invalid: coverage('invalid_source_record'), ambiguous: coverage('ambiguous'), unresolved: coverage('unresolved'), differentScope: coverage('different_scope') }, records, sourceRows: { old, current }, interpretation: 'Counts describe CSV rows or conservative relationships, not physical bin removals/additions. Exact multiset overlap is a separate raw-text accounting view; malformed and duplicate rows remain independently flagged.' };
}

function compact(result: ReturnType<typeof allocateBins>) {
  return { parameters: result.parameters, referenceCount: result.referenceCount, baselineCovered: result.baselineCovered, postCovered: result.postCovered, incrementalCoverage: result.incrementalCoverage, remainingUncovered: result.remainingUncovered, candidateCount: result.candidateCount, selected: result.selected.map((candidate, index) => ({ rank: index + 1, id: candidate.point.id, name: candidate.point.name, district: candidate.point.district, incrementalCoverage: candidate.incrementalCoverage, newlyCoveredIds: candidate.newlyCoveredIds })) };
}
/** Reads hash-locked captured bytes; never downloads or creates an approval declaration. */
export function reviewBinInventoryRevision(captureDirectory = join(auditRoot, 'bin-revision')) {
  const directory = safeAuditDirectory(captureDirectory), source = json(join(directory, 'source.json'));
  const expected = policySources.find(item => item.id === 'bins')!;
  const bytes = readFileSync(join(directory, 'bins-current.csv')), catalogue = readFileSync(join(directory, 'catalogue.html'));
  if (source.id !== expected.id || source.datasetId !== expected.datasetId || source.resourceId !== expected.resourceId || source.httpStatus !== 200 || source.approvalStatus !== 'review_required' || !Number.isFinite(Date.parse(source.fetchedAt)) || sha(bytes) !== source.sha256 || bytes.length !== source.bytes || sha(catalogue) !== source.catalogueSha256) throw new Error('Captured source identity/hash/date mismatch');
  const metadata = parsePortalMetadata(catalogue.toString('utf8'), expected.datasetId, expected.resourceId);
  if (!metadata.resource_present || metadata.declared_format !== 'CSV' || metadata.declared_encoding?.toString().toLowerCase() !== 'big5' || metadata.source_updated_at !== source.resourceUpdatedAt || metadata.metadata_updated_at !== source.metadataUpdatedAt) throw new Error('Captured official metadata mismatch');
  const historicalDirectory = join(directory, '..', 'historical', 'approved'), archive = readFileSync(join(historicalDirectory, 'artifact.zip'));
  if (sha(archive) !== 'be84b9d15ad7f3a929a6bfdd02117270d115d91727e999cdcbb4761bb2ecdf1f') throw new Error('October 26 artifact hash mismatch');
  const archivedReport = unzip(archive)['report.json']; if (!archivedReport || !archivedReport.equals(readFileSync(join(historicalDirectory, 'report.json')))) throw new Error('Historical report differs from artifact bytes');
  const historical = JSON.parse(archivedReport.toString('utf8')), historicalBins = historical.sources.find((item: { source_id: string }) => item.source_id === 'bins');
  if (historicalBins.resource_id !== expected.resourceId || historicalBins.current_hash !== source.sha256) throw new Error('Current capture does not reproduce the October 26 inventory revision');
  const approved = validatePolicySnapshot(json('public/data/bin-policy/analysis.json'));
  const approvedDirectory = resolve('data/raw/bin-policy', approved.snapshotId), approvedManifest = json(join(approvedDirectory, 'sources.json')) as Array<Record<string, unknown>>;
  const beforeHash = sha(readFileSync('public/data/bin-policy/analysis.json'));
  const oldBytes = readFileSync(join(approvedDirectory, 'bins-current.csv'));
  if (sha(oldBytes) !== historicalBins.previous_hash) throw new Error('Approved CSV differs from historical monitoring baseline');
  const oldRows = parseInventoryCsv(oldBytes), newRows = parseInventoryCsv(bytes);
  if (oldRows.length !== historicalBins.previous_record_count || newRows.length !== historicalBins.current_record_count) throw new Error('Historical row count mismatch');
  const reconciliation = compareInventoryRows(oldRows, newRows), stage = mkdtempSync(join(tmpdir(), 'bin-inventory-audit-'));
  try {
    for (const definition of policySources) copyFileSync(join(approvedDirectory, definition.filename), join(stage, definition.filename));
    const reconstructed = buildPolicySnapshot(approvedDirectory);
    if (reconstructed.snapshotId !== approved.snapshotId || JSON.stringify(reconstructed.bins) !== JSON.stringify(approved.bins) || JSON.stringify(reconstructed.references) !== JSON.stringify(approved.references)) throw new Error('Approved reconstruction differs from published inputs');
    writeFileSync(join(stage, 'bins-current.csv'), bytes);
    const revisedManifest = approvedManifest.map(item => item.id === 'bins' ? { ...item, ...source, byteLength: bytes.length, metadataVerifiedAt: source.fetchedAt } : item);
    writeFileSync(join(stage, 'sources.json'), JSON.stringify(revisedManifest));
    const proposed = validatePolicySnapshot(buildPolicySnapshot(stage));
    if (JSON.stringify(proposed.references) !== JSON.stringify(approved.references)) throw new Error('Audit may change only bin inputs, not transport references');
    const districts = [...new Set(approved.references.map(point => point.district))].sort();
    const scenarios = ['', ...districts].map(district => {
      const parameters: PolicyParameters = { district, radius: 300, count: 5, separation: 0, unitCost: null, budget: null };
      const before = compact(allocateBins(approved.bins, approved.references, parameters)), after = compact(allocateBins(proposed.bins, proposed.references, parameters));
      const oldIds = before.selected.map(candidate => candidate.id), newIds = after.selected.map(candidate => candidate.id);
      return { district: district || 'citywide', before, after, delta: { baselineCovered: after.baselineCovered - before.baselineCovered, postCovered: after.postCovered - before.postCovered, incrementalCoverage: after.incrementalCoverage - before.incrementalCoverage }, retainedIds: oldIds.filter(id => newIds.includes(id)), addedIds: newIds.filter(id => !oldIds.includes(id)), removedIds: oldIds.filter(id => !newIds.includes(id)), rankChanges: oldIds.filter(id => newIds.includes(id)).flatMap(id => oldIds.indexOf(id) === newIds.indexOf(id) ? [] : [{ id, before: oldIds.indexOf(id) + 1, after: newIds.indexOf(id) + 1 }]) };
    });
    const coverage = districts.map(district => ({ district, oldRawRows: oldRows.filter(row => row['行政區'] === district).length, newRawRows: newRows.filter(row => row['行政區'] === district).length, oldValidUniquePositions: approved.bins.filter(point => point.district === district).length, newValidUniquePositions: proposed.bins.filter(point => point.district === district).length }));
    const result = { schemaVersion: 1, validatedAt: new Date().toISOString(), approvedSnapshotId: approved.snapshotId, proposedAuditSnapshotId: proposed.snapshotId, approvalStatus: 'review_required', published: false, sourceEvidence: { oldSha256: sha(oldBytes), newSha256: source.sha256, catalogueSha256: source.catalogueSha256, resourceId: expected.resourceId, datasetId: expected.datasetId, resourceUpdatedAt: source.resourceUpdatedAt, metadataUpdatedAt: source.metadataUpdatedAt, retrievedAt: source.fetchedAt, historicalCheckedAt: historical.checked_at, exactOctober26BytesReobtained: true, encoding: metadata.declared_encoding }, validation: { oldRawRows: oldRows.length, newRawRows: newRows.length, oldValidUniqueBins: approved.bins.length, newValidUniqueBins: proposed.bins.length, oldDuplicateCoordinates: approved.quality.duplicateBins, newDuplicateCoordinates: proposed.quality.duplicateBins, oldExcludedBins: approved.quality.excluded.filter(item => item.source === 'bins'), newExcludedBins: proposed.quality.excluded.filter(item => item.source === 'bins') }, reconciliation: { ...reconciliation, sourceRows: undefined }, districtCoverageDefinition: 'Raw row columns use source district labels; valid-unique position columns use unchanged official polygon containment and coordinate deduplication. Source labels and geometry can disagree; neither column is a current physical service census.', districtCoverage: coverage, decisionImpact: { methodology: METHOD, sameReferencePopulation: true, parametersDefinition: 'Publication-review smoke parameters held constant: R300m, max5, separation0m, no costs/budget; all bins retained across district borders.', scenarios, modeB: 'Not rebased or rerun: the reviewed research sidecar is bound to the approved base snapshot. No forged rebinding or adoption approval was created.' }, limitations: ['Source rows are not physical-bin inventories; 20 fewer rows do not prove 20 removals.', 'No stable official bin identifiers exist in this CSV; correspondence uses the existing conservative reconciliation rules.', 'A raw malformed coordinate is retained as invalid rather than repaired by guesswork.', 'Decision differences are input-version sensitivity, not intervention, demand, walking access or operational effects.', 'This audit does not authorize publication or modify approved datasets.'] };
    const output = join(directory, 'analysis'); mkdirSync(output, { recursive: true });
    writeFileSync(join(output, 'review.json'), JSON.stringify(result, null, 2) + '\n');
    writeFileSync(join(output, 'record-evidence.json'), JSON.stringify(reconciliation.sourceRows, null, 2) + '\n');
    if (sha(readFileSync('public/data/bin-policy/analysis.json')) !== beforeHash) throw new Error('Approved snapshot unexpectedly changed');
    return result;
  } finally {
    const resolvedStage = resolve(stage), temporaryRoot = resolve(tmpdir()) + sep;
    if (!resolvedStage.startsWith(temporaryRoot) || !relative(tmpdir(), resolvedStage).startsWith('bin-inventory-audit-')) throw new Error('Unsafe temporary cleanup target');
    if (existsSync(resolvedStage)) rmSync(resolvedStage, { recursive: true, force: true });
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = reviewBinInventoryRevision(process.argv[2]);
  console.log(JSON.stringify({ approved: report.approvedSnapshotId, proposedAuditOnly: report.proposedAuditSnapshotId, validation: report.validation, counts: report.reconciliation.counts, exactRawOverlap: report.reconciliation.exactRawOverlap, modifiedPairs: report.reconciliation.modifiedPairs.length, citywide: report.decisionImpact.scenarios[0], districtCoverage: report.districtCoverage, published: false }));
}
