import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import type { Bin, BinDataMetadata } from '../src/types';

type CsvRow = {
  行政區?: string;
  地址?: string;
  經度?: string;
  緯度?: string;
  備註?: string;
  'Unnamed: 5'?: string;
};

const DEFAULT_INPUT = '/Users/Leo/Downloads/●行人專用清潔箱總表.csv';
const DEFAULT_OUTPUT = 'public/data/bins.json';

const inputPath = resolve(process.argv[2] ?? DEFAULT_INPUT);
const outputPath = resolve(process.argv[3] ?? DEFAULT_OUTPUT);
const metadataPath = outputPath.replace(/\.json$/i, '.metadata.json');

const raw = readFileSync(inputPath);
const csvText = iconv.decode(raw, 'cp950');

const parsed = Papa.parse<CsvRow>(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim(),
});

if (parsed.errors.length > 0) {
  const message = parsed.errors.map((error) => `${error.code}: ${error.message}`).join('\n');
  throw new Error(`Unable to parse CSV:\n${message}`);
}

const bins = parsed.data.reduce<Bin[]>((records, row, index) => {
  const district = row.行政區?.trim() ?? '';
  const address = row.地址?.trim() ?? '';
  const longitude = Number.parseFloat(row.經度?.trim() ?? '');
  const latitude = Number.parseFloat(row.緯度?.trim() ?? '');
  const note = row.備註?.trim() ?? '';

  if (!district && !address && !row.經度 && !row.緯度 && !note) {
    return records;
  }

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return records;
  }

  records.push({
    id: `bin-${String(index + 1).padStart(4, '0')}`,
    district,
    address,
    longitude,
    latitude,
    note,
  });

  return records;
}, []);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(bins, null, 2)}\n`);

const metadata: BinDataMetadata = {
  generatedAt: new Date().toISOString(),
  sourceFile: basename(inputPath),
  recordCount: bins.length,
  encoding: 'Big5/CP950',
};

writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

console.log(`Converted ${bins.length} usable bin records to ${outputPath}`);
console.log(`Wrote metadata to ${metadataPath}`);
