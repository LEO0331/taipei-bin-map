import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(
  inputIndex >= 0
    ? process.argv[inputIndex + 1]
    : '/Users/Leo/Downloads/pay.taipei支援無卡進出停車場清單_20260211 (1).csv',
);
const outputDir = resolve('data/raw/pay-taipei-cardless-parking-lots');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);

writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=f4ec54ba-32d1-402c-966f-78624b56f31e',
  resourceName: 'pay.taipei支援無卡進出停車場清單',
  sourceAgency: '資訊局',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'UTF-8-SIG',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it. Source has addresses but no official coordinates; no automatic geocoding.',
}, null, 2)}\n`);

console.log(`Stored pay.taipei cardless parking CSV at ${output}`);
