import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { BulkyWasteCollectionBookingRecord } from '../src/types';

type Row = Record<string, string | undefined>;
const RAW = resolve('data/raw/bulky-waste-collection-booking/source.csv');
const OUTPUT = resolve('public/data/bulky-waste-collection-booking');
const expected = ['行政區', '地址-行政區域代碼', '分隊', '市話', '各分隊收運轄區里', '預約時間'];
const key = (value: string) => value.normalize('NFKC').replace(/[\s　\-－_()（）]/g, '');
const field = (row: Row, name: string) => Object.entries(row).find(([header]) => key(header) === key(name))?.[1]?.trim() ?? '';
const phoneLooksMalformed = (phone: string) => Boolean(phone) && !/^\(?0\d{1,3}\)?[\s-]?\d{6,8}(?:\s*(?:#|分機)\s*\d+)?$/.test(phone);

export function splitServiceVillages(raw: string) {
  return /[、；;，,\n]/.test(raw) ? raw.split(/[、；;，,\n]+/).map((item) => item.trim()).filter(Boolean) : raw ? [raw] : [];
}

export function convertBulkyWasteCollectionBookingRows(rows: Row[]) {
  const seen = new Set<string>();
  const records: BulkyWasteCollectionBookingRecord[] = [];
  const duplicateRows: Array<{ rowNumber: number; key: string }> = [];
  const missingDistricts: number[] = [];
  const malformedPhones: Array<{ rowNumber: number; value: string }> = [];
  const emptyServiceAreas: number[] = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const districtName = field(row, '行政區');
    const districtCode = field(row, '地址-行政區域代碼');
    const collectionTeam = field(row, '分隊');
    const phone = field(row, '市話');
    const serviceVillagesRaw = field(row, '各分隊收運轄區里');
    const bookingHoursRaw = field(row, '預約時間');
    const dedupeKey = [districtName, collectionTeam, phone, serviceVillagesRaw].join('|');
    if (seen.has(dedupeKey)) { duplicateRows.push({ rowNumber, key: dedupeKey }); return; }
    seen.add(dedupeKey);
    if (!districtName) missingDistricts.push(rowNumber);
    if (phoneLooksMalformed(phone)) malformedPhones.push({ rowNumber, value: phone });
    if (!serviceVillagesRaw) emptyServiceAreas.push(rowNumber);
    records.push({ id: `bulky-waste-${rowNumber}-${districtCode || 'unknown'}`, districtName, districtCode, collectionTeam, phone, serviceVillagesRaw, serviceVillages: splitServiceVillages(serviceVillagesRaw), bookingHoursRaw });
  });
  const summary = {
    totalRecords: records.length,
    districtCount: new Set(records.map((record) => record.districtName).filter(Boolean)).size,
    collectionTeamCount: new Set(records.map((record) => record.collectionTeam).filter(Boolean)).size,
    villageCount: new Set(records.flatMap((record) => record.serviceVillages)).size,
    recordsWithPhone: records.filter((record) => Boolean(record.phone)).length,
    recordsWithBookingHours: records.filter((record) => Boolean(record.bookingHoursRaw)).length,
    dataQuality: { duplicateRows, missingDistricts, malformedPhones, emptyServiceAreas },
  };
  return { records, summary };
}

export function loadBulkyWasteCollectionBookings() {
  if (!existsSync(RAW)) return { records: [], summary: { totalRecords: 0, districtCount: 0, collectionTeamCount: 0, villageCount: 0, recordsWithPhone: 0, recordsWithBookingHours: 0, dataQuality: { duplicateRows: [], missingDistricts: [], malformedPhones: [], emptyServiceAreas: [] } } };
  const bytes = readFileSync(RAW);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true, transformHeader: (header) => header.replace(/^\uFEFF/, '').trim(), transform: (value) => String(value ?? '').trim() });
  const utf8 = parse(bytes.toString('utf8'));
  const decoded = (utf8.meta.fields ?? []).filter((header) => expected.some((name) => key(header) === key(name))).length >= 4 ? utf8 : parse(iconv.decode(bytes, 'cp950'));
  return convertBulkyWasteCollectionBookingRows(decoded.data);
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') ?? '')) {
  const result = loadBulkyWasteCollectionBookings();
  mkdirSync(OUTPUT, { recursive: true });
  writeFileSync(resolve(OUTPUT, 'records.json'), `${JSON.stringify(result.records, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT, 'summary.json'), `${JSON.stringify(result.summary, null, 2)}\n`);
  console.log(`Wrote ${result.records.length} bulky-waste collection booking records.`);
}
