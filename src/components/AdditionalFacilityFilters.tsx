import type { Translation } from '../i18n';
import type { DirectDrinkingPlaceCategory, Language } from '../types';
import { getDirectDrinkingPlaceLabel } from '../utils/facilityUtils';

type TimedCollectionFiltersProps = {
  acceptsGarbage: boolean;
  acceptsRecycling: boolean;
  acceptsFoodWaste: boolean;
  hasSpecialHours: boolean;
  t: Translation;
  onChange: (name: 'garbage' | 'recycling' | 'foodWaste' | 'specialHours', value: boolean) => void;
};

export function TimedCollectionFilters(props: TimedCollectionFiltersProps) {
  const options = [
    ['garbage', props.t.acceptsGeneralGarbage, props.acceptsGarbage],
    ['recycling', props.t.acceptsRecycling, props.acceptsRecycling],
    ['foodWaste', props.t.acceptsFoodWaste, props.acceptsFoodWaste],
    ['specialHours', props.t.hasSpecialHoursNotes, props.hasSpecialHours],
  ] as const;

  return (
    <fieldset className="toilet-filters">
      {options.map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name}>
          <input type="checkbox" checked={checked} onChange={(event) => props.onChange(name, event.target.checked)} />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

const placeCategories: DirectDrinkingPlaceCategory[] = [
  'park_trail',
  'mrt_station',
  'school',
  'government_office',
  'venue',
  'shopping_night_market',
  'other',
];

type DirectDrinkingFiltersProps = {
  normalOnly: boolean;
  includeSuspended: boolean;
  taipeiCityOnly: boolean;
  placeCategory: DirectDrinkingPlaceCategory | '';
  hasMaintenanceInfo: boolean;
  hasPhoto: boolean;
  language: Language;
  t: Translation;
  onBooleanChange: (name: 'normalOnly' | 'includeSuspended' | 'taipeiCityOnly' | 'maintenance' | 'photo', value: boolean) => void;
  onPlaceCategoryChange: (value: DirectDrinkingPlaceCategory | '') => void;
};

export function DirectDrinkingFilters(props: DirectDrinkingFiltersProps) {
  const options = [
    ['normalOnly', props.t.normalOnly, props.normalOnly],
    ['includeSuspended', props.t.includeSuspended, props.includeSuspended],
    ['taipeiCityOnly', props.t.taipeiCityOnly, props.taipeiCityOnly],
    ['maintenance', props.t.hasMaintenanceInfo, props.hasMaintenanceInfo],
    ['photo', props.t.hasPhoto, props.hasPhoto],
  ] as const;

  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.placeType}
        <select value={props.placeCategory} onChange={(event) => props.onPlaceCategoryChange(event.target.value as DirectDrinkingPlaceCategory | '')}>
          <option value="">{props.t.all}</option>
          {placeCategories.map((category) => <option key={category} value={category}>{getDirectDrinkingPlaceLabel(category, props.language)}</option>)}
        </select>
      </label>
      {options.map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name}>
          <input type="checkbox" checked={checked} onChange={(event) => props.onBooleanChange(name, event.target.checked)} />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
