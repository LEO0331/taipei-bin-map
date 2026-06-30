import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  AnnouncedNoSmokingPlaceRecordType,
  AnnouncedNoSmokingPlaceSummary,
  ConversionSourceReport,
  CoordinateStatus,
  CoordinateSystem,
  Facility,
} from '../src/types';
import { TAIPEI_BOUNDS, normalizeTaipeiDistrict } from '../src/utils/facilityUtils';
import { convertTwd97ToWgs84 } from './convertGasLpgStations';

type Row = Record<string, string | undefined>;
type SourceRows = { fileName: string; rows: Row[] };

const RAW_DIR = resolve('data/raw/announced-no-smoking-places');
const OUTPUT_DIR = resolve('public/data');
const SOURCE = '臺北市公告禁菸場所資料';
const SOURCE_AGENCY = '臺北市政府衛生局';
const NOTE = '公告禁菸場所點位僅供來源資料查詢，實際範圍、現場標示與最新公告請以主管機關及現場資訊為準。';

const districtByCode: Record<string, string> = {
  '63000010': '松山區',
  '63000020': '信義區',
  '63000030': '大安區',
  '63000040': '中山區',
  '63000050': '中正區',
  '63000060': '大同區',
  '63000070': '萬華區',
  '63000080': '文山區',
  '63000090': '南港區',
  '63000100': '內湖區',
  '63000110': '士林區',
  '63000120': '北投區',
};

const clean = (value: unknown) => {
  const text = String(value ?? '').replace(/\u3000/g, ' ').trim();
  return text && !['nan', 'null', 'NULL', '-', '--'].includes(text) ? text : undefined;
};
const normalize = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const numberFrom = (value: unknown) => {
  const parsed = Number.parseFloat((clean(value) ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};
const countBy = <T extends string | number>(values: T[]) =>
  [...new Set(values)].map((value) => ({ value, count: values.filter((item) => item === value).length }));

function coordinateStatus(longitude?: number, latitude?: number): CoordinateStatus {
  if (longitude === undefined || latitude === undefined) return 'missing';
  return longitude < TAIPEI_BOUNDS.minLng ||
    longitude > TAIPEI_BOUNDS.maxLng ||
    latitude < TAIPEI_BOUNDS.minLat ||
    latitude > TAIPEI_BOUNDS.maxLat
    ? 'outlier'
    : 'valid';
}

function normalizeDistrict(raw?: string) {
  const text = clean(raw)?.replace(/\s+/g, '') ?? '';
  const code = text.replace(/\.0$/, '');
  if (districtByCode[code]) return districtByCode[code];
  return normalizeTaipeiDistrict(text.endsWith('區') ? text : text);
}

function roadNameFrom(address?: string) {
  return clean(address)?.match(/([\u4e00-\u9fff\d]+[路街道]\d*段?)/)?.[1];
}

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim(),
  }).data;
  const utf8Rows = parse(raw.toString('utf8'));
  const fields = Object.keys(utf8Rows[0] ?? {});
  if (fields.some((field) => ['地點', '地址', 'X', 'Y'].includes(field))) return utf8Rows;
  return parse(iconv.decode(raw, 'cp950'));
}

export function normalizeAnnouncementDate(raw: string | undefined) {
  const text = clean(raw)?.replace(/\D/g, '') ?? '';
  if (text.length !== 8) return undefined;
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6));
  const day = Number(text.slice(6, 8));
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseNoSmokingCoordinates(x: string | undefined, y: string | undefined) {
  const sourceX = clean(x);
  const sourceY = clean(y);
  const parsedX = numberFrom(sourceX);
  const parsedY = numberFrom(sourceY);
  let longitude: number | undefined;
  let latitude: number | undefined;
  let coordinateSystem: CoordinateSystem = 'unknown';

  if (parsedX !== undefined && parsedY !== undefined) {
    if (parsedX > 120 && parsedX < 123 && parsedY > 24 && parsedY < 26) {
      longitude = parsedX;
      latitude = parsedY;
      coordinateSystem = 'wgs84';
    } else if (parsedX > 200_000 && parsedX < 350_000 && parsedY > 2_700_000 && parsedY < 2_850_000) {
      const converted = convertTwd97ToWgs84(parsedX, parsedY);
      longitude = converted.longitude;
      latitude = converted.latitude;
      coordinateSystem = 'twd97';
    }
  }

  return {
    longitude: longitude ?? 0,
    latitude: latitude ?? 0,
    sourceX,
    sourceY,
    coordinateSystem,
    coordinateStatus: coordinateStatus(longitude, latitude),
    hasCoordinates: longitude !== undefined && latitude !== undefined,
  };
}

function classifySource(fileName: string): { recordType: AnnouncedNoSmokingPlaceRecordType; resourceName: string } {
  if (fileName.includes('公園綠地')) {
    return { recordType: 'smoke_free_park_green_space', resourceName: '臺北市除吸菸區外全面禁菸公園綠地' };
  }
  return { recordType: 'outdoor_no_smoking_place', resourceName: '臺北市公告戶外禁菸場所一覽表' };
}

function rowName(row: Row, recordType: AnnouncedNoSmokingPlaceRecordType) {
  if (recordType === 'smoke_free_park_green_space') return clean(row.公園名稱);
  return clean(row.場所名稱) ?? clean(row.地點);
}

function buildSummary(facilities: Facility[]): AnnouncedNoSmokingPlaceSummary {
  const districts = facilities.map((item) => item.district).filter(Boolean);
  const recordTypes = countBy(facilities.map((item) => item.recordType ?? 'unknown'));
  const years = countBy(facilities.map((item) => item.announcementYear).filter(Boolean) as number[]);
  const sources = countBy(facilities.map((item) => item.sourceResourceName).filter(Boolean) as string[]);
  return {
    totalRecords: facilities.length,
    outdoorNoSmokingPlaceCount: facilities.filter((item) => item.recordType === 'outdoor_no_smoking_place').length,
    smokeFreeParkGreenSpaceCount: facilities.filter((item) => item.recordType === 'smoke_free_park_green_space').length,
    withCoordinatesCount: facilities.filter((item) => item.hasCoordinates).length,
    validCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'valid').length,
    missingCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'missing').length,
    outlierCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'outlier').length,
    withAnnouncementDateCount: facilities.filter((item) => item.hasAnnouncementDate).length,
    districtCount: new Set(districts).size,
    byDistrict: countBy(districts).map(({ value, count }) => ({ district: value, count })).sort((a, b) => b.count - a.count),
    byRecordType: recordTypes.map(({ value, count }) => ({ recordType: value, count })),
    byAnnouncementYear: years.map(({ value, count }) => ({ year: value, count })).sort((a, b) => b.year - a.year),
    bySourceResource: sources.map(({ value, count }) => ({ sourceResourceName: value, count })).sort((a, b) => b.count - a.count),
  };
}

export function convertAnnouncedNoSmokingPlaceSources(sources: SourceRows[]) {
  const facilities: Facility[] = [];
  const reports: ConversionSourceReport[] = [];

  sources.forEach(({ fileName, rows }) => {
    const { recordType, resourceName } = classifySource(fileName);
    const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
    const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
    let droppedRows = 0;

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const name = rowName(row, recordType);
      const district = normalizeDistrict(clean(row.行政區) ?? clean(row.行政區別));
      if (!name || !district) {
        missingRequiredFields.push({ rowNumber, fields: [!name ? '場所名稱/地點/公園名稱' : '', !district ? '行政區/行政區別' : ''].filter(Boolean) });
        droppedRows += 1;
        return;
      }

      const sequence = numberFrom(row.序號 ?? row.項次);
      const address = clean(row.地址) ?? '';
      const locationDescription = clean(row.位置);
      const announcementDateRaw = clean(row.公告禁菸日期);
      const announcementDate = normalizeAnnouncementDate(announcementDateRaw);
      const coordinates = parseNoSmokingCoordinates(row.X, row.Y);
      if (coordinates.coordinateStatus !== 'valid' && coordinates.hasCoordinates) {
        invalidCoordinateRows.push({ rowNumber, longitude: coordinates.sourceX, latitude: coordinates.sourceY });
      }
      const announcementDateObj = announcementDate ? new Date(`${announcementDate}T00:00:00Z`) : undefined;
      const parkName = recordType === 'smoke_free_park_green_space' ? name : undefined;
      const placeName = recordType === 'outdoor_no_smoking_place' ? name : undefined;
      const googleMapsQuery = [name, address || locationDescription, district, '台北市'].filter(Boolean).join(' ');

      facilities.push({
        id: `announced_no_smoking_place-${String(facilities.length + 1).padStart(4, '0')}`,
        type: 'announced_no_smoking_place',
        district,
        address,
        longitude: coordinates.longitude,
        latitude: coordinates.latitude,
        note: NOTE,
        source: SOURCE,
        sourceAgency: SOURCE_AGENCY,
        sourceFileName: fileName,
        sourceResourceName: resourceName,
        resourceName,
        sourceSequenceNumber: sequence,
        coordinateStatus: coordinates.coordinateStatus,
        isCoordinateOutlier: coordinates.coordinateStatus === 'outlier',
        locationPrecision: coordinates.hasCoordinates ? 'exact' : 'address_only',
        name,
        placeName: placeName ?? name,
        parkName,
        recordType,
        cityCode: clean(row.縣市別代碼) ?? clean(row.縣市別),
        districtCode: clean(row.行政區別) ?? clean(row.行政區),
        locationDescription,
        hasLocationDescription: Boolean(locationDescription),
        addressNormalized: normalize(address),
        roadName: roadNameFrom(address || locationDescription),
        hasAddress: Boolean(address),
        sourceX: coordinates.sourceX,
        sourceY: coordinates.sourceY,
        coordinateSystem: coordinates.coordinateSystem,
        hasCoordinates: coordinates.hasCoordinates,
        announcementDateRaw,
        announcementDate,
        announcementYear: announcementDateObj ? announcementDateObj.getUTCFullYear() : undefined,
        announcementMonth: announcementDateObj ? announcementDateObj.getUTCMonth() + 1 : undefined,
        announcementMonthKey: announcementDate ? announcementDate.slice(0, 7) : undefined,
        hasAnnouncementDate: Boolean(announcementDate),
        googleMapsQuery,
        sourceRecordHash: normalize([resourceName, name, district, address, locationDescription, coordinates.sourceX, coordinates.sourceY].join('|')),
      });
    });

    reports.push({
      sourceFilename: fileName,
      totalRows: rows.length,
      validRows: facilities.filter((item) => item.sourceFileName === fileName).length,
      droppedRows,
      coordinateOutlierRows: facilities.filter((item) => item.sourceFileName === fileName && item.coordinateStatus === 'outlier').length,
      invalidCoordinateRows,
      missingRequiredFields,
    });
  });

  return { facilities, summary: buildSummary(facilities), reports };
}

export function loadAnnouncedNoSmokingPlaces(rawDir = RAW_DIR) {
  const sources = existsSync(rawDir)
    ? readdirSync(rawDir)
      .filter((item) => item.toLowerCase().endsWith('.csv'))
      .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
      .map((fileName) => ({ fileName, rows: readRows(resolve(rawDir, fileName)) }))
    : [];
  return convertAnnouncedNoSmokingPlaceSources(sources);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadAnnouncedNoSmokingPlaces();
  writeJson(resolve(OUTPUT_DIR, 'announced-no-smoking-places.json'), converted.facilities);
  writeJson(resolve(OUTPUT_DIR, 'announced-no-smoking-place-summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} announced no-smoking place records`);
}
