import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  CommercialEvChargingSwapStationLocation,
  CommercialEvChargingSwapStationSummary,
  CommercialEvServiceType,
  ConversionSourceReport,
  Facility,
} from '../src/types';
import { normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

const SOURCE_NAME = '臺北市營利型電動車充換電站資訊';
const SOURCE_AGENCY = '臺北市政府產業發展局';
const RAW_DIR = resolve('data/raw/commercial-ev-charging-swap-stations');
const OUTPUT_DIR = resolve('public/data');
const LOCATION_CACHE = resolve(OUTPUT_DIR, 'commercial-ev-charging-swap-station-locations.json');
const headers = ['序號', '廠商', '名稱', '地址', '縣市', '縣市代碼'];
type Row = Record<string, string | undefined>;

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return !text || text.toLowerCase() === 'nan' ? undefined : text;
};
const normalize = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const normalizeCityCode = (value: unknown) => clean(value)?.replace(/\.0$/, '');
const normalizeAddress = (value: unknown) => clean(value)?.replace(/^台北市/, '臺北市');

export function classifyCommercialEvServiceType(fileName: string): CommercialEvServiceType {
  if (fileName.includes('營利電動機車換電站')) return 'electric_motorcycle_battery_swap';
  if (fileName.includes('營利電動機車充電站')) return 'electric_motorcycle_charging';
  if (fileName.includes('營利電動車充電站')) return 'electric_car_charging';
  return 'unknown';
}

export function parseCommercialEvAddress(raw: unknown) {
  const address = normalizeAddress(raw);
  if (!address) return { warning: 'missing_address' };
  const district = address.match(/(中正|大同|中山|松山|大安|萬華|信義|士林|北投|內湖|南港|文山)區/)?.[0];
  if (district) return { address, addressNormalized: normalize(address), district };
  if (/南港經貿|經貿二路/.test(address)) {
    return { address, addressNormalized: normalize(address), district: '南港區', warning: 'inferred_district_from_high_confidence_hint' };
  }
  return { address, addressNormalized: normalize(address), warning: 'missing_district' };
}

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const cp950 = parse(iconv.decode(raw, 'cp950'));
  if (headers.every((header) => cp950.meta.fields?.includes(header))) return cp950.data;
  return parse(raw.toString('utf8')).data;
}

function buildSummary(facilities: Facility[]): CommercialEvChargingSwapStationSummary {
  const byServiceType = (['electric_car_charging', 'electric_motorcycle_charging', 'electric_motorcycle_battery_swap', 'unknown'] as CommercialEvServiceType[])
    .map((serviceType) => ({ serviceType, count: facilities.filter((item) => item.serviceType === serviceType).length }))
    .filter((item) => item.count > 0);
  const operators = [...new Set(facilities.map((item) => item.operatorName).filter(Boolean) as string[])];
  const districts = [...new Set(facilities.map((item) => item.district).filter(Boolean) as string[])];
  const byOperator = operators.map((operatorName) => {
    const rows = facilities.filter((item) => item.operatorName === operatorName);
    return {
      operatorName,
      count: rows.length,
      serviceTypes: [...new Set(rows.map((item) => item.serviceType).filter(Boolean))] as CommercialEvServiceType[],
    };
  }).sort((a, b) => b.count - a.count);

  return {
    totalRecords: facilities.length,
    electricCarChargingCount: facilities.filter((item) => item.serviceType === 'electric_car_charging').length,
    electricMotorcycleChargingCount: facilities.filter((item) => item.serviceType === 'electric_motorcycle_charging').length,
    electricMotorcycleBatterySwapCount: facilities.filter((item) => item.serviceType === 'electric_motorcycle_battery_swap').length,
    uniqueOperatorCount: operators.length,
    districtCount: districts.length,
    recordsWithAddress: facilities.filter((item) => item.address).length,
    recordsWithDistrict: facilities.filter((item) => item.district).length,
    recordsWithInferredDistrict: facilities.filter((item) => item.hasInferredDistrict).length,
    recordsMissingDistrict: facilities.filter((item) => !item.district).length,
    byServiceType,
    byOperator,
    byDistrict: districts.map((district) => {
      const rows = facilities.filter((item) => item.district === district);
      const topOperators = [...new Set(rows.map((item) => item.operatorName).filter(Boolean) as string[])]
        .map((operatorName) => ({ operatorName, count: rows.filter((item) => item.operatorName === operatorName).length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      return {
        district,
        totalCount: rows.length,
        electricCarChargingCount: rows.filter((item) => item.serviceType === 'electric_car_charging').length,
        electricMotorcycleChargingCount: rows.filter((item) => item.serviceType === 'electric_motorcycle_charging').length,
        electricMotorcycleBatterySwapCount: rows.filter((item) => item.serviceType === 'electric_motorcycle_battery_swap').length,
        topOperators,
      };
    }).sort((a, b) => b.totalCount - a.totalCount),
    byCity: [...new Set(facilities.map((item) => item.city).filter(Boolean) as string[])]
      .map((city) => ({ city, count: facilities.filter((item) => item.city === city).length }))
      .sort((a, b) => b.count - a.count),
  };
}

export function convertCommercialEvChargingSwapRows(
  inputs: Array<{ fileName: string; rows: Row[] }>,
  locations: CommercialEvChargingSwapStationLocation[] = [],
) {
  const facilities: Facility[] = [];
  const seen = new Set<string>();
  const reports: ConversionSourceReport[] = [];

  inputs.forEach(({ fileName, rows }) => {
    const serviceType = classifyCommercialEvServiceType(fileName);
    const warnings: NonNullable<ConversionSourceReport['addressParseWarnings']> = [];
    const duplicates: ConversionSourceReport['missingRequiredFields'] = [];
    const sourceStartCount = facilities.length;
    rows.forEach((row, index) => {
      const address = parseCommercialEvAddress(row.地址);
      const operatorName = clean(row.廠商);
      const stationName = clean(row.名稱) ?? '';
      const key = [serviceType, normalize(operatorName), normalize(stationName), address.addressNormalized ?? normalize(address.address)].join('|');
      if (seen.has(key)) {
        duplicates.push({ rowNumber: index + 2, fields: ['duplicate'] });
        return;
      }
      seen.add(key);
      if (address.warning) warnings.push({ rowNumber: index + 2, address: address.address, warning: address.warning });
      const exact = locations.find((item) =>
        [item.serviceType, normalize(item.operatorName), normalize(item.stationName), normalize(item.address)].join('|') === key
      );
      facilities.push({
        id: `commercial_ev_charging_swap_station-${String(facilities.length + 1).padStart(4, '0')}`,
        type: 'commercial_ev_charging_swap_station',
        district: address.district ? normalizeTaipeiDistrict(address.district) : '',
        address: address.address ?? '',
        longitude: exact?.longitude ?? 0,
        latitude: exact?.latitude ?? 0,
        locationPrecision: exact ? 'exact' : 'address_only',
        note: '',
        source: SOURCE_NAME,
        sourceAgency: SOURCE_AGENCY,
        sourceResourceName: fileName.replace(/-\d+站\.csv$/, ''),
        sourceFileName: fileName,
        sourceSequenceNumber: Number.parseInt(clean(row.序號) ?? '', 10) || undefined,
        serviceType,
        operatorName,
        stationName,
        name: stationName,
        city: clean(row.縣市)?.replace(/^台北市$/, '臺北市'),
        cityCode: normalizeCityCode(row.縣市代碼),
        addressNormalized: address.addressNormalized,
        hasInferredDistrict: address.warning === 'inferred_district_from_high_confidence_hint',
      });
    });

    reports.push({
      sourceFilename: fileName,
      totalRows: rows.length,
      validRows: facilities.length - sourceStartCount,
      droppedRows: rows.length - (facilities.length - sourceStartCount),
      coordinateOutlierRows: 0,
      invalidCoordinateRows: [],
      missingRequiredFields: duplicates,
      addressParseWarnings: warnings,
      unknownServiceTypeFiles: serviceType === 'unknown' ? [fileName] : [],
    });
  });

  return { facilities, summary: buildSummary(facilities), reports };
}

export function loadCommercialEvChargingSwapStations(rawDir = RAW_DIR) {
  const locations = existsSync(LOCATION_CACHE)
    ? JSON.parse(readFileSync(LOCATION_CACHE, 'utf8')) as CommercialEvChargingSwapStationLocation[]
    : [];
  const inputs = existsSync(rawDir)
    ? readdirSync(rawDir)
      .filter((file) => file.toLowerCase().endsWith('.csv'))
      .sort()
      .map((file) => ({ fileName: file, rows: readRows(resolve(rawDir, file)) }))
    : [];
  return convertCommercialEvChargingSwapRows(inputs, locations);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadCommercialEvChargingSwapStations();
  writeJson(resolve(OUTPUT_DIR, 'commercial-ev-charging-swap-stations.json'), converted.facilities);
  writeJson(resolve(OUTPUT_DIR, 'commercial-ev-charging-swap-station-summary.json'), converted.summary);
  if (!existsSync(LOCATION_CACHE)) writeJson(LOCATION_CACHE, []);
  console.log(`Wrote ${converted.facilities.length} commercial EV charging/swap station records`);
}
