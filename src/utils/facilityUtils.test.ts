import { describe, expect, it } from 'vitest';
import type { Facility } from '../types';
import {
  calculateDistanceMeters,
  classifyDrinkingFountainPlace,
  filterFacilities,
  formatDistance,
  getFacilityGoogleMapsUrl,
  getFacilityTypeLabel,
  isCoordinateOutlier,
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
});

describe('getFacilityTypeLabel', () => {
  it('returns localized facility type labels', () => {
    expect(getFacilityTypeLabel('pedestrian_bin', 'zh')).toBe('行人專用清潔箱');
    expect(getFacilityTypeLabel('dog_waste_bag_box', 'en')).toBe('Dog Waste Bag Box');
    expect(getFacilityTypeLabel('public_toilet', 'en')).toBe('Public Toilet');
    expect(getFacilityTypeLabel('drinking_fountain', 'en')).toBe('Public Drinking Fountain');
    expect(getFacilityTypeLabel('timed_collection_point', 'en')).toBe('Timed Collection Point');
    expect(getFacilityTypeLabel('direct_drinking_station', 'zh')).toBe('直飲臺');
    expect(getFacilityTypeLabel('used_clothing_recycling_box', 'en')).toBe('Used Clothing Recycling Box');
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
});

describe('isCoordinateOutlier', () => {
  it('flags coordinates outside broad Taipei bounds', () => {
    expect(isCoordinateOutlier(121.284173, 25.080592)).toBe(true);
    expect(isCoordinateOutlier(121.5168, 25.0463)).toBe(false);
  });
});
