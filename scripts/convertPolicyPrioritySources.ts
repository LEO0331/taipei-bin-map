import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hash } from './binPolicyGovernance';
import { normalizeXY } from './binPolicyGis';
import { districtLocator } from './convertCurrentBusStops';
import { convertMarketSources, type MarketSourceEntry } from './policyPriorityMarketSources';
import { type PriorityRawManifest, type PrioritySourceArchive } from './policyPrioritySources';
import { validatePolicySnapshot, type PolicySnapshot } from '../src/lib/binPolicyData';
import { validPoint } from '../src/lib/binPolicyDecision';
import { type PolicyReference, type PrioritySnapshot } from '../src/lib/policyPriorityTypes';
import { validatePrioritySnapshot } from '../src/lib/policyBalancedCoverage';

type Locate = (longitude: number, latitude: number) => string | null;
function coordinate(x: number, y: number) {
  try { return normalizeXY(x, y); } catch { return null; }
}
export function boundRawPath(directory: string, filename: string) {
  const root = resolve(directory), target = resolve(root, filename), rel = relative(root, target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Raw source path escapes version directory');
  return target;
}
function reference(source: PrioritySourceArchive, raw: Record<string, unknown>, originalRecordId: string,
  name: string, district: string, longitude: number, latitude: number, category: PolicyReference['category'], canonicalId: string): PolicyReference {
  return { id: `${source.id}:${originalRecordId}`, canonicalId, category, sourceVersion: source.sha256,
    sourceId: source.id, sourceRecord: originalRecordId, originalRecordId, name, district, longitude, latitude,
    geometryType: 'Point', precision: category === 'mrt' ? 'official station-centre point; EPSG:3826 transformed to WGS84; not entrance' : 'official attraction reference; not sidewalk installation location',
    resourceId: source.resourceId, sourcePublishedAt: source.resourceUpdatedAt, retrievedAt: source.fetchedAt,
    validatedAt: source.validatedAt ?? source.fetchedAt, contentHash: source.sha256, status: 'included',
    limitations: [source.caveat, 'Requires field verification; not an approved bin installation site.'], raw };
}

// Explicitly audited source-ID pairs: same named interchange and same intersection in official LOC.
// Not a proximity merge: independent nearby stations always retain independent identity.
const MRT_INTERCHANGES: Record<string, { primary: string; name: string }> = {
  '109': { primary: '17', name: '中山站' }, '103': { primary: '68', name: '南京復興站' }, '104': { primary: '91', name: '松江南京站' },
};
export function normalizeMrt(input: unknown, source: PrioritySourceArchive, locate: Locate) {
  const payload = input as { type?: string; crs?: { properties?: { name?: string } }; features?: Array<{ id: unknown; geometry: { type: string; coordinates: unknown[] }; properties: Record<string, unknown> }> };
  if (payload?.type !== 'FeatureCollection' || payload.crs?.properties?.name !== 'EPSG:3826' || !Array.isArray(payload.features)) throw new Error('MRT CRS or feature schema drift');
  const references: PolicyReference[] = [], excluded: unknown[] = [], ids = new Set<string>();
  const features = [...payload.features].sort((a, b) => Number(a.id) - Number(b.id));
  for (const feature of features) {
    const raw = feature as unknown as Record<string, unknown>, id = String(feature.id), name = feature.properties?.NAME;
    if (!Number.isInteger(feature.id) || feature.properties?.['FID CODE'] !== feature.id || typeof name !== 'string' || !name.trim() || ids.has(id)) throw new Error('MRT station identity/schema drift');
    ids.add(id);
    const xy = feature.geometry?.coordinates;
    if (feature.geometry?.type !== 'Point' || !Array.isArray(xy) || xy.length !== 2 || !xy.every(Number.isFinite)) { excluded.push({ source: source.id, id, reason: 'invalid_geometry', raw }); continue; }
    if (Number(xy[0]) < 250000 || Number(xy[0]) > 340000 || Number(xy[1]) < 2700000 || Number(xy[1]) > 2820000) {
      excluded.push({ source: source.id, id, reason: 'coordinate_inconsistent_with_declared_epsg3826', raw }); continue;
    }
    const point = coordinate(Number(xy[0]), Number(xy[1]));
    const district = point ? locate(point.longitude, point.latitude) : null;
    if (!point || !district) { excluded.push({ source: source.id, id, reason: 'outside_or_ambiguous_taipei_district', raw }); continue; }
    const alias = MRT_INTERCHANGES[id];
    if (alias) {
      const primary = references.find(row => row.originalRecordId === alias.primary && row.name === alias.name);
      if (!primary || name !== alias.name) throw new Error('Reviewed MRT interchange alias identity changed');
      excluded.push({ source: source.id, id, reason: 'reviewed_interchange_alias', canonicalId: primary.canonicalId, raw });
      primary.raw = { ...primary.raw, officialAliases: [...(primary.raw?.officialAliases as unknown[] ?? []), raw] };
      continue;
    }
    references.push(reference(source, raw, id, name.trim(), district, point.longitude, point.latitude, 'mrt', `taipei-mrt:${id}`));
  }
  return { references, excluded, sourceRows: features.length };
}

export function normalizeAttractions(pages: unknown[], sources: PrioritySourceArchive[], locate: Locate) {
  const references: PolicyReference[] = [], excluded: unknown[] = [], ids = new Set<string>(); let total: number | null = null, count = 0;
  pages.forEach((input, index) => {
    const page = input as { Total: number; data: Array<Record<string, unknown>> };
    if (!page || !Number.isInteger(page.Total) || page.Total < 0 || !Array.isArray(page.data) || !sources[index]) throw new Error('Attraction page schema drift');
    if (total !== null && total !== page.Total) throw new Error('Attraction pagination population mismatch'); total = page.Total;
    for (const raw of page.data) {
      count++; const id = String(raw.id ?? ''), name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!id || ids.has(id)) throw new Error('Missing or repeated attraction identity'); ids.add(id);
      const longitude = typeof raw.east_long === 'number' ? raw.east_long : NaN, latitude = typeof raw.nlat === 'number' ? raw.nlat : NaN;
      const point = validPoint({ longitude, latitude }) ? coordinate(longitude, latitude) : null, district = point ? locate(point.longitude, point.latitude) : null;
      if (!name || !point || !district) { excluded.push({ source: sources[index].id, id, reason: 'missing_name_invalid_or_outside_coordinate', raw }); continue; }
      references.push(reference(sources[index], raw, id, name, district, point.longitude, point.latitude, 'tourism', `taipei-travel:${id}`));
    }
  });
  if (count !== total) throw new Error('Incomplete attraction population');
  return { references, excluded, sourceRows: count };
}

export async function buildPrioritySnapshot(directory: string, districtArchive: string, approved: PolicySnapshot): Promise<PrioritySnapshot> {
  validatePolicySnapshot(approved);
  const manifest = JSON.parse(readFileSync(join(directory, 'sources.json'), 'utf8')) as PriorityRawManifest;
  if (manifest.schemaVersion !== 1 || !/^priority-v1-[a-f0-9]{16}$/.test(manifest.snapshotId) || !Array.isArray(manifest.sources)) throw new Error('Invalid priority manifest');
  if (new Set(manifest.sources.map(source => source.id)).size !== manifest.sources.length) throw new Error('Duplicate source identity');
  for (const source of manifest.sources) {
    if (!/^[a-f0-9]{64}$/.test(source.sha256) || hash(readFileSync(boundRawPath(directory, source.filename))) !== source.sha256) throw new Error(`Priority source hash mismatch: ${source.id}`);
    if (!source.fetchedAt || !source.resourceId || !source.downloadUrl) throw new Error('Missing priority source provenance');
  }
  const computedId = `priority-v1-${hash(JSON.stringify(manifest.sources.map(source => [source.id, source.sha256]))).slice(0, 16)}`;
  if (computedId !== manifest.snapshotId) throw new Error('Priority snapshot identity mismatch');
  const boundarySource = approved.sources.find(source => source.id === 'districts');
  if (!boundarySource || hash(readFileSync(districtArchive)) !== boundarySource.sha256) throw new Error('District boundary does not match the approved baseline hash');
  const locate = districtLocator(districtArchive), mrtSource = manifest.sources.find(source => source.id === 'taipei_mrt_gis');
  if (!mrtSource || mrtSource.resourceId !== 'a63e3278-9d10-4916-9f24-e5a4d78afb31') throw new Error('MRT official identity mismatch');
  const mrt = normalizeMrt(JSON.parse(readFileSync(boundRawPath(directory, mrtSource.filename), 'utf8')), mrtSource, locate);
  const touristSources = manifest.sources.filter(source => source.id.startsWith('taipei_travel'));
  if (!touristSources.length) throw new Error('Missing explicit tourism acquisition status');
  const touristBlocked = touristSources.some(source => source.acquisitionStatus === 'blocked');
  const tourism = touristBlocked ? { references: [] as PolicyReference[], excluded: [{ source: 'taipei_travel', reason: 'official_api_http_403_or_acquisition_blocked' }], sourceRows: null }
    : normalizeAttractions(touristSources.map(source => JSON.parse(readFileSync(boundRawPath(directory, source.filename), 'utf8'))), touristSources, locate);
  const marketSources: MarketSourceEntry[] = manifest.sources.filter(source => source.filename.startsWith(`${manifest.marketDirectory}/`)).map(source => ({ ...source,
    validatedAt: source.validatedAt ?? source.fetchedAt, approvalStatus: source.approvalStatus === 'context_only' ? 'context_only' : 'review_required', filename: source.filename.slice(manifest.marketDirectory.length + 1) }));
  const markets = await convertMarketSources(boundRawPath(directory, manifest.marketDirectory), marketSources, locate);
  const bus = approved.sources.find(source => source.id === 'bus'); if (!bus) throw new Error('Approved bus source missing');
  const busReferences: PolicyReference[] = approved.references.map(point => ({ ...point, category: 'bus', canonicalId: `approved-bus:${point.id}`,
    sourceVersion: bus.sha256, geometryType: 'Point', resourceId: bus.resourceId, sourcePublishedAt: bus.resourceUpdatedAt,
    retrievedAt: bus.fetchedAt, validatedAt: approved.generatedAt, contentHash: bus.sha256, originalRecordId: point.sourceRecord,
    status: 'included', limitations: ['Approved historical bus baseline preserved; not the newer comparison source.', 'Reference position is not a legally approved installation site.'] }));
  const analysisValidatedAt = new Date().toISOString();
  const references = [...tourism.references, ...markets.references, ...mrt.references, ...busReferences].map(reference => ({ ...reference, validatedAt: analysisValidatedAt }));
  const exclusions = [...tourism.excluded, ...markets.excluded, ...mrt.excluded];
  const result: PrioritySnapshot = { schemaVersion: 1, snapshotId: manifest.snapshotId, baseSnapshotId: approved.snapshotId, busSourceVersion: bus.sha256, analysisValidatedAt,
    approvalStatus: 'review_required', generatedAt: manifest.generatedAt,
    sources: [...manifest.sources, { ...bus, sourceVersion: bus.sha256, approvalStatus: 'existing_baseline' }, { ...boundarySource, sourceVersion: boundarySource.sha256, approvalStatus: 'existing_baseline' }], references,
    categoryStatus: { tourism: { status: tourism.references.length ? 'available' : 'unavailable', reason: touristBlocked ? 'Official API returned HTTP 403; no tourist population was fabricated. / 官方 API 存取受阻，未虛構景點。' : 'Complete paginated official zh-tw attraction records; point is not an installation location.' },
      ...markets.categoryStatus, mrt: { status: mrt.references.length ? 'available' : 'unavailable', reason: 'Official EPSG:3826 station-centre GIS; audited interchange aliases collapsed, not station entrances.' },
      bus: { status: 'available', reason: 'Unchanged approved 2021 bus reference snapshot; newer comparison source not adopted.' } },
    quality: { exclusions, originalCounts: { tourism: tourism.sourceRows, mrt: mrt.sourceRows, bus: approved.quality.referenceSourceRows },
      includedByCategory: Object.fromEntries(['tourism', 'night_market', 'traditional_market', 'commercial', 'mrt', 'bus'].map(category => [category, references.filter(point => point.category === category).length])),
      contextualRecords: markets.contextualRecords, canonicalPolicy: 'Source-scoped verified IDs; tourism > night_market > traditional_market > commercial > mrt > bus for explicit cross-category aliases only. No proximity merge. MRT explicit source-ID pairs 109→17,103→68,104→91.' } };
  return validatePrioritySnapshot(result, approved.snapshotId, bus.sha256);
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Supply explicit versioned raw directory and audited district ZIP');
  const approved = validatePolicySnapshot(JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8')));
  const result = await buildPrioritySnapshot(resolve(process.argv[2]), resolve(process.argv[3]), approved);
  mkdirSync('public/data/bin-policy', { recursive: true });
  writeFileSync('public/data/bin-policy/priority-references.json.tmp', JSON.stringify(result));
  renameSync('public/data/bin-policy/priority-references.json.tmp', 'public/data/bin-policy/priority-references.json');
  writeFileSync('public/data/bin-policy/priority-source-inventory.json', JSON.stringify({ snapshotId: result.snapshotId, baseSnapshotId: result.baseSnapshotId,
    approvalStatus: result.approvalStatus, sources: result.sources, categories: result.categoryStatus, counts: result.quality.includedByCategory }, null, 2));
  console.log(result.snapshotId, result.quality.includedByCategory);
}
