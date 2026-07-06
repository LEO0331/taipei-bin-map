import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(
  inputIndex >= 0
    ? process.argv[inputIndex + 1]
    : 'C:/Users/150592/Downloads/臺北市行道樹公園綠地廣場認養人資料.csv',
);
const outputDir = resolve('data/raw/green-space-adoption-records');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);

writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  resourceName: '臺北市行道樹公園綠地廣場認養人資料',
  sourceAgency: '臺北市政府工務局公園路燈工程管理處',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'Big5/CP950',
  notes: 'Copied from local uploaded CSV. Source has location text but no official coordinates; no automatic geocoding.',
}, null, 2)}\n`);

console.log(`Stored green-space adoption CSV at ${output}`);
