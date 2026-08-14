import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const url = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=72909622-3154-4451-85d8-d9cdd9ab330f';
const directory = join(process.cwd(), 'data', 'raw', 'low-carbon-sustainable-communities');

const response = await fetch(url);
if (!response.ok) throw new Error(`Official CSV request failed: ${response.status}`);
const source = await response.text();
await mkdir(directory, { recursive: true });
await writeFile(join(directory, 'source.csv'), source, 'utf8');
await writeFile(join(directory, 'source-metadata.json'), JSON.stringify({
  dataset: '臺北市低碳永續家園計畫本市認證執行情形',
  resource: '低碳永續家園評等認證名單',
  url,
  downloadedAt: new Date().toISOString(),
  sourceUpdatedAt: '2025-06-06T08:46:11+08:00',
}, null, 2), 'utf8');
console.log(`Saved official low-carbon certification CSV (${source.length} bytes).`);
