import type { Translation } from '../i18n';

type SearchFiltersProps = {
  searchTerm: string;
  district: string;
  districts: string[];
  placeholder?: string;
  t: Translation;
  onSearchChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
};

export function SearchFilters({
  searchTerm,
  district,
  districts,
  t,
  placeholder = t.searchPlaceholder,
  onSearchChange,
  onDistrictChange,
}: SearchFiltersProps) {
  return (
    <div className="search-filters">
      <label>
        <span>{placeholder}</span>
        <input
          type="search"
          inputMode="search"
          aria-label={t.search}
          placeholder={placeholder}
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
