import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Facility } from '../src/types';
import { convertGasLpgStationRows } from './convertGasLpgStations';

const input = resolve('public/data/gas-lpg-stations.json');
const output = resolve('public/data/gas-lpg-station-summary.json');
const facilities = JSON.parse(readFileSync(input, 'utf8')) as Facility[];

writeFileSync(output, `${JSON.stringify(convertGasLpgStationRows(facilities.map((item) => ({
  CITYZONE: item.district,
  NAME: item.companyName,
  S_NAME: item.stationName,
  SUPPLIER: item.supplier,
  ADDRESS: item.address,
  電話: item.phone,
  DUTY_TIME: item.businessHoursRaw,
  HAVEOIL: item.hasOil ? 'Y' : '',
  HAVEGAS: item.hasLpg ? 'Y' : '',
  HAVESELF: item.hasSelfService ? 'Y' : '',
  ADDR_X: String(item.xTwd97 ?? ''),
  ADDR_Y: String(item.yTwd97 ?? ''),
}))).summary, null, 2)}\n`);

console.log(`Wrote ${output}`);
