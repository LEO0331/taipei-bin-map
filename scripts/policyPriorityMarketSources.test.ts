import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { convertMarketSources, marketCoordinate, parseMarketCsv, type MarketSourceEntry } from './policyPriorityMarketSources';
import { districtLocator } from './convertCurrentBusStops';

const directory = 'data/raw/bin-policy-priority/markets/markets-dda160fd187e17b6';
const manifest = async () => JSON.parse(await readFile(join(directory, 'sources.json'), 'utf8')) as MarketSourceEntry[];
const convert = async () => convertMarketSources(directory, await manifest(), districtLocator('data/raw/bin-policy/v1-14c24bcdbade/districts.zip'));
describe('official market policy sources', () => {
  it('converts the official degrees/minutes/seconds vendor coordinates without geocoding', () => {
    expect(marketCoordinate("121°29'29.7")).toBeCloseTo(121.4915833333, 9);
  });
  it('preserves decimal traditional market coordinates', () => {
    expect(marketCoordinate('25.075139')).toBe(25.075139);
  });
  it.each(['', '121 degrees', "121°61'20", "25°01'60", undefined])('rejects malformed coordinate %s instead of assigning a district centroid', value => {
    expect(Number.isNaN(marketCoordinate(value))).toBe(true);
  });
  it('rejects malformed CSV before converting source rows', () => {
    expect(() => parseMarketCsv(Buffer.from('a,b\n1,2,3'), { encoding: 'UTF-8' })).toThrow('CSV parse errors');
  });
  it('reproduces 42 physical vendor reference entities from 47 official operating rows', async () => {
    expect((await convert()).references.filter(r => r.category === 'night_market')).toHaveLength(42);
  });
  it('keeps repeated operating-day and association rows in exclusion evidence instead of counting them twice', async () => {
    const result = await convert();
    expect(result.excluded.filter(row => (row as {sourceId:string}).sourceId === 'vendor_concentrations')).toHaveLength(5);
  });
  it('retains operating context without claiming every vendor area is a verified night market', async () => {
    const row = (await convert()).references.find(r => r.category === 'night_market')!;
    expect(row.limitations).toContain('Verified vendor concentration areas, not a verified night-market operating classification; hours are context only.');
  });
  it('reproduces 47 traditional market references from their official coordinates', async () => {
    expect((await convert()).references.filter(r => r.category === 'traditional_market')).toHaveLength(47);
  });
  it('does not use association mailing coordinates as commercial district geometry', async () => {
    expect((await convert()).references.filter(r => r.category === 'commercial')).toHaveLength(0);
  });
  it('keeps all 235 commercial introduction and association rows as context', async () => {
    expect((await convert()).contextualRecords).toHaveLength(235);
  });
  it('marks commercial spatial coverage unavailable rather than zero demand', async () => {
    expect((await convert()).categoryStatus.commercial.status).toBe('unavailable');
  });
  it('rejects a byte-identity mismatch instead of silently treating a refresh as reviewed', async () => {
    const sources = await manifest(); sources[0].sha256 = '0'.repeat(64);
    await expect(convertMarketSources(directory, sources, () => '萬華區')).rejects.toThrow('Source hash mismatch');
  });
  it('rejects archive path changes outside the registered filename', async () => {
    const sources = await manifest(); sources[0].filename = '../unrelated.csv';
    await expect(convertMarketSources(directory, sources, () => '萬華區')).rejects.toThrow('registry identity mismatch');
  });
});
