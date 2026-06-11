import type { Bin, Language } from '../types';

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function calculateDistanceMeters(
  userLat: number,
  userLng: number,
  binLat: number,
  binLng: number,
) {
  const deltaLat = toRadians(binLat - userLat);
  const deltaLng = toRadians(binLng - userLng);
  const lat1 = toRadians(userLat);
  const lat2 = toRadians(binLat);

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

export function filterBins(bins: Bin[], searchTerm: string, district: string) {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

  return bins.filter((bin) => {
    const matchesDistrict = !district || bin.district === district;
    const matchesSearch =
      !normalizedSearch ||
      bin.address.toLocaleLowerCase().includes(normalizedSearch) ||
      bin.district.toLocaleLowerCase().includes(normalizedSearch) ||
      bin.note.toLocaleLowerCase().includes(normalizedSearch);

    return matchesDistrict && matchesSearch;
  });
}
