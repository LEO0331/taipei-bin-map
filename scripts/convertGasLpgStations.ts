import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  ConversionSourceReport,
  CoordinateStatus,
  Facility,
  FuelStationServiceType,
  FuelStationStatus,
  GasLpgStationSummary,
} from '../src/types';
import { TAIPEI_BOUNDS, normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

type Row = Record<string, string | undefined>;

const RAW_DIR = resolve('data/raw/gas-lpg-stations');
const OUTPUT_DIR = resolve('public/data');
const SOURCE = '臺北市加油站及加氣站分布圖';
const SOURCE_AGENCY = '臺北市政府產業發展局';
const HEADERS = ['CITYZONE', 'NAME', 'S_NAME', 'SUPPLIER', 'ADDRESS', '電話', 'DUTY_TIME', 'HAVEOIL', 'HAVEGAS', 'HAVESELF', 'ADDR_X', 'ADDR_Y'];

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return !text || text.toLowerCase() === 'nan' ? undefined : text;
};
const normalize = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const numberFrom = (value: unknown) => {
  const parsed = Number.parseFloat(clean(value) ?? '');
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function parseSourceBooleanY(raw: unknown) {
  return String(raw ?? '').trim().toUpperCase() === 'Y';
}

export function deriveFuelStationServiceTypes(record: {
  hasOil: boolean;
  hasLpg: boolean;
  hasSelfService: boolean;
}): FuelStationServiceType[] {
  return [
    record.hasOil ? 'gasoline' : undefined,
    record.hasLpg ? 'lpg' : undefined,
    record.hasSelfService ? 'self_service' : undefined,
  ].filter(Boolean) as FuelStationServiceType[];
}

export function deriveFuelStationStatus(stationName: string | undefined): FuelStationStatus {
  const text = stationName?.trim() ?? '';
  if (!text) return 'unknown';
  return text.includes('終止營業') || text.includes('停業') ? 'terminated' : 'active_or_unspecified';
}

export function parseBusinessHours(raw: unknown) {
  const businessHoursRaw = clean(raw);
  if (!businessHoursRaw) return {};
  return {
    businessHoursRaw,
    businessHours: businessHoursRaw,
    isTwentyFourHours: businessHoursRaw.includes('24小時'),
    hasLimitedHours: /\d{1,2}\s*[~-]\s*\d{1,2}\s*時/.test(businessHoursRaw),
  };
}

export function convertTwd97ToWgs84(x: number, y: number) {
  const a = 6378137;
  const b = 6356752.314245;
  const lon0 = 121 * Math.PI / 180;
  const k0 = 0.9999;
  const dx = 250000;
  const e = Math.sqrt(1 - (b * b) / (a * a));
  const x1 = x - dx;
  const m = y / k0;
  const mu = m / (a * (1 - e ** 2 / 4 - 3 * e ** 4 / 64 - 5 * e ** 6 / 256));
  const e1 = (1 - Math.sqrt(1 - e ** 2)) / (1 + Math.sqrt(1 - e ** 2));
  const j1 = 3 * e1 / 2 - 27 * e1 ** 3 / 32;
  const j2 = 21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32;
  const j3 = 151 * e1 ** 3 / 96;
  const j4 = 1097 * e1 ** 4 / 512;
  const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);
  const e2 = e ** 2 / (1 - e ** 2);
  const c1 = e2 * Math.cos(fp) ** 2;
  const t1 = Math.tan(fp) ** 2;
  const r1 = a * (1 - e ** 2) / (1 - e ** 2 * Math.sin(fp) ** 2) ** 1.5;
  const n1 = a / Math.sqrt(1 - e ** 2 * Math.sin(fp) ** 2);
  const d = x1 / (n1 * k0);
  const q1 = n1 * Math.tan(fp) / r1;
  const q2 = d ** 2 / 2;
  const q3 = (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * e2) * d ** 4 / 24;
  const q4 = (61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * e2 - 3 * c1 ** 2) * d ** 6 / 720;
  const lat = fp - q1 * (q2 - q3 + q4);
  const q5 = d;
  const q6 = (1 + 2 * t1 + c1) * d ** 3 / 6;
  const q7 = (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * e2 + 24 * t1 ** 2) * d ** 5 / 120;
  const lon = lon0 + (q5 - q6 + q7) / Math.cos(fp);
  return { longitude: lon * 180 / Math.PI, latitude: lat * 180 / Math.PI };
}

function coordinateStatus(longitude?: number, latitude?: number): CoordinateStatus {
  if (longitude === undefined || latitude === undefined) return 'missing';
  return longitude < TAIPEI_BOUNDS.minLng ||
    longitude > TAIPEI_BOUNDS.maxLng ||
    latitude < TAIPEI_BOUNDS.minLat ||
    latitude > TAIPEI_BOUNDS.maxLat
    ? 'outlier'
    : 'valid';
}

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim(),
  });
  const utf8 = parse(raw.toString('utf8'));
  if (HEADERS.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  return parse(iconv.decode(raw, 'cp950')).data;
}

function buildSummary(facilities: Facility[]): GasLpgStationSummary {
  const suppliers = [...new Set(facilities.map((item) => item.supplier).filter(Boolean) as string[])];
  const districts = [...new Set(facilities.map((item) => item.district).filter(Boolean))];
  const serviceTypes: FuelStationServiceType[] = ['gasoline', 'lpg', 'self_service'];
  return {
    totalRecords: facilities.length,
    districtCount: districts.length,
    supplierCount: suppliers.length,
    validCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'valid').length,
    missingCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'missing').length,
    outlierCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'outlier').length,
    oilStationCount: facilities.filter((item) => item.hasOil).length,
    lpgStationCount: facilities.filter((item) => item.hasLpg).length,
    selfServiceStationCount: facilities.filter((item) => item.hasSelfService).length,
    terminatedStationCount: facilities.filter((item) => item.stationStatus === 'terminated').length,
    twentyFourHourRecordCount: facilities.filter((item) => item.isTwentyFourHours).length,
    limitedHourRecordCount: facilities.filter((item) => item.hasLimitedHours).length,
    recordsWithPhone: facilities.filter((item) => item.phone).length,
    recordsWithBusinessHours: facilities.filter((item) => item.businessHoursRaw).length,
    byDistrict: districts.map((district) => {
      const rows = facilities.filter((item) => item.district === district);
      return {
        district,
        totalCount: rows.length,
        oilStationCount: rows.filter((item) => item.hasOil).length,
        lpgStationCount: rows.filter((item) => item.hasLpg).length,
        selfServiceStationCount: rows.filter((item) => item.hasSelfService).length,
        twentyFourHourRecordCount: rows.filter((item) => item.isTwentyFourHours).length,
        topSuppliers: suppliers.map((supplier) => ({ supplier, count: rows.filter((item) => item.supplier === supplier).length })).filter((item) => item.count).sort((a, b) => b.count - a.count).slice(0, 3),
      };
    }).sort((a, b) => b.totalCount - a.totalCount),
    bySupplier: suppliers.map((supplier) => {
      const rows = facilities.filter((item) => item.supplier === supplier);
      return {
        supplier,
        count: rows.length,
        oilStationCount: rows.filter((item) => item.hasOil).length,
        lpgStationCount: rows.filter((item) => item.hasLpg).length,
        selfServiceStationCount: rows.filter((item) => item.hasSelfService).length,
      };
    }).sort((a, b) => b.count - a.count),
    byServiceType: serviceTypes.map((serviceType) => ({ serviceType, count: facilities.filter((item) => item.stationServiceTypes?.includes(serviceType)).length })),
    byBusinessHours: [...new Set(facilities.map((item) => item.businessHoursRaw).filter(Boolean) as string[])]
      .map((businessHoursRaw) => ({ businessHoursRaw, count: facilities.filter((item) => item.businessHoursRaw === businessHoursRaw).length }))
      .sort((a, b) => b.count - a.count),
  };
}

export function convertGasLpgStationRows(rows: Row[], fileName = '臺北市加油站及加氣站分布圖.csv') {
  const facilities: Facility[] = [];
  const seen = new Set<string>();
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  const unexpectedBooleanValues: NonNullable<ConversionSourceReport['unexpectedBooleanValues']> = [];
  let droppedRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const district = normalizeTaipeiDistrict(clean(row.CITYZONE) ?? '');
    const companyName = clean(row.NAME);
    const stationName = clean(row.S_NAME);
    const supplier = clean(row.SUPPLIER);
    const address = clean(row.ADDRESS);
    const key = [normalize(stationName), normalize(address), normalize(supplier)].join('|');
    if (seen.has(key)) {
      droppedRows += 1;
      return;
    }
    seen.add(key);

    ['HAVEOIL', 'HAVEGAS', 'HAVESELF'].forEach((field) => {
      const value = clean(row[field]);
      if (value && value.toUpperCase() !== 'Y') unexpectedBooleanValues.push({ rowNumber, field, value });
    });

    const xTwd97 = numberFrom(row.ADDR_X);
    const yTwd97 = numberFrom(row.ADDR_Y);
    const converted = xTwd97 === undefined || yTwd97 === undefined ? undefined : convertTwd97ToWgs84(xTwd97, yTwd97);
    const status = xTwd97 === undefined || yTwd97 === undefined
      ? 'missing'
      : converted
        ? coordinateStatus(converted.longitude, converted.latitude)
        : 'unparsed';
    if (status !== 'valid') {
      invalidCoordinateRows.push({ rowNumber, longitude: clean(row.ADDR_X), latitude: clean(row.ADDR_Y) });
    }

    const hasOil = parseSourceBooleanY(row.HAVEOIL);
    const hasLpg = parseSourceBooleanY(row.HAVEGAS);
    const hasSelfService = parseSourceBooleanY(row.HAVESELF);
    const businessHours = parseBusinessHours(row.DUTY_TIME);
    facilities.push({
      id: `gas_lpg_station-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'gas_lpg_station',
      district,
      address: address ?? '',
      longitude: converted?.longitude ?? 0,
      latitude: converted?.latitude ?? 0,
      coordinateStatus: status,
      isCoordinateOutlier: status === 'outlier',
      note: '',
      source: SOURCE,
      sourceAgency: SOURCE_AGENCY,
      name: stationName,
      companyName,
      stationName,
      supplier,
      phone: clean(row.電話),
      ...businessHours,
      hasOil,
      hasLpg,
      hasSelfService,
      stationServiceTypes: deriveFuelStationServiceTypes({ hasOil, hasLpg, hasSelfService }),
      stationStatus: deriveFuelStationStatus(stationName),
      xTwd97,
      yTwd97,
    });
  });

  const nameCounts = new Map<string, number>();
  facilities.forEach((item) => item.stationName && nameCounts.set(item.stationName, (nameCounts.get(item.stationName) ?? 0) + 1));
  const report: ConversionSourceReport = {
    sourceFilename: fileName,
    totalRows: rows.length,
    validRows: facilities.length,
    droppedRows,
    coordinateOutlierRows: facilities.filter((item) => item.coordinateStatus === 'outlier').length,
    invalidCoordinateRows,
    missingRequiredFields: [],
    unexpectedBooleanValues,
    duplicateStationNames: [...nameCounts.entries()].filter(([, count]) => count > 1).map(([stationName, count]) => ({ stationName, count })),
  };
  return { facilities, summary: buildSummary(facilities), report };
}

export function loadGasLpgStations(rawDir = RAW_DIR) {
  const file = existsSync(rawDir)
    ? readdirSync(rawDir).find((item) => item.toLowerCase().endsWith('.csv'))
    : undefined;
  return file
    ? convertGasLpgStationRows(readRows(resolve(rawDir, file)), file)
    : convertGasLpgStationRows([]);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadGasLpgStations();
  writeJson(resolve(OUTPUT_DIR, 'gas-lpg-stations.json'), converted.facilities);
  writeJson(resolve(OUTPUT_DIR, 'gas-lpg-station-summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} gas/LPG station records`);
}
