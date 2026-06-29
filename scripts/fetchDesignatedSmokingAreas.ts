import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const inputIndex = process.argv.indexOf('--input');
const source = resolve(inputIndex >= 0 ? process.argv[inputIndex + 1] : '/Users/Leo/Downloads/臺北市指定吸菸區.csv');
const outputDir = resolve('data/raw/designated-smoking-areas');
const output = resolve(outputDir, basename(source));
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
if (!existsSync(output) || force) copyFileSync(source, output);

writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=8b2fcdeb-d14b-46c4-92d8-66ad07b96a91',
  resourceName: '臺北市指定吸菸區',
  sourceAgency: '衛生局',
  fetchedAt: new Date().toISOString(),
  filename: basename(output),
  fileSize: statSync(output).size,
  encoding: 'UTF-8-SIG',
  notes: 'Copied from local uploaded CSV; use --input and --force to replace it. Coordinates are source WGS84 latitude/longitude.',
}, null, 2)}\n`);

console.log(`Stored designated smoking area CSV at ${output}`);
