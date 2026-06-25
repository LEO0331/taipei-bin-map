import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Facility } from '../src/types';
import { buildMotorcycleInspectionStationSummary } from './convertMotorcycleInspectionStations';

const facilities = JSON.parse(readFileSync(resolve('public/data/motorcycle-inspection-stations.json'), 'utf8')) as Facility[];
writeFileSync(
  resolve('public/data/motorcycle-inspection-station-summary.json'),
  `${JSON.stringify(buildMotorcycleInspectionStationSummary(facilities), null, 2)}\n`,
);
console.log(`Wrote motorcycle inspection station summary for ${facilities.length} records`);
