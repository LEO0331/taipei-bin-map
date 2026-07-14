import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AccessiblePublicParkingFacilitySummary, Facility } from '../src/types';

const records = JSON.parse(readFileSync(resolve('public/data/accessible-public-parking-facilities/records.json'), 'utf8')) as Facility[];
const summary = JSON.parse(readFileSync(resolve('public/data/accessible-public-parking-facilities/summary.json'), 'utf8')) as AccessiblePublicParkingFacilitySummary;
mkdirSync(resolve('public/data/accessible-public-parking-facilities'), { recursive: true });
writeFileSync(resolve('public/data/accessible-public-parking-facilities/summary.json'), `${JSON.stringify({ ...summary, generatedRecordCount: records.length }, null, 2)}\n`);
