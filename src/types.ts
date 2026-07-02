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
  | 'lactation_room'
  | 'motorcycle_inspection_station'
  | 'electric_motorcycle_charging_station'
  | 'commercial_ev_charging_swap_station'
  | 'gas_lpg_station'
  | 'designated_smoking_area'
  | 'announced_no_smoking_place'
  | 'community_recycling_station'
  | 'clean_needle_exchange_service_point';

export type LocationPrecision = 'exact' | 'district_centroid' | 'address_only' | 'missing';
export type CoordinateStatus = 'valid' | 'missing' | 'outlier' | 'unparsed';
export type RiversideToiletType = 'scenic' | 'standard' | 'accessible' | 'fixed' | 'other' | 'unknown';

export type CommercialEvServiceType =
  | 'electric_car_charging'
  | 'electric_motorcycle_charging'
  | 'electric_motorcycle_battery_swap'
  | 'unknown';

export type FuelStationServiceType = 'gasoline' | 'lpg' | 'self_service';
export type FuelStationStatus = 'active_or_unspecified' | 'terminated' | 'unknown';
export type DesignatedSmokingAreaType = 'outdoor_open' | 'outdoor_negative_pressure' | 'indoor_smoking_room' | 'other' | 'unknown';
export type AnnouncedNoSmokingPlaceRecordType = 'outdoor_no_smoking_place' | 'smoke_free_park_green_space' | 'unknown';
export type CleanNeedleServiceItemCategory =
  | 'health_education_consultation_station'
  | 'needle_return_box'
  | 'automatic_service_machine'
  | 'other'
  | 'unknown';
export type CleanNeedleServicePointCategory =
  | 'pharmacy'
  | 'medical_institution'
  | 'park_market_public_toilet'
  | 'other'
  | 'unknown';
export type CoordinateSystem = 'wgs84' | 'twd97' | 'unknown';
export type OpeningHoursType = 'listed_24_hours' | 'fixed_hours' | 'weekday_or_holiday_rule' | 'depends_on_facility_hours' | 'custom_text' | 'missing' | 'unknown';
export type ManagingUnitCategory = 'taipei_city_government' | 'district_office' | 'central_government' | 'transportation_or_mrt' | 'park_or_public_space' | 'private_operator' | 'cultural_or_sports_facility' | 'other' | 'unknown';

export type ElectricMotorcycleChargingLocationCategory =
  | 'inspection_station'
  | 'public_parking_lot'
  | 'motorcycle_shop'
  | 'cleaning_team'
  | 'metro_station'
  | 'village_office'
  | 'service_factory'
  | 'government_parking_lot'
  | 'incineration_plant'
  | 'campus_parking_lot'
  | 'store'
  | 'sports_center'
  | 'other'
  | 'unknown';

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
  sourceAgency?: string;
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
  brand?: string;
  stationName?: string;
  postalCode?: string;
  responsiblePersonName?: string;
  unitName?: string;
  locationCategoryRaw?: string;
  locationCategory?: ElectricMotorcycleChargingLocationCategory;
  sourceResourceName?: string;
  sourceFileName?: string;
  sourceSequenceNumber?: number;
  serviceType?: CommercialEvServiceType;
  operatorName?: string;
  cityCode?: string;
  addressNormalized?: string;
  hasInferredDistrict?: boolean;
  companyName?: string;
  supplier?: string;
  businessHoursRaw?: string;
  businessHours?: string;
  isTwentyFourHours?: boolean;
  hasLimitedHours?: boolean;
  hasOil?: boolean;
  hasLpg?: boolean;
  hasSelfService?: boolean;
  stationServiceTypes?: FuelStationServiceType[];
  stationStatus?: FuelStationStatus;
  xTwd97?: number;
  yTwd97?: number;
  placeName?: string;
  smokingAreaTypeRaw?: string;
  smokingAreaType?: DesignatedSmokingAreaType;
  openingHoursRaw?: string;
  openingHoursDisplay?: string;
  openingHoursType?: OpeningHoursType;
  isListed24Hours?: boolean;
  hasCustomOpeningHours?: boolean;
  relativeLocation?: string;
  hasRelativeLocation?: boolean;
  hasPhotoUrl?: boolean;
  managingUnit?: string;
  managingUnitCategory?: ManagingUnitCategory;
  managingUnitPhone?: string;
  managingUnitPhoneDisplay?: string;
  managingUnitPhoneDialHref?: string;
  hasManagingUnitPhone?: boolean;
  googleMapsQuery?: string;
  roadName?: string;
  sourceRecordHash?: string;
  recordType?: AnnouncedNoSmokingPlaceRecordType;
  resourceName?: string;
  cityName?: string;
  parkName?: string;
  announcementDateRaw?: string;
  announcementDate?: string;
  announcementYear?: number;
  announcementMonth?: number;
  announcementMonthKey?: string;
  hasAnnouncementDate?: boolean;
  hasLocationDescription?: boolean;
  hasAddress?: boolean;
  sourceX?: string;
  sourceY?: string;
  coordinateSystem?: CoordinateSystem;
  hasCoordinates?: boolean;
  stationNameNormalized?: string;
  districtNormalized?: string;
  districtCodeNormalized?: string;
  hasParsedRoadName?: boolean;
  areaCode?: string;
  areaCodeNormalized?: string;
  districtFromAreaCode?: string;
  districtFromAddress?: string;
  districtMismatch?: boolean;
  serviceItem?: string;
  serviceItemRaw?: string;
  serviceItemCategory?: CleanNeedleServiceItemCategory;
  servicePointCategory?: string;
  servicePointCategoryRaw?: string;
  servicePointCategoryGroup?: CleanNeedleServicePointCategory;
  institutionCode?: string;
  serviceLocationName?: string;
  serviceLocationNameNormalized?: string;
  phoneDisplay?: string;
  phoneDialHref?: string;
  phoneType?: 'taipei_landline' | 'other_landline' | 'mobile' | 'extension' | 'multiple' | 'missing' | 'unknown';
  extensionDisplay?: string;
  hasPhone?: boolean;
  hasExtension?: boolean;
  serviceHoursRaw?: string;
  serviceHours?: string;
  serviceHoursNormalized?: string;
  serviceTimeRanges?: Array<{ start?: string; end?: string; raw: string; crossesMidnight?: boolean }>;
  isTwentyFourHourService?: boolean;
  hasServiceHours?: boolean;
};

export type MotorcycleInspectionStationLocation = {
  stationId: string;
  stationName?: string;
  address?: string;
  latitude: number;
  longitude: number;
  sourceNote: string;
  verifiedAt?: string;
};

export type MotorcycleInspectionStationSummary = {
  totalRecords: number;
  uniqueStationIdCount: number;
  districtCount: number;
  brandCount: number;
  recordsWithPhone: number;
  recordsWithAddress: number;
  recordsWithPostalCode: number;
  byDistrict: Array<{ district: string; count: number; topBrands: Array<{ brand: string; count: number }> }>;
  byBrand: Array<{ brand: string; count: number }>;
  byPostalCode: Array<{ postalCode: string; count: number }>;
};

export type ElectricMotorcycleChargingStationLocation = {
  stationId?: string;
  unitName?: string;
  address?: string;
  latitude: number;
  longitude: number;
  sourceNote: string;
  verifiedAt?: string;
};

export type ElectricMotorcycleChargingStationSummary = {
  totalRecords: number;
  uniqueStationIdCount: number;
  districtCount: number;
  locationCategoryCount: number;
  recordsWithAddress: number;
  recordsWithDistrictCode: number;
  duplicateStationIdCount: number;
  byDistrict: Array<{
    district: string;
    count: number;
    topLocationCategories: Array<{
      locationCategory: ElectricMotorcycleChargingLocationCategory;
      locationCategoryRaw?: string;
      count: number;
    }>;
  }>;
  byLocationCategory: Array<{
    locationCategory: ElectricMotorcycleChargingLocationCategory;
    locationCategoryRaw?: string;
    count: number;
  }>;
  byDistrictCode: Array<{ districtCode: string; district?: string; count: number }>;
};

export type CommercialEvChargingSwapStationLocation = {
  serviceType: CommercialEvServiceType;
  operatorName?: string;
  stationName?: string;
  address?: string;
  latitude: number;
  longitude: number;
  sourceNote: string;
  verifiedAt?: string;
};

export type CommercialEvChargingSwapStationSummary = {
  totalRecords: number;
  electricCarChargingCount: number;
  electricMotorcycleChargingCount: number;
  electricMotorcycleBatterySwapCount: number;
  uniqueOperatorCount: number;
  districtCount: number;
  recordsWithAddress: number;
  recordsWithDistrict: number;
  recordsWithInferredDistrict: number;
  recordsMissingDistrict: number;
  byServiceType: Array<{ serviceType: CommercialEvServiceType; count: number }>;
  byOperator: Array<{ operatorName: string; count: number; serviceTypes: CommercialEvServiceType[] }>;
  byDistrict: Array<{
    district: string;
    totalCount: number;
    electricCarChargingCount: number;
    electricMotorcycleChargingCount: number;
    electricMotorcycleBatterySwapCount: number;
    topOperators: Array<{ operatorName: string; count: number }>;
  }>;
  byCity: Array<{ city: string; count: number }>;
};

export type GasLpgStationSummary = {
  totalRecords: number;
  districtCount: number;
  supplierCount: number;
  validCoordinateCount: number;
  missingCoordinateCount: number;
  outlierCoordinateCount: number;
  oilStationCount: number;
  lpgStationCount: number;
  selfServiceStationCount: number;
  terminatedStationCount: number;
  twentyFourHourRecordCount: number;
  limitedHourRecordCount: number;
  recordsWithPhone: number;
  recordsWithBusinessHours: number;
  byDistrict: Array<{
    district: string;
    totalCount: number;
    oilStationCount: number;
    lpgStationCount: number;
    selfServiceStationCount: number;
    twentyFourHourRecordCount: number;
    topSuppliers: Array<{ supplier: string; count: number }>;
  }>;
  bySupplier: Array<{
    supplier: string;
    count: number;
    oilStationCount: number;
    lpgStationCount: number;
    selfServiceStationCount: number;
  }>;
  byServiceType: Array<{ serviceType: FuelStationServiceType; count: number }>;
  byBusinessHours: Array<{ businessHoursRaw: string; count: number }>;
};

export type DesignatedSmokingAreaSummary = {
  totalRecords: number;
  validCoordinateCount: number;
  missingCoordinateCount: number;
  outlierCoordinateCount: number;
  districtCount: number;
  uniquePlaceNameCount: number;
  uniqueAddressCount: number;
  recordsWithPhotoUrl: number;
  recordsWithRelativeLocation: number;
  recordsWithManagingUnitPhone: number;
  listed24HoursCount: number;
  customOpeningHoursCount: number;
  byDistrict: Array<{ district: string; count: number }>;
  bySmokingAreaType: Array<{ smokingAreaType: DesignatedSmokingAreaType; smokingAreaTypeRaw?: string; count: number }>;
  byOpeningHoursType: Array<{ openingHoursType: OpeningHoursType; count: number }>;
  byManagingUnitCategory: Array<{ managingUnitCategory: ManagingUnitCategory; count: number }>;
  byManagingUnit: Array<{ managingUnit: string; count: number }>;
};

export type AnnouncedNoSmokingPlaceSummary = {
  totalRecords: number;
  outdoorNoSmokingPlaceCount: number;
  smokeFreeParkGreenSpaceCount: number;
  withCoordinatesCount: number;
  validCoordinateCount: number;
  missingCoordinateCount: number;
  outlierCoordinateCount: number;
  withAnnouncementDateCount: number;
  districtCount: number;
  byDistrict: Array<{ district: string; count: number }>;
  byRecordType: Array<{ recordType: AnnouncedNoSmokingPlaceRecordType; count: number }>;
  byAnnouncementYear: Array<{ year: number; count: number }>;
  bySourceResource: Array<{ sourceResourceName: string; count: number }>;
};

export type CommunityRecyclingStationSummary = {
  totalRecords: number;
  districtCount: number;
  uniqueStationNameCount: number;
  uniqueAddressCount: number;
  recordsWithAddress: number;
  recordsWithParsedRoadName: number;
  byDistrict: Array<{ district: string; stationCount: number; uniqueAddressCount: number }>;
  byRoadName: Array<{ roadName: string; count: number }>;
  duplicateStationNames: Array<{ stationName: string; count: number }>;
  duplicateAddresses: Array<{ address: string; count: number }>;
};

export type CleanNeedleExchangeServicePointSummary = {
  totalRecords: number;
  uniqueAreaCodeCount: number;
  taipeiDistrictCount: number;
  uniqueInstitutionCodeCount: number;
  uniqueServiceLocationNameCount: number;
  uniqueAddressCount: number;
  uniquePhoneCount: number;
  recordsWithAddress: number;
  recordsWithPhone: number;
  recordsWithExtension: number;
  recordsWithServiceHours: number;
  twentyFourHourServiceCount: number;
  byServiceItem: Array<{ serviceItem: string; serviceItemCategory: CleanNeedleServiceItemCategory; count: number; twentyFourHourServiceCount: number }>;
  byServicePointCategory: Array<{ servicePointCategory: string; servicePointCategoryGroup: CleanNeedleServicePointCategory; count: number; twentyFourHourServiceCount: number }>;
  byDistrict: Array<{
    district: string;
    servicePointCount: number;
    healthEducationConsultationStationCount: number;
    needleReturnBoxCount: number;
    automaticServiceMachineCount: number;
    twentyFourHourServiceCount: number;
    uniqueAddressCount: number;
  }>;
  byRoadName: Array<{ roadName: string; count: number }>;
  duplicateInstitutionCodes: Array<{ institutionCode: string; count: number }>;
  duplicateServiceLocationNames: Array<{ serviceLocationName: string; count: number }>;
  duplicateAddresses: Array<{ address: string; count: number }>;
  duplicatePhones: Array<{ phone: string; count: number }>;
  dataQuality: {
    invalidAreaCodeCount: number;
    districtMismatchCount: number;
    missingServiceLocationNameCount: number;
    missingAddressCount: number;
    unparsedAddressDistrictCount: number;
    missingServiceHoursCount: number;
  };
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
    reason?: string;
  }>;
  missingRequiredFields: Array<{
    rowNumber: number;
    fields: string[];
  }>;
  unmatchedSecondaryRows?: Array<{ rowNumber: number; name?: string; address?: string }>;
  failedCertificationDates?: Array<{ rowNumber: number; value: string }>;
  matchedPublicToiletCount?: number;
  duplicateStationIds?: Array<{ stationId: string; count: number }>;
  districtCodeConflicts?: Array<{ rowNumber: number; district?: string; districtCode?: string; districtFromCode?: string }>;
  addressParseWarnings?: Array<{ rowNumber: number; address?: string; warning: string }>;
  unknownServiceTypeFiles?: string[];
  unexpectedBooleanValues?: Array<{ rowNumber: number; field: string; value: string }>;
  duplicateStationNames?: Array<{ stationName: string; count: number }>;
  duplicateAddresses?: Array<{ address: string; count: number }>;
  duplicateInstitutionCodes?: Array<{ institutionCode: string; count: number }>;
  duplicateServiceLocationNames?: Array<{ serviceLocationName: string; count: number }>;
  duplicatePhones?: Array<{ phone: string; count: number }>;
};

export type ConversionReport = {
  generatedAt: string;
  totalValidRows: number;
  sources: ConversionSourceReport[];
};
