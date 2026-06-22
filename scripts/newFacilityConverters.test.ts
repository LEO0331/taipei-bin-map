import { describe, expect, it } from 'vitest';
import {
  classifyDirectDrinkingPlaceType,
  convertDirectDrinkingRows,
  normalizeDirectDrinkingStatus,
} from './convertDirectDrinkingStations';
import {
  convertTimedCollectionRows,
  parseTimedCollectionCapabilities,
} from './convertTimedCollectionPoints';
import { convertUsedClothingRows } from './convertUsedClothingRecyclingBoxes';

describe('new facility converters', () => {
  it('parses timed collection notes conservatively', () => {
    expect(parseTimedCollectionCapabilities('不含廚餘，開放時間06：00~22：00')).toMatchObject({
      acceptsGarbage: 'unknown',
      acceptsRecycling: 'unknown',
      acceptsFoodWaste: false,
      hasSpecialHours: true,
    });
  });

  it('normalizes direct drinking status and place type', () => {
    expect(normalizeDirectDrinkingStatus('正常')).toBe('normal');
    expect(normalizeDirectDrinkingStatus('暫停')).toBe('suspended');
    expect(normalizeDirectDrinkingStatus('')).toBe('unknown');
    expect(classifyDirectDrinkingPlaceType('捷運站')).toBe('mrt_station');
  });

  it('normalizes Taipei districts and preserves outside-Taipei records', () => {
    const converted = convertDirectDrinkingRows([
      { 市別: '臺北市', 行政區: '大安', 場所名稱: 'A', 地址: 'A地址', 經度: '121.54', 緯度: '25.03', 狀態: '正常' },
      { 市別: '新北市', 行政區: '新店', 場所名稱: 'B', 地址: 'B地址', 經度: '121.53', 緯度: '24.94', 狀態: '暫停' },
    ]);

    expect(converted.facilities[0]).toMatchObject({ district: '大安區', isTaipeiCity: true });
    expect(converted.facilities[1]).toMatchObject({ district: '新店', isTaipeiCity: false });
  });

  it('keeps timed collection rows and flags invalid coordinates', () => {
    const converted = convertTimedCollectionRows([
      { 行政區: '士林', 地址: '測試地址', 經度: '', 緯度: '', 備註: '每日06:00-22:00' },
    ]);

    expect(converted.facilities[0]).toMatchObject({
      district: '士林區',
      isCoordinateOutlier: true,
    });
    expect(converted.report.invalidCoordinateRows).toHaveLength(1);
  });

  it('maps used-clothing rows and preserves village and organization', () => {
    const converted = convertUsedClothingRows([
      {
        核准編號: '1',
        行政區: '大安',
        里別: '德安',
        臺北市核准地點: '四維路旁',
        團體名稱: '測試協會',
        電話: '02-12345678',
        經度: '121.54',
        緯度: '25.03',
      },
    ]);

    expect(converted.facilities[0]).toMatchObject({
      type: 'used_clothing_recycling_box',
      district: '大安區',
      village: '德安',
      organizationName: '測試協會',
    });
  });
});
