import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const sources = [
  '/Users/Leo/Downloads/臺北市營利電動車充電站-240站.csv',
  '/Users/Leo/Downloads/臺北市營利電動機車充電站-12站.csv',
  '/Users/Leo/Downloads/臺北市營利電動機車換電站-365站.csv',
];
const outputDir = resolve('data/raw/commercial-ev-charging-swap-stations');
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
const files = sources.map((source) => {
  const output = resolve(outputDir, basename(source));
  if (!existsSync(output) || force) copyFileSync(source, output);
  return { filename: basename(output), fileSize: statSync(output).size };
});

writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=668313d7-bcfc-4c90-b769-e398b08a1b2d',
  resourceName: '臺北市營利型電動車充換電站資訊',
  fetchedAt: new Date().toISOString(),
  files,
  encoding: 'Big5/CP950',
  notes: 'Copied from local uploaded CSV files; use --force to replace. No automatic geocoding.',
}, null, 2)}\n`);
console.log(`Stored ${files.length} commercial EV CSV files at ${outputDir}`);
