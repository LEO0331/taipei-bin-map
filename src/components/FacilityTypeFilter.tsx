import type { Translation } from '../i18n';
import type { FacilityType } from '../types';

type FacilityTypeFilterProps = {
  selectedTypes: FacilityType[];
  t: Translation;
  onChange: (types: FacilityType[]) => void;
};

export const FACILITY_TYPE_OPTIONS: FacilityType[] = ['pedestrian_bin', 'dog_waste_bag_box', 'public_toilet'];

export function FacilityTypeFilter({ selectedTypes, t, onChange }: FacilityTypeFilterProps) {
  const labelByType = {
    pedestrian_bin: t.pedestrianBins,
    dog_waste_bag_box: t.dogWasteBagBoxes,
    public_toilet: t.publicToilets,
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
