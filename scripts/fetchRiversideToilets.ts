import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(inputIndex >= 0 ? process.argv[inputIndex + 1] : '/Users/Leo/Downloads/115年度河濱公廁點位(含景觀)0209.csv');
const outputDir = resolve('data/raw/riverside-toilets');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);
writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=cc818250-009c-4271-982f-7e51f73ffe0e',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'Big5/CP950',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it.',
}, null, 2)}\n`);
console.log(`Stored riverside toilet CSV at ${output}`);
