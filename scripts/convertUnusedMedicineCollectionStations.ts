import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { UnusedMedicineCollectionStationRecord } from '../src/types';

type Row = Record<string, string | undefined>;

const raw = resolve('data/raw/unused-medicine-collection-stations/source.csv');
const output = resolve('public/data/unused-medicine-collection-stations');
const districts = ['松山區', '信義區', '大安區', '中山區', '中正區', '大同區', '萬華區', '文山區', '南港區', '內湖區', '士林區', '北投區'];
const knownCategories = new Set(['醫院', '藥局']);
const clean = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const field = (row: Row, header: string) => clean(Object.entries(row).find(([key]) => clean(key).normalize('NFKC') === header)?.[1]);
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase();
const malformedPhone = (value: string) => Boolean(value) && !/^\(?0\d{1,3}\)?[\s-]?\d{6,8}$/.test(value);

export function convertUnusedMedicineCollectionStationRows(rows: Row[]) {
  const seen = new Set<string>();
  const records: UnusedMedicineCollectionStationRecord[] = [];
  const duplicateRows: number[] = [];
  const missingNames: number[] = [];
  const missingAddresses: number[] = [];
  const malformedPhones: Array<{ rowNumber: number; value: string }> = [];
  const unknownCategories: Array<{ rowNumber: number; value: string }> = [];
  const unresolvedDistricts: number[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sourceSequenceNumber = field(row, '序號');
    const stationCategory = field(row, '類別');
    const stationName = field(row, '檢收站名稱');
    const address = field(row, '地址');
    const phone = field(row, '電話');
    const extension = field(row, '分機');
    const dedupeKey = [stationName, address, phone, stationCategory].map(normalize).join('|');

    if (seen.has(dedupeKey)) { duplicateRows.push(rowNumber); return; }
    seen.add(dedupeKey);

    const districtName = districts.find((district) => address.includes(district)) ?? '';
    if (!stationName) missingNames.push(rowNumber);
    if (!address) missingAddresses.push(rowNumber);
    if (!districtName) unresolvedDistricts.push(rowNumber);
    if (malformedPhone(phone)) malformedPhones.push({ rowNumber, value: phone });
    if (!knownCategories.has(stationCategory)) unknownCategories.push({ rowNumber, value: stationCategory });

    records.push({
      id: sourceSequenceNumber ? `unused-medicine-${sourceSequenceNumber}` : `unused-medicine-${normalize(stationName)}-${normalize(address) || rowNumber}`,
      sourceSequenceNumber, stationCategory, stationName, districtName, address, phone, extension,
      fullPhone: phone ? `${phone}${extension ? `#${extension}` : ''}` : '',
      hasPhone: Boolean(phone), googleMapsQuery: address || stationName,
    });
  });

  const count = (predicate: (record: UnusedMedicineCollectionStationRecord) => boolean) => records.filter(predicate).length;
  const topDistrict = [...new Set(records.map((record) => record.districtName).filter(Boolean))]
    .map((district) => ({ district, count: count((record) => record.districtName === district) }))
    .sort((a, b) => b.count - a.count)[0] ?? null;

  return {
    records,
    summary: {
      totalRecords: records.length,
      uniqueStationNames: new Set(records.map((record) => record.stationName).filter(Boolean)).size,
      districtCount: new Set(records.map((record) => record.districtName).filter(Boolean)).size,
      categoryCount: new Set(records.map((record) => record.stationCategory).filter(Boolean)).size,
      recordsWithPhone: count((record) => record.hasPhone),
      recordsWithAddress: count((record) => Boolean(record.address)),
      topDistrict,
      dataQuality: { duplicateRows, missingNames, missingAddresses, malformedPhones, unknownCategories, unresolvedDistricts },
    },
  };
}

export function loadUnusedMedicineCollectionStations() {
  if (!existsSync(raw)) return { records: [], summary: { totalRecords: 0, uniqueStationNames: 0, districtCount: 0, categoryCount: 0, recordsWithPhone: 0, recordsWithAddress: 0, topDistrict: null, dataQuality: { duplicateRows: [], missingNames: [], missingAddresses: [], malformedPhones: [], unknownCategories: [], unresolvedDistricts: [] } } };
  const text = iconv.decode(readFileSync(raw), 'cp950').replace(/^\uFEFF/, '');
  return convertUnusedMedicineCollectionStationRows(Papa.parse<Row>(text, { header: true, skipEmptyLines: true, transformHeader: clean, transform: clean }).data);
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') ?? '')) {
  const result = loadUnusedMedicineCollectionStations();
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'records.json'), `${JSON.stringify(result.records, null, 2)}\n`);
  writeFileSync(resolve(output, 'summary.json'), `${JSON.stringify(result.summary, null, 2)}\n`);
  console.log(`Wrote ${result.records.length} unused-medicine collection station records.`);
}
