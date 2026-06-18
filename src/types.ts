export type Language = 'zh' | 'en';

export type FacilityType =
  | 'pedestrian_bin'
  | 'dog_waste_bag_box'
  | 'public_toilet'
  | 'drinking_fountain'
  | 'timed_collection_point'
  | 'direct_drinking_station';

export type DrinkingFountainPlaceCategory =
  | 'sports_center'
  | 'library'
  | 'park'
  | 'government_facility'
  | 'school'
  | 'transport'
  | 'other';

export type DirectDrinkingPlaceCategory =
  | 'park_trail'
  | 'mrt_station'
  | 'school'
  | 'government_office'
  | 'venue'
  | 'shopping_night_market'
  | 'other';

export type Facility = {
  id: string;
  type: FacilityType;
  district: string;
  address: string;
  road?: string;
  location?: string;
  longitude: number;
  latitude: number;
  note: string;
  source: string;
  isCoordinateOutlier?: boolean;
  name?: string;
  manager?: string;
  phone?: string;
  category?: string;
  totalSeats?: number;
  excellentGradeCount?: number;
  superiorGradeCount?: number;
  ordinaryGradeCount?: number;
  improvementGradeCount?: number;
  accessibleToiletSeats?: number;
  parentChildToiletSeats?: number;
  openingHours?: string;
  installLocation?: string;
  drinkingFountainCount?: number;
  placeCategory?: DrinkingFountainPlaceCategory;
  team?: string;
  acceptsGarbage?: boolean | 'unknown';
  acceptsRecycling?: boolean | 'unknown';
  acceptsFoodWaste?: boolean | 'unknown';
  serviceTimeText?: string;
  hasSpecialHours?: boolean;
  stationId?: string;
  branch?: string;
  city?: string;
  placeType?: string;
  directDrinkingPlaceCategory?: DirectDrinkingPlaceCategory;
  directDrinkingStatus?: 'normal' | 'suspended' | 'unknown';
  latestSamplingDate?: string;
  coliformCountRaw?: string;
  maintenanceUrl?: string;
  photoUrl?: string;
  isTaipeiCity?: boolean;
};

export type FacilityWithDistance = Facility & {
  distanceMeters?: number;
};

export type ConversionSourceReport = {
  sourceFilename: string;
  totalRows: number;
  validRows: number;
  droppedRows: number;
  coordinateOutlierRows: number;
  invalidCoordinateRows: Array<{
    rowNumber: number;
    longitude?: string;
    latitude?: string;
  }>;
  missingRequiredFields: Array<{
    rowNumber: number;
    fields: string[];
  }>;
};

export type ConversionReport = {
  generatedAt: string;
  totalValidRows: number;
  sources: ConversionSourceReport[];
};
