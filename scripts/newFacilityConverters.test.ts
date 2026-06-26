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
import { convertMotorcycleInspectionStationRows } from './convertMotorcycleInspectionStations';
import { convertElectricMotorcycleChargingStationRows } from './convertElectricMotorcycleChargingStations';
import {
  classifyCommercialEvServiceType,
  convertCommercialEvChargingSwapRows,
  parseCommercialEvAddress,
} from './convertCommercialEvChargingSwapStations';

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

  it('maps motorcycle inspection stations as address-only records and preserves responsible person data', () => {
    const converted = convertMotorcycleInspectionStationRows([
      {
        站號: 'A12',
        廠牌: '山葉',
        站名: '宏立機車事業有限公司',
        行政區: '大安區 ',
        郵遞區號: '106025',
        地址: '臺北市大安區和平東路2段141號',
        電話: '(02)27065429',
        負責人: '沈鳳雲',
      },
    ]);

    expect(converted.facilities[0]).toMatchObject({
      type: 'motorcycle_inspection_station',
      stationId: 'A12',
      brand: '山葉',
      district: '大安區',
      postalCode: '106025',
      locationPrecision: 'address_only',
      responsiblePersonName: '沈鳳雲',
    });
    expect(converted.summary).toMatchObject({ totalRecords: 1, uniqueStationIdCount: 1, brandCount: 1 });
  });

  it('maps electric motorcycle charging stations without dropping duplicate station IDs', () => {
    const converted = convertElectricMotorcycleChargingStationRows([
      {
        編號: 'R01',
        單位: '中華汽車社子服務廠',
        縣市: '臺北市',
        行政區: '士林區',
        行政區域代碼: '63000110.0',
        地址: '臺北市士林區延平北路6段434號',
        備註: '中華汽車服務廠',
      },
      {
        編號: 'R01',
        單位: '另一站',
        縣市: '臺北市',
        行政區: '士林區',
        行政區域代碼: '63000110',
        地址: '臺北市士林區測試路1號',
        備註: '公有停車場',
      },
    ]);

    expect(converted.facilities).toHaveLength(2);
    expect(converted.facilities[0]).toMatchObject({
      type: 'electric_motorcycle_charging_station',
      stationId: 'R01',
      unitName: '中華汽車社子服務廠',
      district: '士林區',
      districtCode: '63000110',
      locationCategory: 'service_factory',
      locationPrecision: 'address_only',
    });
    expect(converted.summary).toMatchObject({
      totalRecords: 2,
      uniqueStationIdCount: 1,
      duplicateStationIdCount: 1,
    });
    expect(converted.report.duplicateStationIds).toEqual([{ stationId: 'R01', count: 2 }]);
  });

  it('classifies commercial EV service files and keeps address-only records', () => {
    expect(classifyCommercialEvServiceType('臺北市營利電動車充電站-240站.csv')).toBe('electric_car_charging');
    expect(classifyCommercialEvServiceType('臺北市營利電動機車充電站-12站.csv')).toBe('electric_motorcycle_charging');
    expect(classifyCommercialEvServiceType('臺北市營利電動機車換電站-365站.csv')).toBe('electric_motorcycle_battery_swap');

    expect(parseCommercialEvAddress('台北市南港經貿二路88巷19號')).toMatchObject({
      district: '南港區',
      address: '臺北市南港經貿二路88巷19號',
      warning: 'inferred_district_from_high_confidence_hint',
    });

    const rows = [
      { 序號: '1', 廠商: '業者A', 名稱: '站A', 地址: '臺北市大安區測試路1號', 縣市: '臺北市', 縣市代碼: '63000.0' },
      { 序號: '2', 廠商: '業者B', 名稱: '站B', 地址: '臺北市信義區測試路2號', 縣市: '臺北市', 縣市代碼: '63000' },
      { 序號: '3', 廠商: '業者C', 名稱: '站C', 地址: '臺北市南港經貿二路88巷19號', 縣市: '臺北市', 縣市代碼: '63000.0' },
    ];
    const converted = convertCommercialEvChargingSwapRows([
      { fileName: '臺北市營利電動機車換電站-365站.csv', rows },
    ]);

    expect(converted.facilities).toHaveLength(3);
    expect(converted.facilities[0]).toMatchObject({
      type: 'commercial_ev_charging_swap_station',
      serviceType: 'electric_motorcycle_battery_swap',
      sourceSequenceNumber: 1,
      cityCode: '63000',
      locationPrecision: 'address_only',
    });
    expect(converted.summary).toMatchObject({
      totalRecords: 3,
      electricMotorcycleBatterySwapCount: 3,
      districtCount: 3,
    });
    expect(converted.reports[0].addressParseWarnings).toContainEqual({
      rowNumber: 4,
      address: '臺北市南港經貿二路88巷19號',
      warning: 'inferred_district_from_high_confidence_hint',
    });
  });
});
