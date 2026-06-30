import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { CommunityRecyclingStationSummary, ConversionSourceReport, Facility } from '../src/types';
import { normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

type Row = Record<string, string | undefined>;

const SOURCE_NAME = '臺北市社區資源回收站資訊';
const SOURCE_AGENCY = '臺北市政府環境保護局';
const DEFAULT_INPUT = '/Users/Leo/Downloads/臺北市社區資源回收站資訊.csv';
const DEFAULT_RAW_DIR = resolve('data/raw/community-recycling-stations');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
const requiredHeaders = ['編號', '回收站名稱', '行政區', '行政區代碼', '地址'];
const NOTE = '社區資源回收站資訊為歷年接受補助輔導社區資料，僅供查詢來源欄位使用；實際開放狀態、可回收項目、使用規定與最新資訊請以現場公告、社區管理單位或主管機關公告為準。';

export const cleanCommunityText = (value: unknown) => {
  const text = String(value ?? '').replace(/\u3000/g, ' ').trim();
  return text && !['-', '--', 'nan', 'null'].includes(text.toLowerCase()) ? text : undefined;
};
const normalizeText = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const parseIntegerText = (value: unknown) => {
  const parsed = Number.parseInt((cleanCommunityText(value) ?? '').replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const parseDistrictCode = (value: unknown) => cleanCommunityText(value)?.replace(/\.0$/, '');

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim(),
  });
  const cp950 = parse(iconv.decode(raw, 'cp950'));
  if (requiredHeaders.every((header) => cp950.meta.fields?.includes(header))) return cp950.data;
  const utf8 = parse(raw.toString('utf8'));
  if (requiredHeaders.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  throw new Error(`Unable to parse ${path}: required headers not found`);
}

export function parseCommunityRecyclingStationAddress(raw: unknown, sourceDistrict?: string) {
  const address = cleanCommunityText(raw)?.replace(/^台北市/, '臺北市');
  const districtFromAddress = address?.match(/[臺台]北市([^路街道巷弄號]+區)/)?.[1];
  const roadName = address?.replace(/^臺北市[^路街道巷弄號]+區/, '').match(/^(.+?[路街道](?:[一二三四五六七八九十\d]+段)?)/)?.[1];
  const district = sourceDistrict && districtFromAddress && sourceDistrict !== districtFromAddress ? districtFromAddress : undefined;
  return {
    address,
    addressNormalized: normalizeText(address),
    districtFromAddress,
    roadName,
    warning: district ? 'district_mismatch_between_source_and_address' : undefined,
  };
}

function buildSummary(facilities: Facility[]): CommunityRecyclingStationSummary {
  const countBy = (values: string[]) => [...new Set(values)].map((value) => ({ value, count: values.filter((item) => item === value).length }));
  const stationNames = facilities.map((item) => item.stationName).filter(Boolean) as string[];
  const addresses = facilities.map((item) => item.address).filter(Boolean);
  const roads = facilities.map((item) => item.roadName).filter(Boolean) as string[];
  const districts = [...new Set(facilities.map((item) => item.district).filter(Boolean))];
  return {
    totalRecords: facilities.length,
    districtCount: districts.length,
    uniqueStationNameCount: new Set(stationNames.map(normalizeText)).size,
    uniqueAddressCount: new Set(addresses.map(normalizeText)).size,
    recordsWithAddress: facilities.filter((item) => item.hasAddress).length,
    recordsWithParsedRoadName: facilities.filter((item) => item.hasParsedRoadName).length,
    byDistrict: districts.map((district) => {
      const rows = facilities.filter((item) => item.district === district);
      return {
        district,
        stationCount: rows.length,
        uniqueAddressCount: new Set(rows.map((item) => normalizeText(item.address)).filter(Boolean)).size,
      };
    }).sort((a, b) => b.stationCount - a.stationCount),
    byRoadName: countBy(roads).map(({ value, count }) => ({ roadName: value, count })).sort((a, b) => b.count - a.count),
    duplicateStationNames: countBy(stationNames).filter((item) => item.count > 1).map(({ value, count }) => ({ stationName: value, count })),
    duplicateAddresses: countBy(addresses).filter((item) => item.count > 1).map(({ value, count }) => ({ address: value, count })),
  };
}

export function convertCommunityRecyclingStationRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const facilities: Facility[] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
  const addressParseWarnings: ConversionSourceReport['addressParseWarnings'] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const stationName = cleanCommunityText(row.回收站名稱);
    const district = normalizeTaipeiDistrict(cleanCommunityText(row.行政區) ?? '');
    const districtCode = parseDistrictCode(row.行政區代碼);
    const parsedAddress = parseCommunityRecyclingStationAddress(row.地址, district);
    const missing = [
      !stationName ? '回收站名稱' : '',
      !district ? '行政區' : '',
      !districtCode ? '行政區代碼' : '',
      !parsedAddress.address ? '地址' : '',
    ].filter(Boolean);
    if (missing.length) {
      missingRequiredFields.push({ rowNumber, fields: missing });
      return;
    }
    if (parsedAddress.warning) {
      addressParseWarnings.push({ rowNumber, address: parsedAddress.address, warning: parsedAddress.warning });
    }

    const address = parsedAddress.address ?? '';
    facilities.push({
      id: `community_recycling_station-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'community_recycling_station',
      district,
      districtNormalized: normalizeText(district),
      districtCode,
      districtCodeNormalized: districtCode,
      address,
      addressNormalized: parsedAddress.addressNormalized,
      roadName: parsedAddress.roadName,
      hasAddress: Boolean(address),
      hasParsedRoadName: Boolean(parsedAddress.roadName),
      longitude: 0,
      latitude: 0,
      locationPrecision: 'address_only',
      note: NOTE,
      source: SOURCE_NAME,
      sourceAgency: SOURCE_AGENCY,
      sourceSequenceNumber: parseIntegerText(row.編號),
      stationName,
      stationNameNormalized: normalizeText(stationName),
      name: stationName,
      googleMapsQuery: [address, stationName].filter(Boolean).join(' '),
      sourceRecordHash: normalizeText([row.編號, stationName, district, districtCode, address].join('|')),
    });
  });

  const summary = buildSummary(facilities);
  return {
    facilities,
    summary,
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: rows.length - facilities.length,
      coordinateOutlierRows: 0,
      invalidCoordinateRows: [],
      missingRequiredFields,
      addressParseWarnings,
      duplicateStationNames: summary.duplicateStationNames,
      duplicateAddresses: summary.duplicateAddresses,
    } satisfies ConversionSourceReport,
  };
}

export function loadCommunityRecyclingStations(inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir) ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv')) : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  return existsSync(path)
    ? convertCommunityRecyclingStationRows(readRows(path), basename(path))
    : convertCommunityRecyclingStationRows([], `${basename(path)} (not found)`);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadCommunityRecyclingStations();
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'community-recycling-stations.json'), converted.facilities);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'community-recycling-station-summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} community recycling station records`);
}
