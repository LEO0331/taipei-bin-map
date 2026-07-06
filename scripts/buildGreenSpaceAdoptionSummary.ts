import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadGreenSpaceAdoptionRecords } from './convertGreenSpaceAdoptionRecords';

const output = resolve('public/data/green-space-adoption-records/summary.json');
const converted = loadGreenSpaceAdoptionRecords();

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(converted.summary, null, 2)}\n`);

console.log(`Wrote green-space adoption summary for ${converted.summary.totalRecords} records`);
