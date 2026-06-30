import type { Translation } from '../i18n';
import type {
  CommercialEvServiceType,
  AnnouncedNoSmokingPlaceRecordType,
  DirectDrinkingPlaceCategory,
  DesignatedSmokingAreaType,
  ElectricMotorcycleChargingLocationCategory,
  FuelStationStatus,
  Language,
  ManagingUnitCategory,
  OpeningHoursType,
  RiversideToiletType,
} from '../types';
import {
  getDirectDrinkingPlaceLabel,
  getCommercialEvServiceTypeLabel,
  getDesignatedSmokingAreaTypeLabel,
  getElectricMotorcycleChargingLocationCategoryLabel,
  getManagingUnitCategoryLabel,
  getOpeningHoursTypeLabel,
  getRiversideToiletTypeLabel,
  getAnnouncedNoSmokingRecordTypeLabel,
} from '../utils/facilityUtils';

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

type MotorcycleInspectionStationFiltersProps = {
  brands: string[];
  postalCodes: string[];
  brand: string;
  postalCode: string;
  hasPhone: boolean;
  t: Translation;
  onBrandChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onHasPhoneChange: (value: boolean) => void;
};

export function MotorcycleInspectionStationFilters(props: MotorcycleInspectionStationFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.brand}
        <select value={props.brand} onChange={(event) => props.onBrandChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.brands.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.postalCode}
        <select value={props.postalCode} onChange={(event) => props.onPostalCodeChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.postalCodes.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.hasPhone} onChange={(event) => props.onHasPhoneChange(event.target.checked)} />
        <span>{props.t.hasPhone}</span>
      </label>
    </fieldset>
  );
}

const chargingCategories: ElectricMotorcycleChargingLocationCategory[] = [
  'inspection_station',
  'public_parking_lot',
  'motorcycle_shop',
  'cleaning_team',
  'metro_station',
  'village_office',
  'service_factory',
  'government_parking_lot',
  'incineration_plant',
  'campus_parking_lot',
  'store',
  'sports_center',
  'other',
  'unknown',
];

type ElectricMotorcycleChargingStationFiltersProps = {
  cities: string[];
  districtCodes: string[];
  locationCategory: ElectricMotorcycleChargingLocationCategory | '';
  city: string;
  districtCode: string;
  hasAddress: boolean;
  language: Language;
  t: Translation;
  onLocationCategoryChange: (value: ElectricMotorcycleChargingLocationCategory | '') => void;
  onCityChange: (value: string) => void;
  onDistrictCodeChange: (value: string) => void;
  onHasAddressChange: (value: boolean) => void;
};

export function ElectricMotorcycleChargingStationFilters(props: ElectricMotorcycleChargingStationFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.locationCategory}
        <select value={props.locationCategory} onChange={(event) => props.onLocationCategoryChange(event.target.value as ElectricMotorcycleChargingLocationCategory | '')}>
          <option value="">{props.t.all}</option>
          {chargingCategories.map((value) => <option key={value} value={value}>{getElectricMotorcycleChargingLocationCategoryLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.city}
        <select value={props.city} onChange={(event) => props.onCityChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.cities.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.districtCode}
        <select value={props.districtCode} onChange={(event) => props.onDistrictCodeChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.districtCodes.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.hasAddress} onChange={(event) => props.onHasAddressChange(event.target.checked)} />
        <span>{props.t.hasAddress}</span>
      </label>
    </fieldset>
  );
}

const commercialEvServiceTypes: CommercialEvServiceType[] = [
  'electric_car_charging',
  'electric_motorcycle_charging',
  'electric_motorcycle_battery_swap',
  'unknown',
];

type CommercialEvChargingSwapStationFiltersProps = {
  operators: string[];
  cities: string[];
  cityCodes: string[];
  serviceType: CommercialEvServiceType | '';
  operator: string;
  city: string;
  cityCode: string;
  hasAddress: boolean;
  hasDistrict: boolean;
  language: Language;
  t: Translation;
  onServiceTypeChange: (value: CommercialEvServiceType | '') => void;
  onOperatorChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCityCodeChange: (value: string) => void;
  onHasAddressChange: (value: boolean) => void;
  onHasDistrictChange: (value: boolean) => void;
};

export function CommercialEvChargingSwapStationFilters(props: CommercialEvChargingSwapStationFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.serviceType}
        <select value={props.serviceType} onChange={(event) => props.onServiceTypeChange(event.target.value as CommercialEvServiceType | '')}>
          <option value="">{props.t.all}</option>
          {commercialEvServiceTypes.map((value) => <option key={value} value={value}>{getCommercialEvServiceTypeLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.operatorName}
        <select value={props.operator} onChange={(event) => props.onOperatorChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.operators.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.city}
        <select value={props.city} onChange={(event) => props.onCityChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.cities.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.cityCode}
        <select value={props.cityCode} onChange={(event) => props.onCityCodeChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.cityCodes.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.hasAddress} onChange={(event) => props.onHasAddressChange(event.target.checked)} />
        <span>{props.t.hasAddress}</span>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.hasDistrict} onChange={(event) => props.onHasDistrictChange(event.target.checked)} />
        <span>{props.t.hasDistrict}</span>
      </label>
    </fieldset>
  );
}

type GasLpgStationFiltersProps = {
  suppliers: string[];
  supplier: string;
  hasOil: boolean;
  hasLpg: boolean;
  hasSelfService: boolean;
  twentyFourHours: boolean;
  limitedHours: boolean;
  stationStatus: FuelStationStatus | '';
  hasPhone: boolean;
  t: Translation;
  onSupplierChange: (value: string) => void;
  onStatusChange: (value: FuelStationStatus | '') => void;
  onBooleanChange: (
    name: 'oil' | 'lpg' | 'self' | 'twentyFourHours' | 'limitedHours' | 'phone',
    value: boolean,
  ) => void;
};

export function GasLpgStationFilters(props: GasLpgStationFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.supplier}
        <select value={props.supplier} onChange={(event) => props.onSupplierChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.suppliers.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.stationStatus}
        <select value={props.stationStatus} onChange={(event) => props.onStatusChange(event.target.value as FuelStationStatus | '')}>
          <option value="">{props.t.all}</option>
          <option value="active_or_unspecified">{props.t.activeOrUnspecified}</option>
          <option value="terminated">{props.t.terminated}</option>
          <option value="unknown">{props.t.unknownStatus}</option>
        </select>
      </label>
      {[
        ['oil', props.t.hasOil, props.hasOil],
        ['lpg', props.t.hasLpg, props.hasLpg],
        ['self', props.t.hasSelfService, props.hasSelfService],
        ['twentyFourHours', props.t.sourceSays24Hours, props.twentyFourHours],
        ['limitedHours', props.t.sourceSaysLimitedHours, props.limitedHours],
        ['phone', props.t.hasPhone, props.hasPhone],
      ].map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name as string}>
          <input
            type="checkbox"
            checked={checked as boolean}
            onChange={(event) => props.onBooleanChange(name as 'oil' | 'lpg' | 'self' | 'twentyFourHours' | 'limitedHours' | 'phone', event.target.checked)}
          />
          <span>{label as string}</span>
        </label>
      ))}
    </fieldset>
  );
}

const smokingAreaTypes: DesignatedSmokingAreaType[] = [
  'outdoor_open',
  'outdoor_negative_pressure',
  'indoor_smoking_room',
  'other',
  'unknown',
];

const openingHoursTypes: OpeningHoursType[] = [
  'listed_24_hours',
  'fixed_hours',
  'weekday_or_holiday_rule',
  'depends_on_facility_hours',
  'custom_text',
  'missing',
  'unknown',
];

const managingUnitCategories: ManagingUnitCategory[] = [
  'taipei_city_government',
  'district_office',
  'central_government',
  'transportation_or_mrt',
  'park_or_public_space',
  'private_operator',
  'cultural_or_sports_facility',
  'other',
  'unknown',
];

type DesignatedSmokingAreaFiltersProps = {
  managingUnits: string[];
  smokingAreaType: DesignatedSmokingAreaType | '';
  openingHoursType: OpeningHoursType | '';
  listed24Hours: boolean;
  hasPhoto: boolean;
  hasRelativeLocation: boolean;
  managingUnitCategory: ManagingUnitCategory | '';
  managingUnit: string;
  language: Language;
  t: Translation;
  onSmokingAreaTypeChange: (value: DesignatedSmokingAreaType | '') => void;
  onOpeningHoursTypeChange: (value: OpeningHoursType | '') => void;
  onManagingUnitCategoryChange: (value: ManagingUnitCategory | '') => void;
  onManagingUnitChange: (value: string) => void;
  onBooleanChange: (name: 'listed24Hours' | 'photo' | 'relativeLocation', value: boolean) => void;
};

export function DesignatedSmokingAreaFilters(props: DesignatedSmokingAreaFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.smokingAreaType}
        <select aria-label={props.t.smokingAreaType} value={props.smokingAreaType} onChange={(event) => props.onSmokingAreaTypeChange(event.target.value as DesignatedSmokingAreaType | '')}>
          <option value="">{props.t.all}</option>
          {smokingAreaTypes.map((value) => <option key={value} value={value}>{getDesignatedSmokingAreaTypeLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.openingHoursType}
        <select aria-label={props.t.openingHoursType} value={props.openingHoursType} onChange={(event) => props.onOpeningHoursTypeChange(event.target.value as OpeningHoursType | '')}>
          <option value="">{props.t.all}</option>
          {openingHoursTypes.map((value) => <option key={value} value={value}>{getOpeningHoursTypeLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.managingUnitCategory}
        <select aria-label={props.t.managingUnitCategory} value={props.managingUnitCategory} onChange={(event) => props.onManagingUnitCategoryChange(event.target.value as ManagingUnitCategory | '')}>
          <option value="">{props.t.all}</option>
          {managingUnitCategories.map((value) => <option key={value} value={value}>{getManagingUnitCategoryLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.managingUnit}
        <select aria-label={props.t.managingUnit} value={props.managingUnit} onChange={(event) => props.onManagingUnitChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.managingUnits.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      {[
        ['listed24Hours', props.t.listed24Hours, props.listed24Hours],
        ['photo', props.t.hasPhoto, props.hasPhoto],
        ['relativeLocation', props.t.hasRelativeLocation, props.hasRelativeLocation],
      ].map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name as string}>
          <input
            type="checkbox"
            checked={checked as boolean}
            onChange={(event) => props.onBooleanChange(name as 'listed24Hours' | 'photo' | 'relativeLocation', event.target.checked)}
          />
          <span>{label as string}</span>
        </label>
      ))}
    </fieldset>
  );
}

const noSmokingRecordTypes: AnnouncedNoSmokingPlaceRecordType[] = [
  'outdoor_no_smoking_place',
  'smoke_free_park_green_space',
  'unknown',
];

type AnnouncedNoSmokingPlaceFiltersProps = {
  sourceResources: string[];
  announcementYears: string[];
  recordType: AnnouncedNoSmokingPlaceRecordType | '';
  announcementYear: string;
  coordinateStatus: string;
  sourceResource: string;
  hasCoordinates: boolean;
  hasAddress: boolean;
  hasLocationDescription: boolean;
  language: Language;
  t: Translation;
  onRecordTypeChange: (value: AnnouncedNoSmokingPlaceRecordType | '') => void;
  onAnnouncementYearChange: (value: string) => void;
  onCoordinateStatusChange: (value: string) => void;
  onSourceResourceChange: (value: string) => void;
  onBooleanChange: (name: 'coordinates' | 'address' | 'locationDescription', value: boolean) => void;
};

export function AnnouncedNoSmokingPlaceFilters(props: AnnouncedNoSmokingPlaceFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.noSmokingRecordType}
        <select value={props.recordType} onChange={(event) => props.onRecordTypeChange(event.target.value as AnnouncedNoSmokingPlaceRecordType | '')}>
          <option value="">{props.t.all}</option>
          {noSmokingRecordTypes.map((value) => <option key={value} value={value}>{getAnnouncedNoSmokingRecordTypeLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.announcementYear}
        <select value={props.announcementYear} onChange={(event) => props.onAnnouncementYearChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.announcementYears.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.coordinateStatus}
        <select value={props.coordinateStatus} onChange={(event) => props.onCoordinateStatusChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          <option value="valid">{props.t.validCoordinates}</option>
          <option value="missing">{props.t.missingCoordinates}</option>
          <option value="outlier">{props.t.outlierCoordinates}</option>
        </select>
      </label>
      <label>
        {props.t.sourceResource}
        <select value={props.sourceResource} onChange={(event) => props.onSourceResourceChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.sourceResources.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      {[
        ['coordinates', props.t.hasCoordinates, props.hasCoordinates],
        ['address', props.t.hasAddress, props.hasAddress],
        ['locationDescription', props.t.hasLocationDescription, props.hasLocationDescription],
      ].map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name as string}>
          <input
            type="checkbox"
            checked={checked as boolean}
            onChange={(event) => props.onBooleanChange(name as 'coordinates' | 'address' | 'locationDescription', event.target.checked)}
          />
          <span>{label as string}</span>
        </label>
      ))}
    </fieldset>
  );
}

type CommunityRecyclingStationFiltersProps = {
  districtCodes: string[];
  roadNames: string[];
  districtCode: string;
  roadName: string;
  hasAddress: boolean;
  hasParsedRoadName: boolean;
  t: Translation;
  onDistrictCodeChange: (value: string) => void;
  onRoadNameChange: (value: string) => void;
  onBooleanChange: (name: 'address' | 'road', value: boolean) => void;
};

export function CommunityRecyclingStationFilters(props: CommunityRecyclingStationFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.districtCode}
        <select value={props.districtCode} onChange={(event) => props.onDistrictCodeChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.districtCodes.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.roadName}
        <select value={props.roadName} onChange={(event) => props.onRoadNameChange(event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.roadNames.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.hasAddress} onChange={(event) => props.onBooleanChange('address', event.target.checked)} />
        <span>{props.t.hasAddress}</span>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.hasParsedRoadName} onChange={(event) => props.onBooleanChange('road', event.target.checked)} />
        <span>{props.t.hasParsedRoadName}</span>
      </label>
    </fieldset>
  );
}
