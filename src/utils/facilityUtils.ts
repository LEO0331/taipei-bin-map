import type {
  AnnouncedNoSmokingPlaceRecordType,
  DirectDrinkingPlaceCategory,
  DrinkingFountainPlaceCategory,
  DesignatedSmokingAreaType,
  CommercialEvServiceType,
  CleanNeedleServiceItemCategory,
  CleanNeedleServicePointCategory,
  ElectricMotorcycleChargingLocationCategory,
  Facility,
  FacilityType,
  FuelStationServiceType,
  FuelStationStatus,
  GreenSpaceAdopterCategory,
  GreenSpaceAdoptionTargetCategory,
  Language,
  ManagingUnitCategory,
  OpeningHoursType,
  PayTaipeiParkingGeocodingStatus,
  PayTaipeiParkingLocationPrecision,
  PayTaipeiParkingPostalCodeType,
  PayTaipeiParkingSupportStatus,
  ProtectedTreeCoordinateQuality,
  ProtectedTreeLocationTypeCategory,
  RiversideToiletType,
  TreeCircumferenceCategory,
  TreeDiameterCategory,
} from '../types';

const EARTH_RADIUS_METERS = 6_371_000;

export const TAIPEI_BOUNDS = {
  minLng: 121.43,
  maxLng: 121.7,
  minLat: 24.9,
  maxLat: 25.25,
};

const taipeiDistrictByShortName: Record<string, string> = {
  中正: '中正區',
  大同: '大同區',
  中山: '中山區',
  松山: '松山區',
  大安: '大安區',
  萬華: '萬華區',
  信義: '信義區',
  士林: '士林區',
  北投: '北投區',
  內湖: '內湖區',
  南港: '南港區',
  文山: '文山區',
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
    drinkingFountainPlaceCategory,
    requiresOpeningHours = false,
    acceptsGarbage = false,
    acceptsRecycling = false,
    acceptsFoodWaste = false,
    hasSpecialHours = false,
    directDrinkingNormalOnly = true,
    includeSuspended = false,
    taipeiCityOnly = true,
    directDrinkingPlaceCategory,
    requiresMaintenanceUrl = false,
    requiresPhotoUrl = false,
    usedClothingVillage,
    usedClothingOrganization,
    usedClothingHasPhone = false,
    lactationHasOpeningHours = false,
    lactationHasPhone = false,
    lactationHasMobile = false,
    lactationHasLocationGuidance = false,
    lactationHasCertification = false,
    lactationHasNotes = false,
    lactationLegalRequired = false,
    lactationBasicEquipment,
    lactationFriendlyService,
    riversidePark,
    riversideToiletType,
    riversideHasRemark = false,
    familyToiletCategory,
    familyToiletGrade,
    familyHasDiaperTable = false,
    familyHasChildSeat = false,
    familyHasAward = false,
    familyManager,
    inspectionBrand,
    inspectionPostalCode,
    inspectionHasPhone = false,
    chargingLocationCategory,
    chargingCity,
    chargingDistrictCode,
    chargingHasAddress = false,
    commercialEvServiceType,
    commercialEvOperator,
    commercialEvCity,
    commercialEvCityCode,
    commercialEvHasAddress = false,
    commercialEvHasDistrict = false,
    gasLpgSupplier,
    gasLpgHasOil = false,
    gasLpgHasLpg = false,
    gasLpgHasSelfService = false,
    gasLpgTwentyFourHours = false,
    gasLpgLimitedHours = false,
    gasLpgStationStatus,
    gasLpgHasPhone = false,
    smokingAreaType,
    smokingOpeningHoursType,
    smokingListed24Hours = false,
    smokingHasPhoto = false,
    smokingHasRelativeLocation = false,
    smokingManagingUnitCategory,
    smokingManagingUnit,
    noSmokingRecordType,
    noSmokingAnnouncementYear,
    noSmokingCoordinateStatus,
    noSmokingSourceResource,
    noSmokingHasCoordinates = false,
    noSmokingHasAddress = false,
    noSmokingHasLocationDescription = false,
    communityRecyclingDistrictCode,
    communityRecyclingRoadName,
    communityRecyclingHasAddress = false,
    communityRecyclingHasParsedRoadName = false,
    cleanNeedleAreaCode,
    cleanNeedleServiceItem,
    cleanNeedleServicePointCategory,
    cleanNeedleServiceItemCategory,
    cleanNeedleServicePointCategoryGroup,
    cleanNeedleRoadName,
    cleanNeedleHasPhone = false,
    cleanNeedleHasExtension = false,
    cleanNeedleTwentyFourHour = false,
    protectedTreeSpecies,
    protectedTreeScientificName,
    protectedTreeEnglishName,
    protectedTreeLocationType,
    protectedTreeManagementUnit,
    protectedTreeDiameterCategory,
    protectedTreeCircumferenceCategory,
    protectedTreeCoordinateQuality,
    protectedTreeHasLocationType = false,
    protectedTreeHasSizeFlags = false,
    payTaipeiParkingSupportStatus,
    payTaipeiParkingOperator,
    payTaipeiParkingOperatorId,
    payTaipeiParkingPostalCode,
    payTaipeiParkingPostalCodeType,
    payTaipeiParkingRoadName,
    payTaipeiParkingHasPhone = false,
    payTaipeiParkingHasNote = false,
    payTaipeiParkingServiceStopped = false,
    payTaipeiParkingBasement = false,
    payTaipeiParkingOperatorAddress = false,
    payTaipeiParkingLocationPrecision,
    payTaipeiParkingGeocodingStatus,
    greenSpaceManagementUnit,
    greenSpaceDistrictCode,
    greenSpaceTargetAttribute,
    greenSpaceTargetCategory,
    greenSpaceAdopterName,
    greenSpaceAdopterCategory,
    greenSpaceRoadName,
    greenSpaceHasRangeOrBoundary = false,
    greenSpaceHasIntersection = false,
    accessibleParkingCar = false,
    accessibleParkingMotorcycle = false,
    accessibleParkingElevator = false,
    accessibleParkingToilet = false,
    accessibleParkingHandrail = false,
    accessibleParkingValidCoordinates = false,
  }: {
    searchTerm: string;
    district: string;
    facilityTypes: FacilityType[];
    toiletCategory?: string;
    requiresAccessibleToilet?: boolean;
    requiresParentChildToilet?: boolean;
    drinkingFountainPlaceCategory?: DrinkingFountainPlaceCategory | '';
    requiresOpeningHours?: boolean;
    acceptsGarbage?: boolean;
    acceptsRecycling?: boolean;
    acceptsFoodWaste?: boolean;
    hasSpecialHours?: boolean;
    directDrinkingNormalOnly?: boolean;
    includeSuspended?: boolean;
    taipeiCityOnly?: boolean;
    directDrinkingPlaceCategory?: DirectDrinkingPlaceCategory | '';
    requiresMaintenanceUrl?: boolean;
    requiresPhotoUrl?: boolean;
    usedClothingVillage?: string;
    usedClothingOrganization?: string;
    usedClothingHasPhone?: boolean;
    lactationHasOpeningHours?: boolean;
    lactationHasPhone?: boolean;
    lactationHasMobile?: boolean;
    lactationHasLocationGuidance?: boolean;
    lactationHasCertification?: boolean;
    lactationHasNotes?: boolean;
    lactationLegalRequired?: boolean;
    lactationBasicEquipment?: string;
    lactationFriendlyService?: string;
    riversidePark?: string;
    riversideToiletType?: RiversideToiletType | '';
    riversideHasRemark?: boolean;
    familyToiletCategory?: string;
    familyToiletGrade?: string;
    familyHasDiaperTable?: boolean;
    familyHasChildSeat?: boolean;
    familyHasAward?: boolean;
    familyManager?: string;
    inspectionBrand?: string;
    inspectionPostalCode?: string;
    inspectionHasPhone?: boolean;
    chargingLocationCategory?: ElectricMotorcycleChargingLocationCategory | '';
    chargingCity?: string;
    chargingDistrictCode?: string;
    chargingHasAddress?: boolean;
    commercialEvServiceType?: CommercialEvServiceType | '';
    commercialEvOperator?: string;
    commercialEvCity?: string;
    commercialEvCityCode?: string;
    commercialEvHasAddress?: boolean;
    commercialEvHasDistrict?: boolean;
    gasLpgSupplier?: string;
    gasLpgHasOil?: boolean;
    gasLpgHasLpg?: boolean;
    gasLpgHasSelfService?: boolean;
    gasLpgTwentyFourHours?: boolean;
    gasLpgLimitedHours?: boolean;
    gasLpgStationStatus?: FuelStationStatus | '';
    gasLpgHasPhone?: boolean;
    smokingAreaType?: DesignatedSmokingAreaType | '';
    smokingOpeningHoursType?: OpeningHoursType | '';
    smokingListed24Hours?: boolean;
    smokingHasPhoto?: boolean;
    smokingHasRelativeLocation?: boolean;
    smokingManagingUnitCategory?: ManagingUnitCategory | '';
    smokingManagingUnit?: string;
    noSmokingRecordType?: AnnouncedNoSmokingPlaceRecordType | '';
    noSmokingAnnouncementYear?: string;
    noSmokingCoordinateStatus?: string;
    noSmokingSourceResource?: string;
    noSmokingHasCoordinates?: boolean;
    noSmokingHasAddress?: boolean;
    noSmokingHasLocationDescription?: boolean;
    communityRecyclingDistrictCode?: string;
    communityRecyclingRoadName?: string;
    communityRecyclingHasAddress?: boolean;
    communityRecyclingHasParsedRoadName?: boolean;
    cleanNeedleAreaCode?: string;
    cleanNeedleServiceItem?: string;
    cleanNeedleServicePointCategory?: string;
    cleanNeedleServiceItemCategory?: CleanNeedleServiceItemCategory | '';
    cleanNeedleServicePointCategoryGroup?: CleanNeedleServicePointCategory | '';
    cleanNeedleRoadName?: string;
    cleanNeedleHasPhone?: boolean;
    cleanNeedleHasExtension?: boolean;
    cleanNeedleTwentyFourHour?: boolean;
    protectedTreeSpecies?: string;
    protectedTreeScientificName?: string;
    protectedTreeEnglishName?: string;
    protectedTreeLocationType?: ProtectedTreeLocationTypeCategory | '';
    protectedTreeManagementUnit?: string;
    protectedTreeDiameterCategory?: TreeDiameterCategory | '';
    protectedTreeCircumferenceCategory?: TreeCircumferenceCategory | '';
    protectedTreeCoordinateQuality?: ProtectedTreeCoordinateQuality | '';
    protectedTreeHasLocationType?: boolean;
    protectedTreeHasSizeFlags?: boolean;
    payTaipeiParkingSupportStatus?: PayTaipeiParkingSupportStatus | '';
    payTaipeiParkingOperator?: string;
    payTaipeiParkingOperatorId?: string;
    payTaipeiParkingPostalCode?: string;
    payTaipeiParkingPostalCodeType?: PayTaipeiParkingPostalCodeType | '';
    payTaipeiParkingRoadName?: string;
    payTaipeiParkingHasPhone?: boolean;
    payTaipeiParkingHasNote?: boolean;
    payTaipeiParkingServiceStopped?: boolean;
    payTaipeiParkingBasement?: boolean;
    payTaipeiParkingOperatorAddress?: boolean;
    payTaipeiParkingLocationPrecision?: PayTaipeiParkingLocationPrecision | '';
    payTaipeiParkingGeocodingStatus?: PayTaipeiParkingGeocodingStatus | '';
    greenSpaceManagementUnit?: string;
    greenSpaceDistrictCode?: string;
    greenSpaceTargetAttribute?: string;
    greenSpaceTargetCategory?: GreenSpaceAdoptionTargetCategory | '';
    greenSpaceAdopterName?: string;
    greenSpaceAdopterCategory?: GreenSpaceAdopterCategory | '';
    greenSpaceRoadName?: string;
    greenSpaceHasRangeOrBoundary?: boolean;
    greenSpaceHasIntersection?: boolean;
    accessibleParkingCar?: boolean;
    accessibleParkingMotorcycle?: boolean;
    accessibleParkingElevator?: boolean;
    accessibleParkingToilet?: boolean;
    accessibleParkingHandrail?: boolean;
    accessibleParkingValidCoordinates?: boolean;
  },
) {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const selectedTypes = new Set(facilityTypes);
  const includesPublicToilets = selectedTypes.size === 0 || selectedTypes.has('public_toilet');
  const hasToiletFilters = Boolean(toiletCategory) || requiresAccessibleToilet || requiresParentChildToilet;
  const toiletFiltersOnly = includesPublicToilets && hasToiletFilters;
  const includesDrinkingFountains = selectedTypes.size === 0 || selectedTypes.has('drinking_fountain');
  const hasDrinkingFountainFilters = Boolean(drinkingFountainPlaceCategory) || requiresOpeningHours;
  const drinkingFountainFiltersOnly = includesDrinkingFountains && hasDrinkingFountainFilters;
  const hasRiversideFilters = Boolean(riversidePark || riversideToiletType || riversideHasRemark);
  const hasFamilyToiletFilters = Boolean(
    familyToiletCategory || familyToiletGrade || familyHasDiaperTable || familyHasChildSeat || familyHasAward || familyManager,
  );
  const hasInspectionFilters = Boolean(inspectionBrand || inspectionPostalCode || inspectionHasPhone);
  const hasChargingFilters = Boolean(chargingLocationCategory || chargingCity || chargingDistrictCode || chargingHasAddress);
  const hasCommercialEvFilters = Boolean(commercialEvServiceType || commercialEvOperator || commercialEvCity || commercialEvCityCode || commercialEvHasAddress || commercialEvHasDistrict);
  const hasGasLpgFilters = Boolean(gasLpgSupplier || gasLpgHasOil || gasLpgHasLpg || gasLpgHasSelfService || gasLpgTwentyFourHours || gasLpgLimitedHours || gasLpgStationStatus || gasLpgHasPhone);
  const hasSmokingFilters = Boolean(smokingAreaType || smokingOpeningHoursType || smokingListed24Hours || smokingHasPhoto || smokingHasRelativeLocation || smokingManagingUnitCategory || smokingManagingUnit);
  const hasNoSmokingFilters = Boolean(noSmokingRecordType || noSmokingAnnouncementYear || noSmokingCoordinateStatus || noSmokingSourceResource || noSmokingHasCoordinates || noSmokingHasAddress || noSmokingHasLocationDescription);
  const hasCommunityRecyclingFilters = Boolean(communityRecyclingDistrictCode || communityRecyclingRoadName || communityRecyclingHasAddress || communityRecyclingHasParsedRoadName);
  const hasCleanNeedleFilters = Boolean(cleanNeedleAreaCode || cleanNeedleServiceItem || cleanNeedleServicePointCategory || cleanNeedleServiceItemCategory || cleanNeedleServicePointCategoryGroup || cleanNeedleRoadName || cleanNeedleHasPhone || cleanNeedleHasExtension || cleanNeedleTwentyFourHour);
  const hasProtectedTreeFilters = Boolean(protectedTreeSpecies || protectedTreeScientificName || protectedTreeEnglishName || protectedTreeLocationType || protectedTreeManagementUnit || protectedTreeDiameterCategory || protectedTreeCircumferenceCategory || protectedTreeCoordinateQuality || protectedTreeHasLocationType || protectedTreeHasSizeFlags);
  const hasPayTaipeiParkingFilters = Boolean(payTaipeiParkingSupportStatus || payTaipeiParkingOperator || payTaipeiParkingOperatorId || payTaipeiParkingPostalCode || payTaipeiParkingPostalCodeType || payTaipeiParkingRoadName || payTaipeiParkingHasPhone || payTaipeiParkingHasNote || payTaipeiParkingServiceStopped || payTaipeiParkingBasement || payTaipeiParkingOperatorAddress || payTaipeiParkingLocationPrecision || payTaipeiParkingGeocodingStatus);
  const hasGreenSpaceAdoptionFilters = Boolean(greenSpaceManagementUnit || greenSpaceDistrictCode || greenSpaceTargetAttribute || greenSpaceTargetCategory || greenSpaceAdopterName || greenSpaceAdopterCategory || greenSpaceRoadName || greenSpaceHasRangeOrBoundary || greenSpaceHasIntersection);
  const hasAccessibleParkingFilters = Boolean(accessibleParkingCar || accessibleParkingMotorcycle || accessibleParkingElevator || accessibleParkingToilet || accessibleParkingHandrail || accessibleParkingValidCoordinates);

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
    const matchesDrinkingFountainFilterScope =
      !drinkingFountainFiltersOnly || facility.type === 'drinking_fountain';
    const matchesDrinkingFountainCategory =
      facility.type !== 'drinking_fountain' ||
      !drinkingFountainPlaceCategory ||
      facility.placeCategory === drinkingFountainPlaceCategory;
    const matchesOpeningHours =
      facility.type !== 'drinking_fountain' || !requiresOpeningHours || Boolean(facility.openingHours);
    const matchesTimedCollection =
      facility.type !== 'timed_collection_point' ||
      ((!acceptsGarbage || facility.acceptsGarbage === true) &&
        (!acceptsRecycling || facility.acceptsRecycling === true) &&
        (!acceptsFoodWaste || facility.acceptsFoodWaste === true) &&
        (!hasSpecialHours || facility.hasSpecialHours === true));
    const matchesDirectDrinking =
      facility.type !== 'direct_drinking_station' ||
      ((!directDrinkingNormalOnly || facility.directDrinkingStatus === 'normal') &&
        (includeSuspended || facility.directDrinkingStatus !== 'suspended') &&
        (!taipeiCityOnly || facility.isTaipeiCity === true) &&
        (!directDrinkingPlaceCategory || facility.directDrinkingPlaceCategory === directDrinkingPlaceCategory) &&
        (!requiresMaintenanceUrl || Boolean(facility.maintenanceUrl)) &&
        (!requiresPhotoUrl || Boolean(facility.photoUrl)));
    const matchesUsedClothing =
      facility.type !== 'used_clothing_recycling_box' ||
      ((!usedClothingVillage || facility.village === usedClothingVillage) &&
        (!usedClothingOrganization || facility.organizationName === usedClothingOrganization) &&
        (!usedClothingHasPhone || Boolean(facility.phone)));
    const matchesLactation =
      facility.type !== 'lactation_room' ||
      ((!lactationHasOpeningHours || Boolean(facility.openingHours)) &&
        (!lactationHasPhone || Boolean(facility.phone)) &&
        (!lactationHasMobile || Boolean(facility.mobile)) &&
        (!lactationHasLocationGuidance || Boolean(facility.locationGuidance)) &&
        (!lactationHasCertification || Boolean(facility.certificationValidityRaw)) &&
        (!lactationHasNotes || Boolean(facility.notes)) &&
        (!lactationLegalRequired || facility.appearsInLegalRequiredList === true) &&
        (!lactationBasicEquipment || facility.basicEquipment?.includes(lactationBasicEquipment)) &&
        (!lactationFriendlyService || facility.friendlyEquipmentOrServices?.includes(lactationFriendlyService)));
    const matchesRiverside =
      facility.type !== 'riverside_toilet' ||
      ((!riversidePark || facility.riversidePark === riversidePark) &&
        (!riversideToiletType || facility.riversideToiletType === riversideToiletType) &&
        (!riversideHasRemark || Boolean(facility.remark)));
    const matchesFamilyToilet =
      facility.type !== 'family_friendly_toilet' ||
      ((!familyToiletCategory || facility.toiletCategory === familyToiletCategory) &&
        (!familyToiletGrade || facility.toiletGrade === familyToiletGrade) &&
        (!familyHasDiaperTable || (facility.diaperTableCount ?? 0) > 0) &&
        (!familyHasChildSeat || (facility.childSeatCount ?? 0) > 0) &&
        (!familyHasAward || facility.hasFamilyFriendlyAward === true) &&
        (!familyManager || facility.manager === familyManager));
    const matchesSpecializedToiletScope =
      (!hasRiversideFilters && !hasFamilyToiletFilters) ||
      (hasRiversideFilters && facility.type === 'riverside_toilet') ||
      (hasFamilyToiletFilters && facility.type === 'family_friendly_toilet');
    const matchesInspection =
      facility.type !== 'motorcycle_inspection_station' ||
      ((!inspectionBrand || facility.brand === inspectionBrand) &&
        (!inspectionPostalCode || facility.postalCode === inspectionPostalCode) &&
        (!inspectionHasPhone || Boolean(facility.phone)));
    const matchesInspectionScope = !hasInspectionFilters || facility.type === 'motorcycle_inspection_station';
    const matchesCharging =
      facility.type !== 'electric_motorcycle_charging_station' ||
      ((!chargingLocationCategory || facility.locationCategory === chargingLocationCategory) &&
        (!chargingCity || facility.city === chargingCity) &&
        (!chargingDistrictCode || facility.districtCode === chargingDistrictCode) &&
        (!chargingHasAddress || Boolean(facility.address)));
    const matchesChargingScope = !hasChargingFilters || facility.type === 'electric_motorcycle_charging_station';
    const matchesCommercialEv =
      facility.type !== 'commercial_ev_charging_swap_station' ||
      ((!commercialEvServiceType || facility.serviceType === commercialEvServiceType) &&
        (!commercialEvOperator || facility.operatorName === commercialEvOperator) &&
        (!commercialEvCity || facility.city === commercialEvCity) &&
        (!commercialEvCityCode || facility.cityCode === commercialEvCityCode) &&
        (!commercialEvHasAddress || Boolean(facility.address)) &&
        (!commercialEvHasDistrict || Boolean(facility.district)));
    const matchesCommercialEvScope = !hasCommercialEvFilters || facility.type === 'commercial_ev_charging_swap_station';
    const matchesGasLpg =
      facility.type !== 'gas_lpg_station' ||
      ((!gasLpgSupplier || facility.supplier === gasLpgSupplier) &&
        (!gasLpgHasOil || facility.hasOil === true) &&
        (!gasLpgHasLpg || facility.hasLpg === true) &&
        (!gasLpgHasSelfService || facility.hasSelfService === true) &&
        (!gasLpgTwentyFourHours || facility.isTwentyFourHours === true) &&
        (!gasLpgLimitedHours || facility.hasLimitedHours === true) &&
        (!gasLpgStationStatus || facility.stationStatus === gasLpgStationStatus) &&
        (!gasLpgHasPhone || Boolean(facility.phone)));
    const matchesGasLpgScope = !hasGasLpgFilters || facility.type === 'gas_lpg_station';
    const matchesSmoking =
      facility.type !== 'designated_smoking_area' ||
      ((!smokingAreaType || facility.smokingAreaType === smokingAreaType) &&
        (!smokingOpeningHoursType || facility.openingHoursType === smokingOpeningHoursType) &&
        (!smokingListed24Hours || facility.isListed24Hours === true) &&
        (!smokingHasPhoto || facility.hasPhotoUrl === true) &&
        (!smokingHasRelativeLocation || facility.hasRelativeLocation === true) &&
        (!smokingManagingUnitCategory || facility.managingUnitCategory === smokingManagingUnitCategory) &&
        (!smokingManagingUnit || facility.managingUnit === smokingManagingUnit || facility.manager === smokingManagingUnit));
    const matchesSmokingScope = !hasSmokingFilters || facility.type === 'designated_smoking_area';
    const matchesNoSmoking =
      facility.type !== 'announced_no_smoking_place' ||
      ((!noSmokingRecordType || facility.recordType === noSmokingRecordType) &&
        (!noSmokingAnnouncementYear || String(facility.announcementYear ?? '') === noSmokingAnnouncementYear) &&
        (!noSmokingCoordinateStatus || facility.coordinateStatus === noSmokingCoordinateStatus) &&
        (!noSmokingSourceResource || facility.sourceResourceName === noSmokingSourceResource) &&
        (!noSmokingHasCoordinates || facility.hasCoordinates === true) &&
        (!noSmokingHasAddress || facility.hasAddress === true) &&
        (!noSmokingHasLocationDescription || facility.hasLocationDescription === true));
    const matchesNoSmokingScope = !hasNoSmokingFilters || facility.type === 'announced_no_smoking_place';
    const matchesCommunityRecycling =
      facility.type !== 'community_recycling_station' ||
      ((!communityRecyclingDistrictCode || facility.districtCode === communityRecyclingDistrictCode) &&
        (!communityRecyclingRoadName || facility.roadName === communityRecyclingRoadName) &&
        (!communityRecyclingHasAddress || facility.hasAddress === true) &&
        (!communityRecyclingHasParsedRoadName || facility.hasParsedRoadName === true));
    const matchesCommunityRecyclingScope = !hasCommunityRecyclingFilters || facility.type === 'community_recycling_station';
    const matchesCleanNeedle =
      facility.type !== 'clean_needle_exchange_service_point' ||
      ((!cleanNeedleAreaCode || facility.areaCode === cleanNeedleAreaCode) &&
        (!cleanNeedleServiceItem || facility.serviceItem === cleanNeedleServiceItem) &&
        (!cleanNeedleServicePointCategory || facility.servicePointCategory === cleanNeedleServicePointCategory) &&
        (!cleanNeedleServiceItemCategory || facility.serviceItemCategory === cleanNeedleServiceItemCategory) &&
        (!cleanNeedleServicePointCategoryGroup || facility.servicePointCategoryGroup === cleanNeedleServicePointCategoryGroup) &&
        (!cleanNeedleRoadName || facility.roadName === cleanNeedleRoadName) &&
        (!cleanNeedleHasPhone || facility.hasPhone === true) &&
        (!cleanNeedleHasExtension || facility.hasExtension === true) &&
        (!cleanNeedleTwentyFourHour || facility.isTwentyFourHourService === true));
    const matchesCleanNeedleScope = !hasCleanNeedleFilters || facility.type === 'clean_needle_exchange_service_point';
    const matchesProtectedTree =
      facility.type !== 'protected_tree' ||
      ((!protectedTreeSpecies || facility.speciesNameZh === protectedTreeSpecies) &&
        (!protectedTreeScientificName || facility.scientificName === protectedTreeScientificName) &&
        (!protectedTreeEnglishName || facility.speciesNameEn === protectedTreeEnglishName) &&
        (!protectedTreeLocationType || facility.locationTypeCategory === protectedTreeLocationType) &&
        (!protectedTreeManagementUnit || facility.managementUnit === protectedTreeManagementUnit) &&
        (!protectedTreeDiameterCategory || facility.diameterCategory === protectedTreeDiameterCategory) &&
        (!protectedTreeCircumferenceCategory || facility.circumferenceCategory === protectedTreeCircumferenceCategory) &&
        (!protectedTreeCoordinateQuality || facility.coordinateQuality === protectedTreeCoordinateQuality) &&
        (!protectedTreeHasLocationType || Boolean(facility.locationType)) &&
        (!protectedTreeHasSizeFlags || Boolean(facility.sizeDataQualityFlags?.length)));
    const matchesProtectedTreeScope = !hasProtectedTreeFilters || facility.type === 'protected_tree';
    const matchesPayTaipeiParking =
      facility.type !== 'pay_taipei_cardless_parking_lot' ||
      ((!payTaipeiParkingSupportStatus || facility.supportStatusCategory === payTaipeiParkingSupportStatus) &&
        (!payTaipeiParkingOperator || facility.operatorName === payTaipeiParkingOperator) &&
        (!payTaipeiParkingOperatorId || facility.operatorId === payTaipeiParkingOperatorId) &&
        (!payTaipeiParkingPostalCode || facility.postalCode === payTaipeiParkingPostalCode) &&
        (!payTaipeiParkingPostalCodeType || facility.postalCodeType === payTaipeiParkingPostalCodeType) &&
        (!payTaipeiParkingRoadName || facility.roadName === payTaipeiParkingRoadName) &&
        (!payTaipeiParkingHasPhone || Boolean(facility.phoneNumber || facility.phone)) &&
        (!payTaipeiParkingHasNote || facility.hasNote === true) &&
        (!payTaipeiParkingServiceStopped || facility.serviceStoppedHint === true) &&
        (!payTaipeiParkingBasement || facility.addressLooksLikeBasementOrUnderground === true) &&
        (!payTaipeiParkingOperatorAddress || facility.addressLooksLikeOperatorOrPlatformAddress === true) &&
        (!payTaipeiParkingLocationPrecision || facility.payTaipeiParkingLocationPrecision === payTaipeiParkingLocationPrecision) &&
        (!payTaipeiParkingGeocodingStatus || facility.payTaipeiParkingGeocodingStatus === payTaipeiParkingGeocodingStatus));
    const matchesPayTaipeiParkingScope = !hasPayTaipeiParkingFilters || facility.type === 'pay_taipei_cardless_parking_lot';
    const matchesGreenSpaceAdoption =
      facility.type !== 'green_space_adoption_record' ||
      ((!greenSpaceManagementUnit || facility.managementUnit === greenSpaceManagementUnit) &&
        (!greenSpaceDistrictCode || facility.districtCode === greenSpaceDistrictCode) &&
        (!greenSpaceTargetAttribute || facility.adoptionTargetAttribute === greenSpaceTargetAttribute) &&
        (!greenSpaceTargetCategory || facility.adoptionTargetCategory === greenSpaceTargetCategory) &&
        (!greenSpaceAdopterName || facility.adopterName === greenSpaceAdopterName) &&
        (!greenSpaceAdopterCategory || facility.adopterNameCategory === greenSpaceAdopterCategory) &&
        (!greenSpaceRoadName || facility.roadName === greenSpaceRoadName) &&
        (!greenSpaceHasRangeOrBoundary || facility.locationTextHasRangeOrBoundary === true) &&
        (!greenSpaceHasIntersection || facility.locationTextHasIntersection === true));
    const matchesGreenSpaceAdoptionScope = !hasGreenSpaceAdoptionFilters || facility.type === 'green_space_adoption_record';
    const matchesAccessibleParking =
      facility.type !== 'accessible_public_parking_facility' ||
      ((!accessibleParkingCar || facility.hasAccessibleCarSpaces === true) &&
        (!accessibleParkingMotorcycle || facility.hasAccessibleMotorcycleSpaces === true) &&
        (!accessibleParkingElevator || facility.hasAccessibleElevator === true) &&
        (!accessibleParkingToilet || facility.hasAccessibleToilet === true) &&
        (!accessibleParkingHandrail || facility.hasAccessibleStairHandrail === true) &&
        (!accessibleParkingValidCoordinates || facility.hasValidCoordinates === true));
    const matchesAccessibleParkingScope = !hasAccessibleParkingFilters || facility.type === 'accessible_public_parking_facility';
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
        facility.installLocation,
        facility.openingHours,
        facility.phone,
        facility.team,
        facility.stationId,
        facility.branch,
        facility.city,
        facility.placeType,
        facility.directDrinkingStatus,
        facility.village,
        facility.approvedLocation,
        facility.organizationName,
        facility.facilityName,
        facility.locationGuidance,
        facility.basicEquipmentRaw,
        facility.friendlyEquipmentOrServicesRaw,
        facility.notes,
        facility.source,
        facility.riversidePark,
        facility.locationDescription,
        facility.riversideToiletTypeRaw,
        facility.remark,
        facility.toiletId,
        facility.toiletName,
        facility.toiletLocation,
        facility.toiletGrade,
        facility.toiletCategory,
        facility.brand,
        facility.stationName,
        facility.postalCode,
        facility.unitName,
        facility.districtCode,
        facility.locationCategory,
        facility.locationCategoryRaw,
        facility.sourceSequenceNumber ? String(facility.sourceSequenceNumber) : '',
        facility.serviceType,
        facility.operatorName,
        facility.cityCode,
        facility.addressNormalized,
        facility.companyName,
        facility.supplier,
        facility.businessHoursRaw,
        facility.stationStatus,
        facility.stationServiceTypes?.join(' '),
        facility.placeName,
        facility.smokingAreaTypeRaw,
        facility.openingHoursRaw,
        facility.relativeLocation,
        facility.managingUnit,
        facility.managingUnitPhone,
        facility.recordType,
        facility.resourceName,
        facility.sourceResourceName,
        facility.placeName,
        facility.parkName,
        facility.announcementDate,
        facility.announcementDateRaw,
        facility.stationName,
        facility.stationNameNormalized,
        facility.districtCode,
        facility.districtCodeNormalized,
        facility.roadName,
        facility.areaCode,
        facility.serviceItem,
        facility.servicePointCategory,
        facility.institutionCode,
        facility.serviceLocationName,
        facility.extension,
        facility.serviceHours,
        facility.serviceHoursRaw,
        facility.treeId,
        facility.speciesNameZh,
        facility.scientificName,
        facility.speciesNameEn,
        facility.locationType,
        facility.managementUnit,
        facility.diameterCategory,
        facility.circumferenceCategory,
        facility.coordinateQuality,
        facility.parkingLotId,
        facility.operatorId,
        facility.operatorName,
        facility.parkingLotName,
        facility.statusRaw,
        facility.supportStatusLabelZh,
        facility.supportStatusLabelEn,
        facility.phoneNumber,
        facility.postalCodeType,
        facility.districtNameFromAddress,
        facility.roadName,
        facility.payTaipeiParkingLocationPrecision,
        facility.payTaipeiParkingGeocodingStatus,
        facility.adoptionTargetName,
        facility.adoptionTargetAttribute,
        facility.adoptionLocation,
        facility.adopterName,
        facility.parkingFacilityName,
        facility.queryServiceCode,
        facility.accessiblePublicParkingSourceId,
        facility.accessibleElevatorRaw,
        facility.accessibleToiletRaw,
        facility.accessibleStairHandrailRaw,
        facility.adoptionTargetCategory,
        facility.adopterNameCategory,
        facility.type === 'used_clothing_recycling_box'
          ? '舊衣回收箱 used clothing recycling box'
          : '',
        facility.acceptsGarbage === true ? '一般垃圾 general garbage' : '',
        facility.acceptsRecycling === true ? '資源回收 recycling' : '',
        facility.acceptsFoodWaste === true ? '廚餘 food waste' : '',
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));

    return (
      matchesDistrict &&
      matchesType &&
      matchesToiletFilterScope &&
      matchesToiletCategory &&
      matchesAccessibleToilet &&
      matchesParentChildToilet &&
      matchesDrinkingFountainFilterScope &&
      matchesDrinkingFountainCategory &&
      matchesOpeningHours &&
      matchesTimedCollection &&
      matchesDirectDrinking &&
      matchesUsedClothing &&
      matchesLactation &&
      matchesRiverside &&
      matchesFamilyToilet &&
      matchesSpecializedToiletScope &&
      matchesInspection &&
      matchesInspectionScope &&
      matchesCharging &&
      matchesChargingScope &&
      matchesCommercialEv &&
      matchesCommercialEvScope &&
      matchesGasLpg &&
      matchesGasLpgScope &&
      matchesSmoking &&
      matchesSmokingScope &&
      matchesNoSmoking &&
      matchesNoSmokingScope &&
      matchesCommunityRecycling &&
      matchesCommunityRecyclingScope &&
      matchesCleanNeedle &&
      matchesCleanNeedleScope &&
      matchesProtectedTree &&
      matchesProtectedTreeScope &&
      matchesPayTaipeiParking &&
      matchesPayTaipeiParkingScope &&
      matchesGreenSpaceAdoption &&
      matchesGreenSpaceAdoptionScope &&
      matchesAccessibleParking &&
      matchesAccessibleParkingScope &&
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

  if (type === 'public_toilet') {
    return language === 'zh' ? '公廁' : 'Public Toilet';
  }

  if (type === 'riverside_toilet') {
    return language === 'zh' ? '河濱廁所' : 'Riverside Toilet';
  }

  if (type === 'family_friendly_toilet') {
    return language === 'zh' ? '親子友善廁所' : 'Family-Friendly Toilet';
  }

  if (type === 'drinking_fountain') {
    return language === 'zh' ? '公共場所飲水機' : 'Public Drinking Fountain';
  }

  if (type === 'timed_collection_point') {
    return language === 'zh' ? '限時收受點' : 'Timed Collection Point';
  }

  if (type === 'direct_drinking_station') {
    return language === 'zh' ? '直飲臺' : 'Direct Drinking Station';
  }

  if (type === 'used_clothing_recycling_box') {
    return language === 'zh' ? '舊衣回收箱' : 'Used Clothing Recycling Box';
  }

  if (type === 'motorcycle_inspection_station') {
    return language === 'zh' ? '機車定檢站' : 'Motorcycle Inspection Station';
  }

  if (type === 'electric_motorcycle_charging_station') {
    return language === 'zh' ? '電動機車充電站' : 'Electric Motorcycle Charging Station';
  }

  if (type === 'commercial_ev_charging_swap_station') {
    return language === 'zh' ? '營利型電動車充換電站' : 'Commercial EV Charging & Battery Swap Station';
  }

  if (type === 'gas_lpg_station') {
    return language === 'zh' ? '加油站及加氣站' : 'Gas & LPG Station';
  }

  if (type === 'designated_smoking_area') {
    return language === 'zh' ? '指定吸菸區' : 'Designated Smoking Area';
  }

  if (type === 'announced_no_smoking_place') {
    return language === 'zh' ? '公告禁菸場所' : 'Announced No-Smoking Place';
  }

  if (type === 'community_recycling_station') {
    return language === 'zh' ? '社區資源回收站' : 'Community Recycling Station';
  }

  if (type === 'clean_needle_exchange_service_point') {
    return language === 'zh' ? '清潔針具服務點' : 'Clean Needle Service Point';
  }

  if (type === 'protected_tree') {
    return language === 'zh' ? '受保護樹木' : 'Protected Tree';
  }

  if (type === 'pay_taipei_cardless_parking_lot') {
    return language === 'zh' ? 'pay.taipei支援無卡進出停車場' : 'pay.taipei Cardless Parking Lot';
  }

  if (type === 'green_space_adoption_record') {
    return language === 'zh' ? '行道樹公園綠地廣場認養' : 'Green Space Adoption';
  }

  if (type === 'accessible_public_parking_facility') {
    return language === 'zh' ? '公有路外停車場無障礙設施' : 'Accessible Public Off-Street Parking Facility';
  }

  return language === 'zh' ? '哺集乳室' : 'Lactation Room';
}

export function getGreenSpaceAdoptionTargetCategoryLabel(type: GreenSpaceAdoptionTargetCategory | undefined, language: Language) {
  const labels = language === 'zh'
    ? { street_tree: '行道樹', park: '公園', large_park: '大型公園', green_space: '綠地', green_belt: '綠帶', plaza: '廣場', planter: '植栽/花台', traffic_island: '安全島', roundabout: '圓環', other: '其他', unknown: '未知' }
    : { street_tree: 'Street tree', park: 'Park', large_park: 'Large park', green_space: 'Green space', green_belt: 'Green belt', plaza: 'Plaza', planter: 'Planter', traffic_island: 'Traffic island', roundabout: 'Roundabout', other: 'Other', unknown: 'Unknown' };
  return labels[type ?? 'unknown'];
}

export function getGreenSpaceAdopterCategoryLabel(type: GreenSpaceAdopterCategory | undefined, language: Language) {
  const labels = language === 'zh'
    ? { company: '公司', government_unit: '政府機關', community_organization: '社區組織', foundation_or_association: '基金會/協會', school: '學校', private_individual: '個人', other: '其他', unknown: '未知' }
    : { company: 'Company', government_unit: 'Government unit', community_organization: 'Community organization', foundation_or_association: 'Foundation / association', school: 'School', private_individual: 'Private individual', other: 'Other', unknown: 'Unknown' };
  return labels[type ?? 'unknown'];
}

export function getPayTaipeiParkingSupportStatusLabel(type: PayTaipeiParkingSupportStatus | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      supported: '支援無卡進出',
      not_supported_or_stopped: '未支援或已停止服務',
      other: '其他狀態',
      unknown: '未知狀態',
    }
    : {
      supported: 'Supports cardless entry / exit',
      not_supported_or_stopped: 'Not supported or service stopped',
      other: 'Other status',
      unknown: 'Unknown status',
    };
  return labels[type ?? 'unknown'];
}

export function getPayTaipeiParkingPostalCodeTypeLabel(type: PayTaipeiParkingPostalCodeType | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      taipei_city: '臺北市郵遞區號',
      new_taipei_or_other_city: '新北或其他縣市郵遞區號',
      unknown: '未知',
      missing: '缺漏',
    }
    : {
      taipei_city: 'Taipei City postal code',
      new_taipei_or_other_city: 'New Taipei or other city postal code',
      unknown: 'Unknown',
      missing: 'Missing',
    };
  return labels[type ?? 'unknown'];
}

export function getPayTaipeiParkingLocationPrecisionLabel(type: PayTaipeiParkingLocationPrecision | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      district_address: '行政區與地址',
      geocoded_address_approximate: '近似地理編碼地址',
      official_joined_coordinate: '官方停車資料串接座標',
      operator_or_platform_address: '營運單位或平台地址',
      district_only: '僅行政區',
      missing: '缺漏',
    }
    : {
      district_address: 'District and address',
      geocoded_address_approximate: 'Approximate geocoded address',
      official_joined_coordinate: 'Joined official parking coordinate',
      operator_or_platform_address: 'Operator or platform address',
      district_only: 'District only',
      missing: 'Missing',
    };
  return labels[type ?? 'missing'];
}

export function getPayTaipeiParkingGeocodingStatusLabel(type: PayTaipeiParkingGeocodingStatus | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      not_attempted: '未嘗試',
      not_geocoded_address_only: '未地理編碼，僅地址',
      geocoded_approximate: '近似地理編碼',
      joined_official_coordinate: '官方資料串接座標',
      failed: '地理編碼失敗',
      not_applicable_operator_or_platform_address: '營運單位或平台地址不適用',
    }
    : {
      not_attempted: 'Not attempted',
      not_geocoded_address_only: 'Not geocoded, address only',
      geocoded_approximate: 'Approximate geocoded',
      joined_official_coordinate: 'Joined official coordinate',
      failed: 'Failed',
      not_applicable_operator_or_platform_address: 'Not applicable: operator or platform address',
    };
  return labels[type ?? 'not_attempted'];
}

export function getProtectedTreeLocationTypeLabel(type: ProtectedTreeLocationTypeCategory | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      park_green_space: '公園、綠地',
      school: '學校',
      road_sidewalk: '道路、人行道',
      public_place: '公共場所',
      private_residence: '私有住宅',
      suburban_mountain: '郊山',
      other: '其他',
      missing: '缺漏',
      unknown: '未知',
    }
    : {
      park_green_space: 'Park / green space',
      school: 'School',
      road_sidewalk: 'Road / sidewalk',
      public_place: 'Public place',
      private_residence: 'Private residence',
      suburban_mountain: 'Suburban mountain',
      other: 'Other',
      missing: 'Missing',
      unknown: 'Unknown',
    };
  return labels[type ?? 'unknown'];
}

export function getTreeDiameterCategoryLabel(type: TreeDiameterCategory | undefined, language: Language) {
  const labels = language === 'zh'
    ? { under_0_5m: '0.5公尺以下', '0_5m_to_1m': '0.5至1公尺', '1m_to_2m': '1至2公尺', '2m_to_3m': '2至3公尺', over_3m: '3公尺以上', missing: '缺漏' }
    : { under_0_5m: 'Under 0.5 m', '0_5m_to_1m': '0.5 m to 1 m', '1m_to_2m': '1 m to 2 m', '2m_to_3m': '2 m to 3 m', over_3m: 'Over 3 m', missing: 'Missing' };
  return labels[type ?? 'missing'];
}

export function getTreeCircumferenceCategoryLabel(type: TreeCircumferenceCategory | undefined, language: Language) {
  const labels = language === 'zh'
    ? { under_1m: '1公尺以下', '1m_to_3m': '1至3公尺', '3m_to_5m': '3至5公尺', '5m_to_10m': '5至10公尺', over_10m: '10公尺以上', missing: '缺漏' }
    : { under_1m: 'Under 1 m', '1m_to_3m': '1 m to 3 m', '3m_to_5m': '3 m to 5 m', '5m_to_10m': '5 m to 10 m', over_10m: 'Over 10 m', missing: 'Missing' };
  return labels[type ?? 'missing'];
}

export function getCommunityRecyclingStationLabel(kind: 'short' | 'full', language: Language) {
  if (kind === 'short') return language === 'zh' ? '社區回收站' : 'Community Recycling';
  return language === 'zh' ? '臺北市社區資源回收站資訊' : 'Taipei Community Recycling Station Information';
}

export function getAnnouncedNoSmokingRecordTypeLabel(type: AnnouncedNoSmokingPlaceRecordType | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      outdoor_no_smoking_place: '公告戶外禁菸場所',
      smoke_free_park_green_space: '除吸菸區外全面禁菸公園綠地',
      unknown: '未知',
    }
    : {
      outdoor_no_smoking_place: 'Announced Outdoor No-Smoking Place',
      smoke_free_park_green_space: 'Smoke-Free Park / Green Space',
      unknown: 'Unknown',
    };
  return labels[type ?? 'unknown'];
}

export function getDesignatedSmokingAreaTypeLabel(type: DesignatedSmokingAreaType | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      outdoor_open: '戶外開放式吸菸區',
      outdoor_negative_pressure: '戶外負壓式吸菸區',
      indoor_smoking_room: '室內吸菸室',
      other: '其他',
      unknown: '未知',
    }
    : {
      outdoor_open: 'Outdoor open smoking area',
      outdoor_negative_pressure: 'Outdoor negative-pressure smoking area',
      indoor_smoking_room: 'Indoor smoking room',
      other: 'Other',
      unknown: 'Unknown',
    };
  return labels[type ?? 'unknown'];
}

export function getOpeningHoursTypeLabel(type: OpeningHoursType | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      listed_24_hours: '24小時開放',
      fixed_hours: '固定時段',
      weekday_or_holiday_rule: '平日 / 假日規則',
      depends_on_facility_hours: '依場館時間',
      custom_text: '自訂文字',
      missing: '缺漏',
      unknown: '未知',
    }
    : {
      listed_24_hours: 'Listed 24 hours',
      fixed_hours: 'Fixed hours',
      weekday_or_holiday_rule: 'Weekday / holiday rule',
      depends_on_facility_hours: 'Depends on facility hours',
      custom_text: 'Custom text',
      missing: 'Missing',
      unknown: 'Unknown',
    };
  return labels[type ?? 'unknown'];
}

export function getManagingUnitCategoryLabel(type: ManagingUnitCategory | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      taipei_city_government: '臺北市政府機關',
      district_office: '區公所',
      central_government: '中央政府機關',
      transportation_or_mrt: '交通或捷運相關單位',
      park_or_public_space: '公園或公共空間管理',
      private_operator: '民間營運單位',
      cultural_or_sports_facility: '文化或體育場館',
      other: '其他',
      unknown: '未知',
    }
    : {
      taipei_city_government: 'Taipei City Government agency',
      district_office: 'District office',
      central_government: 'Central government agency',
      transportation_or_mrt: 'Transportation or MRT-related unit',
      park_or_public_space: 'Park or public-space management',
      private_operator: 'Private operator',
      cultural_or_sports_facility: 'Cultural or sports facility',
      other: 'Other',
      unknown: 'Unknown',
    };
  return labels[type ?? 'unknown'];
}

export function getFuelStationServiceTypeLabel(type: FuelStationServiceType, language: Language) {
  if (type === 'gasoline') return language === 'zh' ? '加油' : 'Gasoline';
  if (type === 'lpg') return language === 'zh' ? '加氣' : 'LPG';
  return language === 'zh' ? '自助加油' : 'Self-service';
}

export function getFuelStationStatusLabel(status: FuelStationStatus | undefined, language: Language) {
  if (status === 'terminated') return language === 'zh' ? '來源標示終止營業' : 'Source marked as terminated';
  if (status === 'unknown') return language === 'zh' ? '未知' : 'Unknown';
  return language === 'zh' ? '來源未標示停業' : 'Not marked as terminated';
}

export function getCommercialEvServiceTypeLabel(type: CommercialEvServiceType | undefined, language: Language) {
  const labels = language === 'zh'
    ? {
      electric_car_charging: '電動車充電站',
      electric_motorcycle_charging: '電動機車充電站',
      electric_motorcycle_battery_swap: '電動機車換電站',
      unknown: '未知服務類型',
    }
    : {
      electric_car_charging: 'Electric car charging station',
      electric_motorcycle_charging: 'Electric motorcycle charging station',
      electric_motorcycle_battery_swap: 'Electric motorcycle battery swap station',
      unknown: 'Unknown service type',
    };
  return labels[type ?? 'unknown'];
}

export function classifyElectricMotorcycleChargingLocationCategory(
  raw: string | undefined,
): ElectricMotorcycleChargingLocationCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('檢驗站')) return 'inspection_station';
  if (text.includes('公有停車場')) return 'public_parking_lot';
  if (text.includes('車行')) return 'motorcycle_shop';
  if (text.includes('清潔隊')) return 'cleaning_team';
  if (text.includes('捷運站')) return 'metro_station';
  if (text.includes('里辦公室')) return 'village_office';
  if (text.includes('中華汽車服務廠')) return 'service_factory';
  if (text.includes('公務單位停車場')) return 'government_parking_lot';
  if (text.includes('焚化廠')) return 'incineration_plant';
  if (text.includes('校園停車場')) return 'campus_parking_lot';
  if (text.includes('商店')) return 'store';
  if (text.includes('運動中心')) return 'sports_center';
  return 'other';
}

export function getElectricMotorcycleChargingLocationCategoryLabel(
  category: ElectricMotorcycleChargingLocationCategory | undefined,
  language: Language,
) {
  const labels = language === 'zh'
    ? {
      inspection_station: '檢驗站',
      public_parking_lot: '公有停車場',
      motorcycle_shop: '車行',
      cleaning_team: '清潔隊',
      metro_station: '捷運站',
      village_office: '里辦公室',
      service_factory: '服務廠',
      government_parking_lot: '公務單位停車場',
      incineration_plant: '焚化廠',
      campus_parking_lot: '校園停車場',
      store: '商店',
      sports_center: '運動中心',
      other: '其他',
      unknown: '未知分類',
    }
    : {
      inspection_station: 'Inspection station',
      public_parking_lot: 'Public parking lot',
      motorcycle_shop: 'Motorcycle shop',
      cleaning_team: 'Cleaning team',
      metro_station: 'Metro station',
      village_office: 'Village office',
      service_factory: 'Service factory',
      government_parking_lot: 'Government parking lot',
      incineration_plant: 'Incineration plant',
      campus_parking_lot: 'Campus parking lot',
      store: 'Store',
      sports_center: 'Sports center',
      other: 'Other',
      unknown: 'Unknown category',
    };
  return labels[category ?? 'unknown'];
}

export function getRiversideToiletTypeLabel(type: RiversideToiletType | undefined, language: Language) {
  const labels = language === 'zh'
    ? { scenic: '景觀', standard: '一般型', accessible: '無障礙', fixed: '固定式', other: '其他', unknown: '未知' }
    : { scenic: 'Scenic', standard: 'Standard', accessible: 'Accessible', fixed: 'Fixed', other: 'Other', unknown: 'Unknown' };
  return labels[type ?? 'unknown'];
}

export function getAcceptedItemsLabel(facility: Facility, language: Language) {
  const labels = [
    facility.acceptsGarbage === true ? (language === 'zh' ? '一般垃圾' : 'General garbage') : '',
    facility.acceptsRecycling === true ? (language === 'zh' ? '資源回收' : 'Recycling') : '',
    facility.acceptsFoodWaste === true ? (language === 'zh' ? '廚餘' : 'Food waste') : '',
  ].filter(Boolean);
  return labels.length ? labels.join('、') : language === 'zh' ? '未知，請查看備註' : 'Unknown, please check notes';
}

export function getDirectDrinkingStatusLabel(status: Facility['directDrinkingStatus'], language: Language) {
  if (status === 'normal') return language === 'zh' ? '正常' : 'Normal';
  if (status === 'suspended') return language === 'zh' ? '暫停' : 'Suspended';
  return language === 'zh' ? '未知' : 'Unknown';
}

export function getDirectDrinkingPlaceLabel(category: DirectDrinkingPlaceCategory, language: Language) {
  if (language === 'zh') {
    return {
      park_trail: '公園步道',
      mrt_station: '捷運站',
      school: '學校',
      government_office: '機關',
      venue: '場館',
      shopping_night_market: '商圈夜市',
      other: '其他',
    }[category];
  }
  return {
    park_trail: 'Park / Trail',
    mrt_station: 'MRT Station',
    school: 'School',
    government_office: 'Government Office',
    venue: 'Venue',
    shopping_night_market: 'Shopping / Night Market',
    other: 'Other',
  }[category];
}

export function normalizeTaipeiDistrict(district: string) {
  const normalized = district.trim().replace(/\s+/g, '');
  return taipeiDistrictByShortName[normalized] ?? normalized;
}

export function classifyDrinkingFountainPlace(input: {
  name?: string;
  manager?: string;
  address?: string;
  installLocation?: string;
}): DrinkingFountainPlaceCategory {
  const text = `${input.name ?? ''} ${input.manager ?? ''} ${input.address ?? ''} ${input.installLocation ?? ''}`;

  if (text.includes('運動中心')) return 'sports_center';
  if (text.includes('圖書館')) return 'library';
  if (text.includes('公園')) return 'park';
  if (text.includes('區公所') || text.includes('市政府') || text.includes('機關')) return 'government_facility';
  if (text.includes('學校') || text.includes('國小') || text.includes('國中') || text.includes('高中') || text.includes('大學')) {
    return 'school';
  }
  if (text.includes('捷運') || text.includes('車站') || text.includes('轉運站')) return 'transport';

  return 'other';
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
  if (facility.locationPrecision === 'address_only') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.googleMapsQuery || facility.address)}`;
  }
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
