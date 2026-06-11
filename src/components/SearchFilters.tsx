import type { Translation } from '../i18n';

type SearchFiltersProps = {
  searchTerm: string;
  district: string;
  districts: string[];
  t: Translation;
  onSearchChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
};

export function SearchFilters({
  searchTerm,
  district,
  districts,
  t,
  onSearchChange,
  onDistrictChange,
}: SearchFiltersProps) {
  return (
    <div className="search-filters">
      <label>
        <span>{t.searchPlaceholder}</span>
        <input
          type="search"
          inputMode="search"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <label>
        <span>{t.district}</span>
        <select value={district} onChange={(event) => onDistrictChange(event.target.value)}>
          <option value="">{t.allDistricts}</option>
          {districts.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
