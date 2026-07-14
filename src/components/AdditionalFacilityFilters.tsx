import type { Translation } from '../i18n';
import type {
  CommercialEvServiceType,
  CleanNeedleServiceItemCategory,
  CleanNeedleServicePointCategory,
  AnnouncedNoSmokingPlaceRecordType,
  DirectDrinkingPlaceCategory,
  DesignatedSmokingAreaType,
  ElectricMotorcycleChargingLocationCategory,
  FuelStationStatus,
  GreenSpaceAdopterCategory,
  GreenSpaceAdoptionTargetCategory,
  Language,
  ManagingUnitCategory,
  OpeningHoursType,
  PayTaipeiParkingGeocodingStatus,
  PayTaipeiParkingLocationPrecision,
  PayTaipeiParkingPostalCodeType,
  PayTaipeiParkingSupportStatus,
  ProtectedTreeCoordinateQuality,
  ProtectedTreeLocationTypeCategory,
  RiversideToiletType,
  TreeCircumferenceCategory,
  TreeDiameterCategory,
} from '../types';
import {
  getDirectDrinkingPlaceLabel,
  getCommercialEvServiceTypeLabel,
  getDesignatedSmokingAreaTypeLabel,
  getElectricMotorcycleChargingLocationCategoryLabel,
  getGreenSpaceAdopterCategoryLabel,
  getGreenSpaceAdoptionTargetCategoryLabel,
  getManagingUnitCategoryLabel,
  getOpeningHoursTypeLabel,
  getPayTaipeiParkingGeocodingStatusLabel,
  getPayTaipeiParkingLocationPrecisionLabel,
  getPayTaipeiParkingPostalCodeTypeLabel,
  getPayTaipeiParkingSupportStatusLabel,
  getRiversideToiletTypeLabel,
  getAnnouncedNoSmokingRecordTypeLabel,
  getProtectedTreeLocationTypeLabel,
  getTreeCircumferenceCategoryLabel,
  getTreeDiameterCategoryLabel,
} from '../utils/facilityUtils';

const payTaipeiParkingStatuses: PayTaipeiParkingSupportStatus[] = ['supported', 'not_supported_or_stopped', 'other', 'unknown'];
const payTaipeiParkingPostalCodeTypes: PayTaipeiParkingPostalCodeType[] = ['taipei_city', 'new_taipei_or_other_city', 'unknown', 'missing'];
const payTaipeiParkingLocationPrecisions: PayTaipeiParkingLocationPrecision[] = [
  'district_address',
  'geocoded_address_approximate',
  'official_joined_coordinate',
  'operator_or_platform_address',
  'district_only',
  'missing',
];
const payTaipeiParkingGeocodingStatuses: PayTaipeiParkingGeocodingStatus[] = [
  'not_attempted',
  'not_geocoded_address_only',
  'geocoded_approximate',
  'joined_official_coordinate',
  'failed',
  'not_applicable_operator_or_platform_address',
];

const greenSpaceTargetCategories: GreenSpaceAdoptionTargetCategory[] = ['street_tree', 'park', 'large_park', 'green_space', 'green_belt', 'plaza', 'planter', 'traffic_island', 'roundabout', 'other', 'unknown'];
const greenSpaceAdopterCategories: GreenSpaceAdopterCategory[] = ['company', 'government_unit', 'community_organization', 'foundation_or_association', 'school', 'private_individual', 'other', 'unknown'];

type GreenSpaceAdoptionFiltersProps = {
  managementUnits: string[];
  districtCodes: string[];
  attributes: string[];
  adopters: string[];
  roadNames: string[];
  values: {
    managementUnit: string;
    districtCode: string;
    targetAttribute: string;
    targetCategory: GreenSpaceAdoptionTargetCategory | '';
    adopterName: string;
    adopterCategory: GreenSpaceAdopterCategory | '';
    roadName: string;
    hasRangeOrBoundary: boolean;
    hasIntersection: boolean;
  };
  language: Language;
  t: Translation;
  onSelectChange: (name: 'managementUnit' | 'districtCode' | 'targetAttribute' | 'targetCategory' | 'adopterName' | 'adopterCategory' | 'roadName', value: string) => void;
  onBooleanChange: (name: 'rangeOrBoundary' | 'intersection', value: boolean) => void;
};

export function GreenSpaceAdoptionFilters(props: GreenSpaceAdoptionFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      {[
        ['managementUnit', props.t.managementUnit, props.values.managementUnit, props.managementUnits],
        ['districtCode', props.t.districtCode, props.values.districtCode, props.districtCodes],
        ['targetAttribute', props.t.adoptionTargetAttribute, props.values.targetAttribute, props.attributes],
        ['adopterName', props.t.adopterName, props.values.adopterName, props.adopters],
        ['roadName', props.t.roadName, props.values.roadName, props.roadNames],
      ].map(([name, label, value, options]) => (
        <label key={name as string}>
          {label as string}
          <select value={value as string} onChange={(event) => props.onSelectChange(name as 'managementUnit' | 'districtCode' | 'targetAttribute' | 'adopterName' | 'roadName', event.target.value)}>
            <option value="">{props.t.all}</option>
            {(options as string[]).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ))}
      <label>
        {props.t.adoptionTargetCategory}
        <select value={props.values.targetCategory} onChange={(event) => props.onSelectChange('targetCategory', event.target.value)}>
          <option value="">{props.t.all}</option>
          {greenSpaceTargetCategories.map((value) => <option key={value} value={value}>{getGreenSpaceAdoptionTargetCategoryLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.adopterCategory}
        <select value={props.values.adopterCategory} onChange={(event) => props.onSelectChange('adopterCategory', event.target.value)}>
          <option value="">{props.t.all}</option>
          {greenSpaceAdopterCategories.map((value) => <option key={value} value={value}>{getGreenSpaceAdopterCategoryLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.values.hasRangeOrBoundary} onChange={(event) => props.onBooleanChange('rangeOrBoundary', event.target.checked)} />
        <span>{props.t.hasRangeOrBoundaryText}</span>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.values.hasIntersection} onChange={(event) => props.onBooleanChange('intersection', event.target.checked)} />
        <span>{props.t.hasIntersectionText}</span>
      </label>
    </fieldset>
  );
}

type PayTaipeiParkingFiltersProps = {
  operators: string[];
  operatorIds: string[];
  postalCodes: string[];
  roadNames: string[];
  values: {
    supportStatus: PayTaipeiParkingSupportStatus | '';
    operator: string;
    operatorId: string;
    postalCode: string;
    postalCodeType: PayTaipeiParkingPostalCodeType | '';
    roadName: string;
    hasPhone: boolean;
    hasNote: boolean;
    serviceStopped: boolean;
    basement: boolean;
    operatorAddress: boolean;
    locationPrecision: PayTaipeiParkingLocationPrecision | '';
    geocodingStatus: PayTaipeiParkingGeocodingStatus | '';
  };
  language: Language;
  t: Translation;
  onChange: (name: 'operator' | 'operatorId' | 'postalCode' | 'roadName', value: string) => void;
  onStatusChange: (value: PayTaipeiParkingSupportStatus | '') => void;
  onPostalCodeTypeChange: (value: PayTaipeiParkingPostalCodeType | '') => void;
  onLocationPrecisionChange: (value: PayTaipeiParkingLocationPrecision | '') => void;
  onGeocodingStatusChange: (value: PayTaipeiParkingGeocodingStatus | '') => void;
  onBooleanChange: (name: 'hasPhone' | 'hasNote' | 'serviceStopped' | 'basement' | 'operatorAddress', value: boolean) => void;
};

export function PayTaipeiParkingFilters(props: PayTaipeiParkingFiltersProps) {
  return (
    <fieldset className="toilet-filters">
      <label>
        {props.t.supportStatus}
        <select value={props.values.supportStatus} onChange={(event) => props.onStatusChange(event.target.value as PayTaipeiParkingSupportStatus | '')}>
          <option value="">{props.t.all}</option>
          {payTaipeiParkingStatuses.map((value) => <option key={value} value={value}>{getPayTaipeiParkingSupportStatusLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.payTaipeiParkingOperatorName}
        <select value={props.values.operator} onChange={(event) => props.onChange('operator', event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.operators.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.operatorId}
        <select value={props.values.operatorId} onChange={(event) => props.onChange('operatorId', event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.operatorIds.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.postalCode}
        <select value={props.values.postalCode} onChange={(event) => props.onChange('postalCode', event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.postalCodes.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.postalCodeType}
        <select value={props.values.postalCodeType} onChange={(event) => props.onPostalCodeTypeChange(event.target.value as PayTaipeiParkingPostalCodeType | '')}>
          <option value="">{props.t.all}</option>
          {payTaipeiParkingPostalCodeTypes.map((value) => <option key={value} value={value}>{getPayTaipeiParkingPostalCodeTypeLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.roadName}
        <select value={props.values.roadName} onChange={(event) => props.onChange('roadName', event.target.value)}>
          <option value="">{props.t.all}</option>
          {props.roadNames.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        {props.t.locationPrecision}
        <select value={props.values.locationPrecision} onChange={(event) => props.onLocationPrecisionChange(event.target.value as PayTaipeiParkingLocationPrecision | '')}>
          <option value="">{props.t.all}</option>
          {payTaipeiParkingLocationPrecisions.map((value) => <option key={value} value={value}>{getPayTaipeiParkingLocationPrecisionLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.geocodingStatus}
        <select value={props.values.geocodingStatus} onChange={(event) => props.onGeocodingStatusChange(event.target.value as PayTaipeiParkingGeocodingStatus | '')}>
          <option value="">{props.t.all}</option>
          {payTaipeiParkingGeocodingStatuses.map((value) => <option key={value} value={value}>{getPayTaipeiParkingGeocodingStatusLabel(value, props.language)}</option>)}
        </select>
      </label>
      {[
        ['hasPhone', props.t.hasPhone, props.values.hasPhone],
        ['hasNote', props.t.hasNote, props.values.hasNote],
        ['serviceStopped', props.t.noteMentionsStoppedService, props.values.serviceStopped],
        ['basement', props.t.basementOrUndergroundAddress, props.values.basement],
        ['operatorAddress', props.t.operatorOrPlatformAddress, props.values.operatorAddress],
      ].map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name as string}>
          <input
            type="checkbox"
            checked={checked as boolean}
            onChange={(event) => props.onBooleanChange(name as 'hasPhone' | 'hasNote' | 'serviceStopped' | 'basement' | 'operatorAddress', event.target.checked)}
          />
          <span>{label as string}</span>
        </label>
      ))}
    </fieldset>
  );
}

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

type AccessiblePublicParkingFiltersProps = {
  values: { car: boolean; motorcycle: boolean; elevator: boolean; toilet: boolean; handrail: boolean; validCoordinates: boolean };
  t: Translation;
  onChange: (name: keyof AccessiblePublicParkingFiltersProps['values'], value: boolean) => void;
};

export function AccessiblePublicParkingFilters({ values, t, onChange }: AccessiblePublicParkingFiltersProps) {
  const options: Array<[keyof AccessiblePublicParkingFiltersProps['values'], string]> = [
    ['car', t.accessibleCarSpaceCount],
    ['motorcycle', t.accessibleMotorcycleSpaceCount],
    ['elevator', t.accessibleElevator],
    ['toilet', t.accessibleToilet],
    ['handrail', t.accessibleStairHandrail],
    ['validCoordinates', t.facilitiesWithValidCoordinates],
  ];
  return (
    <fieldset className="toilet-filters">
      {options.map(([name, label]) => (
        <label className="checkbox-filter" key={name}>
          <input type="checkbox" checked={values[name]} onChange={(event) => onChange(name, event.target.checked)} />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

type CleanNeedleServicePointFiltersProps = {
  areaCodes: string[];
  serviceItems: string[];
  servicePointCategories: string[];
  roadNames: string[];
  areaCode: string;
  serviceItem: string;
  servicePointCategory: string;
  serviceItemCategory: CleanNeedleServiceItemCategory | '';
  servicePointCategoryGroup: CleanNeedleServicePointCategory | '';
  roadName: string;
  hasPhone: boolean;
  hasExtension: boolean;
  twentyFourHour: boolean;
  t: Translation;
  onSelectChange: (name: 'areaCode' | 'serviceItem' | 'servicePointCategory' | 'serviceItemCategory' | 'servicePointCategoryGroup' | 'roadName', value: string) => void;
  onBooleanChange: (name: 'phone' | 'extension' | 'twentyFourHour', value: boolean) => void;
};

export function CleanNeedleServicePointFilters(props: CleanNeedleServicePointFiltersProps) {
  const itemCategories: CleanNeedleServiceItemCategory[] = [
    'health_education_consultation_station',
    'needle_return_box',
    'automatic_service_machine',
    'other',
    'unknown',
  ];
  const pointCategories: CleanNeedleServicePointCategory[] = [
    'pharmacy',
    'medical_institution',
    'park_market_public_toilet',
    'other',
    'unknown',
  ];
  const itemCategoryLabel = (value: CleanNeedleServiceItemCategory) => ({
    health_education_consultation_station: props.t.healthEducationConsultationStation,
    needle_return_box: props.t.needleReturnBox,
    automatic_service_machine: props.t.automaticServiceMachine,
    other: props.t.other,
    unknown: props.t.unknown,
  })[value];
  const pointCategoryLabel = (value: CleanNeedleServicePointCategory) => ({
    pharmacy: props.t.pharmacy,
    medical_institution: props.t.medicalInstitution,
    park_market_public_toilet: props.t.parkMarketPublicToilet,
    other: props.t.other,
    unknown: props.t.unknown,
  })[value];

  return (
    <fieldset className="toilet-filters">
      {[
        ['areaCode', props.t.areaCode, props.areaCode, props.areaCodes],
        ['serviceItem', props.t.serviceItem, props.serviceItem, props.serviceItems],
        ['servicePointCategory', props.t.servicePointCategory, props.servicePointCategory, props.servicePointCategories],
        ['roadName', props.t.roadName, props.roadName, props.roadNames],
      ].map(([name, label, value, options]) => (
        <label key={name as string}>
          {label as string}
          <select value={value as string} onChange={(event) => props.onSelectChange(name as 'areaCode' | 'serviceItem' | 'servicePointCategory' | 'roadName', event.target.value)}>
            <option value="">{props.t.all}</option>
            {(options as string[]).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ))}
      <label>
        {props.t.serviceItemCategory}
        <select value={props.serviceItemCategory} onChange={(event) => props.onSelectChange('serviceItemCategory', event.target.value)}>
          <option value="">{props.t.all}</option>
          {itemCategories.map((value) => <option key={value} value={value}>{itemCategoryLabel(value)}</option>)}
        </select>
      </label>
      <label>
        {props.t.servicePointCategoryGroup}
        <select value={props.servicePointCategoryGroup} onChange={(event) => props.onSelectChange('servicePointCategoryGroup', event.target.value)}>
          <option value="">{props.t.all}</option>
          {pointCategories.map((value) => <option key={value} value={value}>{pointCategoryLabel(value)}</option>)}
        </select>
      </label>
      {[
        ['phone', props.t.hasPhone, props.hasPhone],
        ['extension', props.t.hasExtension, props.hasExtension],
        ['twentyFourHour', props.t.twentyFourHourService, props.twentyFourHour],
      ].map(([name, label, checked]) => (
        <label className="checkbox-filter" key={name as string}>
          <input type="checkbox" checked={checked as boolean} onChange={(event) => props.onBooleanChange(name as 'phone' | 'extension' | 'twentyFourHour', event.target.checked)} />
          <span>{label as string}</span>
        </label>
      ))}
    </fieldset>
  );
}

type ProtectedTreeFiltersProps = {
  species: string[];
  scientificNames: string[];
  englishNames: string[];
  managementUnits: string[];
  values: {
    species: string;
    scientificName: string;
    englishName: string;
    locationType: ProtectedTreeLocationTypeCategory | '';
    managementUnit: string;
    diameterCategory: TreeDiameterCategory | '';
    circumferenceCategory: TreeCircumferenceCategory | '';
    coordinateQuality: ProtectedTreeCoordinateQuality | '';
    hasLocationType: boolean;
    hasSizeFlags: boolean;
  };
  language: Language;
  t: Translation;
  onSelectChange: (name: 'species' | 'scientificName' | 'englishName' | 'locationType' | 'managementUnit' | 'diameterCategory' | 'circumferenceCategory' | 'coordinateQuality', value: string) => void;
  onBooleanChange: (name: 'locationType' | 'sizeFlags', value: boolean) => void;
};

export function ProtectedTreeFilters(props: ProtectedTreeFiltersProps) {
  const locationTypes: ProtectedTreeLocationTypeCategory[] = ['park_green_space', 'school', 'road_sidewalk', 'public_place', 'private_residence', 'suburban_mountain', 'other', 'missing', 'unknown'];
  const diameterCategories: TreeDiameterCategory[] = ['under_0_5m', '0_5m_to_1m', '1m_to_2m', '2m_to_3m', 'over_3m', 'missing'];
  const circumferenceCategories: TreeCircumferenceCategory[] = ['under_1m', '1m_to_3m', '3m_to_5m', '5m_to_10m', 'over_10m', 'missing'];
  const coordinateQualities: ProtectedTreeCoordinateQuality[] = ['valid_wgs84_taipei', 'outside_taipei_bounds', 'invalid', 'missing'];
  const qualityLabel = (value: ProtectedTreeCoordinateQuality) => ({
    valid_wgs84_taipei: props.t.validWgs84Coordinate,
    outside_taipei_bounds: props.t.outsideTaipeiBounds,
    invalid: props.t.invalidCoordinate,
    missing: props.t.missingCoordinate,
  })[value];

  return (
    <fieldset className="toilet-filters">
      {[
        ['species', props.t.speciesNameZh, props.values.species, props.species],
        ['scientificName', props.t.scientificName, props.values.scientificName, props.scientificNames],
        ['englishName', props.t.speciesNameEn, props.values.englishName, props.englishNames],
        ['managementUnit', props.t.managementUnit, props.values.managementUnit, props.managementUnits],
      ].map(([name, label, value, options]) => (
        <label key={name as string}>
          {label as string}
          <select value={value as string} onChange={(event) => props.onSelectChange(name as 'species' | 'scientificName' | 'englishName' | 'managementUnit', event.target.value)}>
            <option value="">{props.t.all}</option>
            {(options as string[]).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ))}
      <label>
        {props.t.locationType}
        <select value={props.values.locationType} onChange={(event) => props.onSelectChange('locationType', event.target.value)}>
          <option value="">{props.t.all}</option>
          {locationTypes.map((value) => <option key={value} value={value}>{getProtectedTreeLocationTypeLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.diameterCategory}
        <select value={props.values.diameterCategory} onChange={(event) => props.onSelectChange('diameterCategory', event.target.value)}>
          <option value="">{props.t.all}</option>
          {diameterCategories.map((value) => <option key={value} value={value}>{getTreeDiameterCategoryLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.circumferenceCategory}
        <select value={props.values.circumferenceCategory} onChange={(event) => props.onSelectChange('circumferenceCategory', event.target.value)}>
          <option value="">{props.t.all}</option>
          {circumferenceCategories.map((value) => <option key={value} value={value}>{getTreeCircumferenceCategoryLabel(value, props.language)}</option>)}
        </select>
      </label>
      <label>
        {props.t.coordinateQuality}
        <select value={props.values.coordinateQuality} onChange={(event) => props.onSelectChange('coordinateQuality', event.target.value)}>
          <option value="">{props.t.all}</option>
          {coordinateQualities.map((value) => <option key={value} value={value}>{qualityLabel(value)}</option>)}
        </select>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.values.hasLocationType} onChange={(event) => props.onBooleanChange('locationType', event.target.checked)} />
        <span>{props.t.hasLocationType}</span>
      </label>
      <label className="checkbox-filter">
        <input type="checkbox" checked={props.values.hasSizeFlags} onChange={(event) => props.onBooleanChange('sizeFlags', event.target.checked)} />
        <span>{props.t.sizeDataQuality}</span>
      </label>
    </fieldset>
  );
}
