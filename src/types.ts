export type Language = 'zh' | 'en';

export type FacilityType =
  | 'pedestrian_bin'
  | 'dog_waste_bag_box'
  | 'public_toilet'
  | 'riverside_toilet'
  | 'family_friendly_toilet'
  | 'drinking_fountain'
  | 'timed_collection_point'
  | 'direct_drinking_station'
  | 'used_clothing_recycling_box'
  | 'lactation_room';

export type LocationPrecision = 'exact' | 'district_centroid' | 'address_only' | 'missing';
export type CoordinateStatus = 'valid' | 'missing' | 'outlier' | 'unparsed';
export type RiversideToiletType = 'scenic' | 'standard' | 'accessible' | 'fixed' | 'other' | 'unknown';

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
  primarySourceName?: string;
  secondarySourceName?: string;
  isCoordinateOutlier?: boolean;
  coordinateStatus?: CoordinateStatus;
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
  approvalId?: string;
  village?: string;
  approvedLocation?: string;
  organizationName?: string;
  districtCode?: string;
  locationPrecision?: LocationPrecision;
  facilityName?: string;
  extension?: string;
  mobile?: string;
  locationGuidance?: string;
  basicEquipment?: string[];
  basicEquipmentRaw?: string;
  friendlyEquipmentOrServices?: string[];
  friendlyEquipmentOrServicesRaw?: string;
  certificationValidityRaw?: string;
  certificationValidUntil?: string;
  wheelchairAccessibilityRaw?: string;
  notes?: string;
  appearsInLegalRequiredList?: boolean;
  sourceId?: string;
  riversidePark?: string;
  locationDescription?: string;
  riversideToiletTypeRaw?: string;
  riversideToiletType?: RiversideToiletType;
  remark?: string;
  longitudeTwd97?: number;
  latitudeTwd97?: number;
  toiletId?: string;
  toiletCategory?: string;
  toiletName?: string;
  toiletLocation?: string;
  toiletGrade?: string;
  diaperTableCount?: number;
  childSeatCount?: number;
  familyFriendlyAwardRaw?: string;
  hasFamilyFriendlyAward?: boolean;
  matchedPublicToiletId?: string;
};

export type RiversideToiletSummary = {
  totalRecords: number;
  validCoordinateCount: number;
  districtCount: number;
  riversideParkCount: number;
  byDistrict: Array<{ district: string; count: number }>;
  byRiversidePark: Array<{ riversidePark: string; count: number }>;
  byType: Array<{ riversideToiletType: RiversideToiletType; riversideToiletTypeRaw?: string; count: number }>;
};

export type FamilyFriendlyToiletSummary = {
  totalRecords: number;
  validCoordinateCount: number;
  districtCount: number;
  totalDiaperTableCount: number;
  totalChildSeatCount: number;
  recordsWithDiaperTables: number;
  recordsWithChildSeats: number;
  awardRecordCount: number;
  byDistrict: Array<{ district: string; count: number; diaperTableCount: number; childSeatCount: number; awardRecordCount: number }>;
  byCategory: Array<{ toiletCategory: string; count: number }>;
  byGrade: Array<{ toiletGrade: string; count: number }>;
  byManager: Array<{ manager: string; count: number }>;
};

export type ToiletSummary = {
  publicToiletCount: number;
  riversideToiletCount: number;
  familyFriendlyToiletCount: number;
  totalDiaperTableCount: number;
  totalChildSeatCount: number;
  byDistrict: Array<{
    district: string;
    publicToiletCount: number;
    riversideToiletCount: number;
    familyFriendlyToiletCount: number;
    diaperTableCount: number;
    childSeatCount: number;
  }>;
};

export type LactationRoomLocation = {
  normalizedName: string;
  normalizedAddress: string;
  latitude: number;
  longitude: number;
  sourceNote: string;
  verifiedAt?: string;
};

export type LactationRoomSummary = {
  totalRecords: number;
  uniqueFacilityCount: number;
  districtCount: number;
  recordsWithOpeningHours: number;
  recordsWithPhone: number;
  recordsWithMobile: number;
  recordsWithLocationGuidance: number;
  recordsWithCertificationValidity: number;
  recordsWithNotes: number;
  recordsAppearingInLegalRequiredList: number;
  byDistrict: Array<{
    district: string;
    count: number;
    withOpeningHours: number;
    withCertificationValidity: number;
    withLocationGuidance: number;
  }>;
  byBasicEquipment: Array<{ equipment: string; count: number }>;
  byFriendlyEquipmentOrService: Array<{ service: string; count: number }>;
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
  unmatchedSecondaryRows?: Array<{ rowNumber: number; name?: string; address?: string }>;
  failedCertificationDates?: Array<{ rowNumber: number; value: string }>;
  matchedPublicToiletCount?: number;
};

export type ConversionReport = {
  generatedAt: string;
  totalValidRows: number;
  sources: ConversionSourceReport[];
};
