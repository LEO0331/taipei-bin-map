import type {
  DirectDrinkingPlaceCategory,
  DrinkingFountainPlaceCategory,
  CommercialEvServiceType,
  ElectricMotorcycleChargingLocationCategory,
  Facility,
  FacilityType,
  Language,
  RiversideToiletType,
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

  return language === 'zh' ? '哺集乳室' : 'Lactation Room';
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
  const normalized = district.trim();
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
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`;
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
