import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  ConversionSourceReport,
  Facility,
  PayTaipeiCardlessParkingLotSummary,
  PayTaipeiParkingGeocodingStatus,
  PayTaipeiParkingLocationPrecision,
  PayTaipeiParkingPostalCodeType,
  PayTaipeiParkingSupportStatus,
} from '../src/types';
import { normalizeTaipeiDistrict } from '../src/utils/facilityUtils';

const SOURCE_NAME = 'pay.taipei支援無卡進出停車場清單';
const SOURCE_AGENCY = '臺北市政府資訊局';
const DEFAULT_INPUT = '/Users/Leo/Downloads/pay.taipei支援無卡進出停車場清單_20260211 (1).csv';
const RAW_DIR = resolve('data/raw/pay-taipei-cardless-parking-lots');
const OUTPUT_DIR = resolve('public/data');
const requiredHeaders = ['seqno', '停車場ID', '營運id', '營運單位', '對應停車場', '狀態', '電話', '郵遞區號', '地址', '說明'];
const taipeiPostalCodes = new Set(['100', '103', '104', '105', '106', '108', '110', '111', '112', '114', '115', '116']);
const taipeiDistricts = ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'];

type Row = Record<string, string | undefined>;

const statusLabels: Record<PayTaipeiParkingSupportStatus, { zh: string; en: string }> = {
  supported: { zh: '支援無卡進出', en: 'Supports cardless entry / exit' },
  not_supported_or_stopped: { zh: '未支援或已停止服務', en: 'Not supported or service stopped' },
  other: { zh: '其他狀態', en: 'Other status' },
  unknown: { zh: '未知狀態', en: 'Unknown status' },
};

function cleanText(raw: unknown) {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  if (!text || ['-', '--', 'nan', 'null', 'undefined', '尚無資料'].includes(text.toLowerCase())) return undefined;
  return text;
}

const normalize = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const normalizeAddress = (value?: string) => cleanText(value)?.replace(/^台北市/, '臺北市').replace(/^台北/, '臺北');
const countDuplicates = (values: Array<string | undefined>) => {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value as string, (counts.get(value as string) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1);
};

export function classifyPayTaipeiParkingSupportStatus(raw: string | undefined): PayTaipeiParkingSupportStatus {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text === '1') return 'supported';
  if (text === '0') return 'not_supported_or_stopped';
  return 'other';
}

export function getPayTaipeiParkingStatusLabel(status: PayTaipeiParkingSupportStatus) {
  return statusLabels[status];
}

function parsePostalCode(raw: unknown) {
  const postalCode = cleanText(raw);
  if (!postalCode) return { postalCodeType: 'missing' as PayTaipeiParkingPostalCodeType };
  const normalized = postalCode.replace(/\D/g, '');
  if (taipeiPostalCodes.has(normalized)) return { postalCode, postalCodeNormalized: normalized, postalCodeType: 'taipei_city' as PayTaipeiParkingPostalCodeType };
  if (/^\d{3}$/.test(normalized)) return { postalCode, postalCodeNormalized: normalized, postalCodeType: 'new_taipei_or_other_city' as PayTaipeiParkingPostalCodeType };
  return { postalCode, postalCodeNormalized: normalized || postalCode, postalCodeType: 'unknown' as PayTaipeiParkingPostalCodeType, warning: 'unknown_postal_code' };
}

function parseAddress(raw: unknown, postalCodeType: PayTaipeiParkingPostalCodeType, parkingLotName?: string, note?: string) {
  const address = normalizeAddress(cleanText(raw));
  const district = taipeiDistricts.find((item) => address?.includes(item));
  const roadName = address?.match(/([^\d\s,，、]+(?:路|街|大道|巷))/)?.[1];
  const addressLooksLikeBasementOrUnderground = Boolean(address && /(地下|地下室|B1|B2|Ｂ１|Ｂ２)/i.test(address));
  const addressLooksLikeOperatorOrPlatformAddress = Boolean(
    (parkingLotName && /平台/.test(parkingLotName)) ||
    (note && /平台/.test(note)) ||
    (address && /(公司|辦公|辦公室|[2-9]\d*樓|[二三四五六七八九十]+樓)/.test(address)) ||
    postalCodeType === 'new_taipei_or_other_city',
  );

  return {
    address,
    addressNormalized: normalize(address),
    districtNameFromAddress: district,
    isTaipeiDistrict: Boolean(district),
    roadName,
    addressLooksLikeBasementOrUnderground,
    addressLooksLikeOperatorOrPlatformAddress,
  };
}

function parseNote(raw: unknown) {
  const note = cleanText(raw);
  const noteNormalized = normalize(note);
  const hasNote = Boolean(note && note !== '無');
  const serviceStoppedHint = Boolean(note && /(停止服務|暫停|停用|已停止|不支援)/.test(note));
  return { note, noteNormalized, hasNote, serviceStoppedHint };
}

function locationPrecision(address?: string, district?: string, operatorLike = false): PayTaipeiParkingLocationPrecision {
  if (operatorLike) return 'operator_or_platform_address';
  if (district && address) return 'district_address';
  if (district) return 'district_only';
  return 'missing';
}

function mapQuery(record: { address?: string; parkingLotName?: string; operatorName?: string; operatorLike?: boolean }) {
  if (!record.address && !record.parkingLotName) return undefined;
  return [record.address, record.operatorLike ? record.operatorName : record.parkingLotName].filter(Boolean).join(' ');
}

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const utf8 = parse(raw.toString('utf8'));
  if (requiredHeaders.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  return parse(iconv.decode(raw, 'cp950')).data;
}

function buildSummary(facilities: Facility[], duplicateData: PayTaipeiCardlessParkingLotSummary['dataQuality']): PayTaipeiCardlessParkingLotSummary {
  const unique = (values: Array<string | undefined>) => new Set(values.filter(Boolean)).size;
  const supportCount = (status: PayTaipeiParkingSupportStatus) => facilities.filter((item) => item.supportStatusCategory === status).length;
  const districts = [...new Set(facilities.map((item) => item.districtNameFromAddress).filter(Boolean) as string[])];
  const operators = [...new Set(facilities.map((item) => item.operatorName).filter(Boolean) as string[])];
  const roadNames = [...new Set(facilities.map((item) => item.roadName).filter(Boolean) as string[])];
  const parkingLotNames = [...new Set(facilities.map((item) => item.parkingLotName).filter(Boolean) as string[])];

  return {
    totalRecords: facilities.length,
    uniqueParkingLotIdCount: unique(facilities.map((item) => item.parkingLotId)),
    uniqueOperatorIdCount: unique(facilities.map((item) => item.operatorId)),
    uniqueOperatorNameCount: unique(facilities.map((item) => item.operatorName)),
    uniqueParkingLotNameCount: unique(facilities.map((item) => item.parkingLotName)),
    uniqueAddressCount: unique(facilities.map((item) => item.addressNormalized || item.address)),
    uniquePhoneNumberCount: unique(facilities.map((item) => item.phoneNumberNormalized || item.phoneNumber)),
    uniquePostalCodeCount: unique(facilities.map((item) => item.postalCodeNormalized || item.postalCode)),
    districtCount: districts.length,
    uniqueRoadNameCount: roadNames.length,
    supportedCount: supportCount('supported'),
    notSupportedOrStoppedCount: supportCount('not_supported_or_stopped'),
    unknownStatusCount: supportCount('unknown') + supportCount('other'),
    recordsWithPhone: facilities.filter((item) => item.phoneNumber).length,
    recordsWithNote: facilities.filter((item) => item.hasNote).length,
    recordsWithServiceStoppedHint: facilities.filter((item) => item.serviceStoppedHint).length,
    recordsWithTaipeiDistrictFromAddress: facilities.filter((item) => item.isTaipeiDistrict).length,
    recordsWithOperatorOrPlatformAddress: facilities.filter((item) => item.addressLooksLikeOperatorOrPlatformAddress).length,
    recordsWithBasementOrUndergroundAddress: facilities.filter((item) => item.addressLooksLikeBasementOrUnderground).length,
    recordsWithGeocodedCoordinates: 0,
    recordsWithJoinedOfficialCoordinates: 0,
    byDistrict: districts.map((districtName) => {
      const rows = facilities.filter((item) => item.districtNameFromAddress === districtName);
      return {
        districtName,
        count: rows.length,
        supportedCount: rows.filter((item) => item.supportStatusCategory === 'supported').length,
        notSupportedOrStoppedCount: rows.filter((item) => item.supportStatusCategory === 'not_supported_or_stopped').length,
        uniqueOperatorNameCount: unique(rows.map((item) => item.operatorName)),
        uniqueAddressCount: unique(rows.map((item) => item.addressNormalized || item.address)),
      };
    }).sort((a, b) => b.count - a.count),
    byOperator: operators.map((operatorName) => {
      const rows = facilities.filter((item) => item.operatorName === operatorName);
      return {
        operatorName,
        count: rows.length,
        supportedCount: rows.filter((item) => item.supportStatusCategory === 'supported').length,
        notSupportedOrStoppedCount: rows.filter((item) => item.supportStatusCategory === 'not_supported_or_stopped').length,
        districtCount: unique(rows.map((item) => item.districtNameFromAddress)),
      };
    }).sort((a, b) => b.count - a.count),
    bySupportStatus: (['supported', 'not_supported_or_stopped', 'other', 'unknown'] as PayTaipeiParkingSupportStatus[])
      .map((supportStatusCategory) => ({
        supportStatus: supportStatusCategory,
        supportStatusCategory,
        labelZh: statusLabels[supportStatusCategory].zh,
        labelEn: statusLabels[supportStatusCategory].en,
        count: supportCount(supportStatusCategory),
      }))
      .filter((item) => item.count > 0),
    byPostalCode: [...new Set(facilities.map((item) => item.postalCode).filter(Boolean) as string[])]
      .map((postalCode) => {
        const rows = facilities.filter((item) => item.postalCode === postalCode);
        return { postalCode, postalCodeType: rows[0]?.postalCodeType ?? 'unknown', count: rows.length };
      })
      .sort((a, b) => b.count - a.count),
    byRoadName: roadNames.map((roadName) => {
      const rows = facilities.filter((item) => item.roadName === roadName);
      return { roadName, count: rows.length, districtCount: unique(rows.map((item) => item.districtNameFromAddress)) };
    }).sort((a, b) => b.count - a.count),
    topParkingLotNames: parkingLotNames.map((parkingLotName) => {
      const rows = facilities.filter((item) => item.parkingLotName === parkingLotName);
      return { parkingLotName, count: rows.length, operatorName: rows[0]?.operatorName, districtName: rows[0]?.districtNameFromAddress };
    }).sort((a, b) => b.count - a.count).slice(0, 20),
    dataQuality: duplicateData,
  };
}

export function convertPayTaipeiCardlessParkingLotRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const facilities: Facility[] = [];
  const duplicateRows: ConversionSourceReport['missingRequiredFields'] = [];
  const missingRows: ConversionSourceReport['missingRequiredFields'] = [];
  const unknownStatuses: NonNullable<ConversionSourceReport['unknownStatuses']> = [];
  const unparsedDistrictExamples: NonNullable<ConversionSourceReport['unparsedDistrictExamples']> = [];
  const operatorOrPlatformAddressExamples: NonNullable<ConversionSourceReport['operatorOrPlatformAddressExamples']> = [];
  const postalCodeWarnings: NonNullable<ConversionSourceReport['postalCodeWarnings']> = [];
  const fallbackKeys: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sourceSequenceNumberNormalized = cleanText(row.seqno);
    const sourceSequenceNumber = Number.parseInt(sourceSequenceNumberNormalized ?? '', 10) || undefined;
    const parkingLotId = cleanText(row.停車場ID);
    const operatorId = cleanText(row.營運id);
    const operatorName = cleanText(row.營運單位);
    const parkingLotName = cleanText(row.對應停車場);
    const note = parseNote(row.說明);
    const postal = parsePostalCode(row.郵遞區號);
    const address = parseAddress(row.地址, postal.postalCodeType, parkingLotName, note.note);
    const statusRaw = cleanText(row.狀態);
    const supportStatusCategory = classifyPayTaipeiParkingSupportStatus(statusRaw);
    const labels = statusLabels[supportStatusCategory];
    const missing = [
      !parkingLotId ? '停車場ID' : '',
      !operatorId ? '營運id' : '',
      !operatorName ? '營運單位' : '',
      !parkingLotName ? '對應停車場' : '',
      !statusRaw ? '狀態' : '',
      !postal.postalCode ? '郵遞區號' : '',
      !address.address ? '地址' : '',
    ].filter(Boolean);
    if (missing.length) missingRows.push({ rowNumber, fields: missing });
    if (supportStatusCategory === 'other') unknownStatuses.push({ rowNumber, value: statusRaw ?? '' });
    if (postal.warning) postalCodeWarnings.push({ rowNumber, postalCode: postal.postalCode, warning: postal.warning });
    if (!address.districtNameFromAddress) unparsedDistrictExamples.push({ rowNumber, address: address.address });
    if (address.addressLooksLikeOperatorOrPlatformAddress) {
      operatorOrPlatformAddressExamples.push({ rowNumber, address: address.address, parkingLotName });
    }

    const precision = locationPrecision(address.address, address.districtNameFromAddress, address.addressLooksLikeOperatorOrPlatformAddress);
    const geocodingStatus: PayTaipeiParkingGeocodingStatus = address.addressLooksLikeOperatorOrPlatformAddress
      ? 'not_applicable_operator_or_platform_address'
      : 'not_geocoded_address_only';
    const fallbackKey = [operatorId, operatorName, parkingLotName, address.address].map(normalize).join('|');
    fallbackKeys.push(fallbackKey);

    facilities.push({
      id: `pay_taipei_cardless_parking_lot-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'pay_taipei_cardless_parking_lot',
      district: address.districtNameFromAddress ? normalizeTaipeiDistrict(address.districtNameFromAddress) : '',
      address: address.address ?? '',
      longitude: 0,
      latitude: 0,
      locationPrecision: 'address_only',
      note: note.note ?? '',
      source: SOURCE_NAME,
      sourceAgency: SOURCE_AGENCY,
      name: parkingLotName,
      sourceSequenceNumber,
      sourceSequenceNumberNormalized,
      parkingLotId: parkingLotId ?? '',
      parkingLotIdNormalized: normalize(parkingLotId),
      operatorId: operatorId ?? '',
      operatorIdNormalized: normalize(operatorId),
      operatorName: operatorName ?? '',
      operatorNameNormalized: normalize(operatorName),
      parkingLotName: parkingLotName ?? '',
      parkingLotNameNormalized: normalize(parkingLotName),
      statusRaw,
      supportStatus: statusRaw,
      supportStatusCategory,
      supportStatusLabelZh: labels.zh,
      supportStatusLabelEn: labels.en,
      phoneNumber: cleanText(row.電話),
      phoneNumberNormalized: normalize(cleanText(row.電話)),
      phone: cleanText(row.電話),
      postalCode: postal.postalCode,
      postalCodeNormalized: postal.postalCodeNormalized,
      postalCodeType: postal.postalCodeType,
      addressNormalized: address.addressNormalized,
      districtNameFromAddress: address.districtNameFromAddress,
      isTaipeiDistrict: address.isTaipeiDistrict,
      roadName: address.roadName,
      addressLooksLikeBasementOrUnderground: address.addressLooksLikeBasementOrUnderground,
      addressLooksLikeOperatorOrPlatformAddress: address.addressLooksLikeOperatorOrPlatformAddress,
      noteNormalized: note.noteNormalized,
      hasNote: note.hasNote,
      serviceStoppedHint: note.serviceStoppedHint,
      payTaipeiParkingLocationPrecision: precision,
      payTaipeiParkingGeocodingStatus: geocodingStatus,
      coordinateSource: 'none',
      googleMapsQuery: mapQuery({
        address: address.address,
        parkingLotName,
        operatorName,
        operatorLike: address.addressLooksLikeOperatorOrPlatformAddress,
      }),
    });
  });

  const duplicateSequenceNumbers = countDuplicates(facilities.map((item) => item.sourceSequenceNumberNormalized))
    .map(([sourceSequenceNumber, count]) => ({ sourceSequenceNumber, count }));
  const duplicateParkingLotIds = countDuplicates(facilities.map((item) => item.parkingLotId))
    .map(([parkingLotId, count]) => ({ parkingLotId, count }));
  const duplicateParkingLotNames = countDuplicates(facilities.map((item) => item.parkingLotName))
    .map(([parkingLotName, count]) => ({ parkingLotName, count }));
  const duplicateAddresses = countDuplicates(facilities.map((item) => item.addressNormalized || item.address))
    .map(([address, count]) => ({ address, count }));
  const duplicateFallbackKeys = countDuplicates(fallbackKeys).map(([key, count]) => ({ key, count }));

  const dataQuality: PayTaipeiCardlessParkingLotSummary['dataQuality'] = {
    missingSequenceNumberCount: facilities.filter((item) => !item.sourceSequenceNumberNormalized).length,
    duplicateSequenceNumberCount: duplicateSequenceNumbers.length,
    missingParkingLotIdCount: facilities.filter((item) => !item.parkingLotId).length,
    duplicateParkingLotIdCount: duplicateParkingLotIds.length,
    missingOperatorIdCount: facilities.filter((item) => !item.operatorId).length,
    missingOperatorNameCount: facilities.filter((item) => !item.operatorName).length,
    missingParkingLotNameCount: facilities.filter((item) => !item.parkingLotName).length,
    duplicateParkingLotNameCount: duplicateParkingLotNames.length,
    missingStatusCount: facilities.filter((item) => !item.statusRaw).length,
    unknownStatusCount: unknownStatuses.length,
    missingPhoneNumberCount: facilities.filter((item) => !item.phoneNumber).length,
    missingPostalCodeCount: facilities.filter((item) => !item.postalCode).length,
    unknownPostalCodeTypeCount: facilities.filter((item) => item.postalCodeType === 'unknown').length,
    missingAddressCount: facilities.filter((item) => !item.address).length,
    duplicateAddressCount: duplicateAddresses.length,
    unparsedDistrictFromAddressCount: unparsedDistrictExamples.length,
    operatorOrPlatformAddressCount: operatorOrPlatformAddressExamples.length,
    duplicateFallbackKeyCount: duplicateFallbackKeys.length,
  };

  return {
    facilities,
    summary: buildSummary(facilities, dataQuality),
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: 0,
      coordinateOutlierRows: 0,
      invalidCoordinateRows: [],
      missingRequiredFields: [...missingRows, ...duplicateRows],
      duplicateSequenceNumbers,
      duplicateParkingLotIds,
      duplicateParkingLotNames,
      duplicateAddresses,
      duplicateFallbackKeys,
      unknownStatuses,
      unparsedDistrictExamples: unparsedDistrictExamples.slice(0, 20),
      operatorOrPlatformAddressExamples: operatorOrPlatformAddressExamples.slice(0, 20),
      postalCodeWarnings,
    } satisfies ConversionSourceReport,
  };
}

export function loadPayTaipeiCardlessParkingLots(inputPath = DEFAULT_INPUT, rawDir = RAW_DIR) {
  const rawFile = existsSync(rawDir) ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv')) : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  return existsSync(path)
    ? convertPayTaipeiCardlessParkingLotRows(readRows(path), basename(path))
    : convertPayTaipeiCardlessParkingLotRows([], `${basename(path)} (not found)`);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadPayTaipeiCardlessParkingLots();
  writeJson(resolve(OUTPUT_DIR, 'pay-taipei-cardless-parking-lots.json'), converted.facilities);
  writeJson(resolve(OUTPUT_DIR, 'pay-taipei-cardless-parking-lot-summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} pay.taipei cardless parking lot records`);
}
