import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(inputIndex >= 0 ? process.argv[inputIndex + 1] : '/Users/Leo/Downloads/115年臺北市電動機車充電地點(398).csv');
const outputDir = resolve('data/raw/electric-motorcycle-charging-stations');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);
writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=c66e2f53-92f5-4ccd-8aa9-eb71a288e09e',
  resourceName: '115年臺北市電動機車充電地點',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'UTF-8-SIG',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it. No automatic geocoding.',
}, null, 2)}\n`);
console.log(`Stored electric motorcycle charging station CSV at ${output}`);
