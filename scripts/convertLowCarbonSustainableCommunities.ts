import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import Papa from 'papaparse';

type Row = Record<string, string>;
type Level = 'silver' | 'bronze' | 'registered' | 'other' | 'unknown';
const root = process.cwd();
const rawPath = join(root, 'data/raw/low-carbon-sustainable-communities/source.csv');
const outputDirectory = join(root, 'public/data/low-carbon-sustainable-communities');
const clean = (value: unknown) => String(value ?? '').trim();
const level = (raw: string): Level => raw === '銀級' ? 'silver' : raw === '銅級' ? 'bronze' : raw === '報名成功' ? 'registered' : raw ? 'other' : 'unknown';
const parseDate = (raw: string) => {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const roc = raw.match(/^(\d{2,3})[\/.年](\d{1,2})[\/.月](\d{1,2})/);
  if (roc) return `${Number(roc[1]) + 1911}-${roc[2].padStart(2, '0')}-${roc[3].padStart(2, '0')}`;
  return null;
};

const source = await readFile(rawPath, 'utf8');
const parsed = Papa.parse<Row>(source, { header: true, skipEmptyLines: true });
const seen = new Set<string>(); const exactDuplicates: string[] = [];
const records = parsed.data.map((row, index) => {
  const sourceSequenceNumber = clean(row['序號']); const cityName = clean(row['縣市']); const districtName = clean(row['鄉鎮市區']); const villageName = clean(row['村里']);
  const certificationLevelRaw = clean(row['目前等級']); const achievementDateRaw = clean(row['達成時間']); const achievementDate = parseDate(achievementDateRaw);
  const key = JSON.stringify([sourceSequenceNumber, cityName, districtName, villageName, certificationLevelRaw, achievementDateRaw]);
  if (seen.has(key)) exactDuplicates.push(String(index + 2)); seen.add(key);
  return { id: `${districtName || cityName || 'unknown'}-${villageName || 'district'}-${sourceSequenceNumber || index + 1}`, sourceSequenceNumber, cityName, districtName, villageName, certificationLevelRaw, certificationLevel: level(certificationLevelRaw), achievementDateRaw, achievementDate, achievementYear: achievementDate ? Number(achievementDate.slice(0, 4)) : null, hasVillage: Boolean(villageName), hasDistrict: Boolean(districtName), hasValidCertificationLevel: !['unknown', 'other'].includes(level(certificationLevelRaw)), hasValidAchievementDate: Boolean(achievementDate), sourceFields: row };
}).filter((record) => !exactDuplicates.includes(record.sourceSequenceNumber));
const quality = { totalSourceRows: parsed.data.length, outputRecords: records.length, exactDuplicateRows: exactDuplicates, missingVillage: records.filter((r) => !r.hasVillage).map((r) => r.id), missingDistrict: records.filter((r) => !r.hasDistrict).map((r) => r.id), unknownCertificationLevel: records.filter((r) => !r.hasValidCertificationLevel).map((r) => r.id), missingOrMalformedAchievementDate: records.filter((r) => !r.hasValidAchievementDate).map((r) => r.id), cityInconsistentWithTaipei: records.filter((r) => r.cityName && r.cityName !== '臺北市').map((r) => r.id) };
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'records.json'), JSON.stringify(records, null, 2), 'utf8');
await writeFile(join(outputDirectory, 'summary.json'), JSON.stringify({ sourceUpdatedAt: '2025-06-06T08:46:11+08:00', levelsPresent: [...new Set(records.map((r) => r.certificationLevelRaw))], quality }, null, 2), 'utf8');
console.log(`Generated ${records.length} low-carbon sustainable community records.`);
