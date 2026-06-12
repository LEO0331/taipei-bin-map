import type { Translation } from '../i18n';
import type { Language } from '../types';
import { getToiletCategoryLabel } from '../utils/facilityUtils';

type PublicToiletFiltersProps = {
  categories: string[];
  language: Language;
  selectedCategory: string;
  requiresAccessibleToilet: boolean;
  requiresParentChildToilet: boolean;
  t: Translation;
  onCategoryChange: (category: string) => void;
  onAccessibleChange: (enabled: boolean) => void;
  onParentChildChange: (enabled: boolean) => void;
};

export function PublicToiletFilters({
  categories,
  language,
  selectedCategory,
  requiresAccessibleToilet,
  requiresParentChildToilet,
  t,
  onCategoryChange,
  onAccessibleChange,
  onParentChildChange,
}: PublicToiletFiltersProps) {
  return (
    <div className="toilet-filters">
      <label>
        <span>{t.toiletCategory}</span>
        <select value={selectedCategory} onChange={(event) => onCategoryChange(event.target.value)}>
          <option value="">{t.all}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {getToiletCategoryLabel(category, language)}
            </option>
          ))}
        </select>
      </label>
      <label className="checkbox-filter">
        <input
          type="checkbox"
          checked={requiresAccessibleToilet}
          onChange={(event) => onAccessibleChange(event.target.checked)}
        />
        <span>{t.accessibleToiletAvailable}</span>
      </label>
      <label className="checkbox-filter">
        <input
          type="checkbox"
          checked={requiresParentChildToilet}
          onChange={(event) => onParentChildChange(event.target.checked)}
        />
        <span>{t.parentChildToiletAvailable}</span>
      </label>
    </div>
  );
}
