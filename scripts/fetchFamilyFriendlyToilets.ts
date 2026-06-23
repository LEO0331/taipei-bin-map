import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(inputIndex >= 0 ? process.argv[inputIndex + 1] : '/Users/Leo/Downloads/臺北市親子友善廁所點位資訊.csv');
const outputDir = resolve('data/raw/family-friendly-toilets');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);
writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=9d7488f5-0f19-45c3-adf9-badf686dda18',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'Big5/CP950',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it.',
}, null, 2)}\n`);
console.log(`Stored family-friendly toilet CSV at ${output}`);
