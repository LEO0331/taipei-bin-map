import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type {
  CleanNeedleExchangeServicePointSummary,
  CleanNeedleServiceItemCategory,
  CleanNeedleServicePointCategory,
  ConversionSourceReport,
  Facility,
} from '../src/types';

type Row = Record<string, string | undefined>;

const SOURCE_NAME = '臺北市清潔針具佈點名單';
const SOURCE_AGENCY = '臺北市政府衛生局';
const DEFAULT_INPUT = '/Users/Leo/Downloads/臺北市清潔針具佈點名單115s1.csv';
const DEFAULT_RAW_DIR = resolve('data/raw/clean-needle-exchange-service-points');
const DEFAULT_OUTPUT_DIR = resolve('public/data');
const requiredHeaders = ['序號', '行政區域代碼', '設置項目', '設置點類別', '機構代碼', '設置地點', '電話', '分機', '地址', '服務時間', '備註'];
const NOTE = '清潔針具佈點名單僅供查詢來源欄位使用；實際服務內容、服務時間、可用性、衛教諮詢、醫療需求與最新資訊請以服務單位、臺北市政府衛生局、衛生主管機關及官方公告為準。';

const areaCodeToDistrict: Record<string, string> = {
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

export const cleanNeedleText = (value: unknown) => {
  const text = String(value ?? '').replace(/\u3000/g, ' ').trim();
  return text && !['-', '--', 'nan', 'null', '尚無資料'].includes(text.toLowerCase()) ? text : undefined;
};
const normalizeText = (value?: string) => (value ?? '').replace(/\s+/g, '').replace(/[臺台]/g, '台').toLowerCase();
const parseIntegerText = (value: unknown) => {
  const parsed = Number.parseInt((cleanNeedleText(value) ?? '').replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const parseCode = (value: unknown) => cleanNeedleText(value)?.replace(/\.0$/, '');
const countDuplicates = (values: string[]) => [...new Set(values)]
  .map((value) => ({ value, count: values.filter((item) => item === value).length }))
  .filter((item) => item.count > 1);

function readRows(path: string) {
  const raw = readFileSync(path);
  const parse = (text: string) => Papa.parse<Row>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim(),
  });
  const cp950 = parse(iconv.decode(raw, 'cp950'));
  if (requiredHeaders.every((header) => cp950.meta.fields?.includes(header))) return cp950.data;
  const utf8 = parse(raw.toString('utf8'));
  if (requiredHeaders.every((header) => utf8.meta.fields?.includes(header))) return utf8.data;
  throw new Error(`Unable to parse ${path}: required headers not found`);
}

export function classifyCleanNeedleServiceItem(raw: string | undefined): CleanNeedleServiceItemCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('衛教') || text.includes('諮詢')) return 'health_education_consultation_station';
  if (text.includes('回收桶')) return 'needle_return_box';
  if (text.includes('自動服務機')) return 'automatic_service_machine';
  return 'other';
}

export function classifyCleanNeedleServicePointCategory(raw: string | undefined): CleanNeedleServicePointCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('藥局')) return 'pharmacy';
  if (text.includes('醫事機構') || text.includes('醫院') || text.includes('診所')) return 'medical_institution';
  if (text.includes('公園') || text.includes('市場') || text.includes('公廁')) return 'park_market_public_toilet';
  return 'other';
}

export function parseCleanNeedleAddress(raw: unknown) {
  const address = cleanNeedleText(raw)?.replace(/^台北市/, '臺北市');
  const districtFromAddress = address?.match(/[臺台]北市([^路街道巷弄號]+區)/)?.[1];
  const roadName = address?.replace(/^臺北市[^路街道巷弄號]+區/, '').match(/^(.+?[路街道](?:[一二三四五六七八九十\d]+段)?)/)?.[1];
  return {
    address,
    addressNormalized: normalizeText(address),
    districtFromAddress,
    roadName,
  };
}

export function parseCleanNeedlePhone(raw: unknown) {
  const phone = cleanNeedleText(raw);
  if (!phone) return { phoneType: 'missing' as const };
  const compact = phone.replace(/[()\-\s]/g, '');
  const multiple = /[、/,;；]/.test(phone);
  const extension = /#|轉|分機|ext/i.test(phone);
  const phoneType: Facility['phoneType'] = multiple
    ? 'multiple'
    : extension
      ? 'extension'
      : compact.startsWith('02')
        ? 'taipei_landline'
        : compact.startsWith('09')
          ? 'mobile'
          : /^0\d/.test(compact)
            ? 'other_landline'
            : 'unknown';
  return {
    phone,
    phoneDisplay: phone,
    phoneType,
    phoneDialHref: phoneType === 'taipei_landline' || phoneType === 'mobile' || phoneType === 'other_landline'
      ? `tel:${compact}`
      : undefined,
  };
}

export function parseCleanNeedleServiceHours(raw: unknown) {
  const serviceHoursRaw = cleanNeedleText(raw);
  const normalized = serviceHoursRaw?.replace(/[：]/g, ':').replace(/[～－—–-]/g, '~');
  const serviceTimeRanges = (normalized?.split(/[、,，;；]/) ?? []).map((part) => {
    const [start, end] = part.split('~').map((item) => item?.trim()).filter(Boolean);
    return start && end ? { start, end, raw: part, crossesMidnight: start > end } : { raw: part };
  }).filter((item) => item.raw);
  return {
    serviceHoursRaw,
    serviceHours: serviceHoursRaw,
    serviceHoursNormalized: normalized,
    serviceTimeRanges,
    isTwentyFourHourService: normalized === '00:00~23:59' || normalized === '00:00~24:00',
    hasServiceHours: Boolean(serviceHoursRaw),
  };
}

function buildSummary(facilities: Facility[]): CleanNeedleExchangeServicePointSummary {
  const values = (key: keyof Facility) => facilities.map((item) => item[key]).filter(Boolean) as string[];
  const districts = [...new Set(values('district'))];
  const serviceItems = [...new Set(values('serviceItem'))];
  const servicePointCategories = [...new Set(values('servicePointCategory'))];
  return {
    totalRecords: facilities.length,
    uniqueAreaCodeCount: new Set(values('areaCode')).size,
    taipeiDistrictCount: districts.length,
    uniqueInstitutionCodeCount: new Set(values('institutionCode')).size,
    uniqueServiceLocationNameCount: new Set(values('serviceLocationName').map(normalizeText)).size,
    uniqueAddressCount: new Set(values('address').map(normalizeText)).size,
    uniquePhoneCount: new Set(values('phone').map(normalizeText)).size,
    recordsWithAddress: facilities.filter((item) => item.hasAddress).length,
    recordsWithPhone: facilities.filter((item) => item.hasPhone).length,
    recordsWithExtension: facilities.filter((item) => item.hasExtension).length,
    recordsWithServiceHours: facilities.filter((item) => item.hasServiceHours).length,
    twentyFourHourServiceCount: facilities.filter((item) => item.isTwentyFourHourService).length,
    byServiceItem: serviceItems.map((serviceItem) => {
      const rows = facilities.filter((item) => item.serviceItem === serviceItem);
      return { serviceItem, serviceItemCategory: rows[0].serviceItemCategory ?? 'unknown', count: rows.length, twentyFourHourServiceCount: rows.filter((item) => item.isTwentyFourHourService).length };
    }).sort((a, b) => b.count - a.count),
    byServicePointCategory: servicePointCategories.map((servicePointCategory) => {
      const rows = facilities.filter((item) => item.servicePointCategory === servicePointCategory);
      return { servicePointCategory, servicePointCategoryGroup: rows[0].servicePointCategoryGroup ?? 'unknown', count: rows.length, twentyFourHourServiceCount: rows.filter((item) => item.isTwentyFourHourService).length };
    }).sort((a, b) => b.count - a.count),
    byDistrict: districts.map((district) => {
      const rows = facilities.filter((item) => item.district === district);
      return {
        district,
        servicePointCount: rows.length,
        healthEducationConsultationStationCount: rows.filter((item) => item.serviceItemCategory === 'health_education_consultation_station').length,
        needleReturnBoxCount: rows.filter((item) => item.serviceItemCategory === 'needle_return_box').length,
        automaticServiceMachineCount: rows.filter((item) => item.serviceItemCategory === 'automatic_service_machine').length,
        twentyFourHourServiceCount: rows.filter((item) => item.isTwentyFourHourService).length,
        uniqueAddressCount: new Set(rows.map((item) => normalizeText(item.address)).filter(Boolean)).size,
      };
    }).sort((a, b) => b.servicePointCount - a.servicePointCount),
    byRoadName: [...new Set(values('roadName'))].map((roadName) => ({ roadName, count: facilities.filter((item) => item.roadName === roadName).length })).sort((a, b) => b.count - a.count),
    duplicateInstitutionCodes: countDuplicates(values('institutionCode')).map(({ value, count }) => ({ institutionCode: value, count })),
    duplicateServiceLocationNames: countDuplicates(values('serviceLocationName')).map(({ value, count }) => ({ serviceLocationName: value, count })),
    duplicateAddresses: countDuplicates(values('address')).map(({ value, count }) => ({ address: value, count })),
    duplicatePhones: countDuplicates(values('phone')).map(({ value, count }) => ({ phone: value, count })),
    dataQuality: {
      invalidAreaCodeCount: facilities.filter((item) => item.areaCode && !item.districtFromAreaCode).length,
      districtMismatchCount: facilities.filter((item) => item.districtMismatch).length,
      missingServiceLocationNameCount: facilities.filter((item) => !item.serviceLocationName).length,
      missingAddressCount: facilities.filter((item) => !item.hasAddress).length,
      unparsedAddressDistrictCount: facilities.filter((item) => item.hasAddress && !item.districtFromAddress).length,
      missingServiceHoursCount: facilities.filter((item) => !item.hasServiceHours).length,
    },
  };
}

export function convertCleanNeedleExchangeServicePointRows(rows: Row[], sourceFilename = SOURCE_NAME) {
  const facilities: Facility[] = [];
  const missingRequiredFields: ConversionSourceReport['missingRequiredFields'] = [];
  const addressParseWarnings: ConversionSourceReport['addressParseWarnings'] = [];
  const invalidCoordinateRows: ConversionSourceReport['invalidCoordinateRows'] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const areaCode = parseCode(row.行政區域代碼);
    const districtFromAreaCode = areaCode ? areaCodeToDistrict[areaCode] : undefined;
    const serviceItem = cleanNeedleText(row.設置項目);
    const servicePointCategory = cleanNeedleText(row.設置點類別);
    const institutionCode = parseCode(row.機構代碼);
    const serviceLocationName = cleanNeedleText(row.設置地點);
    const parsedAddress = parseCleanNeedleAddress(row.地址);
    const phone = parseCleanNeedlePhone(row.電話);
    const extension = cleanNeedleText(row.分機)?.replace(/\.0$/, '');
    const serviceHours = parseCleanNeedleServiceHours(row.服務時間);
    const missing = [
      !areaCode ? '行政區域代碼' : '',
      !serviceItem ? '設置項目' : '',
      !servicePointCategory ? '設置點類別' : '',
      !institutionCode ? '機構代碼' : '',
      !serviceLocationName ? '設置地點' : '',
      !parsedAddress.address ? '地址' : '',
      !serviceHours.hasServiceHours ? '服務時間' : '',
    ].filter(Boolean);
    if (missing.length) {
      missingRequiredFields.push({ rowNumber, fields: missing });
      return;
    }
    if (!districtFromAreaCode) invalidCoordinateRows.push({ rowNumber, longitude: '0', latitude: '0', reason: `unknown_area_code:${areaCode}` });
    if (parsedAddress.address && !parsedAddress.districtFromAddress) addressParseWarnings.push({ rowNumber, address: parsedAddress.address, warning: 'missing_address_district' });
    const districtMismatch = Boolean(districtFromAreaCode && parsedAddress.districtFromAddress && districtFromAreaCode !== parsedAddress.districtFromAddress);
    if (districtMismatch) addressParseWarnings.push({ rowNumber, address: parsedAddress.address, warning: 'district_mismatch_between_area_code_and_address' });
    const district = districtFromAreaCode ?? parsedAddress.districtFromAddress ?? '';

    facilities.push({
      id: `clean_needle_exchange_service_point-${String(facilities.length + 1).padStart(4, '0')}`,
      type: 'clean_needle_exchange_service_point',
      district,
      address: parsedAddress.address ?? '',
      addressNormalized: parsedAddress.addressNormalized,
      longitude: 0,
      latitude: 0,
      locationPrecision: 'address_only',
      note: cleanNeedleText(row.備註) ?? NOTE,
      source: SOURCE_NAME,
      sourceAgency: SOURCE_AGENCY,
      sourceSequenceNumber: parseIntegerText(row.序號),
      areaCode,
      areaCodeNormalized: areaCode,
      districtFromAreaCode,
      districtFromAddress: parsedAddress.districtFromAddress,
      districtMismatch,
      roadName: parsedAddress.roadName,
      hasAddress: Boolean(parsedAddress.address),
      serviceItem,
      serviceItemRaw: serviceItem,
      serviceItemCategory: classifyCleanNeedleServiceItem(serviceItem),
      servicePointCategory,
      servicePointCategoryRaw: servicePointCategory,
      servicePointCategoryGroup: classifyCleanNeedleServicePointCategory(servicePointCategory),
      institutionCode,
      serviceLocationName,
      serviceLocationNameNormalized: normalizeText(serviceLocationName),
      name: serviceLocationName,
      phone: phone.phone,
      phoneDisplay: phone.phoneDisplay,
      phoneDialHref: phone.phoneDialHref,
      phoneType: phone.phoneType,
      hasPhone: Boolean(phone.phone),
      extension,
      extensionDisplay: extension,
      hasExtension: Boolean(extension),
      serviceHoursRaw: serviceHours.serviceHoursRaw,
      serviceHours: serviceHours.serviceHours,
      serviceHoursNormalized: serviceHours.serviceHoursNormalized,
      serviceTimeRanges: serviceHours.serviceTimeRanges,
      isTwentyFourHourService: serviceHours.isTwentyFourHourService,
      hasServiceHours: serviceHours.hasServiceHours,
      googleMapsQuery: [parsedAddress.address, serviceLocationName].filter(Boolean).join(' '),
      sourceRecordHash: normalizeText([row.序號, institutionCode, serviceItem, serviceLocationName, parsedAddress.address].join('|')),
    });
  });

  const summary = buildSummary(facilities);
  return {
    facilities,
    summary,
    report: {
      sourceFilename,
      totalRows: rows.length,
      validRows: facilities.length,
      droppedRows: rows.length - facilities.length,
      coordinateOutlierRows: 0,
      invalidCoordinateRows,
      missingRequiredFields,
      addressParseWarnings,
      duplicateInstitutionCodes: summary.duplicateInstitutionCodes,
      duplicateServiceLocationNames: summary.duplicateServiceLocationNames,
      duplicateAddresses: summary.duplicateAddresses,
      duplicatePhones: summary.duplicatePhones,
    } satisfies ConversionSourceReport,
  };
}

export function loadCleanNeedleExchangeServicePoints(inputPath = DEFAULT_INPUT, rawDir = DEFAULT_RAW_DIR) {
  const rawFile = existsSync(rawDir) ? readdirSync(rawDir).find((file) => file.toLowerCase().endsWith('.csv')) : undefined;
  const path = rawFile ? resolve(rawDir, rawFile) : inputPath;
  return existsSync(path)
    ? convertCleanNeedleExchangeServicePointRows(readRows(path), basename(path))
    : convertCleanNeedleExchangeServicePointRows([], `${basename(path)} (not found)`);
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const converted = loadCleanNeedleExchangeServicePoints();
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'clean-needle-exchange-service-points.json'), converted.facilities);
  writeJson(resolve(DEFAULT_OUTPUT_DIR, 'clean-needle-exchange-service-point-summary.json'), converted.summary);
  console.log(`Wrote ${converted.facilities.length} clean needle exchange service point records`);
}
