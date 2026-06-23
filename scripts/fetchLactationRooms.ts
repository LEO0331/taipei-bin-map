import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const outputDir = resolve('data/raw/lactation-rooms');
const primary = resolve('/Users/Leo/Downloads/台北哺乳室建置資料清單-1141231.csv');
const secondary = resolve('/Users/Leo/Downloads/臺北市依法設置哺集乳室清單.csv');
const force = process.argv.includes('--force');

mkdirSync(outputDir, { recursive: true });
const files = [primary, secondary].flatMap((source) => {
  if (!existsSync(source)) return [];
  const output = resolve(outputDir, basename(source));
  if (!existsSync(output) || force) copyFileSync(source, output);
  return [{ filename: basename(output), fileSize: statSync(output).size }];
});
writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=5d1d34d8-1b81-4162-87b6-05e0896af958',
  fetchedAt: new Date().toISOString(),
  encoding: 'Big5/CP950',
  files,
  notes: 'Copied available local CSV resources; use --force to replace them.',
}, null, 2)}\n`);
console.log(`Stored ${files.length} lactation room CSV resources`);
