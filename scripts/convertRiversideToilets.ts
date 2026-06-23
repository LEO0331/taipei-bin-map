import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { ConversionSourceReport, CoordinateStatus, Facility, RiversideToiletSummary, RiversideToiletType } from '../src/types';
import { isCoordinateOutlier, normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

const SOURCE_NAME = '臺北市河濱廁所';
const DEFAULT_INPUT = '/Users/Leo/Downloads/115年度河濱公廁點位(含景觀)0209.csv';
const DEFAULT_RAW_DIR = resolve('data/raw/riverside-toilets');
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

export function classifyRiversideToiletType(raw: string | undefined): RiversideToiletType {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('景觀')) return 'scenic';
  if (text.includes('一般')) return 'standard';
  if (text.includes('無障礙')) return 'accessible';
  if (text.includes('固定')) return 'fixed';
  return 'other';
}

function readRows(path: string) {
  const raw = readFileSync(path);
  const text = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf ? raw.toString('utf8') : iconv.decode(raw, 'cp950');
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, transformHeader: (header) => header.trim() });
  if (parsed.errors.length) throw new Error(parsed.errors.map((error) => error.message).join('\n'));
  return parsed.data;
}

export function convertRiversideToiletRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  const facilities = rows.map((row, index): Facility => {
    const longitudeText = clean(row.Longitude);
    const latitudeText = clean(row.Latitude);
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
    const riversidePark = clean(row['Riverside Park']) ?? '';
    const locationDescription = clean(row.Location) ?? '';
    const typeRaw = clean(row.Type);
    return {
      id: `riverside_toilet-${String(index + 1).padStart(4, '0')}`,
      type: 'riverside_toilet',
      district: normalizeTaipeiDistrict(clean(row['Administrative district']) ?? ''),
      address: [riversidePark, locationDescription].filter(Boolean).join(' '),
      longitude: longitude ?? 0,
      latitude: latitude ?? 0,
      note: clean(row.Remark) ?? '',
      source: SOURCE_NAME,
      coordinateStatus,
      ...(coordinateStatus !== 'valid' ? { isCoordinateOutlier: true } : {}),
      ...(clean(row.NO) ? { sourceId: clean(row.NO) } : {}),
      riversidePark,
      locationDescription,
      riversideToiletTypeRaw: typeRaw,
      riversideToiletType: classifyRiversideToiletType(typeRaw),
      ...(clean(row.Remark) ? { remark: clean(row.Remark) } : {}),
      ...(number(row.Long_TWD97) !== undefined ? { longitudeTwd97: number(row.Long_TWD97) } : {}),
      ...(number(row.Lat_WD97) !== undefined ? { latitudeTwd97: number(row.Lat_WD97) } : {}),
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
    } satisfies ConversionSourceReport,
  };
}

export function buildRiversideToiletSummary(facilities: Facility[]): RiversideToiletSummary {
  const count = (field: 'district' | 'riversidePark' | 'riversideToiletType') => {
    const values = new Map<string, number>();
    facilities.forEach((item) => {
      const value = item[field];
      if (value) values.set(value, (values.get(value) ?? 0) + 1);
    });
    return [...values.entries()].sort((a, b) => b[1] - a[1]);
  };
  return {
    totalRecords: facilities.length,
    validCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'valid').length,
    districtCount: new Set(facilities.map((item) => item.district).filter(Boolean)).size,
    riversideParkCount: new Set(facilities.map((item) => item.riversidePark).filter(Boolean)).size,
    byDistrict: count('district').map(([district, amount]) => ({ district, count: amount })),
    byRiversidePark: count('riversidePark').map(([riversidePark, amount]) => ({ riversidePark, count: amount })),
    byType: count('riversideToiletType').map(([type, amount]) => ({
      riversideToiletType: type as RiversideToiletType,
      riversideToiletTypeRaw: facilities.find((item) => item.riversideToiletType === type)?.riversideToiletTypeRaw,
      count: amount,
    })),
  };
}

export function loadRiversideToilets(inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir) ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv')) : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  const converted = existsSync(path)
    ? convertRiversideToiletRows(readRows(path), basename(path))
    : convertRiversideToiletRows([], `${basename(path)} (not found)`);
  return { ...converted, summary: buildRiversideToiletSummary(converted.facilities) };
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadRiversideToilets();
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'riverside-toilets.json'), converted.facilities);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'riverside-toilet-summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} riverside toilet records`);
}
