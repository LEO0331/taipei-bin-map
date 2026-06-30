import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const RAW_DIR = resolve('data/raw/community-recycling-stations');
const DEFAULT_SOURCE = '/Users/Leo/Downloads/臺北市社區資源回收站資訊.csv';

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
  dataset: '臺北市社區資源回收站資訊',
  sourceAgency: '環保局',
  copiedAt: new Date().toISOString(),
  fileSizeBytes: statSync(target).size,
  encoding: 'cp950',
}, null, 2)}\n`);
console.log(`Copied ${source} -> ${target}`);
