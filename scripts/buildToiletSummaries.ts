import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Facility, ToiletSummary } from '../src/types';
import { buildFamilyFriendlyToiletSummary } from './convertFamilyFriendlyToilets';
import { buildRiversideToiletSummary } from './convertRiversideToilets';

const dataDir = resolve('public/data');
const read = (name: string) => JSON.parse(readFileSync(resolve(dataDir, name), 'utf8')) as Facility[];
const publicToilets = existsSync(resolve(dataDir, 'public-toilets.json')) ? read('public-toilets.json') : [];
const riversideToilets = read('riverside-toilets.json');
const familyFriendlyToilets = read('family-friendly-toilets.json');
const districts = [...new Set([...publicToilets, ...riversideToilets, ...familyFriendlyToilets].map((item) => item.district).filter(Boolean))];
const toiletSummary: ToiletSummary = {
  publicToiletCount: publicToilets.length,
  riversideToiletCount: riversideToilets.length,
  familyFriendlyToiletCount: familyFriendlyToilets.length,
  totalDiaperTableCount: familyFriendlyToilets.reduce((sum, item) => sum + (item.diaperTableCount ?? 0), 0),
  totalChildSeatCount: familyFriendlyToilets.reduce((sum, item) => sum + (item.childSeatCount ?? 0), 0),
  byDistrict: districts.map((district) => ({
    district,
    publicToiletCount: publicToilets.filter((item) => item.district === district).length,
    riversideToiletCount: riversideToilets.filter((item) => item.district === district).length,
    familyFriendlyToiletCount: familyFriendlyToilets.filter((item) => item.district === district).length,
    diaperTableCount: familyFriendlyToilets.filter((item) => item.district === district).reduce((sum, item) => sum + (item.diaperTableCount ?? 0), 0),
    childSeatCount: familyFriendlyToilets.filter((item) => item.district === district).reduce((sum, item) => sum + (item.childSeatCount ?? 0), 0),
  })),
};
writeFileSync(resolve(dataDir, 'riverside-toilet-summary.json'), `${JSON.stringify(buildRiversideToiletSummary(riversideToilets), null, 2)}\n`);
writeFileSync(resolve(dataDir, 'family-friendly-toilet-summary.json'), `${JSON.stringify(buildFamilyFriendlyToiletSummary(familyFriendlyToilets), null, 2)}\n`);
writeFileSync(resolve(dataDir, 'toilet-summary.json'), `${JSON.stringify(toiletSummary, null, 2)}\n`);
console.log('Wrote toilet summary files');
