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
import {
  convertGasLpgStationRows,
  convertTwd97ToWgs84,
  deriveFuelStationStatus,
  parseBusinessHours,
  parseSourceBooleanY,
} from './convertGasLpgStations';
import {
  classifyDesignatedSmokingAreaType,
  classifyOpeningHoursType,
  convertDesignatedSmokingAreaRows,
} from './convertDesignatedSmokingAreas';
import {
  convertAnnouncedNoSmokingPlaceSources,
  normalizeAnnouncementDate,
  parseNoSmokingCoordinates,
} from './convertAnnouncedNoSmokingPlaces';
import {
  convertCommunityRecyclingStationRows,
  parseCommunityRecyclingStationAddress,
} from './convertCommunityRecyclingStations';
import {
  classifyCleanNeedleServiceItem,
  classifyCleanNeedleServicePointCategory,
  convertCleanNeedleExchangeServicePointRows,
  parseCleanNeedleServiceHours,
} from './convertCleanNeedleExchangeServicePoints';
import {
  classifyProtectedTreeLocationType,
  classifyTreeCircumferenceMeters,
  classifyTreeDiameterMeters,
  convertProtectedTreeRows,
} from './convertProtectedTrees';
import {
  classifyPayTaipeiParkingSupportStatus,
  convertPayTaipeiCardlessParkingLotRows,
} from './convertPayTaipeiCardlessParkingLots';
import {
  classifyGreenSpaceAdopter,
  classifyGreenSpaceAdoptionTarget,
  convertGreenSpaceAdoptionRows,
} from './convertGreenSpaceAdoptionRecords';
import {
  convertAccessiblePublicParkingRows,
  normalizeAccessibilityValue,
  parseNonNegativeInteger,
} from './convertAccessiblePublicParkingFacilities';
import { convertUnusedMedicineCollectionStationRows } from './convertUnusedMedicineCollectionStations';
import { convertBulkyWasteCollectionBookingRows, splitServiceVillages } from './convertBulkyWasteCollectionBookings';

describe('new facility converters', () => {
  it('preserves unused-medicine phone extensions while reporting invalid source rows', () => {
    const converted = convertUnusedMedicineCollectionStationRows([
      { 序號: '001', 類別: '藥局', 檢收站名稱: '測試藥局', 地址: '臺北市大安區測試路1號', 電話: '(02)12345678', 分機: '123' },
      { 序號: '', 類別: '藥局', 檢收站名稱: '測試藥局', 地址: '臺北市大安區測試路1號', 電話: '(02)12345678', 分機: '123' },
      { 序號: '003', 類別: '未知', 檢收站名稱: '', 地址: '', 電話: 'bad', 分機: '' },
    ]);
    expect(converted.records).toHaveLength(2);
    expect(converted.records[0]).toMatchObject({ sourceSequenceNumber: '001', phone: '(02)12345678', extension: '123', fullPhone: '(02)12345678#123', districtName: '大安區' });
    expect(converted.summary.dataQuality).toMatchObject({ duplicateRows: [3], missingNames: [4], missingAddresses: [4], unresolvedDistricts: [4] });
    expect(converted.summary.dataQuality.malformedPhones).toHaveLength(1);
    expect(converted.summary.dataQuality.unknownCategories).toEqual([{ rowNumber: 4, value: '未知' }]);
  });
  it('preserves bulky-waste booking source fields while deduplicating clear duplicate rows', () => {
    expect(splitServiceVillages('甲里、乙里')).toEqual(['甲里', '乙里']);
    expect(splitServiceVillages('未分隔服務區')).toEqual(['未分隔服務區']);
    const converted = convertBulkyWasteCollectionBookingRows([
      { 行政區: '南港區', '地址-行政區域代碼': '63000090', 分隊: '玉成分隊', 市話: '(02)27881921', 各分隊收運轄區里: '聯成里、合成里', 預約時間: '早上06:00至下午04:30' },
      { 行政區: '南港區', '地址-行政區域代碼': '63000090', 分隊: '玉成分隊', 市話: '(02)27881921', 各分隊收運轄區里: '聯成里、合成里', 預約時間: '不同來源時間' },
      { 行政區: '', '地址-行政區域代碼': 'x', 分隊: '測試分隊', 市話: 'invalid', 各分隊收運轄區里: '', 預約時間: '' },
    ]);
    expect(converted.records).toHaveLength(2);
    expect(converted.records[0]).toMatchObject({ districtCode: '63000090', serviceVillagesRaw: '聯成里、合成里', bookingHoursRaw: '早上06:00至下午04:30' });
    expect(converted.summary.dataQuality).toMatchObject({ duplicateRows: [{ rowNumber: 3, key: expect.any(String) }], missingDistricts: [4], emptyServiceAreas: [4] });
    expect(converted.summary.dataQuality.malformedPhones).toHaveLength(1);
  });
  it('converts accessible public parking records and detects TWD97 coordinates', () => {
    expect(parseNonNegativeInteger('12')).toMatchObject({ value: 12, valid: true });
    expect(parseNonNegativeInteger('-1').valid).toBe(false);
    expect(normalizeAccessibilityValue('v')).toBe(true);
    expect(normalizeAccessibilityValue('X')).toBe(false);
    expect(normalizeAccessibilityValue('機械塔無設置')).toBe('unknown');

    const converted = convertAccessiblePublicParkingRows([{
      編號: '1', 行政區: '大安區', 停車場名稱: '測試停車場', 地址: '臺北市大安區測試路1號',
      身心障礙汽車格位統計數值: '4', 身心障礙機車格位統計數值: '2', 無障礙電梯: 'v', 無障礙廁所: 'Y', 無障礙樓梯扶手: '1',
      TMPX: '304224.082', TMPY: '2769427.701', QUERYSERVICECODE: 'TPGOS_CA_ADDR',
    }]);
    expect(converted.facilities[0]).toMatchObject({
      type: 'accessible_public_parking_facility',
      sourceId: '1',
      accessibleCarSpaceCount: 4,
      accessibleMotorcycleSpaceCount: 2,
      accessibilityFeatureCount: 3,
      coordinateSystem: 'twd97',
      hasValidCoordinates: true,
    });
    expect(converted.report.invalidCoordinateRows).toHaveLength(0);
  });
  it('parses timed collection notes conservatively', () => {
    expect(parseTimedCollectionCapabilities('不含廚餘，開放時間06：00~22：00')).toMatchObject({
      acceptsGarbage: 'unknown',
      acceptsRecycling: 'unknown',
      acceptsFoodWaste: false,
      hasSpecialHours: true,
    });
  });

  it('converts pay.taipei parking rows as address-only records without geocoding', () => {
    expect(classifyPayTaipeiParkingSupportStatus('1')).toBe('supported');
    expect(classifyPayTaipeiParkingSupportStatus('0')).toBe('not_supported_or_stopped');

    const converted = convertPayTaipeiCardlessParkingLotRows([
      {
        seqno: '1',
        停車場ID: 'P001',
        營運id: 'OP01',
        營運單位: '臺北市停管處',
        對應停車場: '測試停車場',
        狀態: '1',
        電話: '02-12345678',
        郵遞區號: '110',
        地址: '台北市信義區松仁路1號地下1樓',
        說明: '無',
      },
      {
        seqno: '2',
        停車場ID: 'P002',
        營運id: 'OP02',
        營運單位: '平台公司',
        對應停車場: '平台服務',
        狀態: '0',
        電話: '02-99999999',
        郵遞區號: '251',
        地址: '新北市淡水區中正路1號5樓',
        說明: '停止服務',
      },
    ]);

    expect(converted.facilities[0]).toMatchObject({
      type: 'pay_taipei_cardless_parking_lot',
      district: '信義區',
      address: '臺北市信義區松仁路1號地下1樓',
      locationPrecision: 'address_only',
      supportStatusCategory: 'supported',
      postalCodeType: 'taipei_city',
      addressLooksLikeBasementOrUnderground: true,
      payTaipeiParkingGeocodingStatus: 'not_geocoded_address_only',
      coordinateSource: 'none',
    });
    expect(converted.facilities[1]).toMatchObject({
      supportStatusCategory: 'not_supported_or_stopped',
      postalCodeType: 'new_taipei_or_other_city',
      addressLooksLikeOperatorOrPlatformAddress: true,
      serviceStoppedHint: true,
      payTaipeiParkingLocationPrecision: 'operator_or_platform_address',
    });
    expect(converted.summary).toMatchObject({
      totalRecords: 2,
      supportedCount: 1,
      notSupportedOrStoppedCount: 1,
      recordsWithServiceStoppedHint: 1,
    });
  });

  it('maps green-space adoption rows as address-only public-environment records', () => {
    expect(classifyGreenSpaceAdoptionTarget('行道樹')).toBe('street_tree');
    expect(classifyGreenSpaceAdopter('財團法人大安森林公園之友基金會')).toBe('foundation_or_association');

    const converted = convertGreenSpaceAdoptionRows([
      {
        序號: '1',
        管理單位: '青年所',
        行政區: '大安區',
        行政區代碼: '63000030',
        認養標的名稱: '仁愛路四段行道樹',
        屬性: '行道樹',
        認養位置: '仁愛路四段169號(11株)',
        認養單位名稱: '富邦公寓大廈管理維護股份有限公司',
      },
      {
        序號: '2',
        管理單位: '青年所',
        行政區: '大安區',
        行政區代碼: '63000030',
        認養標的名稱: '大安森林公園(部分區域)',
        屬性: '公園',
        認養位置: '新生南路以東信義路3段以南',
        認養單位名稱: '財團法人大安森林公園之友基金會',
      },
    ]);

    expect(converted.facilities[0]).toMatchObject({
      type: 'green_space_adoption_record',
      district: '大安區',
      districtCode: '63000030',
      managementUnit: '青年所',
      adoptionTargetCategory: 'street_tree',
      adopterNameCategory: 'company',
      roadName: '仁愛路',
      locationPrecision: 'address_only',
      coordinateStatus: 'missing',
      longitude: 0,
      latitude: 0,
    });
    expect(converted.facilities[1]).toMatchObject({
      adoptionTargetCategory: 'park',
      adopterNameCategory: 'foundation_or_association',
      locationTextHasRangeOrBoundary: true,
    });
    expect(converted.summary).toMatchObject({
      totalRecords: 2,
      districtCount: 1,
      streetTreeAdoptionRecordCount: 1,
      parkGreenSpaceAdoptionRecordCount: 1,
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

  it('converts gas/LPG TWD97 coordinates and derives source fields', () => {
    expect(parseSourceBooleanY('Y')).toBe(true);
    expect(parseSourceBooleanY('')).toBe(false);
    expect(parseBusinessHours('7~22時')).toMatchObject({ businessHoursRaw: '7~22時', hasLimitedHours: true });
    expect(parseBusinessHours('24小時')).toMatchObject({ isTwentyFourHours: true });
    expect(deriveFuelStationStatus('測試站終止營業')).toBe('terminated');
    expect(convertTwd97ToWgs84(302655, 2775585)).toMatchObject({
      longitude: expect.closeTo(121.522, 3),
      latitude: expect.closeTo(25.088, 3),
    });

    const converted = convertGasLpgStationRows([{
      CITYZONE: '士林區',
      NAME: '台亞',
      S_NAME: '台亞基河加油站',
      SUPPLIER: '台塑',
      ADDRESS: '承德路四段200號',
      電話: '(02)28815335',
      DUTY_TIME: '24小時',
      HAVEOIL: 'Y',
      HAVEGAS: '',
      HAVESELF: 'Y',
      ADDR_X: '302655',
      ADDR_Y: '2775585',
    }]);

    expect(converted.facilities[0]).toMatchObject({
      type: 'gas_lpg_station',
      district: '士林區',
      stationName: '台亞基河加油站',
      supplier: '台塑',
      hasOil: true,
      hasLpg: false,
      hasSelfService: true,
      stationServiceTypes: ['gasoline', 'self_service'],
      coordinateStatus: 'valid',
    });
    expect(converted.summary).toMatchObject({
      totalRecords: 1,
      validCoordinateCount: 1,
      oilStationCount: 1,
      selfServiceStationCount: 1,
    });
  });

  it('maps designated smoking areas with WGS84 coordinates and source fields', () => {
    expect(classifyDesignatedSmokingAreaType('戶外負壓式吸菸區')).toBe('outdoor_negative_pressure');
    expect(classifyOpeningHoursType('週一至週五07:00-19:00，例假日不開放')).toBe('weekday_or_holiday_rule');

    const converted = convertDesignatedSmokingAreaRows([{
      行政區: '松山區',
      地點: '臺北體育館',
      地址: '南京東路4段10號',
      樣態: '戶外開放式吸菸區',
      開放時間: '24小時開放',
      緯度: '25.05135',
      經度: '121.55292',
      相對位置: '體育館後方停車場',
      照片連結: 'https://example.com/photo.jpg',
      管理單位: '臺北市政府體育局',
      管理單位電話: '(02)25702330',
      備註: '本位置資訊僅供參考',
    }]);

    expect(converted.facilities[0]).toMatchObject({
      type: 'designated_smoking_area',
      district: '松山區',
      name: '臺北體育館',
      address: '南京東路4段10號',
      smokingAreaType: 'outdoor_open',
      openingHoursType: 'listed_24_hours',
      isListed24Hours: true,
      hasPhotoUrl: true,
      coordinateStatus: 'valid',
      longitude: 121.55292,
      latitude: 25.05135,
    });
    expect(converted.summary).toMatchObject({
      totalRecords: 1,
      validCoordinateCount: 1,
      listed24HoursCount: 1,
      recordsWithPhotoUrl: 1,
    });
  });

  it('maps announced no-smoking place resources with dates, coordinates, and district codes', () => {
    expect(normalizeAnnouncementDate('20120430')).toBe('2012-04-30');
    expect(parseNoSmokingCoordinates('121.5629231', '25.05662219')).toMatchObject({
      longitude: 121.5629231,
      latitude: 25.05662219,
      coordinateSystem: 'wgs84',
      coordinateStatus: 'valid',
    });

    const converted = convertAnnouncedNoSmokingPlaceSources([
      {
        fileName: '臺北市公告戶外禁菸場所一覽表(僅包含有明確地址者用於製作禁菸地圖)1140912.csv',
        rows: [{
          縣市別代碼: '63000',
          行政區: '63000010',
          地點: '健康國小周邊人行道',
          地址: '延壽街168號',
          X: '121.5629231',
          Y: '25.05662219',
        }],
      },
      {
        fileName: '臺北市公告戶外禁菸場所一覽表0912修.csv',
        rows: [{
          序號: '1',
          行政區別: '63000010',
          場所名稱: '健康國小周邊人行道',
          公告禁菸日期: '20120430',
          縣市別: '63000',
        }],
      },
      {
        fileName: '臺北市除吸菸區外全面禁菸公園綠地_0609修.csv',
        rows: [{
          項次: '1',
          縣市別代碼: '63000',
          行政區: '士 林',
          公園名稱: '士林官邸',
          位置: '中山北路5段378巷以北',
        }],
      },
    ]);

    expect(converted.facilities).toHaveLength(3);
    expect(converted.facilities[0]).toMatchObject({
      type: 'announced_no_smoking_place',
      recordType: 'outdoor_no_smoking_place',
      district: '松山區',
      placeName: '健康國小周邊人行道',
      address: '延壽街168號',
      hasCoordinates: true,
      coordinateSystem: 'wgs84',
      coordinateStatus: 'valid',
    });
    expect(converted.facilities[1]).toMatchObject({
      district: '松山區',
      announcementDate: '2012-04-30',
      announcementYear: 2012,
      announcementMonthKey: '2012-04',
      hasCoordinates: false,
      locationPrecision: 'address_only',
    });
    expect(converted.facilities[2]).toMatchObject({
      recordType: 'smoke_free_park_green_space',
      district: '士林區',
      parkName: '士林官邸',
      locationDescription: '中山北路5段378巷以北',
      hasLocationDescription: true,
    });
    expect(converted.summary).toMatchObject({
      totalRecords: 3,
      withCoordinatesCount: 1,
      withAnnouncementDateCount: 1,
      smokeFreeParkGreenSpaceCount: 1,
    });
  });

  it('maps community recycling stations as address-only records and summarizes duplicates', () => {
    expect(parseCommunityRecyclingStationAddress('台北市信義區松德路89號')).toMatchObject({
      address: '臺北市信義區松德路89號',
      districtFromAddress: '信義區',
      roadName: '松德路',
    });

    const converted = convertCommunityRecyclingStationRows([
      { 編號: '1', 回收站名稱: '信惠社區資源回收站', 行政區: '信義區', 行政區代碼: '63000020', 地址: '台北市信義區松德路89號' },
      { 編號: '2', 回收站名稱: '信惠社區資源回收站', 行政區: '信義區', 行政區代碼: '63000020', 地址: '台北市信義區松德路89號' },
    ]);

    expect(converted.facilities).toHaveLength(2);
    expect(converted.facilities[0]).toMatchObject({
      type: 'community_recycling_station',
      sourceSequenceNumber: 1,
      stationName: '信惠社區資源回收站',
      district: '信義區',
      districtCode: '63000020',
      address: '臺北市信義區松德路89號',
      roadName: '松德路',
      hasAddress: true,
      hasParsedRoadName: true,
      locationPrecision: 'address_only',
      longitude: 0,
      latitude: 0,
    });
    expect(converted.summary).toMatchObject({
      totalRecords: 2,
      districtCount: 1,
      uniqueStationNameCount: 1,
      uniqueAddressCount: 1,
      recordsWithAddress: 2,
      recordsWithParsedRoadName: 2,
    });
    expect(converted.summary.duplicateStationNames).toEqual([{ stationName: '信惠社區資源回收站', count: 2 }]);
    expect(converted.summary.duplicateAddresses).toEqual([{ address: '臺北市信義區松德路89號', count: 2 }]);
  });

  it('maps clean needle service points as address-only public health records', () => {
    expect(classifyCleanNeedleServiceItem('針具回收桶')).toBe('needle_return_box');
    expect(classifyCleanNeedleServicePointCategory('公園/市場/公廁')).toBe('park_market_public_toilet');
    expect(parseCleanNeedleServiceHours('00：00~23：59')).toMatchObject({
      isTwentyFourHourService: true,
      serviceHoursNormalized: '00:00~23:59',
    });

    const converted = convertCleanNeedleExchangeServicePointRows([
      {
        序號: '1',
        行政區域代碼: '63000020',
        設置項目: '衛教諮詢站',
        設置點類別: '藥局',
        機構代碼: '5901170011',
        設置地點: '測試藥局',
        電話: '(02)2720-0000',
        分機: '123',
        地址: '台北市信義區松德路89號',
        服務時間: '09：00~22：00',
        備註: '',
      },
    ]);

    expect(converted.facilities[0]).toMatchObject({
      type: 'clean_needle_exchange_service_point',
      district: '信義區',
      areaCode: '63000020',
      districtFromAreaCode: '信義區',
      districtFromAddress: '信義區',
      serviceItemCategory: 'health_education_consultation_station',
      servicePointCategoryGroup: 'pharmacy',
      institutionCode: '5901170011',
      serviceLocationName: '測試藥局',
      phoneType: 'taipei_landline',
      hasExtension: true,
      address: '臺北市信義區松德路89號',
      roadName: '松德路',
      locationPrecision: 'address_only',
    });
    expect(converted.summary.twentyFourHourServiceCount).toBe(0);
    expect(converted.report.validRows).toBe(1);
  });

  it('maps protected trees with exact coordinates and size quality flags', () => {
    expect(classifyProtectedTreeLocationType('公園、綠地')).toBe('park_green_space');
    expect(classifyTreeDiameterMeters(1.2)).toBe('1m_to_2m');
    expect(classifyTreeCircumferenceMeters(22)).toBe('over_10m');

    const converted = convertProtectedTreeRows([
      {
        樹木編號: '768',
        樹種名稱: '榕',
        樹種學名: 'Ficus microcarpa L. f.',
        樹胸徑寬度公尺: '1.13',
        樹胸圍長度公尺: '227',
        地址: '臺北市萬華區青年公園1號',
        緯度: '25.0232',
        經度: '121.5056',
        地理位置名稱: '公園、綠地',
        管理單位: '臺北市政府工務局公園路燈工程管理處',
        英文名: 'Banyan',
      },
    ]);

    expect(converted.facilities[0]).toMatchObject({
      type: 'protected_tree',
      district: '萬華區',
      locationPrecision: 'exact',
      coordinateStatus: 'valid',
      coordinateQuality: 'valid_wgs84_taipei',
      treeId: '768',
      speciesNameZh: '榕',
      scientificName: 'Ficus microcarpa L. f.',
      speciesNameEn: 'Banyan',
      diameterCategory: '1m_to_2m',
      circumferenceCategory: 'over_10m',
      locationTypeCategory: 'park_green_space',
    });
    expect(converted.facilities[0].sizeDataQualityFlags).toContain('circumference_over_20m');
    expect(converted.summary.totalRecords).toBe(1);
    expect(converted.report.validRows).toBe(1);
  });
});
