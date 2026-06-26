import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(inputIndex >= 0 ? process.argv[inputIndex + 1] : '/Users/Leo/Downloads/臺北市加油站及加氣站分布圖.csv');
const outputDir = resolve('data/raw/gas-lpg-stations');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);

writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=2385447a-6793-4055-8ce0-b601ffa5e9b5',
  resourceName: '臺北市加油站及加氣站分布圖',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'UTF-8-SIG',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it. TWD97 coordinates are converted during data conversion.',
}, null, 2)}\n`);

console.log(`Stored gas/LPG station CSV at ${output}`);
