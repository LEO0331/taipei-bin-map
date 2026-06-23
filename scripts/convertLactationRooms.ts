import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  ConversionSourceReport,
  Facility,
  LactationRoomLocation,
  LactationRoomSummary,
} from '../src/types';

const SOURCE_NAME = '臺北市哺集乳室';
const PRIMARY = resolve('data/raw/lactation-rooms/台北哺乳室建置資料清單-1141231.csv');
const SECONDARY = resolve('data/raw/lactation-rooms/臺北市依法設置哺集乳室清單.csv');
const OUTPUT_DIR = resolve('public/data');
const LOCATIONS = resolve(OUTPUT_DIR, 'lactation-room-locations.json');
const DISTRICTS: Record<string, string> = {
  '63000010': '松山區', '63000020': '信義區', '63000030': '大安區', '63000040': '中山區',
  '63000050': '中正區', '63000060': '大同區', '63000070': '萬華區', '63000080': '文山區',
  '63000090': '南港區', '63000100': '內湖區', '63000110': '士林區', '63000120': '北投區',
};
const DISTRICT_NAMES = Object.values(DISTRICTS);
type Row = Record<string, string | undefined>;

const clean = (value: unknown) => {
  const text = String(value ?? '').trim();
  return !text || text.toLowerCase() === 'nan' ? undefined : text;
};
const normalizeText = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const keyOf = (name?: string, address?: string) => `${normalizeText(name)}|${normalizeText(address)}`;
const splitItems = (value?: string) => (value ?? '').split(';').map((item) => item.trim()).filter(Boolean);

function readRows(path: string) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path);
  const text = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf ? raw.toString('utf8') : iconv.decode(raw, 'cp950');
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, transformHeader: (header) => header.trim() });
  if (parsed.errors.length) throw new Error(parsed.errors.map((error) => error.message).join('\n'));
  return parsed.data;
}

export function normalizeDistrictCode(raw: unknown) {
  return clean(raw)?.replace(/\.0$/, '');
}

export function parseRocChineseDate(raw?: string) {
  const match = raw?.match(/(\d{2,3})年(\d{1,2})月(\d{1,2})日/);
  if (!match) return undefined;
  return `${Number(match[1]) + 1911}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function districtFrom(address?: string, code?: string) {
  if (code && DISTRICTS[code]) return DISTRICTS[code];
  return DISTRICT_NAMES.find((district) => address?.includes(district)) ?? '';
}

export function buildLactationSummary(facilities: Facility[]): LactationRoomSummary {
  const countItems = (field: 'basicEquipment' | 'friendlyEquipmentOrServices') => {
    const counts = new Map<string, number>();
    facilities.flatMap((facility) => facility[field] ?? []).forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
    return [...counts].map(([item, count]) => field === 'basicEquipment' ? { equipment: item, count } : { service: item, count })
      .sort((a, b) => b.count - a.count);
  };
  const districts = [...new Set(facilities.map((facility) => facility.district).filter(Boolean))];
  return {
    totalRecords: facilities.length,
    uniqueFacilityCount: facilities.length,
    districtCount: districts.length,
    recordsWithOpeningHours: facilities.filter((item) => item.openingHours).length,
    recordsWithPhone: facilities.filter((item) => item.phone).length,
    recordsWithMobile: facilities.filter((item) => item.mobile).length,
    recordsWithLocationGuidance: facilities.filter((item) => item.locationGuidance).length,
    recordsWithCertificationValidity: facilities.filter((item) => item.certificationValidityRaw).length,
    recordsWithNotes: facilities.filter((item) => item.notes).length,
    recordsAppearingInLegalRequiredList: facilities.filter((item) => item.appearsInLegalRequiredList).length,
    byDistrict: districts.map((district) => {
      const rows = facilities.filter((item) => item.district === district);
      return {
        district,
        count: rows.length,
        withOpeningHours: rows.filter((item) => item.openingHours).length,
        withCertificationValidity: rows.filter((item) => item.certificationValidityRaw).length,
        withLocationGuidance: rows.filter((item) => item.locationGuidance).length,
      };
    }).sort((a, b) => b.count - a.count),
    byBasicEquipment: countItems('basicEquipment') as Array<{ equipment: string; count: number }>,
    byFriendlyEquipmentOrService: countItems('friendlyEquipmentOrServices') as Array<{ service: string; count: number }>,
  };
}

export function convertLactationRows(
  primaryRows: Row[],
  secondaryRows: Row[],
  verifiedLocations: LactationRoomLocation[] = [],
) {
  const secondaryByKey = new Map(secondaryRows.map((row, index) => [keyOf(clean(row.機關名稱), clean(row.地址)), { row, index }]));
  const locationByKey = new Map(
    verifiedLocations.map((location) => [
      `${location.normalizedName}|${location.normalizedAddress}`,
      location,
    ]),
  );
  const failedCertificationDates: NonNullable<ConversionSourceReport['failedCertificationDates']> = [];
  const facilities: Facility[] = [];
  const seen = new Set<string>();

  primaryRows.forEach((row, index) => {
    const facilityName = clean(row.機構名稱);
    const address = clean(row.地址);
    const key = keyOf(facilityName, address);
    if (!facilityName || !address || seen.has(key)) return;
    seen.add(key);
    const districtCode = normalizeDistrictCode(row.行政區);
    const certificationValidityRaw = clean(row.優良哺集乳室認證效期);
    const certificationValidUntil = parseRocChineseDate(certificationValidityRaw);
    if (certificationValidityRaw && !certificationValidUntil) failedCertificationDates.push({ rowNumber: index + 2, value: certificationValidityRaw });
    const secondary = secondaryByKey.get(key);
    if (secondary) secondaryByKey.delete(key);
    const basicEquipmentRaw = clean(row.基本設備);
    const friendlyEquipmentOrServicesRaw = clean(row.友善設備或服務);
    const verifiedLocation = locationByKey.get(key);
    facilities.push({
      id: `lactation_room-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'lactation_room',
      district: districtFrom(address, districtCode),
      address,
      longitude: verifiedLocation?.longitude ?? 0,
      latitude: verifiedLocation?.latitude ?? 0,
      locationPrecision: verifiedLocation ? 'exact' : 'address_only',
      source: SOURCE_NAME,
      primarySourceName: '台北哺乳室建置資料清單',
      secondarySourceName: '臺北市依法設置哺集乳室清單',
      note: clean(row.貼心小提醒) ?? '',
      name: facilityName,
      facilityName,
      ...(districtCode ? { districtCode } : {}),
      ...(clean(row.電話) ? { phone: clean(row.電話) } : {}),
      ...(clean(row.分機) ? { extension: clean(row.分機) } : {}),
      ...(clean(row.手機) ? { mobile: clean(row.手機) } : {}),
      ...(clean(row.開放時間) ? { openingHours: clean(row.開放時間) } : {}),
      ...(clean(row.位置指引) ? { locationGuidance: clean(row.位置指引) } : {}),
      ...(basicEquipmentRaw ? { basicEquipmentRaw, basicEquipment: splitItems(basicEquipmentRaw) } : {}),
      ...(friendlyEquipmentOrServicesRaw ? { friendlyEquipmentOrServicesRaw, friendlyEquipmentOrServices: splitItems(friendlyEquipmentOrServicesRaw) } : {}),
      ...(certificationValidityRaw ? { certificationValidityRaw } : {}),
      ...(certificationValidUntil ? { certificationValidUntil } : {}),
      ...(clean(row.輪椅使用) ? { wheelchairAccessibilityRaw: clean(row.輪椅使用) } : {}),
      ...(clean(row.貼心小提醒) ? { notes: clean(row.貼心小提醒) } : {}),
      appearsInLegalRequiredList: Boolean(secondary),
    });
  });

  const unmatchedSecondaryRows: NonNullable<ConversionSourceReport['unmatchedSecondaryRows']> = [];
  secondaryByKey.forEach(({ row, index }) => {
    const facilityName = clean(row.機關名稱);
    const address = clean(row.地址);
    if (!facilityName || !address) return;
    unmatchedSecondaryRows.push({ rowNumber: index + 2, name: facilityName, address });
    const verifiedLocation = locationByKey.get(keyOf(facilityName, address));
    facilities.push({
      id: `lactation_room-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'lactation_room',
      district: districtFrom(address),
      address,
      longitude: verifiedLocation?.longitude ?? 0,
      latitude: verifiedLocation?.latitude ?? 0,
      locationPrecision: verifiedLocation ? 'exact' : 'address_only',
      source: SOURCE_NAME,
      secondarySourceName: '臺北市依法設置哺集乳室清單',
      note: '',
      name: facilityName,
      facilityName,
      ...(clean(row.電話) ? { phone: clean(row.電話) } : {}),
      ...(clean(row.分機) ? { extension: clean(row.分機) } : {}),
      ...(clean(row.手機) ? { mobile: clean(row.手機) } : {}),
      ...(clean(row.開放時間) ? { openingHours: clean(row.開放時間) } : {}),
      appearsInLegalRequiredList: true,
    });
  });

  return {
    facilities,
    summary: buildLactationSummary(facilities),
    report: {
      sourceFilename: `${basename(PRIMARY)} + ${basename(SECONDARY)}`,
      totalRows: primaryRows.length + secondaryRows.length,
      validRows: facilities.length,
      droppedRows: primaryRows.length + secondaryRows.length - facilities.length,
      coordinateOutlierRows: 0,
      invalidCoordinateRows: [],
      missingRequiredFields: [],
      unmatchedSecondaryRows: unmatchedSecondaryRows.slice(0, 25),
      failedCertificationDates: failedCertificationDates.slice(0, 25),
    } satisfies ConversionSourceReport,
  };
}

export function loadLactationRooms() {
  const locations = existsSync(LOCATIONS)
    ? JSON.parse(readFileSync(LOCATIONS, 'utf8')) as LactationRoomLocation[]
    : [];
  return convertLactationRows(readRows(PRIMARY), readRows(SECONDARY), locations);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadLactationRooms();
  writeJson(resolve(OUTPUT_DIR, 'lactation-rooms.json'), converted.facilities);
  writeJson(resolve(OUTPUT_DIR, 'lactation-room-summary.json'), converted.summary);
  if (!existsSync(LOCATIONS)) writeJson(LOCATIONS, []);
  console.log(`Wrote ${converted.facilities.length} lactation room records`);
}
