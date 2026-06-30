import type { Translation } from '../i18n';
import type { FacilityType } from '../types';

type WarningNoticeProps = {
  selectedTypes: FacilityType[];
  t: Translation;
};

const noticeTypes: FacilityType[] = [
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
];

export function WarningNotice({ selectedTypes, t }: WarningNoticeProps) {
  const activeTypes = noticeTypes.filter((type) => selectedTypes.includes(type));
  const noticeByType = {
    pedestrian_bin: {
      label: t.pedestrianBins,
      notice: t.pedestrianBinNotice,
    },
    dog_waste_bag_box: {
      label: t.dogWasteBagBoxes,
      notice: t.dogWasteBagBoxNotice,
    },
    public_toilet: {
      label: t.publicToilets,
      notice: t.publicToiletNotice,
    },
    riverside_toilet: {
      label: t.riversideToilets,
      notice: t.riversideToiletDataNote,
    },
    family_friendly_toilet: {
      label: t.familyFriendlyToilets,
      notice: t.familyFriendlyToiletDataNote,
    },
    drinking_fountain: {
      label: t.drinkingFountains,
      notice: t.drinkingFountainNotice,
    },
    timed_collection_point: {
      label: t.timedCollectionPoints,
      notice: t.timedCollectionNotice,
    },
    direct_drinking_station: {
      label: t.directDrinkingStations,
      notice: t.directDrinkingNotice,
    },
    used_clothing_recycling_box: {
      label: t.usedClothingRecyclingBoxes,
      notice: t.usedClothingRecyclingNotice,
    },
    lactation_room: {
      label: t.lactationRooms,
      notice: t.lactationRoomNotice,
    },
    motorcycle_inspection_station: {
      label: t.motorcycleInspectionStations,
      notice: t.inspectionStationNotice,
    },
    electric_motorcycle_charging_station: {
      label: t.electricMotorcycleChargingStations,
      notice: t.chargingStationNotice,
    },
    commercial_ev_charging_swap_station: {
      label: t.commercialEvChargingSwapStations,
      notice: t.commercialEvNotice,
    },
    gas_lpg_station: {
      label: t.gasLpgStations,
      notice: t.gasLpgNotice,
    },
    designated_smoking_area: {
      label: t.designatedSmokingAreas,
      notice: t.designatedSmokingAreaNotice,
    },
    announced_no_smoking_place: {
      label: t.announcedNoSmokingPlaces,
      notice: t.announcedNoSmokingPlaceNotice,
    },
  } satisfies Record<FacilityType, { label: string; notice: string }>;

  return (
    <section className="warning-notice" aria-label={t.warningLabel}>
      <div aria-hidden="true">!</div>
      <p>
        {activeTypes.map((type) => (
          <span key={type}>
            <strong>{noticeByType[type].label}</strong>
            {noticeByType[type].notice}
          </span>
        ))}
      </p>
    </section>
  );
}
