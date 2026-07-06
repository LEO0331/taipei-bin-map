import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  ConversionSourceReport,
  Facility,
  GreenSpaceAdopterCategory,
  GreenSpaceAdoptionRecordSummary,
  GreenSpaceAdoptionTargetCategory,
} from '../src/types';
import { normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

type Row = Record<string, string | undefined>;

const SOURCE_NAME = '臺北市行道樹公園綠地廣場認養人資料';
const SOURCE_AGENCY = '臺北市政府工務局公園路燈工程管理處';
const DEFAULT_INPUT = 'C:/Users/150592/Downloads/臺北市行道樹公園綠地廣場認養人資料.csv';
const RAW_DIR = resolve('data/raw/green-space-adoption-records');
const OUTPUT_DIR = resolve('public/data');
const requiredHeaders = ['序號', '管理單位', '行政區', '行政區代碼', '認養標的名稱', '屬性', '認養位置', '認養單位名稱'];
const NOTE = 'This public-environment adoption dataset has location text but no official longitude or latitude. Records are address-only directory entries with district summaries and external map lookup links; they are not exact map markers.';

const cleanText = (value: unknown) => {
  const text = String(value ?? '').replace(/\u3000/g, ' ').trim();
  return text && !['-', '--', 'nan', 'null', 'undefined'].includes(text.toLowerCase()) ? text : undefined;
};
const normalizeText = (value?: string) => (value ?? '').replace(/\s+/g, '').toLowerCase();
const parseSequence = (value: unknown) => {
  const text = cleanText(value);
  const parsed = Number.parseInt(text ?? '', 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const normalizeDistrictCode = (value: unknown) => cleanText(value)?.replace(/\.0$/, '');

export function classifyGreenSpaceAdoptionTarget(raw: string | undefined): GreenSpaceAdoptionTargetCategory {
  const text = raw ?? '';
  if (!text) return 'unknown';
  if (text.includes('行道樹')) return 'street_tree';
  if (text.includes('大型公園')) return 'large_park';
  if (text.includes('公園')) return 'park';
  if (text.includes('綠地')) return 'green_space';
  if (text.includes('綠帶')) return 'green_belt';
  if (text.includes('廣場')) return 'plaza';
  if (text.includes('植栽') || text.includes('花台')) return 'planter';
  if (text.includes('安全島')) return 'traffic_island';
  if (text.includes('圓環')) return 'roundabout';
  return 'other';
}

export function classifyGreenSpaceAdopter(raw: string | undefined): GreenSpaceAdopterCategory {
  const text = raw ?? '';
  if (!text) return 'unknown';
  if (/學校|大學|高中|國中|國小|幼兒園/.test(text)) return 'school';
  if (/基金會|協會|學會|公會|社團法人|財團法人/.test(text)) return 'foundation_or_association';
  if (/里辦公處|社區|管委會|管理委員會/.test(text)) return 'community_organization';
  if (/局|處|所|公所|政府|機關/.test(text)) return 'government_unit';
  if (/公司|股份|有限|企業|銀行|建設|商行|店/.test(text)) return 'company';
  if (/先生|小姐|女士|君$/.test(text) || text.length <= 4) return 'private_individual';
  return 'other';
}

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim(),
  });
  for (const encoding of ['cp950', 'big5'] as const) {
    const parsed = parse(iconv.decode(raw, encoding));
    if (requiredHeaders.every((header) => parsed.meta.fields?.includes(header))) return parsed.data;
  }
  const utf8 = parse(raw.toString('utf8'));
  if (requiredHeaders.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  throw new Error(`Unable to parse ${path}: required headers not found`);
}

function parseRoadName(location?: string) {
  return location?.match(/([^、，,；;()\s]+?(?:路|街|大道|巷|弄|橋|公園))/)?.[1];
}

function hasRangeOrBoundaryText(location?: string) {
  return Boolean(location && /(以東|以西|以南|以北|至|到|起|迄|沿線|部分|區域|周邊|側)/.test(location));
}

function hasIntersectionText(location?: string) {
  return Boolean(location && /(交叉|口|路口|與|及).*(路|街|巷|大道)/.test(location));
}

const countBy = (values: string[]) => {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

function buildSummary(facilities: Facility[]): GreenSpaceAdoptionRecordSummary {
  const districts = countBy(facilities.map((item) => item.district).filter(Boolean));
  const managementUnits = countBy(facilities.map((item) => item.managementUnit).filter(Boolean) as string[]);
  const targetCategories = countBy(facilities.map((item) => item.adoptionTargetCategory ?? 'unknown'));
  const rawAttributes = countBy(facilities.map((item) => item.adoptionTargetAttribute).filter(Boolean) as string[]);
  const adopters = countBy(facilities.map((item) => item.adopterName).filter(Boolean) as string[]);
  const adopterCategories = countBy(facilities.map((item) => item.adopterNameCategory ?? 'unknown'));
  const roads = countBy(facilities.map((item) => item.roadName).filter(Boolean) as string[]);
  const unique = (values: Array<string | undefined>) => new Set(values.filter(Boolean).map(normalizeText)).size;

  return {
    totalRecords: facilities.length,
    districtCount: new Set(facilities.map((item) => item.district).filter(Boolean)).size,
    managementUnitCount: unique(facilities.map((item) => item.managementUnit)),
    uniqueAdoptionTargetCount: unique(facilities.map((item) => item.adoptionTargetName)),
    uniqueAdoptionLocationCount: unique(facilities.map((item) => item.adoptionLocation)),
    uniqueAdopterCount: unique(facilities.map((item) => item.adopterName)),
    streetTreeAdoptionRecordCount: facilities.filter((item) => item.adoptionTargetCategory === 'street_tree').length,
    parkGreenSpaceAdoptionRecordCount: facilities.filter((item) => ['park', 'large_park', 'green_space', 'green_belt', 'plaza'].includes(item.adoptionTargetCategory ?? '')).length,
    mostCommonTargetCategory: targetCategories[0]?.[0] as GreenSpaceAdoptionTargetCategory | undefined,
    districtWithMostRecords: districts[0]?.[0],
    managementUnitWithMostRecords: managementUnits[0]?.[0],
    topAdopterByRecordCount: adopters[0]?.[0],
    byDistrict: districts.map(([district, count]) => ({
      district,
      count,
      uniqueAdopterCount: unique(facilities.filter((item) => item.district === district).map((item) => item.adopterName)),
    })),
    byTargetCategory: targetCategories.map(([targetCategory, count]) => ({ targetCategory: targetCategory as GreenSpaceAdoptionTargetCategory, count })),
    byRawAttribute: rawAttributes.map(([attribute, count]) => ({ attribute, count })),
    byManagementUnit: managementUnits.map(([managementUnit, count]) => ({ managementUnit, count })),
    byAdopter: adopters.slice(0, 50).map(([adopterName, count]) => ({
      adopterName,
      adopterCategory: facilities.find((item) => item.adopterName === adopterName)?.adopterNameCategory ?? 'unknown',
      count,
    })),
    byAdopterCategory: adopterCategories.map(([adopterCategory, count]) => ({ adopterCategory: adopterCategory as GreenSpaceAdopterCategory, count })),
    byRoadName: roads.map(([roadName, count]) => ({ roadName, count })),
    dataQuality: {
      missingSequenceNumberCount: facilities.filter((item) => !item.sourceSequenceNumber).length,
      missingDistrictCount: facilities.filter((item) => !item.district).length,
      missingDistrictCodeCount: facilities.filter((item) => !item.districtCode).length,
      missingTargetNameCount: facilities.filter((item) => !item.adoptionTargetName).length,
      missingAttributeCount: facilities.filter((item) => !item.adoptionTargetAttribute).length,
      missingLocationCount: facilities.filter((item) => !item.adoptionLocation).length,
      missingAdopterNameCount: facilities.filter((item) => !item.adopterName).length,
      rangeOrBoundaryTextCount: facilities.filter((item) => item.locationTextHasRangeOrBoundary).length,
      intersectionTextCount: facilities.filter((item) => item.locationTextHasIntersection).length,
    },
  };
}

export function convertGreenSpaceAdoptionRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
  const facilities = rows.map((row, index) => {
    const rowNumber = index + 2;
    const sequence = parseSequence(row['序號']);
    const managementUnit = cleanText(row['管理單位']);
    const district = normalizeTaipeiDistrict(cleanText(row['行政區']) ?? '');
    const districtCode = normalizeDistrictCode(row['行政區代碼']);
    const adoptionTargetName = cleanText(row['認養標的名稱']);
    const adoptionTargetAttribute = cleanText(row['屬性']);
    const adoptionLocation = cleanText(row['認養位置']);
    const adopterName = cleanText(row['認養單位名稱']);
    const missing = [
      !sequence ? '序號' : '',
      !managementUnit ? '管理單位' : '',
      !district ? '行政區' : '',
      !districtCode ? '行政區代碼' : '',
      !adoptionTargetName ? '認養標的名稱' : '',
      !adoptionTargetAttribute ? '屬性' : '',
      !adoptionLocation ? '認養位置' : '',
      !adopterName ? '認養單位名稱' : '',
    ].filter(Boolean);
    if (missing.length) missingRequiredFields.push({ rowNumber, fields: missing });

    const roadName = parseRoadName(adoptionLocation);
    const adoptionTargetCategory = classifyGreenSpaceAdoptionTarget(adoptionTargetAttribute);
    const adopterNameCategory = classifyGreenSpaceAdopter(adopterName);
    return {
      id: `green_space_adoption_record-${String(index + 1).padStart(4, '0')}`,
      type: 'green_space_adoption_record',
      district,
      districtNormalized: normalizeText(district),
      districtCode,
      districtCodeNormalized: districtCode,
      address: adoptionLocation ?? '',
      addressNormalized: normalizeText(adoptionLocation),
      longitude: 0,
      latitude: 0,
      locationPrecision: 'address_only',
      coordinateStatus: 'missing',
      note: NOTE,
      source: SOURCE_NAME,
      sourceAgency: SOURCE_AGENCY,
      sourceSequenceNumber: sequence,
      sourceSequenceNumberNormalized: sequence ? String(sequence) : undefined,
      managementUnit,
      managementUnitNormalized: normalizeText(managementUnit),
      adoptionTargetName,
      adoptionTargetNameNormalized: normalizeText(adoptionTargetName),
      adoptionTargetAttribute,
      adoptionTargetCategory,
      adoptionLocation,
      adoptionLocationNormalized: normalizeText(adoptionLocation),
      roadName,
      hasParsedRoadName: Boolean(roadName),
      locationTextHasRangeOrBoundary: hasRangeOrBoundaryText(adoptionLocation),
      locationTextHasIntersection: hasIntersectionText(adoptionLocation),
      adopterName,
      adopterNameNormalized: normalizeText(adopterName),
      adopterNameCategory,
      name: adoptionTargetName,
      googleMapsQuery: [adoptionLocation, adoptionTargetName].filter(Boolean).join(' '),
      sourceRecordHash: normalizeText([sequence, managementUnit, district, districtCode, adoptionTargetName, adoptionLocation, adopterName].join('|')),
    } satisfies Facility;
  });

  return {
    facilities,
    summary: buildSummary(facilities),
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: 0,
      coordinateOutlierRows: 0,
      invalidCoordinateRows: [],
      missingRequiredFields,
    } satisfies ConversionSourceReport,
  };
}

export function loadGreenSpaceAdoptionRecords(inputPath = DEFAULT_INPUT, rawDir = RAW_DIR) {
  const rawFile = existsSync(rawDir) ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv')) : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  return existsSync(path)
    ? convertGreenSpaceAdoptionRows(readRows(path), basename(path))
    : convertGreenSpaceAdoptionRows([], `${basename(path)} (not found)`);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadGreenSpaceAdoptionRecords();
  writeJson(resolve(OUTPUT_DIR, 'green-space-adoption-records/records.json'), converted.facilities);
  writeJson(resolve(OUTPUT_DIR, 'green-space-adoption-records/summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} green-space adoption records`);
}
