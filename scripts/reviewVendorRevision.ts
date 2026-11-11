import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import Papa from 'papaparse';
import iconv from 'iconv-lite';
import { validatePolicySnapshot } from '../src/lib/binPolicyData';
import type { PolicyParameters } from '../src/lib/binPolicyDecision';
import { analyzePolicySensitivity, preparePolicyCoverage, validatePrioritySnapshot } from '../src/lib/policyBalancedCoverage';
import type { PolicyReference, PriorityAllocation } from '../src/lib/policyPriorityTypes';
import { parsePortalMetadata } from './binPolicyPortalMetadata';
import { districtLocator } from './convertCurrentBusStops';
import { convertMarketSources, marketCoordinate, parseMarketCsv, type MarketSourceEntry } from './policyPriorityMarketSources';

const directory = 'reports/issues-27-28-2026-11/vendor';
const rawDirectory = 'data/raw/bin-policy-priority/markets/markets-dda160fd187e17b6';
const fields = ['seqno', 'stitle', 'xbody', 'xcreatedDate', 'xstartTime', 'xendTime', 'xAddress', 'GTag_longitude', 'GTag_latitude'] as const;
const expectedDataset = 'c013d9ec-a550-46bd-ac60-45f085930706';
const expectedResource = '4874f750-b972-4c42-ad76-986960670c70';
const filename = 'vendor_concentrations.csv';
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
type Row = Record<string, string>;
type Indexed = { row: number; id: string; value: Row };
type Locate = ReturnType<typeof districtLocator>;
type SourceReceipt = {
  id: string; datasetId: string; resourceId: string; datasetUrl: string; downloadUrl: string;
  providerAsListed: string; resourceUpdatedAt: string; metadataUpdatedAt: string;
  retrievedAt: string; metadataRetrievedAt: string; metadataHttpStatus: number; metadataContentType: string;
  httpStatus: number; contentType: string; encoding: string; bytes: number; sha256: string;
  catalogueSha256: string; november9MonitorSha256: string; baselineSha256: string; approvalStatus: string;
};

function verifyCapture(receipt: SourceReceipt, bytes: Buffer, catalogue: Buffer) {
  if (receipt.id !== 'vendor_concentrations' || receipt.datasetId !== expectedDataset || receipt.resourceId !== expectedResource ||
    receipt.datasetUrl !== `https://data.taipei/dataset/detail?id=${expectedDataset}` ||
    receipt.downloadUrl !== `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${expectedResource}` ||
    receipt.httpStatus !== 200 || receipt.metadataHttpStatus !== 200 || receipt.approvalStatus !== 'review_required' ||
    !/^text\/csv;\s*charset=big-?5$/i.test(receipt.contentType) || !/^text\/html\b/i.test(receipt.metadataContentType) ||
    ![receipt.retrievedAt, receipt.metadataRetrievedAt].every(date => Number.isFinite(Date.parse(date))) ||
    bytes.length !== receipt.bytes || sha(bytes) !== receipt.sha256 || sha(catalogue) !== receipt.catalogueSha256)
    throw new Error('Official vendor capture identity, HTTP, hash or retrieval-time mismatch');
  const html = catalogue.toString('utf8');
  const metadata = parsePortalMetadata(html, expectedDataset, expectedResource);
  const publisher = html.match(/資料集提供機關\s*<\/th>\s*<td\b[^>]*>\s*([^<]+)\s*<\/td>/)?.[1].trim();
  if (!metadata.resource_present || metadata.declared_format !== 'CSV' ||
    !/^big-?5$/i.test(String(metadata.declared_encoding)) || receipt.encoding !== 'CP950' ||
    metadata.source_updated_at !== receipt.resourceUpdatedAt || metadata.metadata_updated_at !== receipt.metadataUpdatedAt ||
    metadata.download_url !== `/api/dataset/${expectedDataset}/resource/${expectedResource}/download` || publisher !== receipt.providerAsListed)
    throw new Error('Official vendor catalogue metadata mismatch');
  return { ...metadata, publisher };
}

export function readVendorCsv(bytes: Buffer, encoding: string) {
  const decoded = iconv.decode(bytes, encoding).replace(/^\uFEFF/, '');
  if (decoded.includes('\uFFFD')) throw new Error('Vendor CSV contains undecodable characters');
  const header = Papa.parse<string[]>(decoded, { preview: 1 }).data[0]?.map(field => field.trim()) ?? [];
  const missing = fields.filter(field => !header.includes(field));
  if (missing.length || new Set(header).size !== header.length) throw new Error(`Vendor CSV schema mismatch; missing: ${missing.join(', ')}`);
  return {
    header, rows: parseMarketCsv(bytes, { encoding }),
    format: { encoding, bom: iconv.decode(bytes, encoding, { stripBOM: false }).startsWith('\uFEFF'),
      crlf: (decoded.match(/\r\n/g) ?? []).length, loneLf: (decoded.match(/(?<!\r)\n/g) ?? []).length },
  };
}

const indexed = (rows: Row[]) => rows.map((value, i) => ({ row: i + 1, id: value.seqno.trim(), value }));
const group = (rows: Indexed[], key: (row: Indexed) => string | null) => {
  const groups = new Map<string, Indexed[]>();
  for (const row of rows) {
    const id = key(row);
    if (id !== null) groups.set(id, [...(groups.get(id) ?? []), row]);
  }
  return groups;
};
const duplicates = (rows: Indexed[], key: (row: Indexed) => string | null) =>
  [...group(rows, key).values()].filter(entries => entries.length > 1).map(entries => entries.map(({ row, id }) => ({ row, id })));
const coordinates = (row: Row) => [marketCoordinate(row.GTag_longitude), marketCoordinate(row.GTag_latitude)];
const rawCoordinateFields = ['GTag_longitude', 'GTag_latitude'];

/** Treat sequence numbers as version-local labels, not stable real-world identities. */
export function compareVendorRows(oldRows: Row[], newRows: Row[]) {
  const old = indexed(oldRows), revised = indexed(newRows);
  const handledOld = new Set<number>(), handledRevised = new Set<number>();
  const relationships: { evidence: string; old: Indexed[]; revised: Indexed[] }[] = [];
  const match = (evidence: string, key: (row: Indexed) => string | null) => {
    const remainingOld = group(old.filter(row => !handledOld.has(row.row)), key);
    const remainingRevised = group(revised.filter(row => !handledRevised.has(row.row)), key);
    for (const [signature, before] of remainingOld) {
      const after = remainingRevised.get(signature);
      if (!after) continue;
      relationships.push({ evidence, old: before, revised: after });
      before.forEach(({ row }) => handledOld.add(row));
      after.forEach(({ row }) => handledRevised.add(row));
    }
  };
  const content = (value: Row) => Object.entries(value).filter(([field]) => field !== 'seqno').sort(([a], [b]) => a.localeCompare(b, 'en'));
  const keyForPlace = (value: Row, identity: string | number[]) => value.stitle.trim() && value.xAddress.trim()
    ? JSON.stringify([value.stitle.trim(), value.xAddress.trim(), identity]) : null;
  match('all_non_sequence_fields_exact', ({ value }) => JSON.stringify(content(value)));
  match('same_district_full_name_and_extent', ({ value }) => value.xbody.trim() ? keyForPlace(value, value.xbody.trim()) : null);
  match('same_district_extent_and_parsed_coordinates', ({ value }) => {
    const xy = coordinates(value);
    return xy.every(Number.isFinite) ? keyForPlace(value, xy) : null;
  });
  const supportedPairs = relationships.filter(link => link.old.length === 1 && link.revised.length === 1).map(link => {
    const [before] = link.old, [after] = link.revised;
    const changedFields = [...new Set([...Object.keys(before.value), ...Object.keys(after.value)])].sort()
      .filter(field => before.value[field] !== after.value[field]).map(field => ({ field, before: before.value[field] ?? null, after: after.value[field] ?? null }));
    const oldCoordinates = coordinates(before.value), newCoordinates = coordinates(after.value);
    return { evidence: link.evidence, before, after, changedFields,
      coordinateChange: changedFields.some(change => rawCoordinateFields.includes(change.field)) ? {
        before: oldCoordinates, after: newCoordinates, parsedPositionChanged: JSON.stringify(oldCoordinates) !== JSON.stringify(newCoordinates),
      } : null };
  });
  const ambiguousGroups = relationships.filter(link => link.old.length !== 1 || link.revised.length !== 1);
  const oldOnly = old.filter(row => !handledOld.has(row.row)), revisedOnly = revised.filter(row => !handledRevised.has(row.row));
  const unresolvedCrosswalks = revisedOnly.flatMap(after => old.filter(before => before.value.stitle === after.value.stitle &&
    ((before.value.xbody.trim() && before.value.xbody.trim() === after.value.xbody.trim()) ||
     (before.value.xAddress.trim() && before.value.xAddress.trim() === after.value.xAddress.trim()) ||
     (coordinates(after.value).every(Number.isFinite) && JSON.stringify(coordinates(before.value)) === JSON.stringify(coordinates(after.value)))))
    .map(before => ({ before, after, reason: 'Shared name, extent, or point without a unique unpaired match; do not merge.' })));
  const order = supportedPairs.slice().sort((a, b) => a.before.row - b.before.row);
  const inversions = order.reduce((sum, pair, index) => sum + order.slice(index + 1).filter(other => other.after.row < pair.after.row).length, 0);
  if (old.length !== supportedPairs.length + oldOnly.length + ambiguousGroups.reduce((sum, link) => sum + link.old.length, 0) ||
    revised.length !== supportedPairs.length + revisedOnly.length + ambiguousGroups.reduce((sum, link) => sum + link.revised.length, 0)) throw new Error('Incomplete vendor row accounting');
  return {
    rawCount: { old: old.length, revised: revised.length }, supportedPairs, ambiguousGroups, oldOnly, revisedOnly, unresolvedCrosswalks,
    summary: {
      exactPairs: supportedPairs.filter(pair => !pair.changedFields.length).length,
      sequenceOnlyPairs: supportedPairs.filter(pair => pair.changedFields.length === 1 && pair.changedFields[0].field === 'seqno').length,
      sequenceChanges: supportedPairs.filter(pair => pair.before.id !== pair.after.id).length,
      substantivePairs: supportedPairs.filter(pair => pair.changedFields.some(change => change.field !== 'seqno')).length,
      changedFields: Object.fromEntries(fields.map(field => [field, supportedPairs.filter(pair => pair.changedFields.some(change => change.field === field)).length])),
      reorderedPairsInversions: inversions, shiftedRowPositions: supportedPairs.filter(pair => pair.before.row !== pair.after.row).length,
      oldOnly: oldOnly.length, revisedOnly: revisedOnly.length, ambiguousGroups: ambiguousGroups.length,
    },
    duplicateExactRows: { old: duplicates(old, row => JSON.stringify(row.value)), revised: duplicates(revised, row => JSON.stringify(row.value)) },
    duplicateSequenceIds: { old: duplicates(old, row => row.id || null), revised: duplicates(revised, row => row.id || null) },
  };
}

function spatialReview(rows: Row[], converted: Awaited<ReturnType<typeof convertMarketSources>>, locate: Locate, districts: string[]) {
  const invalid = indexed(rows).flatMap(row => {
    const [longitude, latitude] = coordinates(row.value);
    const reason = !Number.isFinite(latitude) || !Number.isFinite(longitude) ? 'invalid_official_coordinate'
      : latitude < 24.85 || latitude > 25.3 || longitude < 121.3 || longitude > 121.8 ? 'outside_taipei_envelope'
      : locate(longitude, latitude) ? null : 'outside_or_ambiguous_official_district';
    return reason ? [{ ...row, longitude, latitude, reason }] : [];
  });
  const { references, excluded } = converted;
  if (references.length + excluded.length !== rows.length) throw new Error('Incomplete spatial review row accounting');
  const collocatedIncluded = [...new Set(references.map(point => `${point.longitude},${point.latitude}`))]
    .map(key => references.filter(point => `${point.longitude},${point.latitude}` === key))
    .filter(points => points.length > 1).map(points => points.map(({ id, name, district }) => ({ id, name, district })));
  return {
    rawRows: rows.length, included: references.length, excluded: excluded.length, invalid, excludedEvidence: excluded, collocatedIncluded,
    districtCounts: Object.fromEntries(districts.map(district => [district, references.filter(point => point.district === district).length])),
    includedReferences: references.map(({ id, name, district, longitude, latitude }) => ({ id, name, district, longitude, latitude })),
  };
}

function compact(result: PriorityAllocation, detailed: boolean) {
  return { methodology: result.methodology, weightConfiguration: result.weightConfiguration,
    referenceCount: result.referenceCount, baselineCovered: result.baselineCovered, postCovered: result.postCovered,
    incrementalCoverage: result.incrementalCoverage, incrementalScore: result.incrementalScore, candidateCount: result.candidateCount,
    invalidReferences: result.invalidReferences, invalidBins: result.invalidBins, categories: result.categories,
    selected: result.selected.map((candidate, index) => ({ rank: index + 1, id: candidate.point.id,
      incrementalCoverage: candidate.incrementalCoverage, incrementalScore: candidate.incrementalScore,
      ...(detailed ? { newlyCoveredIds: candidate.newlyCoveredIds, contributions: candidate.contributions } : {}) })) };
}

const identity = ({ id, canonicalId, name, district, latitude, longitude, sourceVersion }: PolicyReference) =>
  JSON.stringify([id, canonicalId, name, district, latitude, longitude, sourceVersion]);

async function runReview() {
  const source = await json(join(directory, 'source.json')) as SourceReceipt;
  const load = async (name: string) => gunzipSync(await readFile(join(directory, `${name}.gz`)));
  const [bytes, catalogue] = await Promise.all([load(filename), load('catalogue.html')]);
  const metadata = verifyCapture(source, bytes, catalogue);
  const oldSources = await json(join(rawDirectory, 'sources.json')) as MarketSourceEntry[];
  const old = oldSources.find(entry => entry.id === source.id);
  const oldBytes = await readFile(join(rawDirectory, filename));
  if (!old || old.resourceId !== source.resourceId || old.sha256 !== source.baselineSha256 || sha(oldBytes) !== old.sha256) throw new Error('Frozen vendor baseline identity/hash mismatch');
  const oldCsv = readVendorCsv(oldBytes, old.encoding), newCsv = readVendorCsv(bytes, source.encoding);
  const schema = { old: oldCsv.header, revised: newCsv.header, added: newCsv.header.filter(field => !oldCsv.header.includes(field)),
    removed: oldCsv.header.filter(field => !newCsv.header.includes(field)), sameOrder: JSON.stringify(oldCsv.header) === JSON.stringify(newCsv.header),
    oldFormat: oldCsv.format, revisedFormat: newCsv.format };
  const reconciliation = compareVendorRows(oldCsv.rows, newCsv.rows);
  const approvedBytes = await readFile('public/data/bin-policy/analysis.json');
  const approved = validatePolicySnapshot(JSON.parse(approvedBytes.toString('utf8')));
  if (approved.snapshotId !== 'v1-14c24bcdbade') throw new Error('Vendor comparison is bound to the retained approved baseline');
  const boundary = approved.sources.find(entry => entry.id === 'districts')!;
  const bus = approved.sources.find(entry => entry.id === 'bus')!;
  const districtArchive = join('data/raw/bin-policy', approved.snapshotId, 'districts.zip');
  if (sha(await readFile(districtArchive)) !== boundary.sha256) throw new Error('Approved district geometry hash mismatch');
  const locate = districtLocator(districtArchive);
  const districts = [...new Set(approved.references.map(point => point.district))].sort();
  if (districts.length !== 12) throw new Error('Expected all twelve districts');
  const snapshotPath = 'public/data/bin-policy/priority-references-v2.json';
  const snapshotBytes = await readFile(snapshotPath);
  const snapshot = validatePrioritySnapshot(JSON.parse(snapshotBytes.toString('utf8')), approved.snapshotId, bus.sha256);
  const approvedVendor = snapshot.sources.find(entry => entry.id === source.id);
  if (snapshot.schemaVersion !== 2 || approvedVendor?.sha256 !== old.sha256 || snapshot.references.some(reference => reference.category === 'tourism'))
    throw new Error('Vendor audit requires the retained vendor bytes and five-category research snapshot');
  const original = await convertMarketSources(rawDirectory, [old], locate);
  if (JSON.stringify(original.references.map(identity).sort()) !== JSON.stringify(snapshot.references.filter(point => point.sourceId === source.id).map(identity).sort()))
    throw new Error('Reconstructed vendor baseline differs from sidecar');
  const staging = await mkdtemp(join(tmpdir(), 'taipei-vendor-revision-'));
  const temporaryFile = join(staging, filename);
  const proposed: MarketSourceEntry = { ...old, sha256: source.sha256, sourceVersion: `vendor-audit-${source.sha256.slice(0, 16)}`,
    resourceUpdatedAt: source.resourceUpdatedAt, fetchedAt: source.retrievedAt, validatedAt: new Date().toISOString(),
    approvalStatus: 'review_required', encoding: source.encoding };
  let revised: Awaited<ReturnType<typeof convertMarketSources>>;
  try {
    await writeFile(temporaryFile, bytes, { flag: 'wx' });
    revised = await convertMarketSources(staging, [proposed], locate);
  } finally {
    await unlink(temporaryFile).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(staging);
  }
  const beforeSpatial = spatialReview(oldCsv.rows, original, locate, districts), afterSpatial = spatialReview(newCsv.rows, revised, locate, districts);
  const keys = (points: PolicyReference[]) => new Set(points.map(point => JSON.stringify([point.longitude, point.latitude])));
  const oldPoints = keys(original.references), newPoints = keys(revised.references);
  const geometryChange = { oldDistinctCoordinates: oldPoints.size, revisedDistinctCoordinates: newPoints.size,
    oldOnlyCoordinates: [...oldPoints].filter(key => !newPoints.has(key)).map(key => JSON.parse(key) as number[]),
    revisedOnlyCoordinates: [...newPoints].filter(key => !oldPoints.has(key)).map(key => JSON.parse(key) as number[]) };
  const candidateRefs = [...snapshot.references.filter(point => point.sourceId !== source.id), ...revised.references];
  const comparisons = ['', ...districts].map(district => {
    const parameters: PolicyParameters = { district, radius: 300, count: 5, separation: 0, unitCost: null, budget: null };
    const oldPrepared = preparePolicyCoverage(approved.bins, snapshot.references, parameters, 'transport', 2);
    const newPrepared = preparePolicyCoverage(approved.bins, candidateRefs, parameters, 'transport', 2);
    const candidates = (prepared: typeof oldPrepared) => prepared.neighbours.map(({ point }) => identity(point));
    if (JSON.stringify(candidates(oldPrepared)) !== JSON.stringify(candidates(newPrepared))) throw new Error('Vendor-only comparison changed the candidate pool');
    const before = analyzePolicySensitivity(oldPrepared), after = analyzePolicySensitivity(newPrepared);
    const scenarioIds = [...new Set([...before.scenarios, ...after.scenarios].map(item => item.id))];
    const scenarios = scenarioIds.map(id => {
      const oldResult = before.scenarios.find(item => item.id === id)?.result, revisedResult = after.scenarios.find(item => item.id === id)?.result;
      const oldIds = oldResult?.selected.map(point => point.point.id) ?? [], newIds = revisedResult?.selected.map(point => point.point.id) ?? [];
      return { id, before: oldResult ? compact(oldResult, id === 'active') : null, after: revisedResult ? compact(revisedResult, id === 'active') : null,
        rankingChanged: JSON.stringify(oldIds) !== JSON.stringify(newIds),
        retainedIds: oldIds.filter(id => newIds.includes(id)), addedIds: newIds.filter(id => !oldIds.includes(id)), removedIds: oldIds.filter(id => !newIds.includes(id)),
        rankChanges: oldIds.filter(id => newIds.includes(id) && oldIds.indexOf(id) !== newIds.indexOf(id)).map(id => ({ id, before: oldIds.indexOf(id) + 1, after: newIds.indexOf(id) + 1 })) };
    });
    return { district: district || 'citywide', parameters, scenarios,
      sensitivity: { before: { unavailable: before.unavailableCategories, sparse: before.sparseCategories, skipped: before.skipped },
        after: { unavailable: after.unavailableCategories, sparse: after.sparseCategories, skipped: after.skipped } } };
  });
  const active = comparisons[0].scenarios.find(item => item.id === 'active')!;
  if (sha(await readFile('public/data/bin-policy/analysis.json')) !== sha(approvedBytes) || sha(await readFile(snapshotPath)) !== sha(snapshotBytes)) throw new Error('Audit changed protected inputs');
  const report = {
    decision: 'HOLD — DATA QUALITY OR PROVENANCE', approvalStatus: 'review_required', published: false,
    validationAt: proposed.validatedAt, source, officialMetadata: metadata, november9BytesReproduced: source.sha256 === source.november9MonitorSha256,
    baselineVendor: { source: old, bytes: oldBytes.length }, schema, reconciliation,
    spatial: { before: beforeSpatial, after: afterSpatial, geometryChange },
    analysis: { baseSnapshotId: approved.snapshotId, approvedSha256: sha(approvedBytes), busSourceVersion: bus.sha256, boundarySha256: boundary.sha256,
      prioritySnapshotId: snapshot.snapshotId, prioritySnapshotSha256: sha(snapshotBytes), methodology: active.before!.methodology,
      weights: active.before!.categories.map(({ category, weight }) => ({ category, weight })), weightConfiguration: active.before!.weightConfiguration,
      candidatePool: 'transport', comparisons },
    limitations: [
      'Sequence numbers do not establish cross-version business identity. Unmatched and ambiguous rows are not openings or closures.',
      'No DMS repair, alternate geocoding, or reassignment of coordinates was attempted.',
      'The adapter admits two differently named co-located Linjiang references. Eligible reference count is not distinct coordinate count.',
      'Vendor concentrations are not a validated census of operating night markets. Hours are descriptive, not intensity weights.',
      'Publication and metadata dates come from the portal; retrieval and validation are separate events. Nothing was approved or published.',
      'Ranking differences are controlled input-version sensitivity, not measured waste-service effects.',
    ],
  };
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, stage] = process.argv.slice(2);
  if ((command && !['--archive', '--write-report'].includes(command)) || (command === '--archive') !== Boolean(stage))
    throw new Error('Usage: npx tsx scripts/reviewVendorRevision.ts [--archive <isolated-stage> | --write-report]');
  if (stage) {
    const source = await json(join(directory, 'source.json')) as SourceReceipt;
    const [bytes, catalogue] = await Promise.all([readFile(join(stage, filename)), readFile(join(stage, 'catalogue.html'))]);
    const metadata = verifyCapture(source, bytes, catalogue);
    await writeFile(join(directory, `${filename}.gz`), gzipSync(bytes), { flag: 'wx' });
    await writeFile(join(directory, 'catalogue.html.gz'), gzipSync(catalogue), { flag: 'wx' });
    console.log(JSON.stringify({ sha256: source.sha256, metadata, published: false }, null, 2));
  } else {
    const report = await runReview();
    const detailed = JSON.stringify(report.analysis.comparisons);
    const summary = { ...report, analysis: { ...report.analysis,
      sensitivityArchive: { file: 'decision-sensitivity.json.gz', sha256: sha(Buffer.from(detailed)), digestOf: 'Uncompressed UTF-8 JSON bytes' },
      comparisons: report.analysis.comparisons.map(item => ({ ...item, scenarios: item.scenarios.filter(scenario => scenario.id === 'active'),
        sensitivityScenarioIds: item.scenarios.map(scenario => scenario.id), sensitivityRankingChanges: item.scenarios.filter(scenario => scenario.rankingChanged).map(scenario => scenario.id) })) } };
    const summaryPath = join(directory, 'review.json'), detailPath = join(directory, summary.analysis.sensitivityArchive.file);
    if (command === '--write-report') {
      await writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n');
      await writeFile(detailPath, gzipSync(detailed));
    } else {
      const archived = await json(summaryPath);
      if (JSON.stringify({ ...archived, validationAt: null }) !== JSON.stringify({ ...summary, validationAt: null }) ||
        gunzipSync(await readFile(detailPath)).toString('utf8') !== detailed)
        throw new Error('Vendor review replay differs from captured evidence');
    }
    const active = report.analysis.comparisons.map(item => ({ district: item.district, ...item.scenarios.find(scenario => scenario.id === 'active') }));
    console.log(JSON.stringify({ decision: report.decision, sha256: report.source.sha256, reconciliation: report.reconciliation.summary,
      spatial: [report.spatial.before, report.spatial.after].map(({ rawRows, included, excluded, districtCounts, invalid }) => ({ rawRows, included, excluded, districtCounts, invalid: invalid.map(({ id, reason }) => ({ id, reason })) })),
      citywide: active[0], changedDistrictRankings: active.slice(1).filter(item => item.rankingChanged).map(item => item.district), published: false }, null, 2));
  }
}
