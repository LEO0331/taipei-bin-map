import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  ConversionSourceReport,
  ElectricMotorcycleChargingLocationCategory,
  ElectricMotorcycleChargingStationLocation,
  ElectricMotorcycleChargingStationSummary,
  Facility,
} from '../src/types';
import {
  classifyElectricMotorcycleChargingLocationCategory,
  normalizeTaipeiDistrict,
} from '../src/utils/facilityUtils';

const SOURCE_NAME = '臺北市電動機車充電站';
const SOURCE_AGENCY = '臺北市政府環境保護局';
const DEFAULT_INPUT = '/Users/Leo/Downloads/115年臺北市電動機車充電地點(398).csv';
const DEFAULT_RAW_DIR = resolve('data/raw/electric-motorcycle-charging-stations');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
const LOCATION_CACHE = resolve(DEFAULT_OUTPUT_DIR, 'electric-motorcycle-charging-station-locations.json');
const requiredHeaders = ['編號', '單位', '縣市', '行政區', '行政區域代碼', '地址', '備註'];

type Row = Record<string, string | undefined>;

const districtByCode: Record<string, string> = {
  '63000010': '松山區',
  '63000020': '信義區',
  '63000030': '大安區',
  '63000040': '中山區',
  '63000050': '中正區',
  '63000060': '大同區',
  '63000070': '萬華區',
  '63000080': '文山區',
  '63000090': '南港區',
  '63000100': '內湖區',
  '63000110': '士林區',
  '63000120': '北投區',
};

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return !text || text.toLowerCase() === 'nan' ? undefined : text;
};
const normalize = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const normalizeDistrictCode = (value: unknown) => clean(value)?.replace(/\.0$/, '');

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const utf8 = parse(raw.toString('utf8'));
  if (requiredHeaders.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  return parse(iconv.decode(raw, 'cp950')).data;
}

function buildSummary(facilities: Facility[], duplicateStationIds: Array<{ stationId: string; count: number }>): ElectricMotorcycleChargingStationSummary {
  const districts = [...new Set(facilities.map((item) => item.district).filter(Boolean))];
  const categories = [...new Set(facilities.map((item) => item.locationCategory).filter(Boolean))];
  const countBy = (field: 'locationCategory' | 'districtCode') => {
    const map = new Map<string, { raw?: string; district?: string; count: number }>();
    facilities.forEach((item) => {
      const key = item[field];
      if (!key) return;
      const entry = map.get(key) ?? { count: 0, raw: item.locationCategoryRaw, district: item.district };
      entry.count += 1;
      map.set(key, entry);
    });
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  };

  return {
    totalRecords: facilities.length,
    uniqueStationIdCount: new Set(facilities.map((item) => item.stationId).filter(Boolean)).size,
    districtCount: districts.length,
    locationCategoryCount: categories.length,
    recordsWithAddress: facilities.filter((item) => item.address).length,
    recordsWithDistrictCode: facilities.filter((item) => item.districtCode).length,
    duplicateStationIdCount: duplicateStationIds.length,
    byDistrict: districts.map((district) => {
      const rows = facilities.filter((item) => item.district === district);
      const categoryCounts = new Map<string, { raw?: string; count: number }>();
      rows.forEach((item) => {
        const category = item.locationCategory ?? 'unknown';
        const entry = categoryCounts.get(category) ?? { raw: item.locationCategoryRaw, count: 0 };
        entry.count += 1;
        categoryCounts.set(category, entry);
      });
      return {
        district,
        count: rows.length,
        topLocationCategories: [...categoryCounts.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)
          .map(([locationCategory, item]) => ({
            locationCategory: locationCategory as ElectricMotorcycleChargingLocationCategory,
            locationCategoryRaw: item.raw,
            count: item.count,
          })),
      };
    }).sort((a, b) => b.count - a.count),
    byLocationCategory: countBy('locationCategory').map(([locationCategory, item]) => ({
      locationCategory: locationCategory as ElectricMotorcycleChargingLocationCategory,
      locationCategoryRaw: item.raw,
      count: item.count,
    })),
    byDistrictCode: countBy('districtCode').map(([districtCode, item]) => ({ districtCode, district: item.district, count: item.count })),
  };
}

export function convertElectricMotorcycleChargingStationRows(
  rows: Row[],
  locations: ElectricMotorcycleChargingStationLocation[] = [],
  sourceFilename = SOURCE_NAME,
) {
  const seen = new Set<string>();
  const duplicateRows: ConversionSourceReport['missingRequiredFields'] = [];
  const conflicts: NonNullable<ConversionSourceReport['districtCodeConflicts']> = [];
  const stationIdCounts = new Map<string, number>();
  const locationById = new Map(locations.filter((item) => item.stationId).map((item) => [normalize(item.stationId), item]));
  const locationByNameAddress = new Map(locations.map((item) => [`${normalize(item.unitName)}|${normalize(item.address)}`, item]));
  const facilities: Facility[] = [];

  rows.forEach((row, index) => {
    const stationId = clean(row.編號) ?? '';
    const unitName = clean(row.單位) ?? '';
    const address = clean(row.地址) ?? '';
    const key = `${normalize(stationId)}|${normalize(unitName)}|${normalize(address)}`;
    if (seen.has(key)) {
      duplicateRows.push({ rowNumber: index + 2, fields: ['duplicate'] });
      return;
    }
    seen.add(key);
    if (stationId) stationIdCounts.set(stationId, (stationIdCounts.get(stationId) ?? 0) + 1);

    const districtCode = normalizeDistrictCode(row.行政區域代碼);
    const districtFromCode = districtCode ? districtByCode[districtCode] : undefined;
    const district = normalizeTaipeiDistrict(clean(row.行政區) ?? districtFromCode ?? '');
    if (district && districtFromCode && district !== districtFromCode) {
      conflicts.push({ rowNumber: index + 2, district, districtCode, districtFromCode });
    }

    const exact = locationById.get(normalize(stationId)) ?? locationByNameAddress.get(`${normalize(unitName)}|${normalize(address)}`);
    const rawCategory = clean(row.備註);
    const category = classifyElectricMotorcycleChargingLocationCategory(rawCategory);
    facilities.push({
      id: `electric_motorcycle_charging_station-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'electric_motorcycle_charging_station',
      district,
      address,
      longitude: exact?.longitude ?? 0,
      latitude: exact?.latitude ?? 0,
      locationPrecision: exact ? 'exact' : 'address_only',
      note: '',
      source: SOURCE_NAME,
      sourceAgency: SOURCE_AGENCY,
      stationId,
      unitName,
      name: unitName,
      city: clean(row.縣市),
      districtCode,
      locationCategoryRaw: rawCategory,
      locationCategory: category,
    });
  });

  const duplicateStationIds = [...stationIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([stationId, count]) => ({ stationId, count }));
  return {
    facilities,
    summary: buildSummary(facilities, duplicateStationIds),
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: rows.length - facilities.length,
      coordinateOutlierRows: 0,
      invalidCoordinateRows: [],
      missingRequiredFields: duplicateRows,
      duplicateStationIds,
      districtCodeConflicts: conflicts,
    } satisfies ConversionSourceReport,
  };
}

export function loadElectricMotorcycleChargingStations(inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir) ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv')) : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  const locations = existsSync(LOCATION_CACHE)
    ? JSON.parse(readFileSync(LOCATION_CACHE, 'utf8')) as ElectricMotorcycleChargingStationLocation[]
    : [];
  return existsSync(path)
    ? convertElectricMotorcycleChargingStationRows(readRows(path), locations, basename(path))
    : convertElectricMotorcycleChargingStationRows([], locations, `${basename(path)} (not found)`);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadElectricMotorcycleChargingStations();
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'electric-motorcycle-charging-stations.json'), converted.facilities);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'electric-motorcycle-charging-station-summary.json'), converted.summary);
  if (!existsSync(LOCATION_CACHE)) writeJson(LOCATION_CACHE, []);
  console.log(`Wrote ${converted.facilities.length} electric motorcycle charging station records`);
}
