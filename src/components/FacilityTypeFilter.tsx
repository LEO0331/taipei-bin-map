import type { Translation } from '../i18n';
import type { FacilityType } from '../types';

type FacilityTypeFilterProps = {
  selectedTypes: FacilityType[];
  t: Translation;
  onChange: (types: FacilityType[]) => void;
};

export const FACILITY_TYPE_OPTIONS: FacilityType[] = [
  'pedestrian_bin',
  'dog_waste_bag_box',
  'public_toilet',
  'riverside_toilet',
  'family_friendly_toilet',
  'drinking_fountain',
  'timed_collection_point',
  'direct_drinking_station',
  'used_clothing_recycling_box',
  'lactation_room',
  'motorcycle_inspection_station',
  'electric_motorcycle_charging_station',
  'commercial_ev_charging_swap_station',
  'gas_lpg_station',
  'designated_smoking_area',
  'announced_no_smoking_place',
  'community_recycling_station',
  'clean_needle_exchange_service_point',
  'protected_tree',
  'pay_taipei_cardless_parking_lot',
];

export function FacilityTypeFilter({ selectedTypes, t, onChange }: FacilityTypeFilterProps) {
  const labelByType = {
    pedestrian_bin: t.pedestrianBins,
    dog_waste_bag_box: t.dogWasteBagBoxes,
    public_toilet: t.publicToilets,
    riverside_toilet: t.riversideToilets,
    family_friendly_toilet: t.familyFriendlyToilets,
    drinking_fountain: t.drinkingFountains,
    timed_collection_point: t.timedCollectionPoints,
    direct_drinking_station: t.directDrinkingStations,
    used_clothing_recycling_box: t.usedClothingRecyclingBoxes,
    lactation_room: t.lactationRooms,
    motorcycle_inspection_station: t.motorcycleInspectionStations,
    electric_motorcycle_charging_station: t.electricMotorcycleChargingStations,
    commercial_ev_charging_swap_station: t.commercialEvChargingSwapStations,
    gas_lpg_station: t.gasLpgStations,
    designated_smoking_area: t.designatedSmokingAreas,
    announced_no_smoking_place: t.announcedNoSmokingPlaces,
    community_recycling_station: t.communityRecyclingStations,
    clean_needle_exchange_service_point: t.cleanNeedleExchangeServicePoints,
    protected_tree: t.protectedTrees,
    pay_taipei_cardless_parking_lot: t.payTaipeiCardlessParkingLots,
  } satisfies Record<FacilityType, string>;

  const allSelected = selectedTypes.length === FACILITY_TYPE_OPTIONS.length;

  const toggleType = (type: FacilityType) => {
    if (allSelected) {
      onChange([type]);
      return;
    }

    const nextTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((item) => item !== type)
      : [...selectedTypes, type];

    onChange(nextTypes.length > 0 ? nextTypes : selectedTypes);
  };

  return (
    <fieldset className="facility-type-filter">
      <legend>{t.facilityType}</legend>
      <div role="group" aria-label={t.facilityType}>
        {FACILITY_TYPE_OPTIONS.map((type) => (
          <button
            key={type}
            type="button"
            className={selectedTypes.includes(type) ? 'active' : ''}
            aria-pressed={selectedTypes.includes(type)}
            onClick={() => toggleType(type)}
          >
            {labelByType[type]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
