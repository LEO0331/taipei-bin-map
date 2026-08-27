import { useEffect, useState } from 'react';
import type { Language } from '../types';
import { TileLayer } from 'react-leaflet';

export type BasemapPreference = 'default' | 'english';

const STORAGE_KEY = 'basemap-label-language';

export function useBasemapPreference(language: Language) {
  const [basemap, setBasemap] = useState<BasemapPreference>(() =>
    window.localStorage.getItem(STORAGE_KEY) === 'english' ? 'english' : 'default',
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, basemap);
    window.dispatchEvent(new Event('basemap-preference-change'));
  }, [basemap]);

  useEffect(() => {
    const sync = () => setBasemap(window.localStorage.getItem(STORAGE_KEY) === 'english' ? 'english' : 'default');
    window.addEventListener('basemap-preference-change', sync);
    return () => window.removeEventListener('basemap-preference-change', sync);
  }, []);

  const labelsAreEnglish = basemap === 'english';
  const tileUrl = labelsAreEnglish
    ? 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png?lang=en'
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = labelsAreEnglish
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; Wikimedia'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const control = <label className="basemap-preference">{language === 'zh' ? '地圖標籤' : 'Map labels'}<select value={basemap} onChange={(event) => setBasemap(event.target.value as BasemapPreference)}><option value="default">{language === 'zh' ? '地方名稱' : 'Local names'}</option><option value="english">English</option></select><small>{language === 'zh' ? '僅切換底圖文字；官方資料名稱與地址維持原文。' : 'Basemap labels only; official source names and addresses remain unchanged.'}</small></label>;

  return { tileUrl, attribution, control };
}

export function BasemapControl({ language }: { language: Language }) {
  return useBasemapPreference(language).control;
}

export function BasemapTileLayer({ language }: { language: Language }) {
  const basemap = useBasemapPreference(language);
  return <TileLayer attribution={basemap.attribution} url={basemap.tileUrl} />;
}
