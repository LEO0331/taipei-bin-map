import type { Facility, FacilityType, Language } from '../types';

const EARTH_RADIUS_METERS = 6_371_000;

export const TAIPEI_BOUNDS = {
  minLng: 121.45,
  maxLng: 121.7,
  minLat: 24.9,
  maxLat: 25.25,
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function calculateDistanceMeters(
  userLat: number,
  userLng: number,
  facilityLat: number,
  facilityLng: number,
) {
  const deltaLat = toRadians(facilityLat - userLat);
  const deltaLng = toRadians(facilityLng - userLng);
  const lat1 = toRadians(userLat);
  const lat2 = toRadians(facilityLat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatDistance(distanceMeters: number, language: Language) {
  if (distanceMeters < 1000) {
    const meters = Math.round(distanceMeters);
    return language === 'zh' ? `${meters} 公尺` : `${meters} m`;
  }

  const kilometers = (distanceMeters / 1000).toFixed(1);
  return language === 'zh' ? `${kilometers} 公里` : `${kilometers} km`;
}

export function filterFacilities(
  facilities: Facility[],
  {
    searchTerm,
    district,
    facilityTypes,
    toiletCategory,
    requiresAccessibleToilet = false,
    requiresParentChildToilet = false,
  }: {
    searchTerm: string;
    district: string;
    facilityTypes: FacilityType[];
    toiletCategory?: string;
    requiresAccessibleToilet?: boolean;
    requiresParentChildToilet?: boolean;
  },
) {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const selectedTypes = new Set(facilityTypes);
  const includesPublicToilets = selectedTypes.size === 0 || selectedTypes.has('public_toilet');
  const hasToiletFilters = Boolean(toiletCategory) || requiresAccessibleToilet || requiresParentChildToilet;
  const toiletFiltersOnly = includesPublicToilets && hasToiletFilters;

  return facilities.filter((facility) => {
    const matchesDistrict = !district || facility.district === district;
    const matchesType = selectedTypes.size === 0 || selectedTypes.has(facility.type);
    const matchesToiletFilterScope = !toiletFiltersOnly || facility.type === 'public_toilet';
    const matchesToiletCategory =
      facility.type !== 'public_toilet' || !toiletCategory || facility.category === toiletCategory;
    const matchesAccessibleToilet =
      facility.type !== 'public_toilet' ||
      !requiresAccessibleToilet ||
      (facility.accessibleToiletSeats ?? 0) > 0;
    const matchesParentChildToilet =
      facility.type !== 'public_toilet' ||
      !requiresParentChildToilet ||
      (facility.parentChildToiletSeats ?? 0) > 0;
    const matchesSearch =
      !normalizedSearch ||
      [
        facility.district,
        facility.address,
        facility.road,
        facility.location,
        facility.note,
        facility.name,
        facility.category,
        facility.manager,
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));

    return (
      matchesDistrict &&
      matchesType &&
      matchesToiletFilterScope &&
      matchesToiletCategory &&
      matchesAccessibleToilet &&
      matchesParentChildToilet &&
      matchesSearch
    );
  });
}

export function getFacilityTypeLabel(type: FacilityType, language: Language) {
  if (type === 'pedestrian_bin') {
    return language === 'zh' ? '行人專用清潔箱' : 'Pedestrian Garbage Bin';
  }

  if (type === 'dog_waste_bag_box') {
    return language === 'zh' ? '狗便袋箱' : 'Dog Waste Bag Box';
  }

  return language === 'zh' ? '公廁' : 'Public Toilet';
}

export function getToiletCategoryLabel(category: string, language: Language) {
  if (language === 'zh') {
    return category;
  }

  const labels: Record<string, string> = {
    交通: 'Transport',
    公園: 'Park',
    機關: 'Government / Public Agency',
    綜合零售賣場: 'Retail',
    連鎖餐飲店: 'Restaurant',
    加油站: 'Gas Station',
    醫院: 'Hospital',
    市場: 'Market',
    觀光遊憩: 'Tourism / Recreation',
    大專院校: 'School / University',
    宗教: 'Religious Site',
    文化育樂場所: 'Cultural / Recreational Venue',
  };

  return labels[category] ?? category;
}

export function getFacilityGoogleMapsUrl(facility: Facility) {
  return `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`;
}

export function isCoordinateOutlier(longitude: number, latitude: number) {
  return (
    longitude < TAIPEI_BOUNDS.minLng ||
    longitude > TAIPEI_BOUNDS.maxLng ||
    latitude < TAIPEI_BOUNDS.minLat ||
    latitude > TAIPEI_BOUNDS.maxLat
  );
}
