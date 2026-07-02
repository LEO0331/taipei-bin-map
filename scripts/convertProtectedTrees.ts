import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  ConversionSourceReport,
  Facility,
  ProtectedTreeCoordinateQuality,
  ProtectedTreeLocationTypeCategory,
  ProtectedTreeSummary,
  TreeCircumferenceCategory,
  TreeDiameterCategory,
} from '../src/types';

type Row = Record<string, string | undefined>;

const SOURCE_NAME = '臺北市受保護樹木';
const SOURCE_AGENCY = '臺北市政府文化局';
const DEFAULT_INPUT = '/Users/Leo/Downloads/樹籍資料匯出-202603201657.csv';
const DEFAULT_RAW_DIR = resolve('data/raw/protected-trees');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
const requiredHeaders = ['樹木編號', '樹種名稱', '樹種學名', '樹胸徑寬度公尺', '樹胸圍長度公尺', '地址', '緯度', '經度', '管理單位', '英文名'];
const NOTE = '臺北市受保護樹木資料僅供位置查詢、城市自然與公共環境資料探索使用；不代表即時樹木健康、倒塌風險、修剪移植許可、土地權屬或維護進度。';

const districts = ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'];

export const cleanProtectedTreeText = (value: unknown) => {
  const text = String(value ?? '').replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim();
  return text && !['-', '--', 'nan', 'null', '尚無資料'].includes(text.toLowerCase()) ? text : undefined;
};
const normalize = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const countDuplicates = (values: string[]) => [...new Set(values)]
  .map((value) => ({ value, count: values.filter((item) => item === value).length }))
  .filter((item) => item.count > 1);

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim(),
  });
  const utf8 = parse(raw.toString('utf8'));
  if (requiredHeaders.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  const cp950 = parse(iconv.decode(raw, 'cp950'));
  if (requiredHeaders.every((header) => cp950.meta.fields?.includes(header))) return cp950.data;
  throw new Error(`Unable to parse ${path}: required headers not found`);
}

export function classifyProtectedTreeLocationType(raw: string | undefined): ProtectedTreeLocationTypeCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'missing';
  if (text.includes('公園') || text.includes('綠地')) return 'park_green_space';
  if (text.includes('學校')) return 'school';
  if (text.includes('道路') || text.includes('人行道')) return 'road_sidewalk';
  if (text.includes('公共場所')) return 'public_place';
  if (text.includes('私有住宅')) return 'private_residence';
  if (text.includes('郊山')) return 'suburban_mountain';
  if (text.includes('其他')) return 'other';
  return 'unknown';
}

export function classifyTreeDiameterMeters(value: number | undefined): TreeDiameterCategory {
  if (value == null || !Number.isFinite(value)) return 'missing';
  if (value < 0.5) return 'under_0_5m';
  if (value < 1) return '0_5m_to_1m';
  if (value < 2) return '1m_to_2m';
  if (value < 3) return '2m_to_3m';
  return 'over_3m';
}

export function classifyTreeCircumferenceMeters(value: number | undefined): TreeCircumferenceCategory {
  if (value == null || !Number.isFinite(value)) return 'missing';
  if (value < 1) return 'under_1m';
  if (value < 3) return '1m_to_3m';
  if (value < 5) return '3m_to_5m';
  if (value < 10) return '5m_to_10m';
  return 'over_10m';
}

function parseSize(raw: unknown, kind: 'diameter' | 'circumference') {
  const rawText = cleanProtectedTreeText(raw);
  const value = rawText ? Number.parseFloat(rawText.replace(/,/g, '')) : undefined;
  const valid = value != null && Number.isFinite(value);
  const flags: string[] = [];
  if (!valid) flags.push(`invalid_${kind}`);
  if (valid && value <= 0) flags.push(`${kind}_non_positive`);
  if (kind === 'diameter' && valid && value > 5) flags.push('diameter_over_5m');
  if (kind === 'circumference' && valid && value > 20) flags.push('circumference_over_20m');
  return { raw: rawText, value: valid ? value : undefined, flags };
}

function parseAddress(raw: unknown) {
  const address = cleanProtectedTreeText(raw)?.replace(/^台北市/, '臺北市');
  const taipeiDistrict = districts.find((district) => address?.includes(district));
  const roadName = address?.replace(/^臺北市[^路街道巷弄號]+區/, '').match(/^(.+?[路街道](?:[一二三四五六七八九十\d]+段)?)/)?.[1];
  return {
    address,
    addressNormalized: normalize(address),
    districtFromAddress: taipeiDistrict,
    isTaipeiDistrict: Boolean(taipeiDistrict),
    roadName,
  };
}

function coordinateQuality(lng: number | undefined, lat: number | undefined): ProtectedTreeCoordinateQuality {
  if (lng == null || lat == null) return 'missing';
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return 'invalid';
  if (lng < 121.3 || lng > 121.8 || lat < 24.85 || lat > 25.3) return 'outside_taipei_bounds';
  return 'valid_wgs84_taipei';
}

function mapQuery(facility: Facility) {
  return encodeURIComponent(`${facility.address} ${facility.speciesNameZh ?? ''} 受保護樹木`);
}

function buildSummary(facilities: Facility[]): ProtectedTreeSummary {
  const values = (key: keyof Facility) => facilities.map((item) => item[key]).filter(Boolean) as string[];
  const numbers = (key: keyof Facility) => facilities.map((item) => item[key]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const average = (items: number[]) => items.length ? Math.round((items.reduce((sum, value) => sum + value, 0) / items.length) * 100) / 100 : undefined;
  const diameters = numbers('diameterAtBreastHeightMeters');
  const circumferences = numbers('circumferenceAtBreastHeightMeters');
  const coordinatePairs = values('coordinatePairKey');
  const locationTypes = [...new Set(values('locationType'))];
  const managementUnits = [...new Set(values('managementUnit'))];
  const species = [...new Set(values('speciesNameZh'))];
  return {
    totalRecords: facilities.length,
    uniqueTreeIdCount: new Set(values('treeIdNormalized')).size,
    uniqueSpeciesNameZhCount: species.length,
    uniqueScientificNameCount: new Set(values('scientificNameNormalized')).size,
    uniqueSpeciesNameEnCount: new Set(values('speciesNameEnNormalized')).size,
    uniqueAddressCount: new Set(values('addressNormalized')).size,
    uniqueManagementUnitCount: new Set(values('managementUnitNormalized')).size,
    uniqueCoordinatePairCount: new Set(coordinatePairs).size,
    recordsWithValidCoordinates: facilities.filter((item) => item.coordinateQuality === 'valid_wgs84_taipei').length,
    recordsWithLocationType: facilities.filter((item) => item.locationTypeCategory !== 'missing').length,
    recordsWithParsedDistrictFromAddress: facilities.filter((item) => Boolean(item.districtFromAddress)).length,
    minDiameterMeters: diameters.length ? Math.min(...diameters) : undefined,
    maxDiameterMeters: diameters.length ? Math.max(...diameters) : undefined,
    averageDiameterMeters: average(diameters),
    minCircumferenceMeters: circumferences.length ? Math.min(...circumferences) : undefined,
    maxCircumferenceMeters: circumferences.length ? Math.max(...circumferences) : undefined,
    averageCircumferenceMeters: average(circumferences),
    byDistrict: districts.map((district) => {
      const rows = facilities.filter((item) => item.district === district);
      return { district, treeCount: rows.length, uniqueSpeciesCount: new Set(rows.map((item) => item.speciesNameZh)).size, uniqueAddressCount: new Set(rows.map((item) => item.addressNormalized)).size };
    }).filter((item) => item.treeCount > 0).sort((a, b) => b.treeCount - a.treeCount),
    bySpecies: species.map((speciesNameZh) => {
      const rows = facilities.filter((item) => item.speciesNameZh === speciesNameZh);
      return { speciesNameZh, scientificName: rows[0].scientificName, speciesNameEn: rows[0].speciesNameEn, treeCount: rows.length, districtCount: new Set(rows.map((item) => item.district)).size };
    }).sort((a, b) => b.treeCount - a.treeCount),
    byLocationType: locationTypes.map((locationType) => {
      const rows = facilities.filter((item) => item.locationType === locationType);
      return { locationType, locationTypeCategory: rows[0].locationTypeCategory ?? 'unknown', treeCount: rows.length, uniqueSpeciesCount: new Set(rows.map((item) => item.speciesNameZh)).size };
    }).sort((a, b) => b.treeCount - a.treeCount),
    byManagementUnit: managementUnits.map((managementUnit) => {
      const rows = facilities.filter((item) => item.managementUnit === managementUnit);
      return { managementUnit, treeCount: rows.length, uniqueSpeciesCount: new Set(rows.map((item) => item.speciesNameZh)).size, districtCount: new Set(rows.map((item) => item.district)).size };
    }).sort((a, b) => b.treeCount - a.treeCount),
    byDiameterCategory: [...new Set(facilities.map((item) => item.diameterCategory ?? 'missing'))].map((diameterCategory) => ({ diameterCategory, treeCount: facilities.filter((item) => item.diameterCategory === diameterCategory).length })),
    byCircumferenceCategory: [...new Set(facilities.map((item) => item.circumferenceCategory ?? 'missing'))].map((circumferenceCategory) => ({ circumferenceCategory, treeCount: facilities.filter((item) => item.circumferenceCategory === circumferenceCategory).length })),
    coordinateQuality: {
      validWgs84Taipei: facilities.filter((item) => item.coordinateQuality === 'valid_wgs84_taipei').length,
      outsideTaipeiBounds: facilities.filter((item) => item.coordinateQuality === 'outside_taipei_bounds').length,
      invalid: facilities.filter((item) => item.coordinateQuality === 'invalid').length,
      missing: facilities.filter((item) => item.coordinateQuality === 'missing').length,
      duplicateCoordinatePairCount: coordinatePairs.length - new Set(coordinatePairs).size,
    },
    dataQuality: {
      missingTreeIdCount: facilities.filter((item) => !item.treeId).length,
      duplicateTreeIdCount: countDuplicates(values('treeIdNormalized')).length,
      missingLocationTypeCount: facilities.filter((item) => item.locationTypeCategory === 'missing').length,
      invalidDiameterCount: facilities.filter((item) => item.sizeDataQualityFlags?.includes('invalid_diameter')).length,
      suspiciousDiameterCount: facilities.filter((item) => item.sizeDataQualityFlags?.includes('diameter_over_5m')).length,
      invalidCircumferenceCount: facilities.filter((item) => item.sizeDataQualityFlags?.includes('invalid_circumference')).length,
      suspiciousCircumferenceCount: facilities.filter((item) => item.sizeDataQualityFlags?.includes('circumference_over_20m')).length,
      duplicateAddressCount: countDuplicates(values('addressNormalized')).length,
    },
  };
}

export function convertProtectedTreeRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const facilities: Facility[] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  const addressParseWarnings: ConversionSourceReport['addressParseWarnings'] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const treeId = cleanProtectedTreeText(row.樹木編號);
    const speciesNameZh = cleanProtectedTreeText(row.樹種名稱);
    const scientificName = cleanProtectedTreeText(row.樹種學名);
    const speciesNameEn = cleanProtectedTreeText(row.英文名);
    const managementUnit = cleanProtectedTreeText(row.管理單位);
    const address = parseAddress(row.地址);
    const diameter = parseSize(row.樹胸徑寬度公尺, 'diameter');
    const circumference = parseSize(row.樹胸圍長度公尺, 'circumference');
    const latitude = Number.parseFloat(cleanProtectedTreeText(row.緯度) ?? '');
    const longitude = Number.parseFloat(cleanProtectedTreeText(row.經度) ?? '');
    const quality = coordinateQuality(longitude, latitude);
    const locationType = cleanProtectedTreeText(row.地理位置名稱);
    const missing = [
      !treeId ? '樹木編號' : '',
      !speciesNameZh ? '樹種名稱' : '',
      !scientificName ? '樹種學名' : '',
      !speciesNameEn ? '英文名' : '',
      !address.address ? '地址' : '',
      !managementUnit ? '管理單位' : '',
    ].filter(Boolean);
    if (missing.length) {
      missingRequiredFields.push({ rowNumber, fields: missing });
      return;
    }
    if (quality !== 'valid_wgs84_taipei') {
      invalidCoordinateRows.push({ rowNumber, longitude: row.經度, latitude: row.緯度, reason: quality });
    }
    if (!address.districtFromAddress) {
      addressParseWarnings.push({ rowNumber, address: address.address, warning: 'missing_taipei_district' });
    }
    const sizeDataQualityFlags = [...diameter.flags, ...circumference.flags];
    if (diameter.value && circumference.value) {
      const ratio = circumference.value / diameter.value;
      if (ratio < 2.5 || ratio > 4) sizeDataQualityFlags.push('circumference_diameter_ratio_review');
    }
    const facility: Facility = {
      id: `protected_tree-${treeId}`,
      type: 'protected_tree',
      district: address.districtFromAddress ?? '',
      address: address.address ?? '',
      longitude: Number.isFinite(longitude) ? longitude : 0,
      latitude: Number.isFinite(latitude) ? latitude : 0,
      note: NOTE,
      source: SOURCE_NAME,
      sourceAgency: SOURCE_AGENCY,
      locationPrecision: quality === 'valid_wgs84_taipei' ? 'exact' : 'missing',
      coordinateStatus: quality === 'valid_wgs84_taipei' ? 'valid' : quality === 'outside_taipei_bounds' ? 'outlier' : quality === 'missing' ? 'missing' : 'unparsed',
      isCoordinateOutlier: quality === 'outside_taipei_bounds',
      treeId,
      treeIdNormalized: normalize(treeId),
      speciesNameZh,
      speciesNameZhNormalized: normalize(speciesNameZh),
      scientificName,
      scientificNameNormalized: scientificName?.toLowerCase().replace(/\s+/g, ' ').trim(),
      speciesNameEn,
      speciesNameEnNormalized: speciesNameEn?.toLowerCase().replace(/\s+/g, ' ').trim(),
      diameterAtBreastHeightMetersRaw: diameter.raw,
      diameterAtBreastHeightMeters: diameter.value,
      diameterCategory: classifyTreeDiameterMeters(diameter.value),
      circumferenceAtBreastHeightMetersRaw: circumference.raw,
      circumferenceAtBreastHeightMeters: circumference.value,
      circumferenceCategory: classifyTreeCircumferenceMeters(circumference.value),
      sizeDataQualityFlags,
      addressNormalized: address.addressNormalized,
      districtFromAddress: address.districtFromAddress,
      isTaipeiCity: address.isTaipeiDistrict,
      roadName: address.roadName,
      hasParsedRoadName: Boolean(address.roadName),
      locationTypeRaw: locationType,
      locationType: locationType,
      locationTypeCategory: classifyProtectedTreeLocationType(locationType),
      managementUnit,
      managementUnitNormalized: normalize(managementUnit),
      manager: managementUnit,
      coordinateQuality: quality,
      coordinatePairKey: quality === 'valid_wgs84_taipei' ? `${latitude.toFixed(6)},${longitude.toFixed(6)}` : undefined,
    };
    facility.googleMapsQuery = mapQuery(facility);
    facilities.push(facility);
  });

  const duplicateTreeIds = countDuplicates(facilities.map((item) => item.treeIdNormalized).filter(Boolean) as string[]);
  const duplicateAddresses = countDuplicates(facilities.map((item) => item.addressNormalized).filter(Boolean) as string[]);
  return {
    facilities,
    summary: buildSummary(facilities),
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: missingRequiredFields.length,
      coordinateOutlierRows: facilities.filter((item) => item.isCoordinateOutlier).length,
      invalidCoordinateRows,
      missingRequiredFields,
      addressParseWarnings,
      duplicateStationIds: duplicateTreeIds.map(({ value, count }) => ({ stationId: value, count })),
      duplicateAddresses: duplicateAddresses.map(({ value, count }) => ({ address: value, count })),
    } satisfies ConversionSourceReport,
  };
}

function latestCsvInRawDir() {
  if (!existsSync(DEFAULT_RAW_DIR)) return undefined;
  return readdirSync(DEFAULT_RAW_DIR)
    .filter((name) => name.endsWith('.csv'))
    .sort()
    .at(-1);
}

export function loadProtectedTrees(inputPath = resolve(DEFAULT_RAW_DIR, latestCsvInRawDir() ?? ''), fallbackPath = DEFAULT_INPUT) {
  const sourcePath = existsSync(inputPath) ? inputPath : fallbackPath;
  const rows = readRows(sourcePath);
  return convertProtectedTreeRows(rows, basename(sourcePath));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const outputDir = resolve(process.argv[2] ?? DEFAULT_OUTPUT_DIR);
  mkdirSync(outputDir, { recursive: true });
  const { facilities, summary } = loadProtectedTrees();
  writeFileSync(resolve(outputDir, 'protected-trees.json'), `${JSON.stringify(facilities, null, 2)}\n`);
  writeFileSync(resolve(outputDir, 'protected-tree-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Generated ${facilities.length} protected tree records.`);
}
