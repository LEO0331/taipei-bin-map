import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { ConversionReport, ConversionSourceReport, Facility } from '../src/types';
import { isCoordinateOutlier } from '../src/utils/facilityUtils';

type PedestrianCsvRow = {
  行政區?: string;
  地址?: string;
  經度?: string;
  緯度?: string;
  備註?: string;
  'Unnamed: 5'?: string;
};

type DogWasteCsvRow = {
  行政區?: string;
  路名?: string;
  位置?: string;
  經度?: string;
  緯度?: string;
  備註?: string;
};

type SourceConfig<Row> = {
  inputPath: string;
  parseRow: (row: Row, recordIndex: number) => Facility;
  requiredFields: Array<keyof Row>;
  longitudeField: keyof Row;
  latitudeField: keyof Row;
};

type ConvertOptions = {
  pedestrianCsv: string;
  dogWasteCsv: string;
  outputDir: string;
  pedestrianFallbackJson: string;
  dogWasteFallbackJson: string;
};

const DATA_DIR = resolve('public/data');
const DEFAULT_PEDESTRIAN_CSV = '/Users/Leo/Downloads/●行人專用清潔箱總表.csv';
const DEFAULT_DOG_WASTE_CSV = '/Users/Leo/Downloads/狗便袋箱位置總表 .csv';
const DEFAULT_PEDESTRIAN_FALLBACK_JSON = resolve('public/data/bins.json');
const DEFAULT_DOG_WASTE_FALLBACK_JSON = resolve('public/data/dog-waste-bag-boxes.json');

function readCliOptions(): ConvertOptions {
  const args = process.argv.slice(2);
  const optionValue = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };

  return {
    pedestrianCsv: resolve(
      optionValue('--pedestrian-csv') ??
        process.env.PEDESTRIAN_BINS_CSV ??
        DEFAULT_PEDESTRIAN_CSV,
    ),
    dogWasteCsv: resolve(optionValue('--dog-waste-csv') ?? process.env.DOG_WASTE_BAG_BOXES_CSV ?? DEFAULT_DOG_WASTE_CSV),
    outputDir: resolve(optionValue('--out-dir') ?? process.env.FACILITY_DATA_OUTPUT_DIR ?? DATA_DIR),
    pedestrianFallbackJson: resolve(
      optionValue('--pedestrian-fallback-json') ??
        process.env.PEDESTRIAN_BINS_FALLBACK_JSON ??
        DEFAULT_PEDESTRIAN_FALLBACK_JSON,
    ),
    dogWasteFallbackJson: resolve(
      optionValue('--dog-waste-fallback-json') ??
        process.env.DOG_WASTE_BAG_BOXES_FALLBACK_JSON ??
        DEFAULT_DOG_WASTE_FALLBACK_JSON,
    ),
  };
}

const options = readCliOptions();
const FACILITIES_OUTPUT = resolve(options.outputDir, 'facilities.json');
const PEDESTRIAN_OUTPUT = resolve(options.outputDir, 'pedestrian-bins.json');
const DOG_WASTE_OUTPUT = resolve(options.outputDir, 'dog-waste-bag-boxes.json');
const REPORT_OUTPUT = resolve(options.outputDir, 'conversion-report.json');

const clean = (value: unknown) => String(value ?? '').trim();
const numberFrom = (value: unknown) => Number.parseFloat(clean(value));
const hasAnyValue = (row: Record<string, unknown>) => Object.values(row).some((value) => clean(value) !== '');
const countOutliers = (facilities: Facility[]) => facilities.filter((facility) => facility.isCoordinateOutlier).length;

function readCp950Csv<Row>(inputPath: string): Row[] {
  const raw = readFileSync(inputPath);
  const csvText = iconv.decode(raw, 'cp950');
  const parsed = Papa.parse<Row>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    const message = parsed.errors.map((error) => `${error.code}: ${error.message}`).join('\n');
    throw new Error(`Unable to parse ${inputPath}:\n${message}`);
  }

  return parsed.data;
}

function markCoordinateOutlier(facility: Facility): Facility {
  if (!isCoordinateOutlier(facility.longitude, facility.latitude)) {
    return facility;
  }

  return {
    ...facility,
    isCoordinateOutlier: true,
  };
}

function convertSource<Row extends Record<string, unknown>>(
  config: SourceConfig<Row>,
): { facilities: Facility[]; report: ConversionSourceReport } {
  const rows = readCp950Csv<Row>(config.inputPath);
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  let droppedRows = 0;

  const facilities = rows.reduce<Facility[]>((records, row, index) => {
    const rowNumber = index + 2;

    if (!hasAnyValue(row)) {
      droppedRows += 1;
      return records;
    }

    const missingFields = config.requiredFields.filter((field) => clean(row[field]) === '').map(String);
    if (missingFields.length > 0) {
      missingRequiredFields.push({ rowNumber, fields: missingFields });
      droppedRows += 1;
      return records;
    }

    const longitude = numberFrom(row[config.longitudeField]);
    const latitude = numberFrom(row[config.latitudeField]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      invalidCoordinateRows.push({
        rowNumber,
        longitude: clean(row[config.longitudeField]) || undefined,
        latitude: clean(row[config.latitudeField]) || undefined,
      });
      droppedRows += 1;
      return records;
    }

    records.push(markCoordinateOutlier(config.parseRow(row, index + 1)));
    return records;
  }, []);

  return {
    facilities,
    report: {
      sourceFilename: basename(config.inputPath),
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows,
      coordinateOutlierRows: countOutliers(facilities),
      invalidCoordinateRows,
      missingRequiredFields,
    },
  };
}

function parsePedestrianRow(row: PedestrianCsvRow, index: number): Facility {
  const longitude = numberFrom(row.經度);
  const latitude = numberFrom(row.緯度);

  return {
    id: `pedestrian_bin-${String(index).padStart(4, '0')}`,
    type: 'pedestrian_bin',
    district: clean(row.行政區),
    address: clean(row.地址),
    longitude,
    latitude,
    note: clean(row.備註),
    source: '台北市行人專用清潔箱資料',
  };
}

function parseDogWasteRow(row: DogWasteCsvRow, index: number): Facility {
  const longitude = numberFrom(row.經度);
  const latitude = numberFrom(row.緯度);

  const road = clean(row.路名);
  const location = clean(row.位置);

  return {
    id: `dog_waste_bag_box-${String(index).padStart(4, '0')}`,
    type: 'dog_waste_bag_box',
    district: clean(row.行政區),
    address: `${road}${location}`,
    road,
    location,
    longitude,
    latitude,
    note: clean(row.備註),
    source: '台北市狗便袋箱位置資料',
  };
}

function fallbackReport(sourcePath: string, facilities: Facility[]): ConversionSourceReport {
  return {
    sourceFilename: `${basename(sourcePath)} (fallback; source CSV not found)`,
    totalRows: facilities.length,
    validRows: facilities.length,
    droppedRows: 0,
    coordinateOutlierRows: countOutliers(facilities),
    invalidCoordinateRows: [],
    missingRequiredFields: [],
  };
}

function loadPedestrianFacilities(): { facilities: Facility[]; report: ConversionSourceReport } {
  if (existsSync(options.pedestrianCsv)) {
    return convertSource<PedestrianCsvRow>({
      inputPath: options.pedestrianCsv,
      parseRow: parsePedestrianRow,
      requiredFields: ['行政區', '地址', '經度', '緯度'],
      longitudeField: '經度',
      latitudeField: '緯度',
    });
  }

  const fallback = JSON.parse(readFileSync(options.pedestrianFallbackJson, 'utf8')) as Array<
    Omit<Facility, 'type' | 'source'> & Partial<Facility>
  >;
  const facilities = fallback.map((record, index) =>
    markCoordinateOutlier({
      id: record.id || `pedestrian_bin-${String(index + 1).padStart(4, '0')}`,
      type: 'pedestrian_bin',
      district: record.district,
      address: record.address,
      longitude: record.longitude,
      latitude: record.latitude,
      note: record.note,
      source: '台北市行人專用清潔箱資料',
    }),
  );

  return {
    facilities,
    report: fallbackReport(options.pedestrianFallbackJson, facilities),
  };
}

function loadDogWasteFacilities(): { facilities: Facility[]; report: ConversionSourceReport } {
  if (existsSync(options.dogWasteCsv)) {
    return convertSource<DogWasteCsvRow>({
      inputPath: options.dogWasteCsv,
      parseRow: parseDogWasteRow,
      requiredFields: ['行政區', '路名', '位置', '經度', '緯度'],
      longitudeField: '經度',
      latitudeField: '緯度',
    });
  }

  const fallback = JSON.parse(readFileSync(options.dogWasteFallbackJson, 'utf8')) as Facility[];
  const facilities = fallback.map(markCoordinateOutlier);

  return {
    facilities,
    report: fallbackReport(options.dogWasteFallbackJson, facilities),
  };
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const pedestrian = loadPedestrianFacilities();
const dogWaste = loadDogWasteFacilities();

const facilities = [...pedestrian.facilities, ...dogWaste.facilities];
const report: ConversionReport = {
  generatedAt: new Date().toISOString(),
  totalValidRows: facilities.length,
  sources: [pedestrian.report, dogWaste.report],
};

mkdirSync(options.outputDir, { recursive: true });
writeJson(PEDESTRIAN_OUTPUT, pedestrian.facilities);
writeJson(DOG_WASTE_OUTPUT, dogWaste.facilities);
writeJson(FACILITIES_OUTPUT, facilities);
writeJson(REPORT_OUTPUT, report);

console.log(`Wrote ${facilities.length} total facility records to ${FACILITIES_OUTPUT}`);
console.log(`Wrote ${pedestrian.facilities.length} pedestrian bin records to ${PEDESTRIAN_OUTPUT}`);
console.log(`Wrote ${dogWaste.facilities.length} dog-waste bag box records to ${DOG_WASTE_OUTPUT}`);
console.log(`Wrote conversion report to ${REPORT_OUTPUT}`);
