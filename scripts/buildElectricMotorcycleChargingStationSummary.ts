import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertElectricMotorcycleChargingStationRows } from './convertElectricMotorcycleChargingStations';
import type { Facility } from '../src/types';

const input = resolve('public/data/electric-motorcycle-charging-stations.json');
const output = resolve('public/data/electric-motorcycle-charging-station-summary.json');
const facilities = JSON.parse(readFileSync(input, 'utf8')) as Facility[];
const rows = facilities.map((item) => ({
  編號: item.stationId,
  單位: item.unitName,
  縣市: item.city,
  行政區: item.district,
  行政區域代碼: item.districtCode,
  地址: item.address,
  備註: item.locationCategoryRaw,
}));

writeFileSync(output, `${JSON.stringify(convertElectricMotorcycleChargingStationRows(rows).summary, null, 2)}\n`);
console.log(`Wrote ${output}`);
