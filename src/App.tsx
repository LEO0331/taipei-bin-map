import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { DrinkingFountainFilters } from './components/DrinkingFountainFilters';
import {
  CommercialEvChargingSwapStationFilters,
  AnnouncedNoSmokingPlaceFilters,
  DesignatedSmokingAreaFilters,
  DirectDrinkingFilters,
  ElectricMotorcycleChargingStationFilters,
  FamilyFriendlyToiletFilters,
  GasLpgStationFilters,
  LactationRoomFilters,
  MotorcycleInspectionStationFilters,
  RiversideToiletFilters,
  TimedCollectionFilters,
  UsedClothingFilters,
} from './components/AdditionalFacilityFilters';
import { FacilityList } from './components/FacilityList';
import { FacilityTypeFilter, FACILITY_TYPE_OPTIONS } from './components/FacilityTypeFilter';
import { LanguageToggle } from './components/LanguageToggle';
import { NearbyButton } from './components/NearbyButton';
import { PublicToiletFilters } from './components/PublicToiletFilters';
import { SearchFilters } from './components/SearchFilters';
import { WarningNotice } from './components/WarningNotice';
import { translations } from './i18n';
import type {
  ConversionReport,
  AnnouncedNoSmokingPlaceRecordType,
  CommercialEvServiceType,
  DirectDrinkingPlaceCategory,
  DesignatedSmokingAreaType,
  DrinkingFountainPlaceCategory,
  ElectricMotorcycleChargingLocationCategory,
  Facility,
  FacilityType,
  FacilityWithDistance,
  FuelStationStatus,
  Language,
  ManagingUnitCategory,
  OpeningHoursType,
  RiversideToiletType,
} from './types';
import { calculateDistanceMeters, filterFacilities } from './utils/facilityUtils';

const DISTRICT_ORDER = [
  '中正區',
  '大同區',
  '中山區',
  '松山區',
  '大安區',
  '萬華區',
  '信義區',
  '士林區',
  '北投區',
  '內湖區',
  '南港區',
  '文山區',
];

const INITIAL_LIST_LIMIT = 80;
const SINGLE_LAYER_MARKER_LIMIT = 500;
const FacilityMap = lazy(() =>
  import('./components/FacilityMap').then((module) => ({ default: module.FacilityMap })),
);

type UserLocation = {
  latitude: number;
  longitude: number;
};

type ErrorKey = 'load' | 'location' | 'distance' | '';

const getInitialLanguage = (): Language => {
  const stored = window.localStorage.getItem('language');
  return stored === 'en' ? 'en' : 'zh';
};

function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [report, setReport] = useState<ConversionReport | null>(null);
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [searchTerm, setSearchTerm] = useState('');
  const [district, setDistrict] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<FacilityType[]>(FACILITY_TYPE_OPTIONS);
  const [toiletCategory, setToiletCategory] = useState('');
  const [requiresAccessibleToilet, setRequiresAccessibleToilet] = useState(false);
  const [requiresParentChildToilet, setRequiresParentChildToilet] = useState(false);
  const [drinkingFountainPlaceCategory, setDrinkingFountainPlaceCategory] =
    useState<DrinkingFountainPlaceCategory | ''>('');
  const [requiresOpeningHours, setRequiresOpeningHours] = useState(false);
  const [acceptsGarbage, setAcceptsGarbage] = useState(false);
  const [acceptsRecycling, setAcceptsRecycling] = useState(false);
  const [acceptsFoodWaste, setAcceptsFoodWaste] = useState(false);
  const [hasSpecialHours, setHasSpecialHours] = useState(false);
  const [directDrinkingNormalOnly, setDirectDrinkingNormalOnly] = useState(true);
  const [includeSuspended, setIncludeSuspended] = useState(false);
  const [taipeiCityOnly, setTaipeiCityOnly] = useState(true);
  const [directDrinkingPlaceCategory, setDirectDrinkingPlaceCategory] =
    useState<DirectDrinkingPlaceCategory | ''>('');
  const [requiresMaintenanceUrl, setRequiresMaintenanceUrl] = useState(false);
  const [requiresPhotoUrl, setRequiresPhotoUrl] = useState(false);
  const [usedClothingVillage, setUsedClothingVillage] = useState('');
  const [usedClothingOrganization, setUsedClothingOrganization] = useState('');
  const [usedClothingHasPhone, setUsedClothingHasPhone] = useState(false);
  const [lactationHasOpeningHours, setLactationHasOpeningHours] = useState(false);
  const [lactationHasPhone, setLactationHasPhone] = useState(false);
  const [lactationHasMobile, setLactationHasMobile] = useState(false);
  const [lactationHasLocationGuidance, setLactationHasLocationGuidance] = useState(false);
  const [lactationHasCertification, setLactationHasCertification] = useState(false);
  const [lactationHasNotes, setLactationHasNotes] = useState(false);
  const [lactationLegalRequired, setLactationLegalRequired] = useState(false);
  const [lactationBasicEquipment, setLactationBasicEquipment] = useState('');
  const [lactationFriendlyService, setLactationFriendlyService] = useState('');
  const [riversidePark, setRiversidePark] = useState('');
  const [riversideToiletType, setRiversideToiletType] = useState<RiversideToiletType | ''>('');
  const [riversideHasRemark, setRiversideHasRemark] = useState(false);
  const [familyToiletCategory, setFamilyToiletCategory] = useState('');
  const [familyToiletGrade, setFamilyToiletGrade] = useState('');
  const [familyManager, setFamilyManager] = useState('');
  const [familyHasDiaperTable, setFamilyHasDiaperTable] = useState(false);
  const [familyHasChildSeat, setFamilyHasChildSeat] = useState(false);
  const [familyHasAward, setFamilyHasAward] = useState(false);
  const [nearbyRadiusMeters, setNearbyRadiusMeters] = useState(1000);
  const [inspectionBrand, setInspectionBrand] = useState('');
  const [inspectionPostalCode, setInspectionPostalCode] = useState('');
  const [inspectionHasPhone, setInspectionHasPhone] = useState(false);
  const [chargingLocationCategory, setChargingLocationCategory] =
    useState<ElectricMotorcycleChargingLocationCategory | ''>('');
  const [chargingCity, setChargingCity] = useState('');
  const [chargingDistrictCode, setChargingDistrictCode] = useState('');
  const [chargingHasAddress, setChargingHasAddress] = useState(false);
  const [commercialEvServiceType, setCommercialEvServiceType] = useState<CommercialEvServiceType | ''>('');
  const [commercialEvOperator, setCommercialEvOperator] = useState('');
  const [commercialEvCity, setCommercialEvCity] = useState('');
  const [commercialEvCityCode, setCommercialEvCityCode] = useState('');
  const [commercialEvHasAddress, setCommercialEvHasAddress] = useState(false);
  const [commercialEvHasDistrict, setCommercialEvHasDistrict] = useState(false);
  const [gasLpgSupplier, setGasLpgSupplier] = useState('');
  const [gasLpgHasOil, setGasLpgHasOil] = useState(false);
  const [gasLpgHasLpg, setGasLpgHasLpg] = useState(false);
  const [gasLpgHasSelfService, setGasLpgHasSelfService] = useState(false);
  const [gasLpgTwentyFourHours, setGasLpgTwentyFourHours] = useState(false);
  const [gasLpgLimitedHours, setGasLpgLimitedHours] = useState(false);
  const [gasLpgStationStatus, setGasLpgStationStatus] = useState<FuelStationStatus | ''>('');
  const [gasLpgHasPhone, setGasLpgHasPhone] = useState(false);
  const [smokingAreaType, setSmokingAreaType] = useState<DesignatedSmokingAreaType | ''>('');
  const [smokingOpeningHoursType, setSmokingOpeningHoursType] = useState<OpeningHoursType | ''>('');
  const [smokingListed24Hours, setSmokingListed24Hours] = useState(false);
  const [smokingHasPhoto, setSmokingHasPhoto] = useState(false);
  const [smokingHasRelativeLocation, setSmokingHasRelativeLocation] = useState(false);
  const [smokingManagingUnitCategory, setSmokingManagingUnitCategory] = useState<ManagingUnitCategory | ''>('');
  const [smokingManagingUnit, setSmokingManagingUnit] = useState('');
  const [noSmokingRecordType, setNoSmokingRecordType] = useState<AnnouncedNoSmokingPlaceRecordType | ''>('');
  const [noSmokingAnnouncementYear, setNoSmokingAnnouncementYear] = useState('');
  const [noSmokingCoordinateStatus, setNoSmokingCoordinateStatus] = useState('');
  const [noSmokingSourceResource, setNoSmokingSourceResource] = useState('');
  const [noSmokingHasCoordinates, setNoSmokingHasCoordinates] = useState(false);
  const [noSmokingHasAddress, setNoSmokingHasAddress] = useState(false);
  const [noSmokingHasLocationDescription, setNoSmokingHasLocationDescription] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyFacilities, setNearbyFacilities] = useState<FacilityWithDistance[] | null>(null);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<ErrorKey>('');

  const t = translations[language];
  const includesPublicToilets = selectedTypes.includes('public_toilet');
  const includesRiversideToilets = selectedTypes.includes('riverside_toilet');
  const includesFamilyFriendlyToilets = selectedTypes.includes('family_friendly_toilet');
  const includesDrinkingFountains = selectedTypes.includes('drinking_fountain');
  const includesTimedCollectionPoints = selectedTypes.includes('timed_collection_point');
  const includesDirectDrinkingStations = selectedTypes.includes('direct_drinking_station');
  const includesUsedClothing = selectedTypes.includes('used_clothing_recycling_box');
  const includesLactationRooms = selectedTypes.includes('lactation_room');
  const includesInspectionStations = selectedTypes.includes('motorcycle_inspection_station');
  const includesChargingStations = selectedTypes.includes('electric_motorcycle_charging_station');
  const includesCommercialEvStations = selectedTypes.includes('commercial_ev_charging_swap_station');
  const includesGasLpgStations = selectedTypes.includes('gas_lpg_station');
  const includesDesignatedSmokingAreas = selectedTypes.includes('designated_smoking_area');
  const includesAnnouncedNoSmokingPlaces = selectedTypes.includes('announced_no_smoking_place');
  const hasFocusedTypes = selectedTypes.length < FACILITY_TYPE_OPTIONS.length;

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    window.localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    let isMounted = true;

    fetch('/data/facilities.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<Facility[]>;
      })
      .then((data) => {
        if (isMounted) {
          setFacilities(data);
          setError('');
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('load');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingFacilities(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch('/data/conversion-report.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<ConversionReport>;
      })
      .then((data) => {
        if (isMounted) {
          setReport(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReport(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const districts = useMemo(() => {
    const dataDistricts = new Set(facilities.map((facility) => facility.district).filter(Boolean));
    return DISTRICT_ORDER.filter((item) => dataDistricts.has(item));
  }, [facilities]);

  const toiletCategories = useMemo(() => {
    const categories = new Set(
      facilities
        .filter((facility) => facility.type === 'public_toilet' && facility.category)
        .map((facility) => facility.category as string),
    );
    return [...categories].sort((first, second) => first.localeCompare(second, 'zh-Hant'));
  }, [facilities]);
  const usedClothingVillages = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'used_clothing_recycling_box').map((facility) => facility.village).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const usedClothingOrganizations = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'used_clothing_recycling_box').map((facility) => facility.organizationName).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const lactationBasicEquipmentOptions = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'lactation_room').flatMap((facility) => facility.basicEquipment ?? []))].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const lactationFriendlyServiceOptions = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'lactation_room').flatMap((facility) => facility.friendlyEquipmentOrServices ?? []))].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const riversideParks = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'riverside_toilet').map((facility) => facility.riversidePark).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const familyToiletCategories = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'family_friendly_toilet').map((facility) => facility.toiletCategory).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const familyToiletGrades = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'family_friendly_toilet').map((facility) => facility.toiletGrade).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const familyToiletManagers = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'family_friendly_toilet').map((facility) => facility.manager).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const inspectionBrands = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'motorcycle_inspection_station').map((facility) => facility.brand).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const inspectionPostalCodes = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'motorcycle_inspection_station').map((facility) => facility.postalCode).filter(Boolean) as string[])].sort(),
    [facilities],
  );
  const chargingCities = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'electric_motorcycle_charging_station').map((facility) => facility.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const chargingDistrictCodes = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'electric_motorcycle_charging_station').map((facility) => facility.districtCode).filter(Boolean) as string[])].sort(),
    [facilities],
  );
  const commercialEvOperators = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'commercial_ev_charging_swap_station').map((facility) => facility.operatorName).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const commercialEvCities = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'commercial_ev_charging_swap_station').map((facility) => facility.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const commercialEvCityCodes = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'commercial_ev_charging_swap_station').map((facility) => facility.cityCode).filter(Boolean) as string[])].sort(),
    [facilities],
  );
  const gasLpgSuppliers = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'gas_lpg_station').map((facility) => facility.supplier).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const smokingManagingUnits = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'designated_smoking_area').map((facility) => facility.managingUnit).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );
  const noSmokingAnnouncementYears = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'announced_no_smoking_place').map((facility) => facility.announcementYear).filter(Boolean) as number[])]
      .sort((a, b) => b - a)
      .map(String),
    [facilities],
  );
  const noSmokingSourceResources = useMemo(
    () => [...new Set(facilities.filter((facility) => facility.type === 'announced_no_smoking_place').map((facility) => facility.sourceResourceName).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [facilities],
  );

  const filteredFacilities = useMemo(
    () =>
      filterFacilities(facilities, {
        searchTerm,
        district,
        facilityTypes: selectedTypes,
        toiletCategory,
        requiresAccessibleToilet,
        requiresParentChildToilet,
        drinkingFountainPlaceCategory,
        requiresOpeningHours,
        acceptsGarbage,
        acceptsRecycling,
        acceptsFoodWaste,
        hasSpecialHours,
        directDrinkingNormalOnly,
        includeSuspended,
        taipeiCityOnly,
        directDrinkingPlaceCategory,
        requiresMaintenanceUrl,
        requiresPhotoUrl,
        usedClothingVillage,
        usedClothingOrganization,
        usedClothingHasPhone,
        lactationHasOpeningHours,
        lactationHasPhone,
        lactationHasMobile,
        lactationHasLocationGuidance,
        lactationHasCertification,
        lactationHasNotes,
        lactationLegalRequired,
        lactationBasicEquipment,
        lactationFriendlyService,
        riversidePark,
        riversideToiletType,
        riversideHasRemark,
        familyToiletCategory,
        familyToiletGrade,
        familyManager,
        familyHasDiaperTable,
        familyHasChildSeat,
        familyHasAward,
        inspectionBrand,
        inspectionPostalCode,
        inspectionHasPhone,
        chargingLocationCategory,
        chargingCity,
        chargingDistrictCode,
        chargingHasAddress,
        commercialEvServiceType,
        commercialEvOperator,
        commercialEvCity,
        commercialEvCityCode,
        commercialEvHasAddress,
        commercialEvHasDistrict,
        gasLpgSupplier,
        gasLpgHasOil,
        gasLpgHasLpg,
        gasLpgHasSelfService,
        gasLpgTwentyFourHours,
        gasLpgLimitedHours,
        gasLpgStationStatus,
        gasLpgHasPhone,
        smokingAreaType,
        smokingOpeningHoursType,
        smokingListed24Hours,
        smokingHasPhoto,
        smokingHasRelativeLocation,
        smokingManagingUnitCategory,
        smokingManagingUnit,
        noSmokingRecordType,
        noSmokingAnnouncementYear,
        noSmokingCoordinateStatus,
        noSmokingSourceResource,
        noSmokingHasCoordinates,
        noSmokingHasAddress,
        noSmokingHasLocationDescription,
      }),
    [
      district,
      directDrinkingNormalOnly,
      directDrinkingPlaceCategory,
      drinkingFountainPlaceCategory,
      acceptsFoodWaste,
      acceptsGarbage,
      acceptsRecycling,
      facilities,
      hasSpecialHours,
      includeSuspended,
      requiresAccessibleToilet,
      requiresMaintenanceUrl,
      requiresOpeningHours,
      requiresParentChildToilet,
      requiresPhotoUrl,
      searchTerm,
      selectedTypes,
      taipeiCityOnly,
      toiletCategory,
      usedClothingHasPhone,
      usedClothingOrganization,
      usedClothingVillage,
      lactationBasicEquipment,
      lactationFriendlyService,
      lactationHasCertification,
      lactationHasLocationGuidance,
      lactationHasMobile,
      lactationHasNotes,
      lactationHasOpeningHours,
      lactationHasPhone,
      lactationLegalRequired,
      riversidePark,
      riversideToiletType,
      riversideHasRemark,
      familyToiletCategory,
      familyToiletGrade,
      familyManager,
      familyHasDiaperTable,
      familyHasChildSeat,
      familyHasAward,
      inspectionBrand,
      inspectionPostalCode,
      inspectionHasPhone,
      chargingLocationCategory,
      chargingCity,
      chargingDistrictCode,
      chargingHasAddress,
      commercialEvServiceType,
      commercialEvOperator,
      commercialEvCity,
      commercialEvCityCode,
      commercialEvHasAddress,
      commercialEvHasDistrict,
      gasLpgSupplier,
      gasLpgHasOil,
      gasLpgHasLpg,
      gasLpgHasSelfService,
      gasLpgTwentyFourHours,
      gasLpgLimitedHours,
      gasLpgStationStatus,
      gasLpgHasPhone,
      smokingAreaType,
      smokingOpeningHoursType,
      smokingListed24Hours,
      smokingHasPhoto,
      smokingHasRelativeLocation,
      smokingManagingUnitCategory,
      smokingManagingUnit,
      noSmokingRecordType,
      noSmokingAnnouncementYear,
      noSmokingCoordinateStatus,
      noSmokingSourceResource,
      noSmokingHasCoordinates,
      noSmokingHasAddress,
      noSmokingHasLocationDescription,
    ],
  );

  const displayedFacilities = nearbyFacilities ?? filteredFacilities;
  const lactationDistrictSummaries = useMemo(() => {
    const rooms = displayedFacilities.filter((facility) => facility.type === 'lactation_room');
    return [...new Set(rooms.map((facility) => facility.district).filter(Boolean))].map((district) => {
      const rows = rooms.filter((facility) => facility.district === district);
      return {
        district,
        count: rows.length,
        withOpeningHours: rows.filter((facility) => facility.openingHours).length,
        withLocationGuidance: rows.filter((facility) => facility.locationGuidance).length,
        withCertificationValidity: rows.filter((facility) => facility.certificationValidityRaw).length,
      };
    });
  }, [displayedFacilities]);
  const inspectionDistrictSummaries = useMemo(() => {
    const stations = displayedFacilities.filter((facility) => facility.type === 'motorcycle_inspection_station');
    return [...new Set(stations.map((facility) => facility.district).filter(Boolean))].map((district) => {
      const rows = stations.filter((facility) => facility.district === district);
      const brandCounts = new Map<string, number>();
      rows.forEach((facility) => facility.brand && brandCounts.set(facility.brand, (brandCounts.get(facility.brand) ?? 0) + 1));
      return {
        district,
        count: rows.length,
        topBrands: [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([brand, count]) => ({ brand, count })),
      };
    });
  }, [displayedFacilities]);
  const chargingDistrictSummaries = useMemo(() => {
    const stations = displayedFacilities.filter((facility) => facility.type === 'electric_motorcycle_charging_station');
    return [...new Set(stations.map((facility) => facility.district).filter(Boolean))].map((district) => {
      const rows = stations.filter((facility) => facility.district === district);
      const categoryCounts = new Map<string, { raw?: string; count: number }>();
      rows.forEach((facility) => {
        const category = facility.locationCategory ?? 'unknown';
        const entry = categoryCounts.get(category) ?? { raw: facility.locationCategoryRaw, count: 0 };
        entry.count += 1;
        categoryCounts.set(category, entry);
      });
      return {
        district,
        count: rows.length,
        topLocationCategories: [...categoryCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3).map(([locationCategory, item]) => ({
          locationCategory: locationCategory as ElectricMotorcycleChargingLocationCategory,
          locationCategoryRaw: item.raw,
          count: item.count,
        })),
      };
    });
  }, [displayedFacilities]);
  const commercialEvDistrictSummaries = useMemo(() => {
    const stations = displayedFacilities.filter((facility) => facility.type === 'commercial_ev_charging_swap_station');
    return [...new Set(stations.map((facility) => facility.district).filter(Boolean))].map((district) => {
      const rows = stations.filter((facility) => facility.district === district);
      const operatorCounts = new Map<string, number>();
      rows.forEach((facility) => facility.operatorName && operatorCounts.set(facility.operatorName, (operatorCounts.get(facility.operatorName) ?? 0) + 1));
      return {
        district,
        count: rows.length,
        electricCarChargingCount: rows.filter((facility) => facility.serviceType === 'electric_car_charging').length,
        electricMotorcycleChargingCount: rows.filter((facility) => facility.serviceType === 'electric_motorcycle_charging').length,
        electricMotorcycleBatterySwapCount: rows.filter((facility) => facility.serviceType === 'electric_motorcycle_battery_swap').length,
        topOperators: [...operatorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([operatorName, count]) => ({ operatorName, count })),
      };
    });
  }, [displayedFacilities]);
  const renderableFacilities = displayedFacilities.filter(
    (facility) =>
      Number.isFinite(facility.latitude) &&
      Number.isFinite(facility.longitude) &&
      facility.locationPrecision !== 'address_only' &&
      (!facility.coordinateStatus || facility.coordinateStatus === 'valid') &&
      !facility.isCoordinateOutlier,
  );
  // ponytail: broad views use the list; nearby results always render their exact markers.
  const shouldRenderMapMarkers =
    Boolean(nearbyFacilities) ||
    (selectedTypes.length === 1 && renderableFacilities.length <= SINGLE_LAYER_MARKER_LIMIT);
  const markerLimitExceeded = !shouldRenderMapMarkers && renderableFacilities.length > 0;
  const mapFacilities = shouldRenderMapMarkers ? renderableFacilities : [];
  const deferredMapFacilities = useDeferredValue(mapFacilities);
  const listFacilities = useMemo(
    () => (nearbyFacilities ? displayedFacilities : displayedFacilities.slice(0, INITIAL_LIST_LIMIT)),
    [displayedFacilities, nearbyFacilities],
  );
  const isListLimited = !nearbyFacilities && displayedFacilities.length > listFacilities.length;
  const isLactationOnly = selectedTypes.length === 1 && includesLactationRooms;
  const isRiversideOnly = selectedTypes.length === 1 && includesRiversideToilets;
  const isFamilyToiletOnly = selectedTypes.length === 1 && includesFamilyFriendlyToilets;
  const isInspectionOnly = selectedTypes.length === 1 && includesInspectionStations;
  const isChargingOnly = selectedTypes.length === 1 && includesChargingStations;
  const isCommercialEvOnly = selectedTypes.length === 1 && includesCommercialEvStations;
  const isGasLpgOnly = selectedTypes.length === 1 && includesGasLpgStations;
  const isDesignatedSmokingAreaOnly = selectedTypes.length === 1 && includesDesignatedSmokingAreas;
  const isAnnouncedNoSmokingPlaceOnly = selectedTypes.length === 1 && includesAnnouncedNoSmokingPlaces;
  const isSpecializedToiletOnly = isRiversideOnly || isFamilyToiletOnly;
  const listHeading = nearbyFacilities
    ? t.nearestFacilities
      : isLactationOnly
        ? t.lactationRoomDirectory
        : isInspectionOnly
          ? t.motorcycleInspectionStationDirectory
          : isChargingOnly
            ? t.electricMotorcycleChargingStationDirectory
            : isCommercialEvOnly
              ? t.commercialEvChargingSwapStationDirectory
              : isGasLpgOnly
                ? t.gasLpgStationDirectory
              : isDesignatedSmokingAreaOnly
                  ? t.designatedSmokingAreaDirectory
                  : isAnnouncedNoSmokingPlaceOnly
                    ? t.announcedNoSmokingPlaceDirectory
                : t.matchingFacilities;
  const formattedGeneratedAt = useMemo(() => {
    if (!report?.generatedAt) {
      return '';
    }

    return new Intl.DateTimeFormat(language === 'zh' ? 'zh-TW' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Taipei',
    }).format(new Date(report.generatedAt));
  }, [language, report?.generatedAt]);

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setError('');
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setNearbyFacilities(null);
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setNearbyFacilities(null);
  };

  const handleTypeChange = (value: FacilityType[]) => {
    setSelectedTypes(value);
    if (!value.includes('public_toilet')) {
      setToiletCategory('');
      setRequiresAccessibleToilet(false);
      setRequiresParentChildToilet(false);
    }
    if (!value.includes('drinking_fountain')) {
      setDrinkingFountainPlaceCategory('');
      setRequiresOpeningHours(false);
    }
    if (!value.includes('timed_collection_point')) {
      setAcceptsGarbage(false);
      setAcceptsRecycling(false);
      setAcceptsFoodWaste(false);
      setHasSpecialHours(false);
    }
    if (!value.includes('direct_drinking_station')) {
      setDirectDrinkingNormalOnly(true);
      setIncludeSuspended(false);
      setTaipeiCityOnly(true);
      setDirectDrinkingPlaceCategory('');
      setRequiresMaintenanceUrl(false);
      setRequiresPhotoUrl(false);
    }
    if (!value.includes('used_clothing_recycling_box')) {
      setUsedClothingVillage('');
      setUsedClothingOrganization('');
      setUsedClothingHasPhone(false);
    }
    if (!value.includes('lactation_room')) {
      setLactationHasOpeningHours(false);
      setLactationHasPhone(false);
      setLactationHasMobile(false);
      setLactationHasLocationGuidance(false);
      setLactationHasCertification(false);
      setLactationHasNotes(false);
      setLactationLegalRequired(false);
      setLactationBasicEquipment('');
      setLactationFriendlyService('');
    }
    if (!value.includes('riverside_toilet')) {
      setRiversidePark('');
      setRiversideToiletType('');
      setRiversideHasRemark(false);
    }
    if (!value.includes('family_friendly_toilet')) {
      setFamilyToiletCategory('');
      setFamilyToiletGrade('');
      setFamilyManager('');
      setFamilyHasDiaperTable(false);
      setFamilyHasChildSeat(false);
      setFamilyHasAward(false);
    }
    if (!value.includes('motorcycle_inspection_station')) {
      setInspectionBrand('');
      setInspectionPostalCode('');
      setInspectionHasPhone(false);
    }
    if (!value.includes('electric_motorcycle_charging_station')) {
      setChargingLocationCategory('');
      setChargingCity('');
      setChargingDistrictCode('');
      setChargingHasAddress(false);
    }
    if (!value.includes('commercial_ev_charging_swap_station')) {
      setCommercialEvServiceType('');
      setCommercialEvOperator('');
      setCommercialEvCity('');
      setCommercialEvCityCode('');
      setCommercialEvHasAddress(false);
      setCommercialEvHasDistrict(false);
    }
    if (!value.includes('gas_lpg_station')) {
      setGasLpgSupplier('');
      setGasLpgHasOil(false);
      setGasLpgHasLpg(false);
      setGasLpgHasSelfService(false);
      setGasLpgTwentyFourHours(false);
      setGasLpgLimitedHours(false);
      setGasLpgStationStatus('');
      setGasLpgHasPhone(false);
    }
    if (!value.includes('designated_smoking_area')) {
      setSmokingAreaType('');
      setSmokingOpeningHoursType('');
      setSmokingListed24Hours(false);
      setSmokingHasPhoto(false);
      setSmokingHasRelativeLocation(false);
      setSmokingManagingUnitCategory('');
      setSmokingManagingUnit('');
    }
    if (!value.includes('announced_no_smoking_place')) {
      setNoSmokingRecordType('');
      setNoSmokingAnnouncementYear('');
      setNoSmokingCoordinateStatus('');
      setNoSmokingSourceResource('');
      setNoSmokingHasCoordinates(false);
      setNoSmokingHasAddress(false);
      setNoSmokingHasLocationDescription(false);
    }
    setNearbyFacilities(null);
  };

  const handleToiletCategoryChange = (value: string) => {
    setToiletCategory(value);
    setNearbyFacilities(null);
  };

  const handleAccessibleToiletChange = (value: boolean) => {
    setRequiresAccessibleToilet(value);
    setNearbyFacilities(null);
  };

  const handleParentChildToiletChange = (value: boolean) => {
    setRequiresParentChildToilet(value);
    setNearbyFacilities(null);
  };

  const handleDrinkingFountainCategoryChange = (value: DrinkingFountainPlaceCategory | '') => {
    setDrinkingFountainPlaceCategory(value);
    setNearbyFacilities(null);
  };

  const handleOpeningHoursChange = (value: boolean) => {
    setRequiresOpeningHours(value);
    setNearbyFacilities(null);
  };

  const handleTimedCollectionFilterChange = (
    name: 'garbage' | 'recycling' | 'foodWaste' | 'specialHours',
    value: boolean,
  ) => {
    if (name === 'garbage') setAcceptsGarbage(value);
    if (name === 'recycling') setAcceptsRecycling(value);
    if (name === 'foodWaste') setAcceptsFoodWaste(value);
    if (name === 'specialHours') setHasSpecialHours(value);
    setNearbyFacilities(null);
  };

  const handleDirectDrinkingBooleanChange = (
    name: 'normalOnly' | 'includeSuspended' | 'taipeiCityOnly' | 'maintenance' | 'photo',
    value: boolean,
  ) => {
    if (name === 'normalOnly') {
      setDirectDrinkingNormalOnly(value);
      if (value) setIncludeSuspended(false);
    }
    if (name === 'includeSuspended') {
      setIncludeSuspended(value);
      if (value) setDirectDrinkingNormalOnly(false);
    }
    if (name === 'taipeiCityOnly') setTaipeiCityOnly(value);
    if (name === 'maintenance') setRequiresMaintenanceUrl(value);
    if (name === 'photo') setRequiresPhotoUrl(value);
    setNearbyFacilities(null);
  };

  const handleNearbyClick = () => {
    if (filteredFacilities.length === 0) {
      return;
    }

    const distanceCandidates = filteredFacilities.filter(
      (facility) =>
        facility.locationPrecision !== 'address_only' &&
        (!facility.coordinateStatus || facility.coordinateStatus === 'valid') &&
        !facility.isCoordinateOutlier,
    );
    if (distanceCandidates.length === 0) {
      setError('distance');
      return;
    }

    if (!navigator.geolocation) {
      setError('location');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const nearest = distanceCandidates
          .map((facility) => ({
            ...facility,
            distanceMeters: calculateDistanceMeters(
              nextLocation.latitude,
              nextLocation.longitude,
              facility.latitude,
              facility.longitude,
            ),
          }))
          .filter((facility) => !isSpecializedToiletOnly || (facility.distanceMeters ?? Infinity) <= nearbyRadiusMeters)
          .sort((first, second) => (first.distanceMeters ?? 0) - (second.distanceMeters ?? 0))
          .slice(0, 10);

        setUserLocation(nextLocation);
        setNearbyFacilities(nearest);
        setIsLocating(false);
      },
      () => {
        setError('location');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p>{t.subtitle}</p>
          <h1>{t.appTitle}</h1>
        </div>
        <LanguageToggle language={language} onChange={handleLanguageChange} />
      </header>

      <main>
        <section className="controls-panel" aria-label={t.searchPlaceholder}>
          <div className="metrics-strip" aria-label={t.sourceStatus}>
            <div>
              <span>{t.totalFacilities}</span>
              <strong>{facilities.length.toLocaleString()}</strong>
            </div>
            <div>
              <span>{t.visibleFacilities}</span>
              <strong>{displayedFacilities.length.toLocaleString()}</strong>
            </div>
            <div>
              <span>{t.sourceStatus}</span>
              <strong>{report ? report.totalValidRows.toLocaleString() : 'JSON'}</strong>
            </div>
          </div>
          <SearchFilters
            district={district}
            districts={districts}
            placeholder={isLactationOnly
              ? t.lactationRoomSearchPlaceholder
              : isInspectionOnly
                ? t.inspectionStationSearchPlaceholder
                : isChargingOnly
                  ? t.chargingStationSearchPlaceholder
                  : isCommercialEvOnly
                    ? t.commercialEvSearchPlaceholder
                    : isGasLpgOnly
                      ? t.gasLpgSearchPlaceholder
                      : isDesignatedSmokingAreaOnly
                        ? t.designatedSmokingAreaSearchPlaceholder
                        : isAnnouncedNoSmokingPlaceOnly
                          ? t.announcedNoSmokingPlaceSearchPlaceholder
              : isSpecializedToiletOnly
                ? t.toiletSearchPlaceholder
                : t.searchPlaceholder}
            searchTerm={searchTerm}
            t={t}
            onDistrictChange={handleDistrictChange}
            onSearchChange={handleSearchChange}
          />
          <FacilityTypeFilter selectedTypes={selectedTypes} t={t} onChange={handleTypeChange} />
          {hasFocusedTypes && includesPublicToilets && (
            <PublicToiletFilters
              categories={toiletCategories}
              language={language}
              selectedCategory={toiletCategory}
              requiresAccessibleToilet={requiresAccessibleToilet}
              requiresParentChildToilet={requiresParentChildToilet}
              t={t}
              onCategoryChange={handleToiletCategoryChange}
              onAccessibleChange={handleAccessibleToiletChange}
              onParentChildChange={handleParentChildToiletChange}
            />
          )}
          {hasFocusedTypes && includesRiversideToilets && (
            <RiversideToiletFilters
              parks={riversideParks}
              park={riversidePark}
              toiletType={riversideToiletType}
              hasRemark={riversideHasRemark}
              language={language}
              t={t}
              onParkChange={(value) => {
                setRiversidePark(value);
                setNearbyFacilities(null);
              }}
              onTypeChange={(value) => {
                setRiversideToiletType(value);
                setNearbyFacilities(null);
              }}
              onHasRemarkChange={(value) => {
                setRiversideHasRemark(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {hasFocusedTypes && includesFamilyFriendlyToilets && (
            <FamilyFriendlyToiletFilters
              categories={familyToiletCategories}
              grades={familyToiletGrades}
              managers={familyToiletManagers}
              category={familyToiletCategory}
              grade={familyToiletGrade}
              manager={familyManager}
              hasDiaperTable={familyHasDiaperTable}
              hasChildSeat={familyHasChildSeat}
              hasAward={familyHasAward}
              t={t}
              onChange={(name, value) => {
                if (name === 'category') setFamilyToiletCategory(value);
                if (name === 'grade') setFamilyToiletGrade(value);
                if (name === 'manager') setFamilyManager(value);
                setNearbyFacilities(null);
              }}
              onBooleanChange={(name, value) => {
                if (name === 'diaper') setFamilyHasDiaperTable(value);
                if (name === 'childSeat') setFamilyHasChildSeat(value);
                if (name === 'award') setFamilyHasAward(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {hasFocusedTypes && includesInspectionStations && (
            <MotorcycleInspectionStationFilters
              brands={inspectionBrands}
              postalCodes={inspectionPostalCodes}
              brand={inspectionBrand}
              postalCode={inspectionPostalCode}
              hasPhone={inspectionHasPhone}
              t={t}
              onBrandChange={(value) => {
                setInspectionBrand(value);
                setNearbyFacilities(null);
              }}
              onPostalCodeChange={(value) => {
                setInspectionPostalCode(value);
                setNearbyFacilities(null);
              }}
              onHasPhoneChange={(value) => {
                setInspectionHasPhone(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {hasFocusedTypes && includesChargingStations && (
            <ElectricMotorcycleChargingStationFilters
              cities={chargingCities}
              districtCodes={chargingDistrictCodes}
              locationCategory={chargingLocationCategory}
              city={chargingCity}
              districtCode={chargingDistrictCode}
              hasAddress={chargingHasAddress}
              language={language}
              t={t}
              onLocationCategoryChange={(value) => {
                setChargingLocationCategory(value);
                setNearbyFacilities(null);
              }}
              onCityChange={(value) => {
                setChargingCity(value);
                setNearbyFacilities(null);
              }}
              onDistrictCodeChange={(value) => {
                setChargingDistrictCode(value);
                setNearbyFacilities(null);
              }}
              onHasAddressChange={(value) => {
                setChargingHasAddress(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {hasFocusedTypes && includesCommercialEvStations && (
            <CommercialEvChargingSwapStationFilters
              operators={commercialEvOperators}
              cities={commercialEvCities}
              cityCodes={commercialEvCityCodes}
              serviceType={commercialEvServiceType}
              operator={commercialEvOperator}
              city={commercialEvCity}
              cityCode={commercialEvCityCode}
              hasAddress={commercialEvHasAddress}
              hasDistrict={commercialEvHasDistrict}
              language={language}
              t={t}
              onServiceTypeChange={(value) => {
                setCommercialEvServiceType(value);
                setNearbyFacilities(null);
              }}
              onOperatorChange={(value) => {
                setCommercialEvOperator(value);
                setNearbyFacilities(null);
              }}
              onCityChange={(value) => {
                setCommercialEvCity(value);
                setNearbyFacilities(null);
              }}
              onCityCodeChange={(value) => {
                setCommercialEvCityCode(value);
                setNearbyFacilities(null);
              }}
              onHasAddressChange={(value) => {
                setCommercialEvHasAddress(value);
                setNearbyFacilities(null);
              }}
              onHasDistrictChange={(value) => {
                setCommercialEvHasDistrict(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {hasFocusedTypes && includesGasLpgStations && (
            <GasLpgStationFilters
              suppliers={gasLpgSuppliers}
              supplier={gasLpgSupplier}
              hasOil={gasLpgHasOil}
              hasLpg={gasLpgHasLpg}
              hasSelfService={gasLpgHasSelfService}
              twentyFourHours={gasLpgTwentyFourHours}
              limitedHours={gasLpgLimitedHours}
              stationStatus={gasLpgStationStatus}
              hasPhone={gasLpgHasPhone}
              t={t}
              onSupplierChange={(value) => {
                setGasLpgSupplier(value);
                setNearbyFacilities(null);
              }}
              onStatusChange={(value) => {
                setGasLpgStationStatus(value);
                setNearbyFacilities(null);
              }}
              onBooleanChange={(name, value) => {
                if (name === 'oil') setGasLpgHasOil(value);
                if (name === 'lpg') setGasLpgHasLpg(value);
                if (name === 'self') setGasLpgHasSelfService(value);
                if (name === 'twentyFourHours') setGasLpgTwentyFourHours(value);
                if (name === 'limitedHours') setGasLpgLimitedHours(value);
                if (name === 'phone') setGasLpgHasPhone(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {hasFocusedTypes && includesDesignatedSmokingAreas && (
            <DesignatedSmokingAreaFilters
              managingUnits={smokingManagingUnits}
              smokingAreaType={smokingAreaType}
              openingHoursType={smokingOpeningHoursType}
              listed24Hours={smokingListed24Hours}
              hasPhoto={smokingHasPhoto}
              hasRelativeLocation={smokingHasRelativeLocation}
              managingUnitCategory={smokingManagingUnitCategory}
              managingUnit={smokingManagingUnit}
              language={language}
              t={t}
              onSmokingAreaTypeChange={(value) => {
                setSmokingAreaType(value);
                setNearbyFacilities(null);
              }}
              onOpeningHoursTypeChange={(value) => {
                setSmokingOpeningHoursType(value);
                setNearbyFacilities(null);
              }}
              onManagingUnitCategoryChange={(value) => {
                setSmokingManagingUnitCategory(value);
                setNearbyFacilities(null);
              }}
              onManagingUnitChange={(value) => {
                setSmokingManagingUnit(value);
                setNearbyFacilities(null);
              }}
              onBooleanChange={(name, value) => {
                if (name === 'listed24Hours') setSmokingListed24Hours(value);
                if (name === 'photo') setSmokingHasPhoto(value);
                if (name === 'relativeLocation') setSmokingHasRelativeLocation(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {hasFocusedTypes && includesAnnouncedNoSmokingPlaces && (
            <AnnouncedNoSmokingPlaceFilters
              sourceResources={noSmokingSourceResources}
              announcementYears={noSmokingAnnouncementYears}
              recordType={noSmokingRecordType}
              announcementYear={noSmokingAnnouncementYear}
              coordinateStatus={noSmokingCoordinateStatus}
              sourceResource={noSmokingSourceResource}
              hasCoordinates={noSmokingHasCoordinates}
              hasAddress={noSmokingHasAddress}
              hasLocationDescription={noSmokingHasLocationDescription}
              language={language}
              t={t}
              onRecordTypeChange={(value) => {
                setNoSmokingRecordType(value);
                setNearbyFacilities(null);
              }}
              onAnnouncementYearChange={(value) => {
                setNoSmokingAnnouncementYear(value);
                setNearbyFacilities(null);
              }}
              onCoordinateStatusChange={(value) => {
                setNoSmokingCoordinateStatus(value);
                setNearbyFacilities(null);
              }}
              onSourceResourceChange={(value) => {
                setNoSmokingSourceResource(value);
                setNearbyFacilities(null);
              }}
              onBooleanChange={(name, value) => {
                if (name === 'coordinates') setNoSmokingHasCoordinates(value);
                if (name === 'address') setNoSmokingHasAddress(value);
                if (name === 'locationDescription') setNoSmokingHasLocationDescription(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {isSpecializedToiletOnly && (
            <label className="nearby-radius">
              <span>{t.nearbyRadius}</span>
              <select value={nearbyRadiusMeters} onChange={(event) => setNearbyRadiusMeters(Number(event.target.value))}>
                {[300, 500, 1000, 2000, 5000].map((value) => (
                  <option key={value} value={value}>{value < 1000 ? `${value} m` : `${value / 1000} km`}</option>
                ))}
              </select>
            </label>
          )}
          {hasFocusedTypes && includesDrinkingFountains && (
            <DrinkingFountainFilters
              selectedCategory={drinkingFountainPlaceCategory}
              requiresOpeningHours={requiresOpeningHours}
              t={t}
              onCategoryChange={handleDrinkingFountainCategoryChange}
              onOpeningHoursChange={handleOpeningHoursChange}
            />
          )}
          {hasFocusedTypes && includesTimedCollectionPoints && (
            <TimedCollectionFilters
              acceptsGarbage={acceptsGarbage}
              acceptsRecycling={acceptsRecycling}
              acceptsFoodWaste={acceptsFoodWaste}
              hasSpecialHours={hasSpecialHours}
              t={t}
              onChange={handleTimedCollectionFilterChange}
            />
          )}
          {hasFocusedTypes && includesDirectDrinkingStations && (
            <DirectDrinkingFilters
              normalOnly={directDrinkingNormalOnly}
              includeSuspended={includeSuspended}
              taipeiCityOnly={taipeiCityOnly}
              placeCategory={directDrinkingPlaceCategory}
              hasMaintenanceInfo={requiresMaintenanceUrl}
              hasPhoto={requiresPhotoUrl}
              language={language}
              t={t}
              onBooleanChange={handleDirectDrinkingBooleanChange}
              onPlaceCategoryChange={(value) => {
                setDirectDrinkingPlaceCategory(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {includesUsedClothing && (
            <UsedClothingFilters
              villages={usedClothingVillages}
              organizations={usedClothingOrganizations}
              village={usedClothingVillage}
              organization={usedClothingOrganization}
              hasPhone={usedClothingHasPhone}
              t={t}
              onVillageChange={(value) => {
                setUsedClothingVillage(value);
                setNearbyFacilities(null);
              }}
              onOrganizationChange={(value) => {
                setUsedClothingOrganization(value);
                setNearbyFacilities(null);
              }}
              onHasPhoneChange={(value) => {
                setUsedClothingHasPhone(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          {hasFocusedTypes && includesLactationRooms && (
            <LactationRoomFilters
              basicEquipmentOptions={lactationBasicEquipmentOptions}
              friendlyServiceOptions={lactationFriendlyServiceOptions}
              values={{
                openingHours: lactationHasOpeningHours,
                phone: lactationHasPhone,
                mobile: lactationHasMobile,
                locationGuidance: lactationHasLocationGuidance,
                certification: lactationHasCertification,
                notes: lactationHasNotes,
                legalRequired: lactationLegalRequired,
                basicEquipment: lactationBasicEquipment,
                friendlyService: lactationFriendlyService,
              }}
              t={t}
              onBooleanChange={(name, value) => {
                if (name === 'openingHours') setLactationHasOpeningHours(value);
                if (name === 'phone') setLactationHasPhone(value);
                if (name === 'mobile') setLactationHasMobile(value);
                if (name === 'locationGuidance') setLactationHasLocationGuidance(value);
                if (name === 'certification') setLactationHasCertification(value);
                if (name === 'notes') setLactationHasNotes(value);
                if (name === 'legalRequired') setLactationLegalRequired(value);
                setNearbyFacilities(null);
              }}
              onBasicEquipmentChange={(value) => {
                setLactationBasicEquipment(value);
                setNearbyFacilities(null);
              }}
              onFriendlyServiceChange={(value) => {
                setLactationFriendlyService(value);
                setNearbyFacilities(null);
              }}
            />
          )}
          <NearbyButton
            disabled={isLoadingFacilities || filteredFacilities.length === 0}
            isLoading={isLocating}
            label={isLactationOnly
              ? t.viewLactationRoomsByNearbyDistrict
              : isInspectionOnly
                  ? t.viewInspectionStationsByNearbyDistrict
                  : isChargingOnly
                    ? t.viewChargingStationsByNearbyDistrict
                    : isCommercialEvOnly
                      ? t.viewCommercialEvStationsByNearbyDistrict
                      : isGasLpgOnly
                        ? t.showNearbyGasLpgStations
                        : isDesignatedSmokingAreaOnly
                          ? t.findNearbyDesignatedSmokingAreas
                          : isAnnouncedNoSmokingPlaceOnly
                            ? t.findNearbyAnnouncedNoSmokingPlaces
              : isRiversideOnly
                ? t.showNearbyRiversideToilets
                : isFamilyToiletOnly
                  ? t.showNearbyFamilyFriendlyToilets
                  : undefined}
            t={t}
            onClick={handleNearbyClick}
          />
        </section>

        <WarningNotice selectedTypes={selectedTypes} t={t} />

        {error && (
          <p className="status-message error">
            {error === 'load'
              ? t.loadError
              : error === 'distance'
                ? includesInspectionStations
                  ? t.inspectionStationDistanceUnavailableNotice
                  : includesChargingStations
                    ? t.chargingStationDistanceUnavailableNotice
                  : includesCommercialEvStations
                    ? t.commercialEvDistanceUnavailableNotice
                    : includesAnnouncedNoSmokingPlaces
                      ? t.announcedNoSmokingPlaceDistanceUnavailableNotice
                  : t.lactationRoomDistanceUnavailableNotice
                : t.unableToGetLocation}
          </p>
        )}
        {includesLactationRooms && <p className="status-message">{t.lactationRoomNoCoordinateNotice}</p>}
        {includesInspectionStations && <p className="status-message">{t.inspectionStationNoCoordinateNotice}</p>}
        {includesChargingStations && <p className="status-message">{t.chargingStationNoCoordinateNotice}</p>}
        {includesCommercialEvStations && <p className="status-message">{t.commercialEvNoCoordinateNotice}</p>}
        {includesAnnouncedNoSmokingPlaces && <p className="status-message">{t.announcedNoSmokingPlaceNotice}</p>}
        {isLoadingFacilities ? (
          <p className="status-message">{t.loading}</p>
        ) : (
          <div className="workspace">
            <Suspense fallback={<section className="map-panel map-loading">{t.mapLoading}</section>}>
              <FacilityMap
                facilities={deferredMapFacilities}
                language={language}
                markerLimitExceeded={markerLimitExceeded}
                lactationDistrictSummaries={lactationDistrictSummaries}
                inspectionDistrictSummaries={inspectionDistrictSummaries}
                chargingDistrictSummaries={chargingDistrictSummaries}
                commercialEvDistrictSummaries={commercialEvDistrictSummaries}
                t={t}
                userLocation={userLocation}
              />
            </Suspense>
            <FacilityList
              facilities={listFacilities}
              heading={listHeading}
              isLimited={isListLimited}
              language={language}
              t={t}
              totalCount={displayedFacilities.length}
            />
          </div>
        )}
      </main>

      <footer>
        <span>{t.footer}</span>
        {report && formattedGeneratedAt && (
          <span>
            {t.dataUpdated}: {formattedGeneratedAt} ({report.totalValidRows.toLocaleString()} {t.generatedRecords})
          </span>
        )}
      </footer>
    </div>
  );
}

export default App;
