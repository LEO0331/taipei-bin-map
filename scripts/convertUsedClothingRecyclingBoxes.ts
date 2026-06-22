import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { ConversionSourceReport, Facility } from '../src/types';
import { isCoordinateOutlier, normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

const SOURCE_NAME = '臺北市社會福利團體(機構)設置舊衣回收設施據點';
const DEFAULT_INPUT = '/Users/Leo/Downloads/臺北市核准設置舊衣回收箱設置清冊(0530).csv';
const DEFAULT_RAW_DIR = resolve('data/raw/used-clothing-recycling-boxes');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
type Row = Record<string, string | undefined>;

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || undefined;
};

function readRows(path: string) {
  const raw = readFileSync(path);
  const text = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf
    ? raw.toString('utf8')
    : iconv.decode(raw, 'cp950');
  const parsed = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length) throw new Error(parsed.errors.map((error) => error.message).join('\n'));
  return parsed.data;
}

export function convertUsedClothingRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];

  const facilities = rows.map((row, index): Facility => {
    const rowNumber = index + 2;
    const longitudeText = clean(row.經度);
    const latitudeText = clean(row.緯度);
    const longitude = Number.parseFloat(longitudeText ?? '');
    const latitude = Number.parseFloat(latitudeText ?? '');
    const invalidCoordinate = !Number.isFinite(longitude) || !Number.isFinite(latitude);
    const district = normalizeTaipeiDistrict(clean(row.行政區) ?? '');
    const approvedLocation = clean(row.臺北市核准地點) ?? '';
    const organizationName = clean(row.團體名稱);

    if (invalidCoordinate) {
      invalidCoordinateRows.push({ rowNumber, longitude: longitudeText, latitude: latitudeText });
    }
    const fields = [district ? '' : '行政區', approvedLocation ? '' : '臺北市核准地點'].filter(Boolean);
    if (fields.length) missingRequiredFields.push({ rowNumber, fields });

    return {
      id: `used_clothing_recycling_box-${String(index + 1).padStart(4, '0')}`,
      type: 'used_clothing_recycling_box',
      district,
      address: approvedLocation,
      longitude: invalidCoordinate ? 0 : longitude,
      latitude: invalidCoordinate ? 0 : latitude,
      note: '',
      source: SOURCE_NAME,
      name: organizationName ?? '舊衣回收箱',
      ...(invalidCoordinate || isCoordinateOutlier(longitude, latitude) ? { isCoordinateOutlier: true } : {}),
      ...(clean(row.核准編號) ? { approvalId: clean(row.核准編號) } : {}),
      ...(clean(row.里別) ? { village: clean(row.里別) } : {}),
      ...(approvedLocation ? { approvedLocation } : {}),
      ...(organizationName ? { organizationName } : {}),
      ...(clean(row.電話) ? { phone: clean(row.電話) } : {}),
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

export function loadUsedClothingRecyclingBoxes(inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir)
    ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv'))
    : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  if (!existsSync(path)) return convertUsedClothingRows([], `${basename(path)} (not found)`);
  return convertUsedClothingRows(readRows(path), basename(path));
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const inputIndex = process.argv.indexOf('--input');
  const input = inputIndex >= 0 ? resolve(process.argv[inputIndex + 1]) : DEFAULT_INPUT;
  const converted = loadUsedClothingRecyclingBoxes(input);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'used-clothing-recycling-boxes.json'), converted.facilities);
  console.log(`Wrote ${converted.facilities.length} used-clothing recycling box records`);
}
