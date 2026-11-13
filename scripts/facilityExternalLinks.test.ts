import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Facility } from '../src/types';
import { externalHttpUrl } from '../src/utils/externalHttpUrl';
import { convertDesignatedSmokingAreaRows } from './convertDesignatedSmokingAreas';
import { convertDirectDrinkingRows } from './convertDirectDrinkingStations';

describe('imported facility links', () => {
  it('omits invalid maintenance links without dropping the drinking station', () => {
    const { facilities } = convertDirectDrinkingRows([{
      '名稱': '測試直飲臺', '水質維護資訊網址': 'mailto:station@example.test',
      '照片網址': 'https://example.test/photo.png',
    }]);
    expect(facilities[0]).toMatchObject({ name: '測試直飲臺', photoUrl: 'https://example.test/photo.png' });
    expect(facilities[0]).not.toHaveProperty('maintenanceUrl');
  });

  it('omits malformed smoking area photo links', () => {
    const { facilities } = convertDesignatedSmokingAreaRows([{
      '行政區': '大安區', '地點': '測試設施', '地址': '測試地址', '照片連結': 'https://',
      '經度': '121.54', '緯度': '25.02', '樣態': '戶外開放式', '開放時間': '24小時',
    }]);
    expect(facilities[0]).toMatchObject({ name: '測試設施', hasPhotoUrl: false });
    expect(facilities[0].photoUrl).toBeUndefined();
  });

  it('preserves all photo and maintenance links in the current published facility snapshot', () => {
    const facilities: Facility[] = JSON.parse(readFileSync('public/data/facilities.json', 'utf8'));
    const urls = facilities.flatMap(({ photoUrl, maintenanceUrl }) => [photoUrl, maintenanceUrl]).filter(Boolean);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((url) => externalHttpUrl(url) !== url)).toEqual([]);
  });
});
