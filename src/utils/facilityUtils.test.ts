import { describe, expect, it } from 'vitest';
import type { Facility } from '../types';
import {
  calculateDistanceMeters,
  filterFacilities,
  formatDistance,
  getFacilityGoogleMapsUrl,
  getFacilityTypeLabel,
  isCoordinateOutlier,
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
});

describe('getFacilityTypeLabel', () => {
  it('returns localized facility type labels', () => {
    expect(getFacilityTypeLabel('pedestrian_bin', 'zh')).toBe('行人專用清潔箱');
    expect(getFacilityTypeLabel('dog_waste_bag_box', 'en')).toBe('Dog Waste Bag Box');
    expect(getFacilityTypeLabel('public_toilet', 'en')).toBe('Public Toilet');
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
