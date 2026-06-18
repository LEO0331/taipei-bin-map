import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { ConversionSourceReport, Facility } from '../src/types';
import { isCoordinateOutlier, normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

const SOURCE_NAME = '臺北市垃圾資源回收、廚餘回收限時收受點';
const DEFAULT_INPUT = '/Users/Leo/Downloads/●115年開放時間 (限時收受點csv) 1150223.csv';
const DEFAULT_RAW_DIR = resolve('data/raw/timed-collection-points');
const DEFAULT_OUTPUT_DIR = resolve('public/data');

type Row = Record<string, string | undefined>;

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || undefined;
};

export function parseTimedCollectionCapabilities(note: string) {
  const acceptsFoodWaste: boolean | 'unknown' = note.includes('不含廚餘')
    ? false
    : note.includes('廚餘')
      ? true
      : 'unknown';

  return {
    acceptsGarbage: note.includes('一般垃圾') ? true : 'unknown' as const,
    acceptsRecycling: /資源回收物|資源回收|資源/.test(note) ? true : 'unknown' as const,
    acceptsFoodWaste,
    ...( /(?:\d{1,2}[：:]\d{2}\s*[~-]\s*\d{1,2}[：:]\d{2}|上午|下午|晚上|每日)/.test(note)
      ? { serviceTimeText: note }
      : {}),
    hasSpecialHours: /限|僅|不含|特殊|例假日|假日|週六|週日|周六|周日|、/.test(note),
  };
}

function readRows(path: string) {
  const parsed = Papa.parse<Row>(iconv.decode(readFileSync(path), 'cp950'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length) throw new Error(parsed.errors.map((error) => error.message).join('\n'));
  return parsed.data;
}

export function convertTimedCollectionRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];

  const facilities = rows.map((row, index): Facility => {
    const rowNumber = index + 2;
    const longitude = Number.parseFloat(clean(row.經度) ?? '');
    const latitude = Number.parseFloat(clean(row.緯度) ?? '');
    const invalidCoordinate = !Number.isFinite(longitude) || !Number.isFinite(latitude);
    const note = clean(row.備註) ?? '';
    const district = normalizeTaipeiDistrict(clean(row.行政區) ?? '');
    const address = clean(row.地址) ?? '';

    if (invalidCoordinate) {
      invalidCoordinateRows.push({ rowNumber, longitude: clean(row.經度), latitude: clean(row.緯度) });
    }
    const fields = [district ? '' : '行政區', address ? '' : '地址'].filter(Boolean);
    if (fields.length) missingRequiredFields.push({ rowNumber, fields });

    return {
      id: `timed_collection_point-${String(index + 1).padStart(4, '0')}`,
      type: 'timed_collection_point',
      district,
      address,
      longitude: invalidCoordinate ? 0 : longitude,
      latitude: invalidCoordinate ? 0 : latitude,
      note,
      source: SOURCE_NAME,
      ...(invalidCoordinate || isCoordinateOutlier(longitude, latitude) ? { isCoordinateOutlier: true } : {}),
      ...(clean(row.分隊) ? { team: clean(row.分隊) } : {}),
      ...(clean(row.電話) ? { phone: clean(row.電話) } : {}),
      ...parseTimedCollectionCapabilities(note),
    };
  });

  return {
    facilities,
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: 0,
      coordinateOutlierRows: facilities.filter((facility) => facility.isCoordinateOutlier).length,
      invalidCoordinateRows,
      missingRequiredFields,
    } satisfies ConversionSourceReport,
  };
}

export function loadTimedCollectionPoints(inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir)
    ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv'))
    : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  if (!existsSync(path)) return convertTimedCollectionRows([], `${basename(path)} (not found)`);
  return convertTimedCollectionRows(readRows(path), basename(path));
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const inputIndex = process.argv.indexOf('--input');
  const input = inputIndex >= 0 ? resolve(process.argv[inputIndex + 1]) : DEFAULT_INPUT;
  const converted = loadTimedCollectionPoints(input);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'timed-collection-points.json'), converted.facilities);
  console.log(`Wrote ${converted.facilities.length} timed collection point records`);
}
