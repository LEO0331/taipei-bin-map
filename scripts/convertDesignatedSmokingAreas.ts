import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  ConversionSourceReport,
  CoordinateStatus,
  DesignatedSmokingAreaSummary,
  DesignatedSmokingAreaType,
  Facility,
  ManagingUnitCategory,
  OpeningHoursType,
} from '../src/types';
import { TAIPEI_BOUNDS, normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

type Row = Record<string, string | undefined>;

const RAW_DIR = resolve('data/raw/designated-smoking-areas');
const OUTPUT_DIR = resolve('public/data');
const SOURCE = '臺北市指定吸菸區';
const SOURCE_AGENCY = '臺北市政府衛生局';
const HEADERS = ['行政區', '地點', '地址', '樣態', '開放時間', '緯度', '經度', '管理單位', '管理單位電話', '備註'];

const clean = (value: unknown) => {
  const text = String(value ?? '').replace(/\u3000/g, ' ').trim();
  return !text || ['nan', 'null', 'NULL', '-', '--'].includes(text) ? undefined : text;
};
const numberFrom = (value: unknown) => {
  const parsed = Number.parseFloat((clean(value) ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};
const normalize = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const countBy = <T extends string>(values: T[]) => [...new Set(values)].map((value) => ({ value, count: values.filter((item) => item === value).length }));

export function classifyDesignatedSmokingAreaType(raw: string | undefined): DesignatedSmokingAreaType {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('戶外開放式')) return 'outdoor_open';
  if (text.includes('戶外負壓式')) return 'outdoor_negative_pressure';
  if (text.includes('室內吸菸室')) return 'indoor_smoking_room';
  return 'other';
}

export function classifyOpeningHoursType(raw: string | undefined): OpeningHoursType {
  const text = raw?.trim() ?? '';
  if (!text) return 'missing';
  if (text.includes('24小時')) return 'listed_24_hours';
  if (text.includes('開館時間') || text.includes('營業時間')) return 'depends_on_facility_hours';
  if (text.includes('週') || text.includes('例假日') || text.includes('國定假日')) return 'weekday_or_holiday_rule';
  if (/\d{1,2}[:：]\d{2}/.test(text)) return 'fixed_hours';
  return 'custom_text';
}

export function classifyManagingUnitCategory(raw: string | undefined): ManagingUnitCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('區公所')) return 'district_office';
  if (text.includes('臺北市政府') || text.includes('臺北市停車管理工程處') || text.includes('臺北市殯葬管理處')) return 'taipei_city_government';
  if (text.includes('內政部') || text.includes('國家公園')) return 'central_government';
  if (text.includes('捷運') || text.includes('交通局') || text.includes('航空站')) return 'transportation_or_mrt';
  if (text.includes('公園') || text.includes('公園路燈')) return 'park_or_public_space';
  if (text.includes('股份有限公司') || text.includes('公司')) return 'private_operator';
  if (text.includes('體育') || text.includes('表演藝術') || text.includes('文化') || text.includes('劇院')) return 'cultural_or_sports_facility';
  return 'other';
}

function coordinateStatus(longitude?: number, latitude?: number): CoordinateStatus {
  if (longitude === undefined || latitude === undefined) return 'missing';
  return longitude < TAIPEI_BOUNDS.minLng ||
    longitude > TAIPEI_BOUNDS.maxLng ||
    latitude < TAIPEI_BOUNDS.minLat ||
    latitude > TAIPEI_BOUNDS.maxLat
    ? 'outlier'
    : 'valid';
}

function roadNameFrom(address?: string) {
  const text = address?.replace(/^臺北市/, '').replace(/^台北市/, '');
  return text?.match(/(.+[路街道]\d*段?)/)?.[1];
}

function telHref(phone?: string) {
  if (!phone || /[#轉分機]/.test(phone)) return undefined;
  const normalized = phone.replace(/[()\s-]/g, '');
  return /^\+?\d+$/.test(normalized) ? `tel:${normalized}` : undefined;
}

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim(),
  });
  const utf8 = parse(raw.toString('utf8'));
  if (HEADERS.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  return parse(iconv.decode(raw, 'cp950')).data;
}

function buildSummary(facilities: Facility[]): DesignatedSmokingAreaSummary {
  const districts = facilities.map((item) => item.district).filter(Boolean);
  const typeRows = countBy(facilities.map((item) => item.smokingAreaType ?? 'unknown'));
  const hourRows = countBy(facilities.map((item) => item.openingHoursType ?? 'unknown'));
  const unitCategories = countBy(facilities.map((item) => item.managingUnitCategory ?? 'unknown'));
  const units = facilities.map((item) => item.managingUnit).filter(Boolean) as string[];
  return {
    totalRecords: facilities.length,
    validCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'valid').length,
    missingCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'missing').length,
    outlierCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'outlier').length,
    districtCount: new Set(districts).size,
    uniquePlaceNameCount: new Set(facilities.map((item) => item.name).filter(Boolean)).size,
    uniqueAddressCount: new Set(facilities.map((item) => item.address).filter(Boolean)).size,
    recordsWithPhotoUrl: facilities.filter((item) => item.hasPhotoUrl).length,
    recordsWithRelativeLocation: facilities.filter((item) => item.hasRelativeLocation).length,
    recordsWithManagingUnitPhone: facilities.filter((item) => item.hasManagingUnitPhone).length,
    listed24HoursCount: facilities.filter((item) => item.isListed24Hours).length,
    customOpeningHoursCount: facilities.filter((item) => item.hasCustomOpeningHours).length,
    byDistrict: countBy(districts).map(({ value, count }) => ({ district: value, count })).sort((a, b) => b.count - a.count),
    bySmokingAreaType: typeRows.map(({ value, count }) => ({
      smokingAreaType: value,
      smokingAreaTypeRaw: facilities.find((item) => item.smokingAreaType === value)?.smokingAreaTypeRaw,
      count,
    })),
    byOpeningHoursType: hourRows.map(({ value, count }) => ({ openingHoursType: value, count })),
    byManagingUnitCategory: unitCategories.map(({ value, count }) => ({ managingUnitCategory: value, count })),
    byManagingUnit: countBy(units).map(({ value, count }) => ({ managingUnit: value, count })).sort((a, b) => b.count - a.count),
  };
}

export function convertDesignatedSmokingAreaRows(rows: Row[], fileName = '臺北市指定吸菸區.csv') {
  const facilities: Facility[] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];
  let droppedRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const missing = ['行政區', '地點', '地址', '樣態', '開放時間', '緯度', '經度'].filter((field) => !clean(row[field]));
    if (missing.length) {
      missingRequiredFields.push({ rowNumber, fields: missing });
      droppedRows += 1;
      return;
    }

    const district = normalizeTaipeiDistrict(clean(row.行政區) ?? '');
    const name = clean(row.地點) ?? '';
    const address = clean(row.地址)?.replace(/^台北市/, '臺北市') ?? '';
    const latitude = numberFrom(row.緯度);
    const longitude = numberFrom(row.經度);
    const status = coordinateStatus(longitude, latitude);
    if (status !== 'valid') invalidCoordinateRows.push({ rowNumber, longitude: clean(row.經度), latitude: clean(row.緯度) });
    const smokingAreaTypeRaw = clean(row.樣態);
    const openingHoursRaw = clean(row.開放時間);
    const openingHoursType = classifyOpeningHoursType(openingHoursRaw);
    const photoUrl = clean(row.照片連結);
    const validPhotoUrl = photoUrl && /^https?:\/\//.test(photoUrl) ? photoUrl : undefined;
    const managingUnit = clean(row.管理單位);
    const managingUnitPhone = clean(row.管理單位電話);

    facilities.push({
      id: `designated_smoking_area-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'designated_smoking_area',
      district,
      address,
      longitude: longitude ?? 0,
      latitude: latitude ?? 0,
      coordinateStatus: status,
      isCoordinateOutlier: status === 'outlier',
      note: clean(row.備註) ?? '',
      source: SOURCE,
      sourceAgency: SOURCE_AGENCY,
      name,
      placeName: name,
      roadName: roadNameFrom(address),
      smokingAreaTypeRaw,
      smokingAreaType: classifyDesignatedSmokingAreaType(smokingAreaTypeRaw),
      openingHoursRaw,
      openingHours: openingHoursRaw,
      openingHoursDisplay: openingHoursRaw,
      openingHoursType,
      isListed24Hours: openingHoursType === 'listed_24_hours',
      hasCustomOpeningHours: openingHoursType !== 'listed_24_hours' && openingHoursType !== 'missing',
      relativeLocation: clean(row.相對位置),
      hasRelativeLocation: Boolean(clean(row.相對位置)),
      photoUrl: validPhotoUrl,
      hasPhotoUrl: Boolean(validPhotoUrl),
      manager: managingUnit,
      managingUnit,
      managingUnitCategory: classifyManagingUnitCategory(managingUnit),
      phone: managingUnitPhone,
      managingUnitPhone,
      managingUnitPhoneDisplay: managingUnitPhone,
      managingUnitPhoneDialHref: telHref(managingUnitPhone),
      hasManagingUnitPhone: Boolean(managingUnitPhone),
      googleMapsQuery: [name, address].filter(Boolean).join(' '),
      sourceRecordHash: normalize([name, address, latitude, longitude].join('|')),
    });
  });

  const report: ConversionSourceReport = {
    sourceFilename: fileName,
    totalRows: rows.length,
    validRows: facilities.length,
    droppedRows,
    coordinateOutlierRows: facilities.filter((item) => item.coordinateStatus === 'outlier').length,
    invalidCoordinateRows,
    missingRequiredFields,
  };
  return { facilities, summary: buildSummary(facilities), report };
}

export function loadDesignatedSmokingAreas(rawDir = RAW_DIR) {
  const file = existsSync(rawDir)
    ? readdirSync(rawDir).find((item) => item.toLowerCase().endsWith('.csv'))
    : undefined;
  return file
    ? convertDesignatedSmokingAreaRows(readRows(resolve(rawDir, file)), file)
    : convertDesignatedSmokingAreaRows([]);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadDesignatedSmokingAreas();
  writeJson(resolve(OUTPUT_DIR, 'designated-smoking-areas.json'), converted.facilities);
  writeJson(resolve(OUTPUT_DIR, 'designated-smoking-area-summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} designated smoking area records`);
}
