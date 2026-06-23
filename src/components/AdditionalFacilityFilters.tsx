import type { Translation } from '../i18n';
import type { DirectDrinkingPlaceCategory, Language, RiversideToiletType } from '../types';
import { getDirectDrinkingPlaceLabel, getRiversideToiletTypeLabel } from '../utils/facilityUtils';

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

type UsedClothingFiltersProps = {
  villages: string[];
  organizations: string[];
  village: string;
  organization: string;
  hasPhone: boolean;
  t: Translation;
  onVillageChange: (value: string) => void;
  onOrganizationChange: (value: string) => void;
  onHasPhoneChange: (value: boolean) => void;
};

export function UsedClothingFilters(props: UsedClothingFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.village}
        <select value={props.village} onChange={(event) => props.onVillageChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.villages.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.organizationName}
        <select value={props.organization} onChange={(event) => props.onOrganizationChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.organizations.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.hasPhone} onChange={(event) => props.onHasPhoneChange(event.target.checked)} />
        <span>{props.t.hasPhone}</span>
      </label>
    </fieldset>
  );
}

type LactationRoomFiltersProps = {
  basicEquipmentOptions: string[];
  friendlyServiceOptions: string[];
  values: {
    openingHours: boolean;
    phone: boolean;
    mobile: boolean;
    locationGuidance: boolean;
    certification: boolean;
    notes: boolean;
    legalRequired: boolean;
    basicEquipment: string;
    friendlyService: string;
  };
  t: Translation;
  onBooleanChange: (name: 'openingHours' | 'phone' | 'mobile' | 'locationGuidance' | 'certification' | 'notes' | 'legalRequired', value: boolean) => void;
  onBasicEquipmentChange: (value: string) => void;
  onFriendlyServiceChange: (value: string) => void;
};

export function LactationRoomFilters(props: LactationRoomFiltersProps) {
  const checks = [
    ['openingHours', props.t.hasOpeningHours, props.values.openingHours],
    ['phone', props.t.hasPhone, props.values.phone],
    ['mobile', props.t.hasMobile, props.values.mobile],
    ['locationGuidance', props.t.hasLocationGuidance, props.values.locationGuidance],
    ['certification', props.t.hasCertificationValidity, props.values.certification],
    ['notes', props.t.hasNotes, props.values.notes],
    ['legalRequired', props.t.legalRequiredList, props.values.legalRequired],
  ] as const;

  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.basicEquipment}
        <select value={props.values.basicEquipment} onChange={(event) => props.onBasicEquipmentChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.basicEquipmentOptions.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.friendlyEquipmentOrServices}
        <select value={props.values.friendlyService} onChange={(event) => props.onFriendlyServiceChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.friendlyServiceOptions.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      {checks.map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name}>
          <input type="checkbox" checked={checked} onChange={(event) => props.onBooleanChange(name, event.target.checked)} />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

type RiversideToiletFiltersProps = {
  parks: string[];
  park: string;
  toiletType: RiversideToiletType | '';
  hasRemark: boolean;
  language: Language;
  t: Translation;
  onParkChange: (value: string) => void;
  onTypeChange: (value: RiversideToiletType | '') => void;
  onHasRemarkChange: (value: boolean) => void;
};

export function RiversideToiletFilters(props: RiversideToiletFiltersProps) {
  const types: RiversideToiletType[] = ['scenic', 'standard', 'accessible', 'fixed', 'other'];
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.riversidePark}
        <select value={props.park} onChange={(event) => props.onParkChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.parks.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.toiletType}
        <select value={props.toiletType} onChange={(event) => props.onTypeChange(event.target.value as RiversideToiletType | '')}>
          <option value="">{props.t.all}</option>
          {types.map((value) => <option key={value} value={value}>{getRiversideToiletTypeLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.hasRemark} onChange={(event) => props.onHasRemarkChange(event.target.checked)} />
        <span>{props.t.hasRemark}</span>
      </label>
    </fieldset>
  );
}

type FamilyFriendlyToiletFiltersProps = {
  categories: string[];
  grades: string[];
  managers: string[];
  category: string;
  grade: string;
  manager: string;
  hasDiaperTable: boolean;
  hasChildSeat: boolean;
  hasAward: boolean;
  t: Translation;
  onChange: (name: 'category' | 'grade' | 'manager', value: string) => void;
  onBooleanChange: (name: 'diaper' | 'childSeat' | 'award', value: boolean) => void;
};

export function FamilyFriendlyToiletFilters(props: FamilyFriendlyToiletFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      {[
        ['category', props.t.toiletCategory, props.category, props.categories],
        ['grade', props.t.toiletGrade, props.grade, props.grades],
        ['manager', props.t.managingUnit, props.manager, props.managers],
      ].map(([name, label, value, options]) => (
        <label key={name as string}>
          {label as string}
          <select value={value as string} onChange={(event) => props.onChange(name as 'category' | 'grade' | 'manager', event.target.value)}>
            <option value="">{props.t.all}</option>
            {(options as string[]).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ))}
      {[
        ['diaper', props.t.hasDiaperTable, props.hasDiaperTable],
        ['childSeat', props.t.hasChildSeat, props.hasChildSeat],
        ['award', props.t.familyFriendlyAward, props.hasAward],
      ].map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name as string}>
          <input type="checkbox" checked={checked as boolean} onChange={(event) => props.onBooleanChange(name as 'diaper' | 'childSeat' | 'award', event.target.checked)} />
          <span>{label as string}</span>
        </label>
      ))}
    </fieldset>
  );
}
