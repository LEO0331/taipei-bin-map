import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { AmenityAvailability, CoolingComfortSpotRecord, FacilityEnvironment, ParsedOpeningHours } from '../src/types';

type Row = Record<string, string | undefined>;
const rawPath = resolve('data/raw/cooling-comfort-spots/source.csv');
const out = resolve('public/data/cooling-comfort-spots');
const clean = (value: unknown) => String(value ?? '').replace(/^\uFEFF/, '').trim();
const field = (row: Row, header: string) => clean(Object.entries(row).find(([key]) => clean(key) === header)?.[1]);
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase();

export function normalizeAmenity(raw: string): AmenityAvailability {
  const value = clean(raw).toUpperCase();
  if (!value) return 'unknown';
  if (value === 'Y' || value === '是' || value === '有') return 'yes';
  if (value === 'N' || value === '否' || value === '無') return 'no';
  return 'conditional';
}
export function normalizeEnvironment(raw: string): FacilityEnvironment {
  if (raw.includes('室內') && raw.includes('戶外')) return 'mixed';
  if (raw.includes('室內')) return 'indoor';
  if (raw.includes('戶外')) return 'outdoor';
  return 'unknown';
}
function coordinate(raw: string) { const value = Number(clean(raw)); return Number.isFinite(value) ? value : null; }
export function parseOpeningHours(raw: string): ParsedOpeningHours {
  const source = clean(raw); if (!source) return { raw: source, schedules: [], parseConfidence: 'low' };
  if (/24\s*小時|全天|24hr/i.test(source)) return { raw: source, schedules: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' }], parseConfidence: 'high' };
  const matches = [...source.replace(/[：]/g, ':').matchAll(/(\d{1,2}(?::\d{2})?)\s*(?:-|~|～|至|到|V)\s*(\d{1,2}(?::\d{2})?)/g)];
  const toTime = (value: string) => value.includes(':') ? value.padStart(5, '0') : `${value.padStart(2, '0')}:00`;
  const schedules = matches.map((m) => ({ days: [], start: toTime(m[1]), end: toTime(m[2]) }));
  return { raw: source, schedules, parseConfidence: schedules.length === 1 && !/[例假日|除外|依|視|公告]/.test(source) ? 'medium' : 'low' };
}
export function convertCoolingComfortSpotRows(rows: Row[]) {
  const seen = new Set<string>(); const records: CoolingComfortSpotRecord[] = []; const quality = { exactDuplicateRows: [] as number[], missingNames: [] as number[], missingDistricts: [] as number[], missingAddresses: [] as number[], missingCoordinates: [] as number[], outOfRangeCoordinates: [] as number[], reversedCoordinateCandidates: [] as number[], malformedPhones: [] as Array<{ rowNumber: number; value: string }>, unknownAmenityValues: [] as Array<{ rowNumber: number; field: string; value: string }>, duplicateSourceIds: [] as string[] };
  const ids = new Map<string, number>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2; const sourceSequenceNumber = field(row, '編號'); const environmentRaw = field(row, '設施地點（戶外或室內）'); const name = field(row, '名稱'); const districtName = field(row, '行政區'); const address = field(row, '地址'); const longitudeRaw = field(row, '經度'); const latitudeRaw = field(row, '緯度');
    const phoneRaw = field(row, '市話'); const extension = field(row, '分機'); const mobileRaw = field(row, '手機'); const otherContact = field(row, '其他聯絡方式'); const openingHoursRaw = field(row, '開放時間');
    const sourceAmenities = [['電風扇', field(row, '電風扇')], ['冷氣', field(row, '冷氣')], ['廁所', field(row, '廁所')], ['座位', field(row, '座位')], ['飲水設施（例如：飲水機；直飲台；奉茶點等）', field(row, '飲水設施（例如：飲水機；直飲台；奉茶點等）')], ['無障礙座位', field(row, '無障礙座位')] ] as const;
    const key = [sourceSequenceNumber, environmentRaw, name, districtName, address, longitudeRaw, latitudeRaw, phoneRaw, openingHoursRaw, ...sourceAmenities.map(([, value]) => value)].join('|'); if (seen.has(key)) { quality.exactDuplicateRows.push(rowNumber); return; } seen.add(key);
    if (sourceSequenceNumber) { ids.set(sourceSequenceNumber, (ids.get(sourceSequenceNumber) ?? 0) + 1); } if (!name) quality.missingNames.push(rowNumber); if (!districtName) quality.missingDistricts.push(rowNumber); if (!address) quality.missingAddresses.push(rowNumber);
    const longitude = coordinate(longitudeRaw); const latitude = coordinate(latitudeRaw); const hasValidCoordinates = longitude !== null && latitude !== null && longitude >= 121.3 && longitude <= 121.8 && latitude >= 24.85 && latitude <= 25.3;
    if (longitude === null || latitude === null) quality.missingCoordinates.push(rowNumber); else if (!hasValidCoordinates) { quality.outOfRangeCoordinates.push(rowNumber); if (latitude >= 121.3 && latitude <= 121.8 && longitude >= 24.85 && longitude <= 25.3) quality.reversedCoordinateCandidates.push(rowNumber); }
    if (phoneRaw && !/^\(?0\d{1,3}\)?[\s-]?\d{6,8}$/.test(phoneRaw.replace(/\s/g, ''))) quality.malformedPhones.push({ rowNumber, value: phoneRaw });
    const values = sourceAmenities.map(([label, value]) => { const normalized = normalizeAmenity(value); if (normalized === 'conditional' || normalized === 'unknown') quality.unknownAmenityValues.push({ rowNumber, field: label, value }); return normalized; });
    const [fanAvailability, airConditioningAvailability, toiletAvailability, seatingAvailability, drinkingWaterAvailability, accessibleSeatingAvailability] = values;
    const amenityTags = ([['indoor', normalizeEnvironment(environmentRaw) === 'indoor'], ['outdoor', normalizeEnvironment(environmentRaw) === 'outdoor'], ['air_conditioning', airConditioningAvailability === 'yes'], ['fan', fanAvailability === 'yes'], ['seating', seatingAvailability === 'yes'], ['toilet', toiletAvailability === 'yes'], ['drinking_water', drinkingWaterAvailability === 'yes'], ['accessible_seating', accessibleSeatingAvailability === 'yes'], ['contact', Boolean(phoneRaw || mobileRaw || otherContact)]] as Array<[string, boolean]>).filter(([, included]) => included).map(([tag]) => tag);
    records.push({ id: sourceSequenceNumber || `cooling-${normalize(name)}-${normalize(address) || rowNumber}`, sourceSequenceNumber, environmentRaw, environment: normalizeEnvironment(environmentRaw), name, districtName, address, longitudeRaw, latitudeRaw, longitude: hasValidCoordinates ? longitude : null, latitude: hasValidCoordinates ? latitude : null, hasValidCoordinates, phoneRaw, phone: phoneRaw, extension, mobileRaw, mobile: mobileRaw, otherContact, openingHoursRaw, fanRaw: sourceAmenities[0][1], fanAvailability, airConditioningRaw: sourceAmenities[1][1], airConditioningAvailability, toiletRaw: sourceAmenities[2][1], toiletAvailability, seatingRaw: sourceAmenities[3][1], seatingAvailability, drinkingWaterRaw: sourceAmenities[4][1], drinkingWaterAvailability, accessibleSeatingRaw: sourceAmenities[5][1], accessibleSeatingAvailability, highlights: field(row, '其他特色及亮點'), note: field(row, '備註'), hasCoolingEquipment: fanAvailability === 'yes' || airConditioningAvailability === 'yes', hasCoreRestAmenities: toiletAvailability === 'yes' && seatingAvailability === 'yes' && drinkingWaterAvailability === 'yes', amenityTags, parsedOpeningHours: parseOpeningHours(openingHoursRaw) });
  });
  ids.forEach((count, id) => { if (count > 1) quality.duplicateSourceIds.push(id); }); const count = (predicate: (r: CoolingComfortSpotRecord) => boolean) => records.filter(predicate).length;
  return { records, summary: { totalRecords: records.length, districtCount: new Set(records.map((r) => r.districtName).filter(Boolean)).size, validCoordinateCount: count((r) => r.hasValidCoordinates), byEnvironment: Object.fromEntries(['indoor', 'outdoor', 'mixed', 'unknown'].map((v) => [v, count((r) => r.environment === v)])), amenities: Object.fromEntries(['airConditioningAvailability', 'fanAvailability', 'toiletAvailability', 'seatingAvailability', 'drinkingWaterAvailability', 'accessibleSeatingAvailability'].map((key) => [key, count((r) => r[key as keyof CoolingComfortSpotRecord] === 'yes')])), dataQuality: quality } };
}
export function loadCoolingComfortSpots() { if (!existsSync(rawPath)) return convertCoolingComfortSpotRows([]); const source = iconv.decode(readFileSync(rawPath), 'cp950').replace(/^\uFEFF/, ''); return convertCoolingComfortSpotRows(Papa.parse<Row>(source, { header: true, skipEmptyLines: true, transformHeader: clean }).data); }
if (process.argv[1]?.replace(/\\/g, '/').endsWith('convertCoolingComfortSpots.ts')) { const result = loadCoolingComfortSpots(); mkdirSync(out, { recursive: true }); writeFileSync(resolve(out, 'records.json'), `${JSON.stringify(result.records, null, 2)}\n`); writeFileSync(resolve(out, 'summary.json'), `${JSON.stringify(result.summary, null, 2)}\n`); console.log(`Wrote ${result.records.length} cooling comfort spots.`); }
