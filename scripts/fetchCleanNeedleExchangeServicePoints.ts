import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const RAW_DIR = resolve('data/raw/clean-needle-exchange-service-points');
const DEFAULT_SOURCE = '/Users/Leo/Downloads/臺北市清潔針具佈點名單115s1.csv';

mkdirSync(RAW_DIR, { recursive: true });

const source = resolve(process.argv[2] ?? DEFAULT_SOURCE);
if (!existsSync(source)) {
  throw new Error(`Missing source CSV: ${source}`);
}

const target = resolve(RAW_DIR, basename(source));
copyFileSync(source, target);
writeFileSync(resolve(RAW_DIR, 'source-metadata.json'), `${JSON.stringify({
  source,
  target,
  dataset: '臺北市清潔針具佈點名單',
  sourceAgency: '衛生局',
  copiedAt: new Date().toISOString(),
  fileSizeBytes: statSync(target).size,
  encoding: 'cp950',
}, null, 2)}\n`);
console.log(`Copied ${source} -> ${target}`);
