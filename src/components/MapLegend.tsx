import type { Translation } from '../i18n';

type MapLegendProps = {
  t: Translation;
};

export function MapLegend({ t }: MapLegendProps) {
  return (
    <div className="map-legend" aria-label={t.mapLegend}>
      <strong>{t.mapLegend}</strong>
      <span>
        <i aria-hidden="true">🗑️</i>
        {t.pedestrianBins}
      </span>
      <span>
        <i aria-hidden="true">🐾</i>
        {t.dogWasteBagBoxes}
      </span>
      <span>
        <i aria-hidden="true">🚻</i>
        {t.publicToilets}
      </span>
      <span>
        <i aria-hidden="true">📍</i>
        {t.userLocation}
      </span>
    </div>
  );
}
