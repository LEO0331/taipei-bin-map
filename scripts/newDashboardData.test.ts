import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readJson = <T>(path: string) => JSON.parse(readFileSync(path, 'utf8')) as T;

describe('new dashboard generated data contracts', () => {
  const pools = readJson<Array<{ hasValidCoordinates: boolean; latitude: number | null; longitude: number | null; phone: string; extension: string; sourceExtraFields: Record<string, string> }>>('public/data/public-private-swimming-pools/records.json');
  const bathhouses = readJson<Array<{ certificationValidUntilRaw: string; certificationValidUntil: string | null; certificationStatus: string; districtName: string; sourceFields: Record<string, string> }>>('public/data/certified-bathhouses/records.json');
  const recycling = readJson<Array<{ rocYear: number; year: number; month: number; districtCode: string; districtName: string; recyclingTons: number; sourceFields: Record<string, string> }>>('public/data/recycling-analytics/records.json');

  it('keeps valid swimming-pool coordinates within Taipei bounds', () => {
    const mapped = pools.filter((record) => record.hasValidCoordinates);
    expect(mapped).not.toHaveLength(0);
    expect(mapped.every((record) => record.longitude! >= 121.3 && record.longitude! <= 121.8 && record.latitude! >= 24.85 && record.latitude! <= 25.3)).toBe(true);
  });

  it('preserves swimming-pool phone and extension source fields as strings', () => {
    const record = pools.find((item) => item.phone && item.extension);
    expect(record).toBeDefined();
    expect(typeof record?.phone).toBe('string');
    expect(typeof record?.extension).toBe('string');
    expect(record?.sourceExtraFields).toHaveProperty('電話');
    expect(record?.sourceExtraFields).toHaveProperty('分機');
  });

  it('retains bathhouse source date text while producing ISO dates only for eight-digit values', () => {
    expect(bathhouses).not.toHaveLength(0);
    expect(bathhouses.every((record) => record.certificationValidUntil === null || /^\d{4}-\d{2}-\d{2}$/.test(record.certificationValidUntil))).toBe(true);
    expect(bathhouses.every((record) => Object.hasOwn(record.sourceFields, '認證有效日期'))).toBe(true);
  });

  it('limits bathhouse certification status to supported source-date outcomes', () => {
    expect(bathhouses.every((record) => ['valid', 'expiringSoon', 'expired', 'unknown'].includes(record.certificationStatus))).toBe(true);
  });

  it('converts recycling ROC years to Gregorian years', () => {
    expect(recycling).not.toHaveLength(0);
    expect(recycling.every((record) => record.year === record.rocYear + 1911)).toBe(true);
  });

  it('keeps non-district recycling rows distinct from the twelve Taipei district codes', () => {
    const otherRows = recycling.filter((record) => !record.districtCode);
    expect(otherRows.length).toBeGreaterThan(0);
    expect(otherRows.every((record) => record.districtName === '其他')).toBe(true);
  });

  it('keeps recycling months and tonnes within valid import ranges', () => {
    expect(recycling.every((record) => record.month >= 1 && record.month <= 12 && Number.isFinite(record.recyclingTons) && record.recyclingTons >= 0)).toBe(true);
  });
});
