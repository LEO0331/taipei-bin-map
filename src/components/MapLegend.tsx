import { useState } from 'react';
import type { Translation } from '../i18n';
import type { FacilityType, Language } from '../types';
import { getFacilityTypeLabel } from '../utils/facilityUtils';

export const markerEmojiByType = {
  pedestrian_bin: '🗑️', dog_waste_bag_box: '🐾', public_toilet: '🚻',
  riverside_toilet: '🌊', family_friendly_toilet: '🚼', drinking_fountain: '🚰',
  timed_collection_point: '♻️', direct_drinking_station: '🚰', used_clothing_recycling_box: '👕',
  lactation_room: '🍼', motorcycle_inspection_station: '🏍️', electric_motorcycle_charging_station: '🔌',
  commercial_ev_charging_swap_station: '🔋', gas_lpg_station: '⛽', designated_smoking_area: '⌖',
  announced_no_smoking_place: '🚭', community_recycling_station: '🏘️', clean_needle_exchange_service_point: '🏥',
  protected_tree: '🌳', pay_taipei_cardless_parking_lot: '🅿️', green_space_adoption_record: 'GS',
  accessible_public_parking_facility: '♿',
} satisfies Record<FacilityType, string>;

type MapLegendProps = {
  t: Translation;
  language: Language;
  selectedTypes: FacilityType[];
  hasUserLocation: boolean;
};

export function MapLegend({ t, language, selectedTypes, hasUserLocation }: MapLegendProps) {
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 761px)').matches);
  if (!selectedTypes.length && !hasUserLocation) return null;

  return (
    <details className="map-legend" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>{t.mapLegend}</summary>
      <div className="map-legend-items">
        {selectedTypes.map(type => (
          <span key={type}><i aria-hidden="true">{markerEmojiByType[type]}</i>{getFacilityTypeLabel(type, language)}</span>
        ))}
        {hasUserLocation && <span><i aria-hidden="true">📍</i>{t.userLocation}</span>}
      </div>
    </details>
  );
}
