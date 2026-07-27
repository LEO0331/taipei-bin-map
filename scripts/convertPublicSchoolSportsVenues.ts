import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Papa from 'papaparse';
import type { ParsedOpeningSchedule, PublicSchoolSportsVenueRecord, SportType } from '../src/types';

type Row = Record<string, string | undefined>;
const raw = resolve('data/raw/public-school-sports-venues/source.csv');
const output = resolve('public/data/public-school-sports-venues');
const clean = (value: unknown) => String(value ?? '').replace(/^\uFEFF/, '').trim();
const text = (value: string) => value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const field = (row: Row, name: string) => clean(Object.entries(row).find(([key]) => clean(key) === name)?.[1]);
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase();

export const sportKeywords: Record<SportType, string[]> = {
  badminton: ['羽球', '羽毛球'], basketball: ['籃球'], pickleball: ['匹克球'], volleyball: ['排球'], tennis: ['網球'],
  table_tennis: ['桌球', '乒乓球'], track: ['田徑', '跑道', '操場'], football: ['足球'], other: [],
};

export function detectSports(source: string) {
  const detectedSports: SportType[] = [];
  const detectedFacilityLabels: string[] = [];
  for (const [sport, keywords] of Object.entries(sportKeywords) as Array<[SportType, string[]]>) {
    for (const keyword of keywords) if (source.includes(keyword)) { detectedSports.push(sport); detectedFacilityLabels.push(keyword); break; }
  }
  return { detectedSports, detectedFacilityLabels };
}

const toTime = (value: string) => {
  const compact = value.replace(/[：;；]/g, ':').replace(/[^\d:]/g, '');
  if (/^\d{3,4}$/.test(compact)) return `${compact.slice(0, -2).padStart(2, '0')}:${compact.slice(-2)}`;
  const match = compact.match(/^(\d{1,2}):(\d{1,2})$/); return match ? `${match[1].padStart(2, '0')}:${match[2]}` : null;
};

export function parseOpeningSchedules(source: string): ParsedOpeningSchedule[] {
  const normalized = source.replace(/[～~至]/g, '-').replace(/[：]/g, ':');
  const terms = [
    { label: 'weekdays', pattern: /週[一二三四五]|周[一二三四五]|平日|上課日/ },
    { label: 'weekends', pattern: /週[六日]|周[六日]|六日|假日|例假日/ },
  ];
  const ranges = [...normalized.matchAll(/(\d{1,2}(?::\d{1,2})?|\d{3,4})\s*-\s*(\d{1,2}(?::\d{1,2})?|\d{3,4})/g)];
  if (!ranges.length || /未開放|不開放|施工/.test(source)) return [];
  const hasWeekday = terms[0].pattern.test(source); const hasWeekend = terms[1].pattern.test(source);
  return ranges.map((range) => ({
    days: hasWeekday && hasWeekend ? ['weekdays', 'weekends'] : hasWeekday ? ['weekdays'] : hasWeekend ? ['weekends'] : [],
    startTime: toTime(range[1]), endTime: toTime(range[2]), appliesDuringSchoolTerm: /上課日/.test(source) ? true : null,
    appliesDuringVacation: /寒暑假/.test(source) ? true : null, parseConfidence: (hasWeekday || hasWeekend ? 'medium' : 'low') as 'medium' | 'low',
  })).filter((schedule) => schedule.startTime && schedule.endTime);
}

export function convertPublicSchoolSportsVenueRows(rows: Row[]) {
  const seen = new Set<string>(); const records: PublicSchoolSportsVenueRecord[] = []; const duplicateRows: number[] = []; const missingSchoolNames: number[] = []; const duplicateAgencyCodes: string[] = [];
  const agencyCounts = new Map<string, number>();
  rows.forEach((row, index) => {
    const sourceSequenceNumber = field(row, '序號'); const schoolName = field(row, '校名'); const districtName = field(row, '行政區'); const postalCode = field(row, '郵遞區號'); const agencyCode = field(row, '機關代碼'); const cityCode = field(row, '縣市別代碼'); const campusOpeningRaw = clean(field(row, '校園場地開放時間'));
    const key = [sourceSequenceNumber, schoolName, districtName, postalCode, agencyCode, cityCode, campusOpeningRaw].join('|'); if (seen.has(key)) { duplicateRows.push(index + 2); return; } seen.add(key);
    if (!schoolName) missingSchoolNames.push(index + 2); if (agencyCode) agencyCounts.set(agencyCode, (agencyCounts.get(agencyCode) ?? 0) + 1);
    const campusOpeningText = text(campusOpeningRaw); const detected = detectSports(campusOpeningText); const openingProvided = Boolean(campusOpeningText) && !/未開放|不開放|施工/.test(campusOpeningText);
    records.push({ id: agencyCode || `public-school-sports-${normalize(schoolName)}-${districtName}-${sourceSequenceNumber}`, sourceSequenceNumber, schoolName, districtName, postalCode, agencyCode, cityCode, campusOpeningRaw, campusOpeningText, ...detected, bookingStatus: openingProvided ? 'contact_school' : 'unknown', bookingUrl: null, bookingPhone: '', bookingNote: openingProvided ? '校園開放資訊存在，但來源未提供可驗證的預約連結或程序。' : '', address: '', longitude: null, latitude: null, hasAuthoritativeLocation: false, parsedSchedules: parseOpeningSchedules(campusOpeningText) });
  });
  agencyCounts.forEach((count, code) => { if (count > 1) duplicateAgencyCodes.push(code); });
  return { records, summary: { totalRecords: records.length, districtCount: new Set(records.map((r) => r.districtName).filter(Boolean)).size, withSports: records.filter((r) => r.detectedSports.length).length, parseableSchedules: records.filter((r) => r.parsedSchedules.length).length, bookingStatusCounts: Object.fromEntries(['official_booking_link', 'booking_information_in_source', 'contact_school', 'unknown'].map((status) => [status, records.filter((r) => r.bookingStatus === status).length])), dataQuality: { duplicateRows, missingSchoolNames, duplicateAgencyCodes } } };
}

export function loadPublicSchoolSportsVenues() { if (!existsSync(raw)) return convertPublicSchoolSportsVenueRows([]); return convertPublicSchoolSportsVenueRows(Papa.parse<Row>(readFileSync(raw, 'utf8'), { header: true, skipEmptyLines: true, transformHeader: clean }).data); }
if (process.argv[1]?.replace(/\\/g, '/').endsWith('convertPublicSchoolSportsVenues.ts')) { const result = loadPublicSchoolSportsVenues(); mkdirSync(output, { recursive: true }); writeFileSync(resolve(output, 'records.json'), `${JSON.stringify(result.records, null, 2)}\n`); writeFileSync(resolve(output, 'summary.json'), `${JSON.stringify(result.summary, null, 2)}\n`); console.log(`Wrote ${result.records.length} public school sports-venue records.`); }
