import type { Translation } from '../i18n';
import type { DrinkingFountainPlaceCategory } from '../types';

type DrinkingFountainFiltersProps = {
  selectedCategory: DrinkingFountainPlaceCategory | '';
  requiresOpeningHours: boolean;
  t: Translation;
  onCategoryChange: (category: DrinkingFountainPlaceCategory | '') => void;
  onOpeningHoursChange: (requiresOpeningHours: boolean) => void;
};

const placeCategories: DrinkingFountainPlaceCategory[] = [
  'sports_center',
  'library',
  'park',
  'government_facility',
  'school',
  'transport',
  'other',
];

export function DrinkingFountainFilters({
  selectedCategory,
  requiresOpeningHours,
  t,
  onCategoryChange,
  onOpeningHoursChange,
}: DrinkingFountainFiltersProps) {
  const categoryLabelByType = {
    sports_center: t.sportsCenter,
    library: t.library,
    park: t.park,
    government_facility: t.governmentFacility,
    school: t.school,
    transport: t.transportStation,
    other: t.other,
  } satisfies Record<DrinkingFountainPlaceCategory, string>;

  return (
    <fieldset className="toilet-filters">
      <label>
        {t.placeCategory}
        <select
          aria-label={t.placeCategory}
          value={selectedCategory}
          onChange={(event) => onCategoryChange(event.target.value as DrinkingFountainPlaceCategory | '')}
        >
          <option value="">{t.all}</option>
          {placeCategories.map((category) => (
            <option key={category} value={category}>
              {categoryLabelByType[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="checkbox-filter">
        <input
          type="checkbox"
          checked={requiresOpeningHours}
          onChange={(event) => onOpeningHoursChange(event.target.checked)}
        />
        <span>{t.hasOpeningHours}</span>
      </label>
    </fieldset>
  );
}
