import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const currentBusSource = {
  id: 'taipei-stop-location', datasetId: 'ce7d3d2b-096f-4f2d-b7cf-cdd6a529f35c',
  datasetUrl: 'https://data.taipei/dataset/detail?id=ce7d3d2b-096f-4f2d-b7cf-cdd6a529f35c',
  downloadUrl: 'https://tcgbusfs.blob.core.windows.net/blobbus/GetStopLocation.gz',
  provider: '臺北市公共運輸處', unit: 'StopLocation physical directional platform; exact coordinates collapsed for equal-location coverage',
  license: 'Government Data Open License 1.0 (dataset public/free)', licenseUrl: 'https://data.gov.tw/license',
  metadataUpdatedAt: '2025-11-24T16:35:04+08:00', metadataVerifiedAt: '2026-10-15',
  updateFrequency: 'Descriptor CSV: daily; dataset page: irregular; actual source UpdateTime retained',
  documentationUrl: 'https://pto.gov.taipei/News_Content.aspx?n=A1DF07A86105B6BB&s=55E8ADD164E4F579',
};
export function decodeTaipeiBusPayload(bytes: Buffer): unknown {
  return JSON.parse((bytes[0] === 31 && bytes[1] === 139 ? gunzipSync(bytes, { maxOutputLength: 20_000_000 }) : bytes).toString('utf8'));
}
// Optional build-time adapter only. Tokens are never persisted or sent to the browser.
export async function fetchTdxPages(unit: 'Stop' | 'Station', token: string, fetcher: typeof fetch = fetch, pageSize = 1000) {
  if (!token || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error('TDX token and valid page size required');
  const all: unknown[] = []; const pages = new Set<string>();
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const url = new URL(`https://tdx.transportdata.tw/api/basic/v2/Bus/${unit}/City/Taipei`);
    url.searchParams.set('$top', String(pageSize)); url.searchParams.set('$skip', String(offset)); url.searchParams.set('$format', 'JSON');
    const response = await fetcher(url.href, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`TDX ${unit} HTTP ${response.status}`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || rows.length > pageSize) throw new Error('TDX page schema invalid');
    const identityKey = unit === 'Stop' ? 'StopUID' : 'StationUID';
    if(rows.some(row => !row || typeof row !== 'object' || typeof row[identityKey] !== 'string')) throw new Error(`TDX ${unit} identity schema invalid`);
    if (rows.length) { const hash = createHash('sha256').update(JSON.stringify(rows)).digest('hex'); if (pages.has(hash)) throw new Error('Repeated TDX page'); pages.add(hash); }
    all.push(...rows); if (rows.length < pageSize) return all;
  }
  throw new Error('TDX pagination limit exceeded');
}
export async function fetchCurrentBusStops(directory = 'data/raw/bin-policy/bus-current') {
  const response = await fetch(currentBusSource.downloadUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Current bus HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100 || bytes.length > 10_000_000) throw new Error('Unexpected current bus source size');
  const payload = decodeTaipeiBusPayload(bytes) as { BusInfo?: unknown[]; EssentialInfo?: { UpdateTime?: string; CoordinateSystem?: string } };
  if (!Array.isArray(payload.BusInfo) || payload.BusInfo.length < 100 || payload.EssentialInfo?.CoordinateSystem !== 'WGS84') throw new Error('Current bus source schema/truncation failure');
  const sha256 = createHash('sha256').update(bytes).digest('hex'); const versionId = `taipei-stop-location-${sha256.slice(0,12)}`;
  const destination = resolve(directory, versionId);
  if (existsSync(destination)) return destination;
  const provenance = { ...currentBusSource, versionId, sha256, retrieved_at: new Date().toISOString(), source_updated_at: payload.EssentialInfo?.UpdateTime ?? null, sourceTimestampTimezone: 'Source Taipei local time; no offset in payload', httpLastModified: response.headers.get('last-modified'), etag: response.headers.get('etag'), sourceRows: payload.BusInfo.length, approvalStatus: 'review_required' };
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination,'GetStopLocation.gz'), bytes, { flag:'wx' });
  writeFileSync(join(destination,'source.json'), JSON.stringify(provenance,null,2), { flag:'wx' });
  return destination;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(await fetchCurrentBusStops(process.argv[2]));
