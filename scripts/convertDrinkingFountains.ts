import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ConversionSourceReport, Facility } from '../src/types';
import {
  classifyDrinkingFountainPlace,
  isCoordinateOutlier,
  normalizeTaipeiDistrict,
} from '../src/utils/facilityUtils';

const DEFAULT_RAW_DIR = resolve('data/raw/drinking-fountains');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
const DEFAULT_FALLBACK_JSON = resolve('public/data/drinking-fountains.json');
const SOURCE_NAME = '臺北市公共場所飲水機資訊';
const NOTICE = '公共場所飲水機實際開放時間與可用狀態請以現場為準';

type DrinkingFountainApiRow = {
  行政區?: unknown;
  場所名稱?: unknown;
  場所地址?: unknown;
  管理單位?: unknown;
  連絡電話?: unknown;
  場所開放時間?: unknown;
  飲水台數?: unknown;
  設置地點?: unknown;
  緯度?: unknown;
  經度?: unknown;
};

type TaipeiOpenDataResponse = {
  result?: {
    results?: DrinkingFountainApiRow[];
  };
};

type ConvertOptions = {
  rawDir: string;
  outputDir: string;
  fallbackJson: string;
};

type ConvertedDrinkingFountains = {
  facilities: Facility[];
  report: ConversionSourceReport;
};

const clean = (value: unknown) => {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
};

const numberFrom = (value: unknown) => {
  const text = clean(value);
  if (!text) {
    return undefined;
  }

  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const integerFrom = (value: unknown) => {
  const text = clean(value);
  if (!text) {
    return undefined;
  }

  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const trimKeys = (row: DrinkingFountainApiRow) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), value])) as DrinkingFountainApiRow;

function readCliOptions(): ConvertOptions {
  const args = process.argv.slice(2);
  const optionValue = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };

  return {
    rawDir: resolve(optionValue('--raw-dir') ?? process.env.DRINKING_FOUNTAINS_RAW_DIR ?? DEFAULT_RAW_DIR),
    outputDir: resolve(optionValue('--out-dir') ?? process.env.FACILITY_DATA_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR),
    fallbackJson: resolve(
      optionValue('--drinking-fountains-fallback-json') ??
        process.env.DRINKING_FOUNTAINS_FALLBACK_JSON ??
        DEFAULT_FALLBACK_JSON,
    ),
  };
}

function readRawRows(rawDir: string) {
  const pageFiles = readdirSync(rawDir)
    .filter((file) => file.endsWith('.json') && file !== 'resource-index.json')
    .sort();

  return pageFiles.flatMap((file) => {
    const payload = JSON.parse(readFileSync(resolve(rawDir, file), 'utf8')) as TaipeiOpenDataResponse;
    return payload.result?.results ?? [];
  });
}

export function convertDrinkingFountainRows(
  rows: DrinkingFountainApiRow[],
  sourceFilename = SOURCE_NAME,
): ConvertedDrinkingFountains {
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
  const coordinateOutlierRows: ConversionSourceReport['invalidCoordinateRows'] = [];

  const facilities = rows.map((rawRow, index): Facility => {
    const row = trimKeys(rawRow);
    const rowNumber = index + 1;
    const longitude = numberFrom(row.經度);
    const latitude = numberFrom(row.緯度);
    const hasInvalidCoordinate = longitude === undefined || latitude === undefined;
    const safeLongitude = longitude ?? 0;
    const safeLatitude = latitude ?? 0;
    const outlier = hasInvalidCoordinate || isCoordinateOutlier(safeLongitude, safeLatitude);

    if (hasInvalidCoordinate) {
      invalidCoordinateRows.push({
        rowNumber,
        longitude: clean(row.經度),
        latitude: clean(row.緯度),
      });
    } else if (outlier) {
      coordinateOutlierRows.push({
        rowNumber,
        longitude: clean(row.經度),
        latitude: clean(row.緯度),
      });
    }

    const district = normalizeTaipeiDistrict(clean(row.行政區) ?? '');
    const name = clean(row.場所名稱);
    const address = clean(row.場所地址);
    const manager = clean(row.管理單位);
    const phone = clean(row.連絡電話);
    const openingHours = clean(row.場所開放時間);
    const installLocation = clean(row.設置地點);
    const drinkingFountainCount = integerFrom(row.飲水台數);

    if (!district || !name || !address) {
      missingRequiredFields.push({
        rowNumber,
        fields: [
          district ? '' : '行政區',
          name ? '' : '場所名稱',
          address ? '' : '場所地址',
        ].filter(Boolean),
      });
    }

    return {
      id: `drinking_fountain-${String(index + 1).padStart(4, '0')}`,
      type: 'drinking_fountain',
      district,
      address: address ?? '',
      longitude: safeLongitude,
      latitude: safeLatitude,
      note: NOTICE,
      source: SOURCE_NAME,
      ...(outlier ? { isCoordinateOutlier: true } : {}),
      ...(name ? { name } : {}),
      ...(manager ? { manager } : {}),
      ...(phone ? { phone } : {}),
      ...(openingHours ? { openingHours } : {}),
      ...(installLocation ? { installLocation } : {}),
      ...(drinkingFountainCount !== undefined ? { drinkingFountainCount } : {}),
      placeCategory: classifyDrinkingFountainPlace({ name, manager, address, installLocation }),
    };
  });

  return {
    facilities,
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: 0,
      coordinateOutlierRows: coordinateOutlierRows.length + invalidCoordinateRows.length,
      invalidCoordinateRows,
      missingRequiredFields,
    },
  };
}

export function loadDrinkingFountainFacilities(options: ConvertOptions): ConvertedDrinkingFountains {
  if (existsSync(options.rawDir)) {
    const rows = readRawRows(options.rawDir);
    return convertDrinkingFountainRows(rows, SOURCE_NAME);
  }

  const facilities = existsSync(options.fallbackJson)
    ? (JSON.parse(readFileSync(options.fallbackJson, 'utf8')) as Facility[])
    : [];

  return {
    facilities,
    report: {
      sourceFilename: `${basename(options.fallbackJson)} (fallback; raw API data not found)`,
      totalRows: facilities.length,
      validRows: facilities.length,
      droppedRows: 0,
      coordinateOutlierRows: facilities.filter((facility) => facility.isCoordinateOutlier).length,
      invalidCoordinateRows: [],
      missingRequiredFields: [],
    },
  };
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

if (isMain) {
  const options = readCliOptions();
  const drinkingFountains = loadDrinkingFountainFacilities(options);
  const outputPath = resolve(options.outputDir, 'drinking-fountains.json');

  writeJson(outputPath, drinkingFountains.facilities);
  console.log(`Wrote ${drinkingFountains.facilities.length} drinking fountain records to ${outputPath}`);
}
