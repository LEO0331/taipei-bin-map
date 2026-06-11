import { describe, expect, it } from 'vitest';
import type { Bin } from '../types';
import { calculateDistanceMeters, filterBins, formatDistance } from './binUtils';

const bins: Bin[] = [
  {
    id: 'bin-1',
    district: '中正區',
    address: '台北車站南側',
    longitude: 121.5168,
    latitude: 25.0463,
    note: '嚴禁投入家用垃圾，違者重罰新臺幣6000元',
  },
  {
    id: 'bin-2',
    district: '大安區',
    address: '大安森林公園入口',
    longitude: 121.5354,
    latitude: 25.033,
    note: '嚴禁投入家用垃圾，違者重罰新臺幣6000元',
  },
];

describe('calculateDistanceMeters', () => {
  it('calculates a Haversine distance in meters', () => {
    const distance = calculateDistanceMeters(25.0478, 121.517, 25.033, 121.5354);

    expect(distance).toBeGreaterThan(2400);
    expect(distance).toBeLessThan(2600);
  });
});

describe('formatDistance', () => {
  it('formats short distances in meters for Chinese and English', () => {
    expect(formatDistance(280, 'zh')).toBe('280 公尺');
    expect(formatDistance(280, 'en')).toBe('280 m');
  });

  it('formats longer distances in kilometers for Chinese and English', () => {
    expect(formatDistance(1530, 'zh')).toBe('1.5 公里');
    expect(formatDistance(1530, 'en')).toBe('1.5 km');
  });
});

describe('filterBins', () => {
  it('filters by district and address keyword', () => {
    const result = filterBins(bins, '森林', '大安區');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('bin-2');
  });

  it('returns all bins when filters are empty', () => {
    expect(filterBins(bins, '', '')).toEqual(bins);
  });
});
