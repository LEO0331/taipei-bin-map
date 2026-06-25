import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  ConversionSourceReport,
  Facility,
  MotorcycleInspectionStationLocation,
  MotorcycleInspectionStationSummary,
} from '../src/types';
import { normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

const SOURCE_NAME = '臺北市機車定檢站位置';
const SOURCE_AGENCY = '臺北市政府環境保護局';
const DEFAULT_INPUT = '/Users/Leo/Downloads/115年臺北市定檢站(245).csv';
const DEFAULT_RAW_DIR = resolve('data/raw/motorcycle-inspection-stations');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
const LOCATION_CACHE = resolve(DEFAULT_OUTPUT_DIR, 'motorcycle-inspection-station-locations.json');
type Row = Record<string, string | undefined>;

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return !text || text.toLowerCase() === 'nan' ? undefined : text;
};
const normalize = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const requiredHeaders = ['站號', '廠牌', '站名', '行政區', '郵遞區號', '地址', '電話', '負責人'];

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const utf8 = parse(raw.toString('utf8'));
  if (requiredHeaders.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  const cp950 = parse(iconv.decode(raw, 'cp950'));
  if (cp950.errors.length) throw new Error(cp950.errors.map((error) => error.message).join('\n'));
  return cp950.data;
}

export function buildMotorcycleInspectionStationSummary(facilities: Facility[]): MotorcycleInspectionStationSummary {
  const counts = (field: 'brand' | 'postalCode') => {
    const map = new Map<string, number>();
    facilities.forEach((item) => {
      const value = item[field];
      if (value) map.set(value, (map.get(value) ?? 0) + 1);
    });
    return [...map].sort((a, b) => b[1] - a[1]);
  };
  const districts = [...new Set(facilities.map((item) => item.district).filter(Boolean))];
  return {
    totalRecords: facilities.length,
    uniqueStationIdCount: new Set(facilities.map((item) => item.stationId).filter(Boolean)).size,
    districtCount: districts.length,
    brandCount: new Set(facilities.map((item) => item.brand).filter(Boolean)).size,
    recordsWithPhone: facilities.filter((item) => item.phone).length,
    recordsWithAddress: facilities.filter((item) => item.address).length,
    recordsWithPostalCode: facilities.filter((item) => item.postalCode).length,
    byDistrict: districts.map((district) => {
      const rows = facilities.filter((item) => item.district === district);
      const brandCounts = new Map<string, number>();
      rows.forEach((item) => item.brand && brandCounts.set(item.brand, (brandCounts.get(item.brand) ?? 0) + 1));
      return {
        district,
        count: rows.length,
        topBrands: [...brandCounts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([brand, count]) => ({ brand, count })),
      };
    }).sort((a, b) => b.count - a.count),
    byBrand: counts('brand').map(([brand, count]) => ({ brand, count })),
    byPostalCode: counts('postalCode').map(([postalCode, count]) => ({ postalCode, count })),
  };
}

export function convertMotorcycleInspectionStationRows(
  rows: Row[],
  locations: MotorcycleInspectionStationLocation[] = [],
  sourceFilename = SOURCE_NAME,
) {
  const duplicateRows: ConversionSourceReport['missingRequiredFields'] = [];
  const seen = new Set<string>();
  const locationById = new Map(locations.map((location) => [normalize(location.stationId), location]));
  const facilities: Facility[] = [];
  rows.forEach((row, index) => {
    const stationId = clean(row.站號) ?? '';
    const stationName = clean(row.站名) ?? '';
    const address = clean(row.地址) ?? '';
    const key = normalize(stationId) || `${normalize(stationName)}|${normalize(address)}`;
    if (seen.has(key)) {
      duplicateRows.push({ rowNumber: index + 2, fields: ['duplicate'] });
      return;
    }
    seen.add(key);
    const exact = locationById.get(normalize(stationId));
    facilities.push({
      id: `motorcycle_inspection_station-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'motorcycle_inspection_station',
      district: normalizeTaipeiDistrict(clean(row.行政區) ?? ''),
      address,
      longitude: exact?.longitude ?? 0,
      latitude: exact?.latitude ?? 0,
      locationPrecision: exact ? 'exact' : 'address_only',
      note: '',
      source: SOURCE_NAME,
      sourceAgency: SOURCE_AGENCY,
      stationId,
      brand: clean(row.廠牌),
      stationName,
      name: stationName,
      postalCode: clean(row.郵遞區號),
      phone: clean(row.電話),
      responsiblePersonName: clean(row.負責人),
    });
  });
  return {
    facilities,
    summary: buildMotorcycleInspectionStationSummary(facilities),
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: rows.length - facilities.length,
      coordinateOutlierRows: 0,
      invalidCoordinateRows: [],
      missingRequiredFields: duplicateRows,
    } satisfies ConversionSourceReport,
  };
}

export function loadMotorcycleInspectionStations(inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir) ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv')) : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  const locations = existsSync(LOCATION_CACHE)
    ? JSON.parse(readFileSync(LOCATION_CACHE, 'utf8')) as MotorcycleInspectionStationLocation[]
    : [];
  return existsSync(path)
    ? convertMotorcycleInspectionStationRows(readRows(path), locations, basename(path))
    : convertMotorcycleInspectionStationRows([], locations, `${basename(path)} (not found)`);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadMotorcycleInspectionStations();
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'motorcycle-inspection-stations.json'), converted.facilities);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'motorcycle-inspection-station-summary.json'), converted.summary);
  if (!existsSync(LOCATION_CACHE)) writeJson(LOCATION_CACHE, []);
  console.log(`Wrote ${converted.facilities.length} motorcycle inspection station records`);
}
