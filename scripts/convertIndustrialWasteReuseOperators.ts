import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { IndustrialWasteReuseOperatorRecord } from '../src/types';

type Row = Record<string, string | undefined>;
const raw = resolve('data/raw/industrial-waste-reuse-operators/source.csv');
const output = resolve('public/data/industrial-waste-reuse-operators');
const districts = ['松山區','信義區','大安區','中山區','中正區','大同區','萬華區','文山區','南港區','內湖區','士林區','北投區'];
const clean = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const field = (row: Row, header: string) => clean(row[header]);
const split = (value: string) => /[、；;，,\n]/.test(value) ? value.split(/[、；;，,\n]+/).map(clean).filter(Boolean) : value ? [value] : [];
const quantity = (value: string) => /^\d+(?:\.\d+)?$/.test(value.replace(/[\s,公噸/月]/g, '')) ? Number(value.replace(/[\s,公噸/月]/g, '')) : null;
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

export function convertIndustrialWasteReuseOperatorRows(rows: Row[]) {
  const seen = new Set<string>();
  const records: IndustrialWasteReuseOperatorRecord[] = [];
  const quality = { duplicateRows: [] as number[], missingOperatorNames: [] as number[], missingControlNumbers: [] as number[], malformedPhones: [] as number[], missingAddresses: [] as number[], unresolvedDistricts: [] as number[], invalidQuantities: [] as number[], invalidVerificationDates: [] as number[], expiryBeforePassed: [] as number[], unknownWholesaleRetail: [] as number[], noWasteOrPurpose: [] as number[] };

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sourceSequenceNumber = field(row, '項次');
    const controlNumber = field(row, '管制編號');
    const operatorName = field(row, '機構名稱');
    const phone = field(row, '機構電話');
    const address = field(row, '機構地址');
    const reusableWasteRaw = field(row, '再利用廢棄物');
    const maximumMonthlyReuseRaw = field(row, '最大月再利用量（公噸/月）');
    const wasteSourceRaw = field(row, '廢棄物來源');
    const reusePurposeRaw = field(row, '再利用用途');
    const verificationPassedDateRaw = field(row, '檢核通過日期');
    const verificationExpiryDateRaw = field(row, '檢核到期日期');
    const wholesaleRetailRaw = field(row, '批發零售業');
    const key = JSON.stringify(row);
    if (seen.has(key)) { quality.duplicateRows.push(rowNumber); return; }
    seen.add(key);

    const maximumMonthlyReuseTonnes = quantity(maximumMonthlyReuseRaw);
    const verificationPassedDate = date(verificationPassedDateRaw);
    const verificationExpiryDate = date(verificationExpiryDateRaw);
    const districtName = districts.find((district) => address.includes(district)) ?? '';
    if (!operatorName) quality.missingOperatorNames.push(rowNumber);
    if (!controlNumber) quality.missingControlNumbers.push(rowNumber);
    if (!address) quality.missingAddresses.push(rowNumber);
    if (!districtName) quality.unresolvedDistricts.push(rowNumber);
    if (phone && !/^0\d{1,3}-?\d{6,8}$/.test(phone)) quality.malformedPhones.push(rowNumber);
    if (maximumMonthlyReuseRaw && maximumMonthlyReuseTonnes === null) quality.invalidQuantities.push(rowNumber);
    if ((verificationPassedDateRaw && !verificationPassedDate) || (verificationExpiryDateRaw && !verificationExpiryDate)) quality.invalidVerificationDates.push(rowNumber);
    if (verificationPassedDate && verificationExpiryDate && verificationExpiryDate < verificationPassedDate) quality.expiryBeforePassed.push(rowNumber);
    if (!['是', '否'].includes(wholesaleRetailRaw)) quality.unknownWholesaleRetail.push(rowNumber);
    if (!reusableWasteRaw && !reusePurposeRaw) quality.noWasteOrPurpose.push(rowNumber);
    if (!operatorName && !controlNumber) return;

    records.push({ id: `${controlNumber || 'row'}-${reusableWasteRaw || rowNumber}-${verificationExpiryDateRaw}`, sourceSequenceNumber, controlNumber, operatorName, phone, address, districtName, reusableWasteRaw, reusableWasteCategories: split(reusableWasteRaw), wasteSourceRaw, wasteSourceCategories: split(wasteSourceRaw), reusePurposeRaw, reusePurposeCategories: split(reusePurposeRaw), maximumMonthlyReuseRaw, maximumMonthlyReuseTonnes, verificationPassedDateRaw, verificationPassedDate, verificationExpiryDateRaw, verificationExpiryDate, wholesaleRetailRaw, wholesaleRetailCategory: wholesaleRetailRaw, hasPhone: Boolean(phone), hasAddress: Boolean(address), googleMapsQuery: address || operatorName });
  });

  return { records, summary: { totalRecords: records.length, uniqueOperators: new Set(records.map((record) => record.operatorName)).size, quality } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const source = existsSync(raw) ? iconv.decode(readFileSync(raw), 'cp950') : '';
  const result = convertIndustrialWasteReuseOperatorRows(Papa.parse<Row>(source, { header: true, skipEmptyLines: true, transform: clean, transformHeader: clean }).data);
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'records.json'), JSON.stringify(result.records, null, 2));
  writeFileSync(resolve(output, 'summary.json'), JSON.stringify(result.summary, null, 2));
  console.log(`Wrote ${result.records.length} industrial-waste reuse operators.`);
}
