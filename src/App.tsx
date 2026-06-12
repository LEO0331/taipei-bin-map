import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { FacilityList } from './components/FacilityList';
import { FacilityTypeFilter, type FacilityTypeSelection } from './components/FacilityTypeFilter';
import { LanguageToggle } from './components/LanguageToggle';
import { NearbyButton } from './components/NearbyButton';
import { SearchFilters } from './components/SearchFilters';
import { WarningNotice } from './components/WarningNotice';
import { translations } from './i18n';
import type { ConversionReport, Facility, FacilityType, FacilityWithDistance, Language } from './types';
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

const selectedFacilityTypes = (selectedType: FacilityTypeSelection): FacilityType[] =>
  selectedType === 'all' ? ['pedestrian_bin', 'dog_waste_bag_box'] : [selectedType];

function App() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [report, setReport] = useState<ConversionReport | null>(null);
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [searchTerm, setSearchTerm] = useState('');
  const [district, setDistrict] = useState('');
  const [selectedType, setSelectedType] = useState<FacilityTypeSelection>('all');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyFacilities, setNearbyFacilities] = useState<FacilityWithDistance[] | null>(null);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<ErrorKey>('');

  const t = translations[language];
  const activeFacilityTypes = useMemo(() => selectedFacilityTypes(selectedType), [selectedType]);

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

  const filteredFacilities = useMemo(
    () =>
      filterFacilities(facilities, {
        searchTerm,
        district,
        facilityTypes: activeFacilityTypes,
      }),
    [activeFacilityTypes, district, facilities, searchTerm],
  );

  const displayedFacilities = nearbyFacilities ?? filteredFacilities;
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

  const handleTypeChange = (value: FacilityTypeSelection) => {
    setSelectedType(value);
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
          <FacilityTypeFilter selectedType={selectedType} t={t} onChange={handleTypeChange} />
          <NearbyButton
            disabled={isLoadingFacilities || filteredFacilities.length === 0}
            isLoading={isLocating}
            t={t}
            onClick={handleNearbyClick}
          />
        </section>

        <WarningNotice selectedType={selectedType} t={t} />

        {error && <p className="status-message error">{error === 'load' ? t.loadError : t.unableToGetLocation}</p>}
        {isLoadingFacilities ? (
          <p className="status-message">{t.loading}</p>
        ) : (
          <div className="workspace">
            <Suspense fallback={<section className="map-panel map-loading">{t.mapLoading}</section>}>
              <FacilityMap
                facilities={displayedFacilities}
                language={language}
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
