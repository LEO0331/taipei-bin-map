import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  AccessiblePublicParkingFacilitySummary,
  ConversionSourceReport,
  CoordinateSystem,
  Facility,
} from '../src/types';
import { convertTwd97ToWgs84 } from './convertGasLpgStations';
import { normalizeTaipeiDistrict, TAIPEI_BOUNDS } from '../src/utils/facilityUtils';

type Row = Record<string, string | undefined>;
const RAW_DIR = resolve('data/raw/accessible-public-parking-facilities');
const OUTPUT_DIR = resolve('public/data/accessible-public-parking-facilities');
const RECORDS_OUTPUT = resolve(OUTPUT_DIR, 'records.json');
const SUMMARY_OUTPUT = resolve(OUTPUT_DIR, 'summary.json');
const SOURCE = '臺北市公有路外停車場無障礙設施設置情形';
const SOURCE_AGENCY = '交通局停管處';
const HEADERS = ['編號', '行政區', '停車場名稱', '地址', '身心障礙汽車格位統計數值', '身心障礙機車格位統計數值', '無障礙電梯', '無障礙廁所', '無障礙樓梯扶手', 'TMPX', 'TMPY', 'QUERYSERVICECODE'];

const clean = (value: unknown) => {
  const text = String(value ?? '').replace(/\u3000/g, ' ').trim();
  return text && !['-', '--', 'null', 'undefined', 'nan'].includes(text.toLowerCase()) ? text : undefined;
};
export const normalizeAccessibleParkingText = (value: string | undefined) =>
  (value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s,，。．:：;；/\\()[\]{}「」『』]/g, '');

export function parseNonNegativeInteger(value: unknown) {
  const raw = clean(value);
  if (!raw) return { raw: '', value: 0, valid: true };
  if (!/^\d+$/.test(raw)) return { raw, value: 0, valid: false };
  const valueNumber = Number.parseInt(raw, 10);
  return { raw, value: Number.isSafeInteger(valueNumber) ? valueNumber : 0, valid: Number.isSafeInteger(valueNumber) };
}

export type AccessibilityValue = boolean | 'unknown';
export function normalizeAccessibilityValue(value: unknown): AccessibilityValue {
  const raw = normalizeAccessibleParkingText(clean(value));
  if (!raw) return false;
  if (['v', 'y', 'yes', '1', 'true', '有', '是', '設置', '可'].includes(raw)) return true;
  if (['x', 'n', 'no', '0', 'false', '無', '否', '未設置', '不可'].includes(raw)) return false;
  return 'unknown';
}

function readRows(path: string) {
  const bytes = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => String(value).trim(),
    transformHeader: (header) => String(header).replace(/^\uFEFF/, '').trim(),
  });
  const utf8 = parse(bytes.toString('utf8'));
  return HEADERS.every((header) => utf8.meta.fields?.includes(header)) ? utf8.data : parse(iconv.decode(bytes, 'cp950')).data;
}

export function detectAccessiblePublicParkingCoordinates(sourceX: string | undefined, sourceY: string | undefined) {
  const x = Number.parseFloat(sourceX ?? '');
  const y = Number.parseFloat(sourceY ?? '');
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { longitude: 0, latitude: 0, coordinateSystem: 'unknown' as CoordinateSystem, hasValidCoordinates: false, reason: 'missing_or_non_numeric' };
  if (x >= 121.3 && x <= 121.8 && y >= 24.8 && y <= 25.3) {
    const valid = x >= TAIPEI_BOUNDS.minLng && x <= TAIPEI_BOUNDS.maxLng && y >= TAIPEI_BOUNDS.minLat && y <= TAIPEI_BOUNDS.maxLat;
    return { longitude: x, latitude: y, coordinateSystem: 'wgs84' as CoordinateSystem, hasValidCoordinates: valid, reason: valid ? undefined : 'outside_taipei_bounds' };
  }
  if (x >= 250000 && x <= 350000 && y >= 2700000 && y <= 2800000) {
    const converted = convertTwd97ToWgs84(x, y);
    const valid = converted.longitude >= TAIPEI_BOUNDS.minLng && converted.longitude <= TAIPEI_BOUNDS.maxLng && converted.latitude >= TAIPEI_BOUNDS.minLat && converted.latitude <= TAIPEI_BOUNDS.maxLat;
    return { ...converted, coordinateSystem: 'twd97' as CoordinateSystem, hasValidCoordinates: valid, reason: valid ? undefined : 'converted_outside_taipei_bounds' };
  }
  return { longitude: x, latitude: y, coordinateSystem: 'unknown' as CoordinateSystem, hasValidCoordinates: false, reason: 'unrecognized_coordinate_range' };
}

const duplicateCounts = (values: string[]) => [...values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map<string, number>())].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));

export function buildAccessiblePublicParkingSummary(records: Facility[], report: Pick<ConversionSourceReport, 'duplicateSourceIds' | 'duplicateFallbackKeys' | 'invalidNumberValues' | 'unknownAccessibilityValues'>): AccessiblePublicParkingFacilitySummary {
  const districts = [...new Set(records.map((record) => record.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const withFeature = (field: 'hasAccessibleElevator' | 'hasAccessibleToilet' | 'hasAccessibleStairHandrail') => records.filter((record) => record[field] === true).length;
  return {
    totalRecords: records.length,
    validCoordinateCount: records.filter((record) => record.hasValidCoordinates).length,
    invalidCoordinateCount: records.filter((record) => !record.hasValidCoordinates).length,
    districtCount: districts.length,
    totalAccessibleCarSpaceCount: records.reduce((sum, record) => sum + (record.accessibleCarSpaceCount ?? 0), 0),
    totalAccessibleMotorcycleSpaceCount: records.reduce((sum, record) => sum + (record.accessibleMotorcycleSpaceCount ?? 0), 0),
    facilitiesWithAccessibleCarSpaces: records.filter((record) => record.hasAccessibleCarSpaces).length,
    facilitiesWithAccessibleMotorcycleSpaces: records.filter((record) => record.hasAccessibleMotorcycleSpaces).length,
    facilitiesWithAccessibleElevators: withFeature('hasAccessibleElevator'),
    facilitiesWithAccessibleToilets: withFeature('hasAccessibleToilet'),
    facilitiesWithAccessibleStairHandrails: withFeature('hasAccessibleStairHandrail'),
    byDistrict: districts.map((district) => {
      const rows = records.filter((record) => record.district === district);
      return { district, facilityCount: rows.length, accessibleCarSpaceCount: rows.reduce((sum, row) => sum + (row.accessibleCarSpaceCount ?? 0), 0), accessibleMotorcycleSpaceCount: rows.reduce((sum, row) => sum + (row.accessibleMotorcycleSpaceCount ?? 0), 0), elevatorCount: rows.filter((row) => row.hasAccessibleElevator === true).length, toiletCount: rows.filter((row) => row.hasAccessibleToilet === true).length, stairHandrailCount: rows.filter((row) => row.hasAccessibleStairHandrail === true).length };
    }),
    byAccessibilityFeatureCount: [...new Set(records.map((record) => record.accessibilityFeatureCount ?? 0))].sort((a, b) => a - b).map((featureCount) => ({ featureCount, facilityCount: records.filter((record) => record.accessibilityFeatureCount === featureCount).length })),
    dataQuality: { duplicateSourceIdCount: report.duplicateSourceIds?.length ?? 0, duplicateFallbackKeyCount: report.duplicateFallbackKeys?.length ?? 0, invalidNumberCount: report.invalidNumberValues?.length ?? 0, unknownAccessibilityValueCount: report.unknownAccessibilityValues?.length ?? 0 },
  };
}

export function convertAccessiblePublicParkingRows(rows: Row[], sourceFilename = 'accessible-public-parking-facilities.csv') {
  const facilities: Facility[] = [];
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
  const invalidNumberValues: NonNullable<ConversionSourceReport['invalidNumberValues']> = [];
  const unknownAccessibilityValues: NonNullable<ConversionSourceReport['unknownAccessibilityValues']> = [];
  const sourceIds: string[] = [];
  const fallbackKeys: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sourceId = clean(row['編號']);
    const districtName = clean(row['行政區']) ?? '';
    const parkingFacilityName = clean(row['停車場名稱']) ?? '';
    const address = clean(row['地址']) ?? '';
    const car = parseNonNegativeInteger(row['身心障礙汽車格位統計數值']);
    const motorcycle = parseNonNegativeInteger(row['身心障礙機車格位統計數值']);
    const accessibilityFields = [
      ['accessibleElevatorRaw', row['無障礙電梯']],
      ['accessibleToiletRaw', row['無障礙廁所']],
      ['accessibleStairHandrailRaw', row['無障礙樓梯扶手']],
    ] as const;
    const accessibility = accessibilityFields.map(([field, value]) => ({ field, raw: clean(value) ?? '', normalized: normalizeAccessibilityValue(value) }));
    accessibility.forEach(({ field, raw, normalized }) => { if (normalized === 'unknown') unknownAccessibilityValues.push({ rowNumber, field, value: raw }); });
    if (!car.valid) invalidNumberValues.push({ rowNumber, field: '身心障礙汽車格位統計數值', value: car.raw });
    if (!motorcycle.valid) invalidNumberValues.push({ rowNumber, field: '身心障礙機車格位統計數值', value: motorcycle.raw });
    const coordinates = detectAccessiblePublicParkingCoordinates(clean(row.TMPX), clean(row.TMPY));
    if (!coordinates.hasValidCoordinates) invalidCoordinateRows.push({ rowNumber, longitude: clean(row.TMPX), latitude: clean(row.TMPY), reason: coordinates.reason });
    const nameKey = normalizeAccessibleParkingText(parkingFacilityName);
    const addressKey = normalizeAccessibleParkingText(address);
    const fallbackKey = `${nameKey}|${addressKey}`;
    sourceIds.push(sourceId ?? '');
    fallbackKeys.push(fallbackKey);
    const elevator = accessibility[0].normalized;
    const toilet = accessibility[1].normalized;
    const handrail = accessibility[2].normalized;
    const id = sourceId ? `accessible-public-parking-facility-${sourceId}` : `accessible-public-parking-facility-${fallbackKey || `row-${rowNumber}`}`;
    if (!sourceId || !parkingFacilityName || !address) missingRequiredFields.push({ rowNumber, fields: [!sourceId ? '編號' : '', !parkingFacilityName ? '停車場名稱' : '', !address ? '地址' : ''].filter(Boolean) });
    facilities.push({
      id, type: 'accessible_public_parking_facility', district: normalizeTaipeiDistrict(districtName), address, longitude: coordinates.longitude, latitude: coordinates.latitude, locationPrecision: coordinates.hasValidCoordinates ? 'exact' : 'missing', coordinateStatus: coordinates.hasValidCoordinates ? 'valid' : 'unparsed', note: 'Accessibility facility values are source snapshots; they do not indicate live vacancies, operating status, or complete accessibility certification.', source: SOURCE, sourceAgency: SOURCE_AGENCY, name: parkingFacilityName, facilityName: parkingFacilityName, accessiblePublicParkingSourceId: sourceId, sourceId, districtName, parkingFacilityName, parkingFacilityNameNormalized: nameKey, accessibleCarSpaceCountRaw: car.raw, accessibleMotorcycleSpaceCountRaw: motorcycle.raw, accessibleCarSpaceCount: car.value, accessibleMotorcycleSpaceCount: motorcycle.value, hasAccessibleCarSpaces: car.value > 0, hasAccessibleMotorcycleSpaces: motorcycle.value > 0, accessibleElevatorRaw: accessibility[0].raw, accessibleToiletRaw: accessibility[1].raw, accessibleStairHandrailRaw: accessibility[2].raw, hasAccessibleElevator: elevator, hasAccessibleToilet: toilet, hasAccessibleStairHandrail: handrail, accessibilityFeatureCount: [elevator, toilet, handrail].filter((value) => value === true).length, sourceX: clean(row.TMPX), sourceY: clean(row.TMPY), coordinateSystem: coordinates.coordinateSystem, hasValidCoordinates: coordinates.hasValidCoordinates, queryServiceCode: clean(row.QUERYSERVICECODE), addressNormalized: addressKey,
    });
  });
  const duplicateSourceIds = duplicateCounts(sourceIds.filter(Boolean)).map(({ value, count }) => ({ sourceId: value, count }));
  const duplicateFallbackKeys = duplicateCounts(fallbackKeys.filter(Boolean)).map(({ value, count }) => ({ key: value, count }));
  const report: ConversionSourceReport = { sourceFilename, totalRows: rows.length, validRows: facilities.length, droppedRows: 0, coordinateOutlierRows: 0, invalidCoordinateRows, missingRequiredFields, duplicateSourceIds, duplicateFallbackKeys, invalidNumberValues, unknownAccessibilityValues };
  return { facilities, summary: buildAccessiblePublicParkingSummary(facilities, report), report };
}

export function loadAccessiblePublicParkingFacilities() {
  if (!existsSync(RAW_DIR)) return { facilities: [] as Facility[], summary: buildAccessiblePublicParkingSummary([], {}), report: { sourceFilename: 'accessible-public-parking-facilities.csv', totalRows: 0, validRows: 0, droppedRows: 0, coordinateOutlierRows: 0, invalidCoordinateRows: [], missingRequiredFields: [] } satisfies ConversionSourceReport };
  const files = readdirSync(RAW_DIR).filter((file) => file.toLowerCase().endsWith('.csv'));
  if (!files.length) return { facilities: [] as Facility[], summary: buildAccessiblePublicParkingSummary([], {}), report: { sourceFilename: 'accessible-public-parking-facilities.csv', totalRows: 0, validRows: 0, droppedRows: 0, coordinateOutlierRows: 0, invalidCoordinateRows: [], missingRequiredFields: [] } satisfies ConversionSourceReport };
  return convertAccessiblePublicParkingRows(readRows(resolve(RAW_DIR, files[0])), files[0]);
}

function writeJson(path: string, data: unknown) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`); }
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = loadAccessiblePublicParkingFacilities();
  writeJson(RECORDS_OUTPUT, result.facilities);
  writeJson(SUMMARY_OUTPUT, result.summary);
  console.log(`Wrote ${result.facilities.length} accessible public parking facility records to ${RECORDS_OUTPUT}`);
}
