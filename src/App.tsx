import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { DrinkingFountainFilters } from './components/DrinkingFountainFilters';
import { DirectDrinkingFilters, TimedCollectionFilters } from './components/AdditionalFacilityFilters';
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
  DirectDrinkingPlaceCategory,
  DrinkingFountainPlaceCategory,
  Facility,
  FacilityType,
  FacilityWithDistance,
  Language,
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
const MAP_MARKER_LIMIT = 1800;
const FacilityMap = lazy(() =>
  import('./components/FacilityMap').then((module) => ({ default: module.FacilityMap })),
);

type UserLocation = {
  latitude: number;
  longitude: number;
};

type ErrorKey = 'load' | 'location' | '';

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
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyFacilities, setNearbyFacilities] = useState<FacilityWithDistance[] | null>(null);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<ErrorKey>('');

  const t = translations[language];
  const includesPublicToilets = selectedTypes.includes('public_toilet');
  const includesDrinkingFountains = selectedTypes.includes('drinking_fountain');
  const includesTimedCollectionPoints = selectedTypes.includes('timed_collection_point');
  const includesDirectDrinkingStations = selectedTypes.includes('direct_drinking_station');
  const hasFocusedTypes = selectedTypes.length < FACILITY_TYPE_OPTIONS.length;

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    window.localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    let isMounted = true;

    fetch('/data/facilities.json', { cache: 'no-cache' })
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

    fetch('/data/conversion-report.json', { cache: 'no-cache' })
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
    ],
  );

  const displayedFacilities = nearbyFacilities ?? filteredFacilities;
  const renderableFacilities = displayedFacilities.filter(
    (facility) =>
      Number.isFinite(facility.latitude) &&
      Number.isFinite(facility.longitude) &&
      !facility.isCoordinateOutlier,
  );
  const markerLimitExceeded = !nearbyFacilities && renderableFacilities.length > MAP_MARKER_LIMIT;
  const mapFacilities = markerLimitExceeded
    ? renderableFacilities.slice(0, MAP_MARKER_LIMIT)
    : renderableFacilities;
  const listFacilities = useMemo(
    () => (nearbyFacilities ? displayedFacilities : displayedFacilities.slice(0, INITIAL_LIST_LIMIT)),
    [displayedFacilities, nearbyFacilities],
  );
  const isListLimited = !nearbyFacilities && displayedFacilities.length > listFacilities.length;
  const listHeading = nearbyFacilities ? t.nearestFacilities : t.matchingFacilities;
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

        const nearest = filteredFacilities
          .map((facility) => ({
            ...facility,
            distanceMeters: calculateDistanceMeters(
              nextLocation.latitude,
              nextLocation.longitude,
              facility.latitude,
              facility.longitude,
            ),
          }))
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
          <NearbyButton
            disabled={isLoadingFacilities || filteredFacilities.length === 0}
            isLoading={isLocating}
            t={t}
            onClick={handleNearbyClick}
          />
        </section>

        <WarningNotice selectedTypes={selectedTypes} t={t} />

        {error && <p className="status-message error">{error === 'load' ? t.loadError : t.unableToGetLocation}</p>}
        {isLoadingFacilities ? (
          <p className="status-message">{t.loading}</p>
        ) : (
          <div className="workspace">
            <Suspense fallback={<section className="map-panel map-loading">{t.mapLoading}</section>}>
              <FacilityMap
                facilities={mapFacilities}
                language={language}
                markerLimitExceeded={markerLimitExceeded}
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
