import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Facility } from '../src/types';
import { convertCommercialEvChargingSwapRows } from './convertCommercialEvChargingSwapStations';

const input = resolve('public/data/commercial-ev-charging-swap-stations.json');
const output = resolve('public/data/commercial-ev-charging-swap-station-summary.json');
const facilities = JSON.parse(readFileSync(input, 'utf8')) as Facility[];
const inputs = [...new Set(facilities.map((item) => item.sourceFileName ?? 'unknown.csv'))].map((fileName) => ({
  fileName,
  rows: facilities.filter((item) => (item.sourceFileName ?? 'unknown.csv') === fileName).map((item) => ({
    序號: String(item.sourceSequenceNumber ?? ''),
    廠商: item.operatorName,
    名稱: item.stationName,
    地址: item.address,
    縣市: item.city,
    縣市代碼: item.cityCode,
  })),
}));

writeFileSync(output, `${JSON.stringify(convertCommercialEvChargingSwapRows(inputs).summary, null, 2)}\n`);
console.log(`Wrote ${output}`);
