import type { Translation } from '../i18n';

type MapLegendProps = {
  t: Translation;
};

export function MapLegend({ t }: MapLegendProps) {
  return (
    <div className="map-legend" aria-label={t.mapLegend}>
      <strong>{t.mapLegend}</strong>
      <span>
        <i className="legend-dot pedestrian" aria-hidden="true" />
        {t.pedestrianBins}
      </span>
      <span>
        <i className="legend-dot dog" aria-hidden="true" />
        {t.dogWasteBagBoxes}
      </span>
      <span>
        <i className="legend-dot user" aria-hidden="true" />
        {t.userLocation}
      </span>
    </div>
  );
}
