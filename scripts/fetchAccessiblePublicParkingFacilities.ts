import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceUrl = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=936e3be6-e029-4bdf-9199-a8b8fb482df6';
const outputDir = resolve('data/raw/accessible-public-parking-facilities');
const output = resolve(outputDir, 'accessible-public-parking-facilities.csv');

mkdirSync(outputDir, { recursive: true });
const response = await fetch(sourceUrl, { headers: { 'user-agent': 'taipei-bin-map-data-fetcher/1.0' } });
if (!response.ok) throw new Error(`Unable to fetch accessibility parking CSV: HTTP ${response.status}`);
writeFileSync(output, Buffer.from(await response.arrayBuffer()));
writeFileSync(resolve(outputDir, 'source-metadata.json'), `${JSON.stringify({
  sourceUrl: 'https://data.taipei/dataset/detail?id=08f9bc00-b1e9-4f6e-9199-0da74d8ad930',
  resourceId: '936e3be6-e029-4bdf-9199-a8b8fb482df6',
  resourceName: '公有路外停車場無障礙設施設置情形',
  sourceAgency: '交通局停管處',
  fetchedAt: new Date().toISOString(),
  filename: 'accessible-public-parking-facilities.csv',
  fileSize: statSync(output).size,
  encoding: 'UTF-8',
  notes: 'TMPX/TMPY are detected and converted as TWD97/TM2 when they fall in the EPSG:3826 range.',
}, null, 2)}\n`);
console.log(`Stored accessible public parking CSV at ${output}`);
