import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { ConversionReport, ConversionSourceReport, Facility } from '../src/types';
import { isCoordinateOutlier } from '../src/utils/facilityUtils';
import { loadDirectDrinkingStations } from './convertDirectDrinkingStations';
import { loadDrinkingFountainFacilities } from './convertDrinkingFountains';
import { loadTimedCollectionPoints } from './convertTimedCollectionPoints';
import { loadUsedClothingRecyclingBoxes } from './convertUsedClothingRecyclingBoxes';
import { loadLactationRooms } from './convertLactationRooms';
import { loadRiversideToilets } from './convertRiversideToilets';
import { loadFamilyFriendlyToilets } from './convertFamilyFriendlyToilets';
import { loadMotorcycleInspectionStations } from './convertMotorcycleInspectionStations';
import { loadElectricMotorcycleChargingStations } from './convertElectricMotorcycleChargingStations';
import { loadCommercialEvChargingSwapStations } from './convertCommercialEvChargingSwapStations';

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

type PublicToiletCsvRow = {
  行政區?: string;
  公廁類別?: string;
  公廁名稱?: string;
  公廁地址?: string;
  經度?: string;
  緯度?: string;
  管理單位?: string;
  座數?: string;
  特優級?: string;
  優等級?: string;
  普通級?: string;
  改善級?: string;
  無障礙廁座數?: string;
  親子廁座數?: string;
};

type SourceConfig<Row> = {
  inputPath: string;
  parseRow: (row: Row, recordIndex: number) => Facility;
  requiredFields: Array<keyof Row>;
  longitudeField: keyof Row;
  latitudeField: keyof Row;
  encoding: 'cp950' | 'utf8';
};

type ConvertOptions = {
  pedestrianCsv: string;
  dogWasteCsv: string;
  publicToiletCsv: string;
  outputDir: string;
  pedestrianFallbackJson: string;
  dogWasteFallbackJson: string;
  publicToiletFallbackJson: string;
  drinkingFountainsRawDir: string;
  drinkingFountainsFallbackJson: string;
};

const DATA_DIR = resolve('public/data');
const DEFAULT_PEDESTRIAN_CSV = '/Users/Leo/Downloads/●行人專用清潔箱總表.csv';
const DEFAULT_DOG_WASTE_CSV = '/Users/Leo/Downloads/狗便袋箱位置總表 .csv';
const DEFAULT_PUBLIC_TOILET_CSV = '/Users/Leo/Downloads/臺北市公廁點位資訊.csv';
const DEFAULT_PEDESTRIAN_FALLBACK_JSON = resolve('public/data/bins.json');
const DEFAULT_DOG_WASTE_FALLBACK_JSON = resolve('public/data/dog-waste-bag-boxes.json');
const DEFAULT_PUBLIC_TOILET_FALLBACK_JSON = resolve('public/data/public-toilets.json');
const DEFAULT_DRINKING_FOUNTAINS_RAW_DIR = resolve('data/raw/drinking-fountains');
const DEFAULT_DRINKING_FOUNTAINS_FALLBACK_JSON = resolve('public/data/drinking-fountains.json');

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
    publicToiletCsv: resolve(
      optionValue('--public-toilet-csv') ??
        process.env.PUBLIC_TOILETS_CSV ??
        DEFAULT_PUBLIC_TOILET_CSV,
    ),
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
    publicToiletFallbackJson: resolve(
      optionValue('--public-toilet-fallback-json') ??
        process.env.PUBLIC_TOILETS_FALLBACK_JSON ??
        DEFAULT_PUBLIC_TOILET_FALLBACK_JSON,
    ),
    drinkingFountainsRawDir: resolve(
      optionValue('--drinking-fountains-raw-dir') ??
        process.env.DRINKING_FOUNTAINS_RAW_DIR ??
        DEFAULT_DRINKING_FOUNTAINS_RAW_DIR,
    ),
    drinkingFountainsFallbackJson: resolve(
      optionValue('--drinking-fountains-fallback-json') ??
        process.env.DRINKING_FOUNTAINS_FALLBACK_JSON ??
        DEFAULT_DRINKING_FOUNTAINS_FALLBACK_JSON,
    ),
  };
}

const options = readCliOptions();
const FACILITIES_OUTPUT = resolve(options.outputDir, 'facilities.json');
const PEDESTRIAN_OUTPUT = resolve(options.outputDir, 'pedestrian-bins.json');
const DOG_WASTE_OUTPUT = resolve(options.outputDir, 'dog-waste-bag-boxes.json');
const PUBLIC_TOILET_OUTPUT = resolve(options.outputDir, 'public-toilets.json');
const RIVERSIDE_TOILET_OUTPUT = resolve(options.outputDir, 'riverside-toilets.json');
const RIVERSIDE_TOILET_SUMMARY_OUTPUT = resolve(options.outputDir, 'riverside-toilet-summary.json');
const FAMILY_FRIENDLY_TOILET_OUTPUT = resolve(options.outputDir, 'family-friendly-toilets.json');
const FAMILY_FRIENDLY_TOILET_SUMMARY_OUTPUT = resolve(options.outputDir, 'family-friendly-toilet-summary.json');
const TOILET_SUMMARY_OUTPUT = resolve(options.outputDir, 'toilet-summary.json');
const MOTORCYCLE_INSPECTION_STATION_OUTPUT = resolve(options.outputDir, 'motorcycle-inspection-stations.json');
const MOTORCYCLE_INSPECTION_STATION_SUMMARY_OUTPUT = resolve(options.outputDir, 'motorcycle-inspection-station-summary.json');
const MOTORCYCLE_INSPECTION_STATION_LOCATIONS_OUTPUT = resolve(options.outputDir, 'motorcycle-inspection-station-locations.json');
const ELECTRIC_MOTORCYCLE_CHARGING_STATION_OUTPUT = resolve(options.outputDir, 'electric-motorcycle-charging-stations.json');
const ELECTRIC_MOTORCYCLE_CHARGING_STATION_SUMMARY_OUTPUT = resolve(options.outputDir, 'electric-motorcycle-charging-station-summary.json');
const ELECTRIC_MOTORCYCLE_CHARGING_STATION_LOCATIONS_OUTPUT = resolve(options.outputDir, 'electric-motorcycle-charging-station-locations.json');
const COMMERCIAL_EV_OUTPUT = resolve(options.outputDir, 'commercial-ev-charging-swap-stations.json');
const COMMERCIAL_EV_SUMMARY_OUTPUT = resolve(options.outputDir, 'commercial-ev-charging-swap-station-summary.json');
const COMMERCIAL_EV_LOCATIONS_OUTPUT = resolve(options.outputDir, 'commercial-ev-charging-swap-station-locations.json');
const DRINKING_FOUNTAINS_OUTPUT = resolve(options.outputDir, 'drinking-fountains.json');
const TIMED_COLLECTION_OUTPUT = resolve(options.outputDir, 'timed-collection-points.json');
const DIRECT_DRINKING_OUTPUT = resolve(options.outputDir, 'direct-drinking-stations.json');
const USED_CLOTHING_OUTPUT = resolve(options.outputDir, 'used-clothing-recycling-boxes.json');
const LACTATION_ROOMS_OUTPUT = resolve(options.outputDir, 'lactation-rooms.json');
const LACTATION_SUMMARY_OUTPUT = resolve(options.outputDir, 'lactation-room-summary.json');
const LACTATION_LOCATIONS_OUTPUT = resolve(options.outputDir, 'lactation-room-locations.json');
const REPORT_OUTPUT = resolve(options.outputDir, 'conversion-report.json');

const clean = (value: unknown) => String(value ?? '').trim();
const numberFrom = (value: unknown) => Number.parseFloat(clean(value));
const integerFrom = (value: unknown) => {
  const parsed = Number.parseInt(clean(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};
const hasAnyValue = (row: Record<string, unknown>) => Object.values(row).some((value) => clean(value) !== '');
const countOutliers = (facilities: Facility[]) => facilities.filter((facility) => facility.isCoordinateOutlier).length;

function readCsv<Row>(inputPath: string, encoding: 'cp950' | 'utf8'): Row[] {
  const raw = readFileSync(inputPath);
  const csvText = encoding === 'cp950' ? iconv.decode(raw, 'cp950') : raw.toString('utf8');
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
  const rows = readCsv<Row>(config.inputPath, config.encoding);
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

function parsePublicToiletRow(row: PublicToiletCsvRow, index: number): Facility {
  return {
    id: `public_toilet-${String(index).padStart(4, '0')}`,
    type: 'public_toilet',
    district: clean(row.行政區),
    address: clean(row.公廁地址),
    longitude: numberFrom(row.經度),
    latitude: numberFrom(row.緯度),
    note: '實際開放情況請以現場為準',
    source: '臺北市公廁點位資訊',
    name: clean(row.公廁名稱),
    category: clean(row.公廁類別),
    manager: clean(row.管理單位),
    totalSeats: integerFrom(row.座數),
    excellentGradeCount: integerFrom(row.特優級),
    superiorGradeCount: integerFrom(row.優等級),
    ordinaryGradeCount: integerFrom(row.普通級),
    improvementGradeCount: integerFrom(row.改善級),
    accessibleToiletSeats: integerFrom(row.無障礙廁座數),
    parentChildToiletSeats: integerFrom(row.親子廁座數),
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
      encoding: 'cp950',
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
      encoding: 'cp950',
    });
  }

  const fallback = JSON.parse(readFileSync(options.dogWasteFallbackJson, 'utf8')) as Facility[];
  const facilities = fallback.map(markCoordinateOutlier);

  return {
    facilities,
    report: fallbackReport(options.dogWasteFallbackJson, facilities),
  };
}

function loadPublicToiletFacilities(): { facilities: Facility[]; report: ConversionSourceReport } {
  if (existsSync(options.publicToiletCsv)) {
    return convertSource<PublicToiletCsvRow>({
      inputPath: options.publicToiletCsv,
      parseRow: parsePublicToiletRow,
      requiredFields: ['行政區', '公廁類別', '公廁名稱', '公廁地址', '經度', '緯度'],
      longitudeField: '經度',
      latitudeField: '緯度',
      encoding: 'utf8',
    });
  }

  const fallback = JSON.parse(readFileSync(options.publicToiletFallbackJson, 'utf8')) as Facility[];
  const facilities = fallback.map(markCoordinateOutlier);

  return {
    facilities,
    report: fallbackReport(options.publicToiletFallbackJson, facilities),
  };
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

const pedestrian = loadPedestrianFacilities();
const dogWaste = loadDogWasteFacilities();
const publicToilets = loadPublicToiletFacilities();
const riversideToilets = loadRiversideToilets();
const familyFriendlyToilets = loadFamilyFriendlyToilets(publicToilets.facilities);
const drinkingFountains = loadDrinkingFountainFacilities({
  rawDir: options.drinkingFountainsRawDir,
  outputDir: options.outputDir,
  fallbackJson: options.drinkingFountainsFallbackJson,
});
const timedCollectionPoints = loadTimedCollectionPoints();
const directDrinkingStations = loadDirectDrinkingStations();
const usedClothingRecyclingBoxes = loadUsedClothingRecyclingBoxes();
const lactationRooms = loadLactationRooms();
const motorcycleInspectionStations = loadMotorcycleInspectionStations();
const electricMotorcycleChargingStations = loadElectricMotorcycleChargingStations();
const commercialEvStations = loadCommercialEvChargingSwapStations();

const facilities = [
  ...pedestrian.facilities,
  ...dogWaste.facilities,
  ...publicToilets.facilities,
  ...riversideToilets.facilities,
  ...familyFriendlyToilets.facilities,
  ...drinkingFountains.facilities,
  ...timedCollectionPoints.facilities,
  ...directDrinkingStations.facilities,
  ...usedClothingRecyclingBoxes.facilities,
  ...lactationRooms.facilities,
  ...motorcycleInspectionStations.facilities,
  ...electricMotorcycleChargingStations.facilities,
  ...commercialEvStations.facilities,
];
const report: ConversionReport = {
  generatedAt: new Date().toISOString(),
  totalValidRows: facilities.length,
  sources: [
    pedestrian.report,
    dogWaste.report,
    publicToilets.report,
    riversideToilets.report,
    familyFriendlyToilets.report,
    drinkingFountains.report,
    timedCollectionPoints.report,
    directDrinkingStations.report,
    usedClothingRecyclingBoxes.report,
    lactationRooms.report,
    motorcycleInspectionStations.report,
    electricMotorcycleChargingStations.report,
    ...commercialEvStations.reports,
  ],
};

mkdirSync(options.outputDir, { recursive: true });
writeJson(PEDESTRIAN_OUTPUT, pedestrian.facilities);
writeJson(DOG_WASTE_OUTPUT, dogWaste.facilities);
writeJson(PUBLIC_TOILET_OUTPUT, publicToilets.facilities);
writeJson(RIVERSIDE_TOILET_OUTPUT, riversideToilets.facilities);
writeJson(RIVERSIDE_TOILET_SUMMARY_OUTPUT, riversideToilets.summary);
writeJson(FAMILY_FRIENDLY_TOILET_OUTPUT, familyFriendlyToilets.facilities);
writeJson(FAMILY_FRIENDLY_TOILET_SUMMARY_OUTPUT, familyFriendlyToilets.summary);
const toiletDistricts = [...new Set([
  ...publicToilets.facilities,
  ...riversideToilets.facilities,
  ...familyFriendlyToilets.facilities,
].map((item) => item.district).filter(Boolean))];
writeJson(TOILET_SUMMARY_OUTPUT, {
  publicToiletCount: publicToilets.facilities.length,
  riversideToiletCount: riversideToilets.facilities.length,
  familyFriendlyToiletCount: familyFriendlyToilets.facilities.length,
  totalDiaperTableCount: familyFriendlyToilets.facilities.reduce((sum, item) => sum + (item.diaperTableCount ?? 0), 0),
  totalChildSeatCount: familyFriendlyToilets.facilities.reduce((sum, item) => sum + (item.childSeatCount ?? 0), 0),
  byDistrict: toiletDistricts.map((district) => ({
    district,
    publicToiletCount: publicToilets.facilities.filter((item) => item.district === district).length,
    riversideToiletCount: riversideToilets.facilities.filter((item) => item.district === district).length,
    familyFriendlyToiletCount: familyFriendlyToilets.facilities.filter((item) => item.district === district).length,
    diaperTableCount: familyFriendlyToilets.facilities.filter((item) => item.district === district).reduce((sum, item) => sum + (item.diaperTableCount ?? 0), 0),
    childSeatCount: familyFriendlyToilets.facilities.filter((item) => item.district === district).reduce((sum, item) => sum + (item.childSeatCount ?? 0), 0),
  })),
});
writeJson(DRINKING_FOUNTAINS_OUTPUT, drinkingFountains.facilities);
writeJson(TIMED_COLLECTION_OUTPUT, timedCollectionPoints.facilities);
writeJson(DIRECT_DRINKING_OUTPUT, directDrinkingStations.facilities);
writeJson(USED_CLOTHING_OUTPUT, usedClothingRecyclingBoxes.facilities);
writeJson(LACTATION_ROOMS_OUTPUT, lactationRooms.facilities);
writeJson(LACTATION_SUMMARY_OUTPUT, lactationRooms.summary);
if (!existsSync(LACTATION_LOCATIONS_OUTPUT)) writeJson(LACTATION_LOCATIONS_OUTPUT, []);
writeJson(MOTORCYCLE_INSPECTION_STATION_OUTPUT, motorcycleInspectionStations.facilities);
writeJson(MOTORCYCLE_INSPECTION_STATION_SUMMARY_OUTPUT, motorcycleInspectionStations.summary);
if (!existsSync(MOTORCYCLE_INSPECTION_STATION_LOCATIONS_OUTPUT)) writeJson(MOTORCYCLE_INSPECTION_STATION_LOCATIONS_OUTPUT, []);
writeJson(ELECTRIC_MOTORCYCLE_CHARGING_STATION_OUTPUT, electricMotorcycleChargingStations.facilities);
writeJson(ELECTRIC_MOTORCYCLE_CHARGING_STATION_SUMMARY_OUTPUT, electricMotorcycleChargingStations.summary);
if (!existsSync(ELECTRIC_MOTORCYCLE_CHARGING_STATION_LOCATIONS_OUTPUT)) writeJson(ELECTRIC_MOTORCYCLE_CHARGING_STATION_LOCATIONS_OUTPUT, []);
writeJson(COMMERCIAL_EV_OUTPUT, commercialEvStations.facilities);
writeJson(COMMERCIAL_EV_SUMMARY_OUTPUT, commercialEvStations.summary);
if (!existsSync(COMMERCIAL_EV_LOCATIONS_OUTPUT)) writeJson(COMMERCIAL_EV_LOCATIONS_OUTPUT, []);
writeJson(FACILITIES_OUTPUT, facilities);
writeJson(REPORT_OUTPUT, report);

console.log(`Wrote ${facilities.length} total facility records to ${FACILITIES_OUTPUT}`);
console.log(`Wrote ${pedestrian.facilities.length} pedestrian bin records to ${PEDESTRIAN_OUTPUT}`);
console.log(`Wrote ${dogWaste.facilities.length} dog-waste bag box records to ${DOG_WASTE_OUTPUT}`);
console.log(`Wrote ${publicToilets.facilities.length} public toilet records to ${PUBLIC_TOILET_OUTPUT}`);
console.log(`Wrote ${riversideToilets.facilities.length} riverside toilet records to ${RIVERSIDE_TOILET_OUTPUT}`);
console.log(`Wrote ${familyFriendlyToilets.facilities.length} family-friendly toilet records to ${FAMILY_FRIENDLY_TOILET_OUTPUT}`);
console.log(`Wrote ${drinkingFountains.facilities.length} drinking fountain records to ${DRINKING_FOUNTAINS_OUTPUT}`);
console.log(`Wrote ${timedCollectionPoints.facilities.length} timed collection point records to ${TIMED_COLLECTION_OUTPUT}`);
console.log(`Wrote ${directDrinkingStations.facilities.length} direct drinking station records to ${DIRECT_DRINKING_OUTPUT}`);
console.log(`Wrote ${usedClothingRecyclingBoxes.facilities.length} used-clothing recycling box records to ${USED_CLOTHING_OUTPUT}`);
console.log(`Wrote ${lactationRooms.facilities.length} lactation room records to ${LACTATION_ROOMS_OUTPUT}`);
console.log(`Wrote ${motorcycleInspectionStations.facilities.length} motorcycle inspection station records to ${MOTORCYCLE_INSPECTION_STATION_OUTPUT}`);
console.log(`Wrote ${electricMotorcycleChargingStations.facilities.length} electric motorcycle charging station records to ${ELECTRIC_MOTORCYCLE_CHARGING_STATION_OUTPUT}`);
console.log(`Wrote ${commercialEvStations.facilities.length} commercial EV charging/swap station records to ${COMMERCIAL_EV_OUTPUT}`);
console.log(`Wrote conversion report to ${REPORT_OUTPUT}`);
