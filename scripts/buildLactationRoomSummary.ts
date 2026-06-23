import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Facility } from '../src/types';
import { buildLactationSummary } from './convertLactationRooms';

const facilities = JSON.parse(readFileSync(resolve('public/data/lactation-rooms.json'), 'utf8')) as Facility[];
writeFileSync(resolve('public/data/lactation-room-summary.json'), `${JSON.stringify(buildLactationSummary(facilities), null, 2)}\n`);
console.log(`Wrote lactation room summary for ${facilities.length} records`);
