import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(inputIndex >= 0 ? process.argv[inputIndex + 1] : '/Users/Leo/Downloads/●115年開放時間 (限時收受點csv) 1150223.csv');
const outputDir = resolve('data/raw/timed-collection-points');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);
writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=1acf38f3-1509-4cb1-898a-9b1d4f31a3af',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'Big5/CP950',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it.',
}, null, 2)}\n`);
console.log(`Stored timed collection CSV at ${output}`);
