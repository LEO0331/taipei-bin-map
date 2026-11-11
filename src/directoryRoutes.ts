export const directoryRoutes = [
  'bulky-waste-collection-booking', 'unused-medicine-collection-stations',
  'industrial-waste-reuse-operators', 'public-school-sports-venues',
  'cooling-comfort-spots', 'swimming-pools', 'certified-bathhouses',
  'recycling-analytics', 'bin-policy', 'shade-equity',
] as const;

export type DirectoryRoute = typeof directoryRoutes[number] | '';

export function getDirectoryRoute(): DirectoryRoute {
  const route = window.location.hash.replace(/^#\//, '');
  return directoryRoutes.find((known) => known === route) ?? '';
}
