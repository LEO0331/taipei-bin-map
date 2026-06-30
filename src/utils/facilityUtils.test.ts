import { describe, expect, it } from 'vitest';
import type { Facility } from '../types';
import {
  calculateDistanceMeters,
  classifyDrinkingFountainPlace,
  filterFacilities,
  formatDistance,
  getCommercialEvServiceTypeLabel,
  getFacilityGoogleMapsUrl,
  getFacilityTypeLabel,
  getElectricMotorcycleChargingLocationCategoryLabel,
  getAnnouncedNoSmokingRecordTypeLabel,
  getCommunityRecyclingStationLabel,
  isCoordinateOutlier,
  getFuelStationStatusLabel,
  normalizeTaipeiDistrict,
} from './facilityUtils';

const facilities: Facility[] = [
  {
    id: 'pedestrian_bin_0001',
    type: 'pedestrian_bin',
    district: '中正區',
    address: '台北車站南側',
    longitude: 121.5168,
    latitude: 25.0463,
    note: '嚴禁投入家用垃圾，違者重罰新臺幣6,000元',
    source: '台北市行人專用清潔箱資料',
  },
  {
    id: 'dog_waste_bag_box_0001',
    type: 'dog_waste_bag_box',
    district: '大安區',
    road: '新生南路',
    location: '大安森林公園入口',
    address: '新生南路大安森林公園入口',
    longitude: 121.5354,
    latitude: 25.033,
    note: '隨手清狗便，違者最高罰鍰新臺幣6,000元',
    source: '台北市狗便袋箱位置資料',
  },
  {
    id: 'public_toilet_0001',
    type: 'public_toilet',
    district: '士林區',
    address: '臺北市士林區中山北路五段65號',
    longitude: 121.525078,
    latitude: 25.084873,
    note: '實際開放情況請以現場為準',
    source: '臺北市公廁點位資訊',
    name: '捷運劍潭站(淡水信義線)',
    category: '交通',
    manager: '捷運劍潭站(夜)',
    totalSeats: 5,
    accessibleToiletSeats: 0,
    parentChildToiletSeats: 1,
  },
  {
    id: 'drinking_fountain_0001',
    type: 'drinking_fountain',
    district: '士林區',
    address: '臺北市士林區基河路130號',
    longitude: 121.524,
    latitude: 25.088,
    note: '公共場所飲水機實際開放時間與可用狀態請以現場為準',
    source: '臺北市公共場所飲水機資訊',
    name: '臺北市士林運動中心',
    manager: '臺北市政府體育局',
    phone: '02-28806066',
    openingHours: '06:00-22:00',
    installLocation: '1樓大廳',
    drinkingFountainCount: 3,
    placeCategory: 'sports_center',
  },
  {
    id: 'timed_collection_point_0001',
    type: 'timed_collection_point',
    district: '士林區',
    address: '臺北市士林區文昌路211之3號',
    longitude: 121.52006,
    latitude: 25.09997,
    note: '不含廚餘，開放時間06：00~22：00',
    source: '臺北市垃圾資源回收、廚餘回收限時收受點',
    team: '蘭雅',
    acceptsGarbage: 'unknown',
    acceptsRecycling: 'unknown',
    acceptsFoodWaste: false,
    hasSpecialHours: true,
  },
  {
    id: 'direct_drinking_station_0001',
    type: 'direct_drinking_station',
    district: '大安區',
    address: '臺北市大安區長興街131號',
    longitude: 121.548456,
    latitude: 25.014828,
    note: '',
    source: '臺北市所屬直飲臺',
    name: '北水處長興淨水場',
    city: '臺北市',
    placeType: '機關',
    directDrinkingPlaceCategory: 'government_office',
    directDrinkingStatus: 'normal',
    maintenanceUrl: 'https://example.test/water',
    isTaipeiCity: true,
  },
  {
    id: 'used_clothing_recycling_box_0001',
    type: 'used_clothing_recycling_box',
    district: '大安區',
    address: '四維路52巷10號旁',
    longitude: 121.54708,
    latitude: 25.03507,
    note: '',
    source: '臺北市社會福利團體(機構)設置舊衣回收設施據點',
    name: '台北市自閉症家長協會',
    village: '德安',
    approvedLocation: '四維路52巷10號旁',
    organizationName: '台北市自閉症家長協會',
    phone: '(02)25953937',
  },
  {
    id: 'lactation_room-0001',
    type: 'lactation_room',
    district: '大安區',
    address: '臺北市大安區仁愛路四段1號',
    longitude: 0,
    latitude: 0,
    note: '請洽服務台',
    source: '臺北市哺集乳室',
    locationPrecision: 'address_only',
    name: '測試哺集乳室',
    facilityName: '測試哺集乳室',
    openingHours: '09:00-18:00',
    phone: '02-12345678',
    locationGuidance: '一樓服務台旁',
    basicEquipment: ['尿布台', '洗手台'],
    basicEquipmentRaw: '尿布台;洗手台',
    friendlyEquipmentOrServices: ['熱水'],
    friendlyEquipmentOrServicesRaw: '熱水',
    certificationValidityRaw: '114年12月31日',
    appearsInLegalRequiredList: true,
  },
  {
    id: 'riverside_toilet-0001',
    type: 'riverside_toilet',
    district: '中山區',
    address: '大佳河濱公園 兒童遊戲區',
    longitude: 121.535869,
    latitude: 25.074578,
    note: '景觀廁所',
    source: '臺北市河濱廁所',
    riversidePark: '大佳河濱公園',
    locationDescription: '兒童遊戲區',
    riversideToiletTypeRaw: '景觀',
    riversideToiletType: 'scenic',
    remark: '景觀廁所',
    coordinateStatus: 'valid',
  },
  {
    id: 'family_friendly_toilet-0001',
    type: 'family_friendly_toilet',
    district: '士林區',
    address: '臺北市士林區中山北路五段65號',
    longitude: 121.525078,
    latitude: 25.084873,
    note: '',
    source: '臺北市親子友善廁所點位資訊',
    name: '捷運劍潭站親子廁所',
    toiletName: '捷運劍潭站親子廁所',
    toiletId: 'A147',
    toiletCategory: '交通',
    toiletLocation: '北側親子',
    toiletGrade: '特優級(分)',
    manager: '捷運劍潭站',
    diaperTableCount: 1,
    childSeatCount: 1,
    hasFamilyFriendlyAward: true,
    coordinateStatus: 'valid',
  },
  {
    id: 'motorcycle_inspection_station-0001',
    type: 'motorcycle_inspection_station',
    district: '大安區',
    address: '臺北市大安區和平東路2段141號',
    longitude: 0,
    latitude: 0,
    note: '',
    source: '臺北市機車定檢站位置',
    sourceAgency: '臺北市政府環境保護局',
    locationPrecision: 'address_only',
    stationId: 'A12',
    brand: '山葉',
    stationName: '宏立機車事業有限公司',
    name: '宏立機車事業有限公司',
    postalCode: '106025',
    phone: '(02)27065429',
    responsiblePersonName: '沈鳳雲',
  },
  {
    id: 'electric_motorcycle_charging_station-0001',
    type: 'electric_motorcycle_charging_station',
    district: '士林區',
    address: '臺北市士林區延平北路6段434號',
    longitude: 0,
    latitude: 0,
    note: '',
    source: '臺北市電動機車充電站',
    sourceAgency: '臺北市政府環境保護局',
    locationPrecision: 'address_only',
    stationId: 'R01',
    unitName: '中華汽車社子服務廠',
    name: '中華汽車社子服務廠',
    city: '臺北市',
    districtCode: '63000110',
    locationCategoryRaw: '中華汽車服務廠',
    locationCategory: 'service_factory',
  },
  {
    id: 'commercial_ev_charging_swap_station-0001',
    type: 'commercial_ev_charging_swap_station',
    district: '南港區',
    address: '臺北市南港經貿二路88巷19號',
    longitude: 0,
    latitude: 0,
    note: '',
    source: '臺北市營利型電動車充換電站資訊',
    sourceAgency: '臺北市政府產業發展局',
    locationPrecision: 'address_only',
    sourceSequenceNumber: 3,
    serviceType: 'electric_motorcycle_battery_swap',
    operatorName: 'Gogoro Network',
    stationName: '南港經貿站',
    name: '南港經貿站',
    city: '臺北市',
    cityCode: '63000',
    addressNormalized: '臺北市南港經貿二路88巷19號',
    hasInferredDistrict: true,
  },
  {
    id: 'gas_lpg_station-0001',
    type: 'gas_lpg_station',
    district: '士林區',
    address: '承德路四段200號',
    longitude: 121.52201272952914,
    latitude: 25.087626531764496,
    note: '',
    source: '臺北市加油站及加氣站分布圖',
    sourceAgency: '臺北市政府產業發展局',
    coordinateStatus: 'valid',
    name: '台亞基河加油站',
    companyName: '台亞',
    stationName: '台亞基河加油站',
    supplier: '台塑',
    phone: '(02)28815335',
    businessHoursRaw: '24小時',
    businessHours: '24小時',
    isTwentyFourHours: true,
    hasLimitedHours: false,
    hasOil: true,
    hasLpg: false,
    hasSelfService: true,
    stationServiceTypes: ['gasoline', 'self_service'],
    stationStatus: 'active_or_unspecified',
    xTwd97: 302655,
    yTwd97: 2775585,
  },
  {
    id: 'designated_smoking_area-0001',
    type: 'designated_smoking_area',
    district: '松山區',
    address: '南京東路4段10號',
    longitude: 121.55292,
    latitude: 25.05135,
    note: '本位置資訊僅供參考',
    source: '臺北市指定吸菸區',
    sourceAgency: '臺北市政府衛生局',
    coordinateStatus: 'valid',
    name: '臺北體育館',
    smokingAreaTypeRaw: '戶外開放式吸菸區',
    smokingAreaType: 'outdoor_open',
    openingHours: '24小時開放',
    openingHoursType: 'listed_24_hours',
    isListed24Hours: true,
    hasCustomOpeningHours: false,
    hasPhotoUrl: true,
    manager: '臺北市政府體育局',
    phone: '(02)25702330',
  },
  {
    id: 'announced_no_smoking_place-0001',
    type: 'announced_no_smoking_place',
    district: '松山區',
    address: '延壽街168號',
    longitude: 121.5629231,
    latitude: 25.05662219,
    note: '公告禁菸場所點位僅供來源資料查詢，實際範圍、現場標示與最新公告請以主管機關及現場資訊為準。',
    source: '臺北市公告禁菸場所資料',
    sourceAgency: '臺北市政府衛生局',
    coordinateStatus: 'valid',
    recordType: 'outdoor_no_smoking_place',
    sourceResourceName: '臺北市公告戶外禁菸場所一覽表(僅包含有明確地址者用於製作禁菸地圖)',
    placeName: '健康國小周邊人行道',
    name: '健康國小周邊人行道',
    cityCode: '63000',
    districtCode: '63000010',
    addressNormalized: '延壽街168號',
    roadName: '延壽街',
    hasCoordinates: true,
    hasAddress: true,
    hasLocationDescription: false,
    announcementDate: '2012-04-30',
    announcementYear: 2012,
    announcementMonth: 4,
    announcementMonthKey: '2012-04',
    hasAnnouncementDate: true,
    coordinateSystem: 'wgs84',
  },
  {
    id: 'community_recycling_station-0001',
    type: 'community_recycling_station',
    district: '信義區',
    address: '臺北市信義區松德路89號',
    longitude: 0,
    latitude: 0,
    note: '',
    source: '臺北市社區資源回收站資訊',
    sourceAgency: '臺北市政府環境保護局',
    locationPrecision: 'address_only',
    sourceSequenceNumber: 1,
    stationName: '信惠社區資源回收站',
    name: '信惠社區資源回收站',
    districtCode: '63000020',
    districtCodeNormalized: '63000020',
    addressNormalized: '台北市信義區松德路89號',
    roadName: '松德路',
    hasAddress: true,
    hasParsedRoadName: true,
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

describe('filterFacilities', () => {
  it('filters by facility type, district, road, and location', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '森林',
      district: '大安區',
      facilityTypes: ['dog_waste_bag_box'],
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dog_waste_bag_box_0001');
  });

  it('returns all facilities when filters are empty', () => {
    expect(filterFacilities(facilities, { searchTerm: '', district: '', facilityTypes: [] })).toEqual(
      facilities,
    );
  });

  it('filters public toilets by category and parent-child availability', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '劍潭',
      district: '士林區',
      facilityTypes: ['public_toilet'],
      toiletCategory: '交通',
      requiresParentChildToilet: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('public_toilet_0001');
  });

  it('filters public toilets by accessible availability', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '',
      district: '',
      facilityTypes: ['public_toilet'],
      requiresAccessibleToilet: true,
    });

    expect(result).toHaveLength(0);
  });

  it('limits all-facility results to public toilets when toilet-specific filters are active', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '',
      district: '',
      facilityTypes: [],
      toiletCategory: '交通',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('public_toilet_0001');
  });

  it('ignores stale toilet filters when public toilets are not selected', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '',
      district: '',
      facilityTypes: ['dog_waste_bag_box'],
      toiletCategory: '交通',
      requiresParentChildToilet: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dog_waste_bag_box_0001');
  });

  it('searches drinking fountain place fields', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '1樓大廳',
      district: '士林區',
      facilityTypes: ['drinking_fountain'],
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('drinking_fountain_0001');
  });

  it('filters drinking fountains by opening hours and place category', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '',
      district: '',
      facilityTypes: [],
      drinkingFountainPlaceCategory: 'sports_center',
      requiresOpeningHours: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('drinking_fountain_0001');
  });

  it('filters timed collection points by special notes and excludes unknown capabilities', () => {
    expect(filterFacilities(facilities, {
      searchTerm: '',
      district: '',
      facilityTypes: ['timed_collection_point'],
      hasSpecialHours: true,
    })).toHaveLength(1);

    expect(filterFacilities(facilities, {
      searchTerm: '',
      district: '',
      facilityTypes: ['timed_collection_point'],
      acceptsFoodWaste: true,
    })).toHaveLength(0);
  });

  it('filters direct drinking stations by status, Taipei City, place type, and maintenance URL', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '長興',
      district: '',
      facilityTypes: ['direct_drinking_station'],
      directDrinkingNormalOnly: true,
      taipeiCityOnly: true,
      directDrinkingPlaceCategory: 'government_office',
      requiresMaintenanceUrl: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('direct_drinking_station_0001');
  });

  it('filters and searches used-clothing recycling boxes', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '自閉症',
      district: '大安區',
      facilityTypes: ['used_clothing_recycling_box'],
      usedClothingVillage: '德安',
      usedClothingOrganization: '台北市自閉症家長協會',
      usedClothingHasPhone: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('used_clothing_recycling_box_0001');
  });

  it('filters and searches lactation room service fields', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '服務台旁',
      district: '大安區',
      facilityTypes: ['lactation_room'],
      lactationHasOpeningHours: true,
      lactationHasPhone: true,
      lactationHasLocationGuidance: true,
      lactationHasCertification: true,
      lactationLegalRequired: true,
      lactationBasicEquipment: '尿布台',
      lactationFriendlyService: '熱水',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('lactation_room-0001');
  });

  it('filters riverside toilets by park, type, remark, and search', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '兒童遊戲區',
      district: '中山區',
      facilityTypes: ['riverside_toilet'],
      riversidePark: '大佳河濱公園',
      riversideToiletType: 'scenic',
      riversideHasRemark: true,
    });
    expect(result.map((item) => item.id)).toEqual(['riverside_toilet-0001']);
  });

  it('filters family-friendly toilets by equipment, category, grade, award, and manager', () => {
    const result = filterFacilities(facilities, {
      searchTerm: 'A147',
      district: '士林區',
      facilityTypes: ['family_friendly_toilet'],
      familyToiletCategory: '交通',
      familyToiletGrade: '特優級(分)',
      familyManager: '捷運劍潭站',
      familyHasDiaperTable: true,
      familyHasChildSeat: true,
      familyHasAward: true,
    });
    expect(result.map((item) => item.id)).toEqual(['family_friendly_toilet-0001']);
  });

  it('filters and searches motorcycle inspection stations without requiring coordinates', () => {
    const result = filterFacilities(facilities, {
      searchTerm: 'A12',
      district: '大安區',
      facilityTypes: ['motorcycle_inspection_station'],
      inspectionBrand: '山葉',
      inspectionPostalCode: '106025',
      inspectionHasPhone: true,
    });
    expect(result.map((item) => item.id)).toEqual(['motorcycle_inspection_station-0001']);
  });

  it('filters and searches electric motorcycle charging stations without requiring coordinates', () => {
    const result = filterFacilities(facilities, {
      searchTerm: 'R01',
      district: '士林區',
      facilityTypes: ['electric_motorcycle_charging_station'],
      chargingLocationCategory: 'service_factory',
      chargingCity: '臺北市',
      chargingDistrictCode: '63000110',
      chargingHasAddress: true,
    });
    expect(result.map((item) => item.id)).toEqual(['electric_motorcycle_charging_station-0001']);
  });

  it('filters and searches commercial EV charging and swap stations without requiring coordinates', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '南港經貿',
      district: '南港區',
      facilityTypes: ['commercial_ev_charging_swap_station'],
      commercialEvServiceType: 'electric_motorcycle_battery_swap',
      commercialEvOperator: 'Gogoro Network',
      commercialEvCity: '臺北市',
      commercialEvCityCode: '63000',
      commercialEvHasAddress: true,
      commercialEvHasDistrict: true,
    });
    expect(result.map((item) => item.id)).toEqual(['commercial_ev_charging_swap_station-0001']);
  });

  it('filters and searches gas/LPG stations', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '基河',
      district: '士林區',
      facilityTypes: ['gas_lpg_station'],
      gasLpgSupplier: '台塑',
      gasLpgHasOil: true,
      gasLpgHasSelfService: true,
      gasLpgTwentyFourHours: true,
      gasLpgStationStatus: 'active_or_unspecified',
      gasLpgHasPhone: true,
    });
    expect(result.map((item) => item.id)).toEqual(['gas_lpg_station-0001']);
  });

  it('filters and searches designated smoking areas', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '體育局',
      district: '',
      facilityTypes: ['designated_smoking_area'],
      smokingAreaType: 'outdoor_open',
      smokingOpeningHoursType: 'listed_24_hours',
      smokingListed24Hours: true,
      smokingHasPhoto: true,
      smokingManagingUnit: '臺北市政府體育局',
    });
    expect(result.map((item) => item.id)).toEqual(['designated_smoking_area-0001']);
  });

  it('filters and searches announced no-smoking places', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '健康國小',
      district: '松山區',
      facilityTypes: ['announced_no_smoking_place'],
      noSmokingRecordType: 'outdoor_no_smoking_place',
      noSmokingAnnouncementYear: '2012',
      noSmokingCoordinateStatus: 'valid',
      noSmokingHasAddress: true,
    });
    expect(result.map((item) => item.id)).toEqual(['announced_no_smoking_place-0001']);
  });

  it('filters and searches community recycling stations without coordinates', () => {
    const result = filterFacilities(facilities, {
      searchTerm: '松德',
      district: '信義區',
      facilityTypes: ['community_recycling_station'],
      communityRecyclingDistrictCode: '63000020',
      communityRecyclingRoadName: '松德路',
      communityRecyclingHasAddress: true,
      communityRecyclingHasParsedRoadName: true,
    });
    expect(result.map((item) => item.id)).toEqual(['community_recycling_station-0001']);
  });
});

describe('getFacilityTypeLabel', () => {
  it('returns localized facility type labels', () => {
    expect(getFacilityTypeLabel('pedestrian_bin', 'zh')).toBe('行人專用清潔箱');
    expect(getFacilityTypeLabel('dog_waste_bag_box', 'en')).toBe('Dog Waste Bag Box');
    expect(getFacilityTypeLabel('public_toilet', 'en')).toBe('Public Toilet');
    expect(getFacilityTypeLabel('riverside_toilet', 'en')).toBe('Riverside Toilet');
    expect(getFacilityTypeLabel('family_friendly_toilet', 'zh')).toBe('親子友善廁所');
    expect(getFacilityTypeLabel('drinking_fountain', 'en')).toBe('Public Drinking Fountain');
    expect(getFacilityTypeLabel('timed_collection_point', 'en')).toBe('Timed Collection Point');
    expect(getFacilityTypeLabel('direct_drinking_station', 'zh')).toBe('直飲臺');
    expect(getFacilityTypeLabel('used_clothing_recycling_box', 'en')).toBe('Used Clothing Recycling Box');
    expect(getFacilityTypeLabel('lactation_room', 'en')).toBe('Lactation Room');
    expect(getFacilityTypeLabel('motorcycle_inspection_station', 'en')).toBe('Motorcycle Inspection Station');
    expect(getFacilityTypeLabel('electric_motorcycle_charging_station', 'zh')).toBe('電動機車充電站');
    expect(getFacilityTypeLabel('commercial_ev_charging_swap_station', 'en')).toBe('Commercial EV Charging & Battery Swap Station');
    expect(getFacilityTypeLabel('gas_lpg_station', 'en')).toBe('Gas & LPG Station');
    expect(getFacilityTypeLabel('designated_smoking_area', 'zh')).toBe('指定吸菸區');
    expect(getFacilityTypeLabel('announced_no_smoking_place', 'zh')).toBe('公告禁菸場所');
    expect(getAnnouncedNoSmokingRecordTypeLabel('smoke_free_park_green_space', 'en')).toBe('Smoke-Free Park / Green Space');
    expect(getFacilityTypeLabel('community_recycling_station', 'zh')).toBe('社區資源回收站');
    expect(getCommunityRecyclingStationLabel('short', 'en')).toBe('Community Recycling');
    expect(getElectricMotorcycleChargingLocationCategoryLabel('service_factory', 'en')).toBe('Service factory');
    expect(getCommercialEvServiceTypeLabel('electric_motorcycle_battery_swap', 'zh')).toBe('電動機車換電站');
    expect(getFuelStationStatusLabel('terminated', 'zh')).toBe('來源標示終止營業');
  });
});

describe('normalizeTaipeiDistrict', () => {
  it('normalizes short Taipei district names', () => {
    expect(normalizeTaipeiDistrict('士林')).toBe('士林區');
    expect(normalizeTaipeiDistrict('大安區')).toBe('大安區');
    expect(normalizeTaipeiDistrict('未知')).toBe('未知');
  });
});

describe('classifyDrinkingFountainPlace', () => {
  it('classifies drinking fountain place categories from names and locations', () => {
    expect(classifyDrinkingFountainPlace({ name: '信義運動中心' })).toBe('sports_center');
    expect(classifyDrinkingFountainPlace({ installLocation: '市立圖書館入口' })).toBe('library');
    expect(classifyDrinkingFountainPlace({ address: '大安森林公園' })).toBe('park');
    expect(classifyDrinkingFountainPlace({ manager: '臺北市政府' })).toBe('government_facility');
    expect(classifyDrinkingFountainPlace({ name: '仁愛國小' })).toBe('school');
    expect(classifyDrinkingFountainPlace({ name: '捷運臺北車站' })).toBe('transport');
    expect(classifyDrinkingFountainPlace({ name: '市民活動中心' })).toBe('other');
  });
});

describe('getFacilityGoogleMapsUrl', () => {
  it('builds a Google Maps query URL from facility coordinates', () => {
    expect(getFacilityGoogleMapsUrl(facilities[0])).toBe(
      'https://www.google.com/maps/search/?api=1&query=25.0463,121.5168',
    );
  });

  it('builds an address-based Google Maps URL for coordinate-free facilities', () => {
    expect(getFacilityGoogleMapsUrl(facilities.find((item) => item.type === 'lactation_room')!)).toBe(
      'https://www.google.com/maps/search/?api=1&query=%E8%87%BA%E5%8C%97%E5%B8%82%E5%A4%A7%E5%AE%89%E5%8D%80%E4%BB%81%E6%84%9B%E8%B7%AF%E5%9B%9B%E6%AE%B51%E8%99%9F',
    );
  });
});

describe('isCoordinateOutlier', () => {
  it('flags coordinates outside broad Taipei bounds', () => {
    expect(isCoordinateOutlier(121.284173, 25.080592)).toBe(true);
    expect(isCoordinateOutlier(121.5168, 25.0463)).toBe(false);
  });
});
