import type { Translation } from '../i18n';
import type { FacilityType } from '../types';

export type FacilityTypeSelection = 'all' | FacilityType;

type FacilityTypeFilterProps = {
  selectedType: FacilityTypeSelection;
  t: Translation;
  onChange: (type: FacilityTypeSelection) => void;
};

const OPTIONS: FacilityTypeSelection[] = ['all', 'pedestrian_bin', 'dog_waste_bag_box'];

export function FacilityTypeFilter({ selectedType, t, onChange }: FacilityTypeFilterProps) {
  const labelByType = {
    all: t.all,
    pedestrian_bin: t.pedestrianBins,
    dog_waste_bag_box: t.dogWasteBagBoxes,
  } satisfies Record<FacilityTypeSelection, string>;

  return (
    <fieldset className="facility-type-filter">
      <legend>{t.facilityType}</legend>
      <div role="group" aria-label={t.facilityType}>
        {OPTIONS.map((type) => (
          <button
            key={type}
            type="button"
            className={selectedType === type ? 'active' : ''}
            aria-pressed={selectedType === type}
            onClick={() => onChange(type)}
          >
            {labelByType[type]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
