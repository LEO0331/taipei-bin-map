import { useEffect, useMemo, useState } from 'react';
import { BinList } from './components/BinList';
import { BinMap } from './components/BinMap';
import { LanguageToggle } from './components/LanguageToggle';
import { NearbyButton } from './components/NearbyButton';
import { SearchFilters } from './components/SearchFilters';
import { WarningNotice } from './components/WarningNotice';
import { translations } from './i18n';
import type { Bin, BinWithDistance, Language } from './types';
import { calculateDistanceMeters, filterBins } from './utils/binUtils';

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

type UserLocation = {
  latitude: number;
  longitude: number;
};

const getInitialLanguage = (): Language => {
  const stored = window.localStorage.getItem('language');
  return stored === 'en' ? 'en' : 'zh';
};

function App() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [searchTerm, setSearchTerm] = useState('');
  const [district, setDistrict] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyBins, setNearbyBins] = useState<BinWithDistance[] | null>(null);
  const [isLoadingBins, setIsLoadingBins] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const t = translations[language];

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    window.localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    let isMounted = true;

    fetch('/data/bins.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<Bin[]>;
      })
      .then((data) => {
        if (isMounted) {
          setBins(data);
          setError('');
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(t.loadError);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingBins(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t.loadError]);

  const districts = useMemo(() => {
    const dataDistricts = new Set(bins.map((bin) => bin.district).filter(Boolean));
    return DISTRICT_ORDER.filter((item) => dataDistricts.has(item));
  }, [bins]);

  const filteredBins = useMemo(() => filterBins(bins, searchTerm, district), [bins, district, searchTerm]);

  const displayedBins = nearbyBins ?? filteredBins;
  const listHeading = nearbyBins ? t.nearestBins : t.matchingBins;

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setError('');
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setNearbyBins(null);
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setNearbyBins(null);
  };

  const handleNearbyClick = () => {
    if (!navigator.geolocation) {
      setError(t.locationError);
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

        const nearest = bins
          .map((bin) => ({
            ...bin,
            distanceMeters: calculateDistanceMeters(
              nextLocation.latitude,
              nextLocation.longitude,
              bin.latitude,
              bin.longitude,
            ),
          }))
          .sort((first, second) => (first.distanceMeters ?? 0) - (second.distanceMeters ?? 0))
          .slice(0, 10);

        setUserLocation(nextLocation);
        setNearbyBins(nearest);
        setIsLocating(false);
      },
      () => {
        setError(t.locationError);
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
          <SearchFilters
            district={district}
            districts={districts}
            searchTerm={searchTerm}
            t={t}
            onDistrictChange={handleDistrictChange}
            onSearchChange={handleSearchChange}
          />
          <NearbyButton isLoading={isLocating} t={t} onClick={handleNearbyClick} />
        </section>

        <WarningNotice t={t} />

        {error && <p className="status-message error">{error}</p>}
        {isLoadingBins ? (
          <p className="status-message">{t.loading}</p>
        ) : (
          <div className="workspace">
            <BinMap bins={displayedBins} t={t} userLocation={userLocation} />
            <BinList bins={displayedBins} heading={listHeading} language={language} t={t} />
          </div>
        )}
      </main>

      <footer>{t.footer}</footer>
    </div>
  );
}

export default App;
