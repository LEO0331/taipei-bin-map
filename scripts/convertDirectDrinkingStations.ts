import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { ConversionSourceReport, DirectDrinkingPlaceCategory, Facility } from '../src/types';
import { normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

const SOURCE_NAME = '臺北市所屬直飲臺';
const DEFAULT_INPUT = '/Users/Leo/Downloads/11505_直飲臺基本資料.csv';
const DEFAULT_RAW_DIR = resolve('data/raw/direct-drinking-stations');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
const TAIPEI_NEARBY_BOUNDS = { minLng: 121.3, maxLng: 121.8, minLat: 24.85, maxLat: 25.3 };
const TAIPEI_DISTRICTS = new Set(['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區']);

type Row = Record<string, string | undefined>;

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || undefined;
};
const pick = (row: Row, names: string[]) => names.map((name) => clean(row[name])).find(Boolean);

export function normalizeDirectDrinkingStatus(raw?: string) {
  if (raw === '正常') return 'normal' as const;
  if (raw === '暫停') return 'suspended' as const;
  return 'unknown' as const;
}

export function classifyDirectDrinkingPlaceType(raw?: string): DirectDrinkingPlaceCategory {
  if (raw === '公園步道') return 'park_trail';
  if (raw === '捷運站') return 'mrt_station';
  if (raw === '學校') return 'school';
  if (raw === '機關') return 'government_office';
  if (raw === '場館') return 'venue';
  if (raw === '商圈夜市') return 'shopping_night_market';
  return 'other';
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

export function convertDirectDrinkingRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];

  const facilities = rows.map((row, index): Facility => {
    const rowNumber = index + 2;
    const longitudeText = pick(row, ['經度', 'Longitude']);
    const latitudeText = pick(row, ['緯度', 'Latitude']);
    const longitude = Number.parseFloat(longitudeText ?? '');
    const latitude = Number.parseFloat(latitudeText ?? '');
    const invalidCoordinate = !Number.isFinite(longitude) || !Number.isFinite(latitude);
    const outsideNearbyBounds = !invalidCoordinate && (
      longitude < TAIPEI_NEARBY_BOUNDS.minLng || longitude > TAIPEI_NEARBY_BOUNDS.maxLng ||
      latitude < TAIPEI_NEARBY_BOUNDS.minLat || latitude > TAIPEI_NEARBY_BOUNDS.maxLat
    );
    const city = pick(row, ['縣市', '市別', '城市']) ?? '';
    const rawDistrict = pick(row, ['行政區', '區']) ?? '';
    const district = city === '臺北市' ? normalizeTaipeiDistrict(rawDistrict) : rawDistrict;
    const address = pick(row, ['地址', '場所地址']) ?? '';
    const name = pick(row, ['場所名稱', '名稱']);
    const placeType = pick(row, ['場所類型', '場所別']);

    if (invalidCoordinate) {
      invalidCoordinateRows.push({ rowNumber, longitude: longitudeText, latitude: latitudeText });
    }
    const fields = [name ? '' : '場所名稱', address ? '' : '地址'].filter(Boolean);
    if (fields.length) missingRequiredFields.push({ rowNumber, fields });

    return {
      id: `direct_drinking_station-${String(index + 1).padStart(4, '0')}`,
      type: 'direct_drinking_station',
      district,
      address,
      longitude: invalidCoordinate ? 0 : longitude,
      latitude: invalidCoordinate ? 0 : latitude,
      note: '',
      source: SOURCE_NAME,
      ...(invalidCoordinate || outsideNearbyBounds ? { isCoordinateOutlier: true } : {}),
      ...(name ? { name } : {}),
      ...(pick(row, ['直飲臺編號', '直飲台編號']) ? { stationId: pick(row, ['直飲臺編號', '直飲台編號']) } : {}),
      ...(pick(row, ['分處', '轄區分處']) ? { branch: pick(row, ['分處', '轄區分處']) } : {}),
      ...(city ? { city } : {}),
      ...(placeType ? { placeType, directDrinkingPlaceCategory: classifyDirectDrinkingPlaceType(placeType) } : {}),
      ...(pick(row, ['開放時間', '場所開放時間']) ? { openingHours: pick(row, ['開放時間', '場所開放時間']) } : {}),
      ...(pick(row, ['設置地點']) ? { installLocation: pick(row, ['設置地點']) } : {}),
      directDrinkingStatus: normalizeDirectDrinkingStatus(pick(row, ['狀態'])),
      ...(pick(row, ['最近檢驗日期', '最近採樣日期時間']) ? { latestSamplingDate: pick(row, ['最近檢驗日期', '最近採樣日期時間']) } : {}),
      ...(pick(row, ['大腸桿菌群', '大腸桿菌數']) ? { coliformCountRaw: pick(row, ['大腸桿菌群', '大腸桿菌數']) } : {}),
      ...(pick(row, ['水質維護資訊網址', '水質及維護資訊網址']) ? { maintenanceUrl: pick(row, ['水質維護資訊網址', '水質及維護資訊網址']) } : {}),
      ...(pick(row, ['照片網址', '直飲台照片網址', '直飲臺照片網址']) ? { photoUrl: pick(row, ['照片網址', '直飲台照片網址', '直飲臺照片網址']) } : {}),
      isTaipeiCity: city === '臺北市' && TAIPEI_DISTRICTS.has(district),
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

export function loadDirectDrinkingStations(inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir)
    ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv'))
    : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  if (!existsSync(path)) return convertDirectDrinkingRows([], `${basename(path)} (not found)`);
  return convertDirectDrinkingRows(readRows(path), basename(path));
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const inputIndex = process.argv.indexOf('--input');
  const input = inputIndex >= 0 ? resolve(process.argv[inputIndex + 1]) : DEFAULT_INPUT;
  const converted = loadDirectDrinkingStations(input);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'direct-drinking-stations.json'), converted.facilities);
  console.log(`Wrote ${converted.facilities.length} direct drinking station records`);
}
