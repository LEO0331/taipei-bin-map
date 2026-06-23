import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { ConversionSourceReport, CoordinateStatus, Facility, FamilyFriendlyToiletSummary } from '../src/types';
import { isCoordinateOutlier, normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

const SOURCE_NAME = '臺北市親子友善廁所點位資訊';
const DEFAULT_INPUT = '/Users/Leo/Downloads/臺北市親子友善廁所點位資訊.csv';
const DEFAULT_RAW_DIR = resolve('data/raw/family-friendly-toilets');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
type Row = Record<string, string | undefined>;

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return !text || text.toLowerCase() === 'nan' ? undefined : text;
};
const number = (value: unknown) => {
  const parsed = Number.parseFloat(clean(value) ?? '');
  return Number.isFinite(parsed) ? parsed : undefined;
};
const integer = (value: unknown) => Math.max(0, Number.parseInt(clean(value) ?? '0', 10) || 0);
const normalized = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();

export function parseFamilyFriendlyAward(raw: unknown) {
  const text = String(raw ?? '').trim();
  return text === 'V' || text === 'v' || text.includes('是') || text.includes('有') || text.includes('獲獎');
}

function readRows(path: string) {
  const raw = readFileSync(path);
  const text = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf ? raw.toString('utf8') : iconv.decode(raw, 'cp950');
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, transformHeader: (header) => header.trim() });
  if (parsed.errors.length) throw new Error(parsed.errors.map((error) => error.message).join('\n'));
  return parsed.data;
}

export function convertFamilyFriendlyToiletRows(rows: Row[], publicToilets: Facility[] = [], sourceFilename = SOURCE_NAME) {
  const byNameAddress = new Map(publicToilets.map((item) => [`${normalized(item.name)}|${normalized(item.address)}`, item.id]));
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  let matchedPublicToiletCount = 0;
  const facilities = rows.map((row, index): Facility => {
    const longitudeText = clean(row.經度);
    const latitudeText = clean(row.緯度);
    const longitude = number(longitudeText);
    const latitude = number(latitudeText);
    const coordinateStatus: CoordinateStatus = !longitudeText || !latitudeText
      ? 'missing'
      : longitude === undefined || latitude === undefined
        ? 'unparsed'
        : isCoordinateOutlier(longitude, latitude)
          ? 'outlier'
          : 'valid';
    if (coordinateStatus !== 'valid') invalidCoordinateRows.push({ rowNumber: index + 2, longitude: longitudeText, latitude: latitudeText });
    const toiletName = clean(row.公廁名稱) ?? '';
    const address = clean(row.公廁地址) ?? '';
    const matchedPublicToiletId = byNameAddress.get(`${normalized(toiletName)}|${normalized(address)}`);
    if (matchedPublicToiletId) matchedPublicToiletCount += 1;
    const awardRaw = clean(row.親子友善評鑑獲獎);
    return {
      id: `family_friendly_toilet-${String(index + 1).padStart(4, '0')}`,
      type: 'family_friendly_toilet',
      district: normalizeTaipeiDistrict(clean(row.行政區) ?? ''),
      address,
      longitude: longitude ?? 0,
      latitude: latitude ?? 0,
      note: '',
      source: SOURCE_NAME,
      coordinateStatus,
      ...(coordinateStatus !== 'valid' ? { isCoordinateOutlier: true } : {}),
      name: toiletName,
      toiletName,
      ...(clean(row.公廁編號) ? { toiletId: clean(row.公廁編號) } : {}),
      ...(clean(row.公廁類別) ? { toiletCategory: clean(row.公廁類別) } : {}),
      ...(clean(row.公廁位置) ? { toiletLocation: clean(row.公廁位置) } : {}),
      ...(clean(row.公廁等級) ? { toiletGrade: clean(row.公廁等級) } : {}),
      ...(clean(row.管理單位) ? { manager: clean(row.管理單位) } : {}),
      diaperTableCount: integer(row.尿布臺設置數量),
      childSeatCount: integer(row.兒童座椅設置數量),
      ...(awardRaw ? { familyFriendlyAwardRaw: awardRaw } : {}),
      hasFamilyFriendlyAward: parseFamilyFriendlyAward(awardRaw),
      ...(matchedPublicToiletId ? { matchedPublicToiletId } : {}),
    };
  });
  return {
    facilities,
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: 0,
      coordinateOutlierRows: facilities.filter((item) => item.coordinateStatus === 'outlier').length,
      invalidCoordinateRows,
      missingRequiredFields: [],
      matchedPublicToiletCount,
    } satisfies ConversionSourceReport,
  };
}

export function buildFamilyFriendlyToiletSummary(facilities: Facility[]): FamilyFriendlyToiletSummary {
  const group = (field: 'toiletCategory' | 'toiletGrade' | 'manager') => {
    const counts = new Map<string, number>();
    facilities.forEach((item) => {
      const value = item[field];
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };
  const districts = [...new Set(facilities.map((item) => item.district).filter(Boolean))];
  return {
    totalRecords: facilities.length,
    validCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'valid').length,
    districtCount: districts.length,
    totalDiaperTableCount: facilities.reduce((sum, item) => sum + (item.diaperTableCount ?? 0), 0),
    totalChildSeatCount: facilities.reduce((sum, item) => sum + (item.childSeatCount ?? 0), 0),
    recordsWithDiaperTables: facilities.filter((item) => (item.diaperTableCount ?? 0) > 0).length,
    recordsWithChildSeats: facilities.filter((item) => (item.childSeatCount ?? 0) > 0).length,
    awardRecordCount: facilities.filter((item) => item.hasFamilyFriendlyAward).length,
    byDistrict: districts.map((district) => {
      const items = facilities.filter((item) => item.district === district);
      return {
        district,
        count: items.length,
        diaperTableCount: items.reduce((sum, item) => sum + (item.diaperTableCount ?? 0), 0),
        childSeatCount: items.reduce((sum, item) => sum + (item.childSeatCount ?? 0), 0),
        awardRecordCount: items.filter((item) => item.hasFamilyFriendlyAward).length,
      };
    }).sort((a, b) => b.count - a.count),
    byCategory: group('toiletCategory').map(([toiletCategory, count]) => ({ toiletCategory, count })),
    byGrade: group('toiletGrade').map(([toiletGrade, count]) => ({ toiletGrade, count })),
    byManager: group('manager').map(([manager, count]) => ({ manager, count })),
  };
}

export function loadFamilyFriendlyToilets(publicToilets: Facility[] = [], inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir) ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv')) : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  const converted = existsSync(path)
    ? convertFamilyFriendlyToiletRows(readRows(path), publicToilets, basename(path))
    : convertFamilyFriendlyToiletRows([], publicToilets, `${basename(path)} (not found)`);
  return { ...converted, summary: buildFamilyFriendlyToiletSummary(converted.facilities) };
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const publicToilets = existsSync(resolve(DEFAULT_OUTPUT_DIR, 'public-toilets.json'))
    ? JSON.parse(readFileSync(resolve(DEFAULT_OUTPUT_DIR, 'public-toilets.json'), 'utf8')) as Facility[]
    : [];
  const converted = loadFamilyFriendlyToilets(publicToilets);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'family-friendly-toilets.json'), converted.facilities);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'family-friendly-toilet-summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} family-friendly toilet records`);
}
