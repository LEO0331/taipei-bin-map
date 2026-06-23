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
import {
  convertLactationRows,
  normalizeDistrictCode,
  parseRocChineseDate,
} from './convertLactationRooms';
import {
  classifyRiversideToiletType,
  convertRiversideToiletRows,
} from './convertRiversideToilets';
import {
  convertFamilyFriendlyToiletRows,
  parseFamilyFriendlyAward,
} from './convertFamilyFriendlyToilets';

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

  it('normalizes lactation room district codes and ROC dates', () => {
    expect(normalizeDistrictCode('63000030.0')).toBe('63000030');
    expect(parseRocChineseDate('114年12月31日')).toBe('2025-12-31');
  });

  it('deduplicates lactation rooms, parses equipment, and cross-references the legal list', () => {
    const primary = {
      行政區: '63000030.0',
      機構名稱: '測試哺集乳室',
      地址: '臺北市大安區測試路1號',
      開放時間: '09:00-18:00',
      基本設備: '尿布台;洗手台',
      友善設備或服務: '熱水',
      優良哺集乳室認證效期: '114年12月31日',
    };
    const converted = convertLactationRows(
      [primary, primary],
      [{ 機關名稱: '測試哺集乳室', 地址: '台北市大安區測試路1號' }],
    );

    expect(converted.facilities).toHaveLength(1);
    expect(converted.facilities[0]).toMatchObject({
      type: 'lactation_room',
      district: '大安區',
      locationPrecision: 'address_only',
      basicEquipment: ['尿布台', '洗手台'],
      certificationValidUntil: '2025-12-31',
      appearsInLegalRequiredList: true,
    });
    expect(converted.report.coordinateOutlierRows).toBe(0);
  });

  it('uses only manually verified lactation-room coordinates for exact markers', () => {
    const converted = convertLactationRows(
      [{ 行政區: '63000030', 機構名稱: '測試哺集乳室', 地址: '臺北市大安區測試路1號' }],
      [],
      [{
        normalizedName: '測試哺集乳室',
        normalizedAddress: '台北市大安區測試路1號',
        latitude: 25.03,
        longitude: 121.54,
        sourceNote: 'Manual verification',
      }],
    );

    expect(converted.facilities[0]).toMatchObject({
      latitude: 25.03,
      longitude: 121.54,
      locationPrecision: 'exact',
    });
  });

  it('classifies and maps riverside toilet coordinates', () => {
    const converted = convertRiversideToiletRows([{
      NO: '1',
      'Administrative district': '中山區 ',
      'Riverside Park': '大佳河濱公園',
      Location: '兒童遊戲區',
      Type: '無障礙',
      Longitude: '121.535869',
      Latitude: '25.074578',
      Long_TWD97: '304058.4359',
      Lat_WD97: '2774145.154',
    }]);

    expect(classifyRiversideToiletType('固定式')).toBe('fixed');
    expect(converted.facilities[0]).toMatchObject({
      district: '中山區',
      riversideToiletType: 'accessible',
      coordinateStatus: 'valid',
      longitudeTwd97: 304058.4359,
    });
  });

  it('parses family-friendly equipment, awards, and public-toilet matches', () => {
    const converted = convertFamilyFriendlyToiletRows([{
      行政區: '士林區',
      公廁編號: 'A147',
      公廁類別: '交通',
      公廁名稱: '捷運劍潭站',
      公廁地址: '臺北市士林區中山北路五段65號',
      經度: '121.525078',
      緯度: '25.084873',
      尿布臺設置數量: '2',
      兒童座椅設置數量: '1',
      親子友善評鑑獲獎: 'V',
    }], [{
      id: 'public_toilet-1',
      type: 'public_toilet',
      district: '士林區',
      address: '台北市士林區中山北路五段65號',
      longitude: 121.525078,
      latitude: 25.084873,
      note: '',
      source: '',
      name: '捷運劍潭站',
    }]);

    expect(parseFamilyFriendlyAward('獲獎')).toBe(true);
    expect(converted.facilities[0]).toMatchObject({
      diaperTableCount: 2,
      childSeatCount: 1,
      hasFamilyFriendlyAward: true,
      matchedPublicToiletId: 'public_toilet-1',
      coordinateStatus: 'valid',
    });
  });
});
