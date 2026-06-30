import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const RAW_DIR = resolve('data/raw/announced-no-smoking-places');
const DEFAULT_SOURCES = [
  '/Users/Leo/Downloads/臺北市公告戶外禁菸場所一覽表(僅包含有明確地址者用於製作禁菸地圖)1140912.csv',
  '/Users/Leo/Downloads/臺北市公告戶外禁菸場所一覽表0912修.csv',
  '/Users/Leo/Downloads/臺北市除吸菸區外全面禁菸公園綠地_0609修.csv',
];

mkdirSync(RAW_DIR, { recursive: true });

const sources = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SOURCES;
sources.forEach((source) => {
  const resolved = resolve(source);
  if (!existsSync(resolved)) {
    throw new Error(`Missing source CSV: ${resolved}`);
  }

  const target = resolve(RAW_DIR, basename(resolved));
  copyFileSync(resolved, target);
  console.log(`Copied ${resolved} -> ${target}`);
});
