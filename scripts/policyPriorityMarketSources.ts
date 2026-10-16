import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import Papa from 'papaparse';
import iconv from 'iconv-lite';
import type { PolicyReference, PrioritySource } from '../src/lib/policyPriorityTypes';

export interface MarketSourceEntry extends PrioritySource { filename: string; validatedAt: string; approvalStatus: 'review_required' | 'context_only'; downloadUrl: string }
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const definitions = [
  ['vendor_concentrations', '臺北市臨時攤販集中場', 'c013d9ec-a550-46bd-ac60-45f085930706', '4874f750-b972-4c42-ad76-986960670c70', '2025-08-26T15:58:47+08:00'],
  ['traditional_markets', '臺北市市商場基本資料', '89bebb3a-990d-4070-bd67-631a575f6d4a', '35acfce1-2c4d-4c70-aa75-601cdab2b3f7', '2026-09-04T11:01:23+08:00'],
  ['commercial_introduction', '臺北市商圈介紹', '52da1174-0d77-434b-88c3-e77b008e8624', 'bdc97a62-4da4-43f9-8c35-c0e6157d3d68', '2025-06-17T15:11:51+08:00'],
  ['commercial_associations', '商圈公會通訊錄', '89f53365-ea7b-4132-b702-27b26a575b3b', '09a5639c-e5d8-4b07-8aae-25a0425778c2', '2025-08-08T11:36:54+08:00'],
] as const;

/** Download original bytes into an immutable, content-addressed review archive, never production. */
export async function acquireMarketSources(outputDirectory: string) {
  const results = await Promise.all(definitions.map(async ([id, name, dataset, resourceId, resourceUpdatedAt]) => {
    const downloadUrl = `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${resourceId}`;
    const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100 || bytes.length > 5_000_000) throw new Error(`${id}: unexpected source size`);
    const encoding = bytes.toString('utf8').includes('\ufffd') ? 'CP950' : 'UTF-8';
    parseMarketCsv(bytes, { encoding });
    const source: MarketSourceEntry = { id, name, resourceId, resourceUpdatedAt, downloadUrl,
      provider: id.startsWith('commercial') ? '臺北市政府產業發展局商業處' : '臺北市政府產業發展局市場處',
      datasetUrl: `https://data.taipei/dataset/detail?id=${dataset}`, fetchedAt: new Date().toISOString(),
      validatedAt: new Date().toISOString(), sha256: digest(bytes), encoding,
      crs: id.startsWith('commercial') ? 'No verified commercial district geometry' : 'Official longitude/latitude; WGS84-compatible',
      license: '政府資料開放授權條款第1版', licenseUrl: 'https://data.gov.tw/license',
      caveat: id === 'vendor_concentrations' ? 'Verified vendor concentration areas, not a verified night-market operating classification; hours are context only.' : id.startsWith('commercial') ? 'Text location or association mailing coordinates do not establish district geometry; context only.' : 'Market reference point is not an accessible installation site or measured operating intensity.',
      filename: `${id}.csv`, approvalStatus: id.startsWith('commercial') ? 'context_only' : 'review_required' };
    return { bytes, source };
  }));
  const version = `markets-${digest(results.map(r => r.source.sha256).join('|')).slice(0, 16)}`;
  const directory = join(outputDirectory, version);
  await mkdir(directory, { recursive: true });
  const manifest = join(directory, 'sources.json');
  try {
    const sources = JSON.parse(await readFile(manifest, 'utf8')) as MarketSourceEntry[];
    for (const { source } of results) {
      const archived = sources.find(s => s.id === source.id);
      if (!archived || digest(await readFile(join(directory, archived.filename))) !== source.sha256) throw new Error('Existing market archive identity mismatch');
    }
    return { directory, sources };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  for (const { bytes, source } of results) await writeFile(join(directory, source.filename), bytes, { flag: 'wx' });
  const sources = results.map(r => ({ ...r.source, sourceVersion: version }));
  await writeFile(manifest, JSON.stringify(sources, null, 2), { flag: 'wx' });
  return { directory, sources };
}

export function parseMarketCsv(bytes: Buffer, source: Pick<MarketSourceEntry, 'encoding'>) {
  const text = iconv.decode(bytes, source.encoding).replace(/^\uFEFF/, '');
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim() });
  if (parsed.errors.length) throw new Error(`Market CSV parse errors: ${parsed.errors.map(e => e.code).join(', ')}`);
  return parsed.data;
}

/** Official vendor coordinates use degrees/minutes/seconds, unlike decimal market coordinates. */
export function marketCoordinate(value: string | undefined): number {
  const text = value?.trim() ?? '';
  if (/^[+-]?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const dms = text.match(/^(\d{1,3})°(\d{1,2})['′](\d{1,2}(?:\.\d+)?)["″]?$/);
  if (!dms || Number(dms[2]) >= 60 || Number(dms[3]) >= 60) return NaN;
  return Number(dms[1]) + Number(dms[2]) / 60 + Number(dms[3]) / 3600;
}

export async function convertMarketSources(rawDirectory: string, sourceEntries: MarketSourceEntry[], locateDistrict: (lon: number, lat: number) => string | null) {
  const references: PolicyReference[] = [], excluded: unknown[] = [], contextualRecords: unknown[] = [];
  if (new Set(sourceEntries.map(s => s.id)).size !== sourceEntries.length) throw new Error('Duplicate market source identity');
  for (const source of sourceEntries) {
    const expected = definitions.find(d => d[0] === source.id);
    if (!expected || source.resourceId !== expected[3] || source.filename !== `${source.id}.csv`) throw new Error('Market source registry identity mismatch');
    const bytes = await readFile(join(rawDirectory, source.filename));
    if (digest(bytes) !== source.sha256) throw new Error(`Source hash mismatch: ${source.id}`);
    const rows = parseMarketCsv(bytes, source);
    const spatial = source.id === 'vendor_concentrations' || source.id === 'traditional_markets';
    if (spatial && rows.length && !['seqno', 'stitle', 'GTag_longitude', 'GTag_latitude'].every(field => field in rows[0])) throw new Error(`Unexpected official market schema: ${source.id}`);
    const seen = new Map<string, string>(), aliases = new Map<string, string>();
    for (const [index, raw] of rows.entries()) {
      const originalRecordId = raw.seqno?.trim() || `row-sha256-${digest(JSON.stringify(raw))}`;
      const id = `${source.id}:${originalRecordId}`;
      if (!spatial) {
        contextualRecords.push({ id, sourceId: source.id, raw, status: 'context_only', reason: 'No defensible commercial district location/boundary; association mailing coordinates excluded.' });
        excluded.push({ id, sourceId: source.id, originalRecordId, reason: 'commercial_geometry_unavailable', raw });
        continue;
      }
      const lat = marketCoordinate(raw.GTag_latitude), lon = marketCoordinate(raw.GTag_longitude);
      const name = (source.id === 'vendor_concentrations' ? raw.xbody : raw.stitle)?.trim();
      const district = Number.isFinite(lat) && Number.isFinite(lon) && lat >= 24.85 && lat <= 25.3 && lon >= 121.3 && lon <= 121.8 ? locateDistrict(lon, lat) : null;
      if (!name || !district) { excluded.push({ id, sourceId: source.id, originalRecordId, row: index + 1, reason: !name ? 'missing_name' : 'invalid_or_outside_taipei_geometry', raw }); continue; }
      const identity = JSON.stringify([name, lat, lon]);
      if (seen.has(originalRecordId)) {
        if (seen.get(originalRecordId) !== identity) throw new Error(`Conflicting official identity: ${id}`);
        excluded.push({ id, sourceId: source.id, reason: 'duplicate_official_identity', raw }); continue;
      }
      seen.set(originalRecordId, identity);
      // The official vendor CSV repeats operating-day/association rows for the same
      // named place. Exact coordinate + identical described extent are required;
      // proximity alone never merges independent places.
      const placeName = source.id === 'vendor_concentrations' ? name.replace(/\([^()]*\)$/, '').trim() : name;
      const placeIdentity = JSON.stringify([placeName, lat, lon, raw.xAddress?.trim()]);
      if (aliases.has(placeIdentity)) { excluded.push({ id, sourceId: source.id, canonicalId: aliases.get(placeIdentity), reason: 'same_named_place_exact_coordinate_and_extent_operating_alias', raw }); continue; }
      aliases.set(placeIdentity, id);
      references.push({ id, canonicalId: id, category: source.id === 'vendor_concentrations' ? 'night_market' : 'traditional_market',
        name, district, latitude: lat, longitude: lon, sourceId: source.id, sourceRecord: originalRecordId,
        precision: 'Official market/vendor reference coordinate; not installation geometry', geometryType: 'Point',
        resourceId: source.resourceId, sourcePublishedAt: source.resourceUpdatedAt, retrievedAt: source.fetchedAt,
        validatedAt: source.validatedAt, contentHash: source.sha256, originalRecordId,
        sourceVersion: source.sourceVersion ?? source.sha256, status: 'included', limitations: [source.caveat, 'Operating hours/dates retained as context, not intensity weights.', 'Source sequence identifier is not guaranteed stable across provider revisions.'], raw });
    }
  }
  return { references, excluded, contextualRecords, categoryStatus: {
    night_market: { status: references.some(r => r.category === 'night_market') ? 'available' as const : 'unavailable' as const, reason: 'Official vendor concentration areas; no separate operating-classification field verifying night-market status.' },
    traditional_market: { status: references.some(r => r.category === 'traditional_market') ? 'available' as const : 'unavailable' as const, reason: 'Official market reference points; location is not siting suitability or operating intensity.' },
    commercial: { status: 'unavailable' as const, reason: 'Introduction has descriptive locations only; association coordinates are mailing addresses, not authoritative commercial district geometry.' },
  } };
}
