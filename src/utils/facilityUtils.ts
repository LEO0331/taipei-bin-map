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
  }: {
    searchTerm: string;
    district: string;
    facilityTypes: FacilityType[];
  },
) {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const selectedTypes = new Set(facilityTypes);

  return facilities.filter((facility) => {
    const matchesDistrict = !district || facility.district === district;
    const matchesType = selectedTypes.size === 0 || selectedTypes.has(facility.type);
    const matchesSearch =
      !normalizedSearch ||
      [
        facility.district,
        facility.address,
        facility.road,
        facility.location,
        facility.note,
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));

    return matchesDistrict && matchesType && matchesSearch;
  });
}

export function getFacilityTypeLabel(type: FacilityType, language: Language) {
  if (type === 'pedestrian_bin') {
    return language === 'zh' ? '行人專用清潔箱' : 'Pedestrian Garbage Bin';
  }

  return language === 'zh' ? '狗便袋箱' : 'Dog Waste Bag Box';
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
