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
        <i aria-hidden="true">🌊</i>
        {t.riversideToilets}
      </span>
      <span>
        <i aria-hidden="true">🚼</i>
        {t.familyFriendlyToilets}
      </span>
      <span>
        <i aria-hidden="true">🚰</i>
        {t.drinkingFountains}
      </span>
      <span>
        <i aria-hidden="true">♻️</i>
        {t.timedCollectionPoints}
      </span>
      <span>
        <i aria-hidden="true">🚰</i>
        {t.directDrinkingStations}
      </span>
      <span>
        <i aria-hidden="true">👕</i>
        {t.usedClothingRecyclingBoxes}
      </span>
      <span>
        <i aria-hidden="true">🍼</i>
        {t.lactationRooms}
      </span>
      <span>
        <i aria-hidden="true">🏍️</i>
        {t.motorcycleInspectionStations}
      </span>
      <span>
        <i aria-hidden="true">🔌</i>
        {t.electricMotorcycleChargingStations}
      </span>
      <span>
        <i aria-hidden="true">🔋</i>
        {t.commercialEvChargingSwapStations}
      </span>
      <span>
        <i aria-hidden="true">⛽</i>
        {t.gasLpgStations}
      </span>
      <span>
        <i aria-hidden="true">⌖</i>
        {t.designatedSmokingAreas}
      </span>
      <span>
        <i aria-hidden="true">🚭</i>
        {t.announcedNoSmokingPlaces}
      </span>
      <span>
        <i aria-hidden="true">🏘️</i>
        {t.communityRecyclingStations}
      </span>
      <span>
        <i aria-hidden="true">🏥</i>
        {t.cleanNeedleServicePoints}
      </span>
      <span>
        <i aria-hidden="true">🌳</i>
        {t.protectedTrees}
      </span>
      <span>
        <i aria-hidden="true">📍</i>
        {t.userLocation}
      </span>
    </div>
  );
}
