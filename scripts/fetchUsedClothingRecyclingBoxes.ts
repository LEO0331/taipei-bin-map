import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(inputIndex >= 0 ? process.argv[inputIndex + 1] : '/Users/Leo/Downloads/臺北市核准設置舊衣回收箱設置清冊(0530).csv');
const outputDir = resolve('data/raw/used-clothing-recycling-boxes');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);
writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=33de0950-24df-463d-b199-da3fbf612ef1',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'Big5/CP950',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it.',
}, null, 2)}\n`);
console.log(`Stored used-clothing recycling CSV at ${output}`);
