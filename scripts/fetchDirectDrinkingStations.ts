import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(inputIndex >= 0 ? process.argv[inputIndex + 1] : '/Users/Leo/Downloads/11505_直飲臺基本資料.csv');
const outputDir = resolve('data/raw/direct-drinking-stations');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);
writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=155999f2-3c5d-486b-af58-d7f4c0b0a4c9',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'Big5/CP950',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it.',
}, null, 2)}\n`);
console.log(`Stored direct drinking station CSV at ${output}`);
