import type { Translation } from '../i18n';
import type { FacilityWithDistance, Language } from '../types';
import { formatDistance, getFacilityGoogleMapsUrl, getFacilityTypeLabel } from '../utils/facilityUtils';

type FacilityListProps = {
  facilities: FacilityWithDistance[];
  heading: string;
  isLimited?: boolean;
  language: Language;
  t: Translation;
  totalCount?: number;
};

const getFacilityPlace = (facility: FacilityWithDistance) => {
  if (facility.type === 'dog_waste_bag_box') {
    return [facility.road, facility.location].filter(Boolean).join(' ');
  }

  return facility.address;
};

export function FacilityList({
  facilities,
  heading,
  isLimited = false,
  language,
  t,
  totalCount = facilities.length,
}: FacilityListProps) {
  return (
    <section className="facility-list" aria-labelledby="facility-list-heading">
      <div className="list-heading">
        <h2 id="facility-list-heading">{heading}</h2>
        <span>
          {totalCount} {t.resultsCount}
        </span>
      </div>
      {isLimited && <p className="list-limit">{t.listLimitNotice}</p>}
      {facilities.length === 0 ? (
        <p className="empty-state">{t.noMatchingFacilities}</p>
      ) : (
        <ol>
          {facilities.map((facility, index) => (
            <li key={facility.id}>
              <div>
                <strong>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {facility.district}
                </strong>
                {typeof facility.distanceMeters === 'number' && (
                  <span className="distance">{formatDistance(facility.distanceMeters, language)}</span>
                )}
              </div>
              <p>
                <b>{getFacilityTypeLabel(facility.type, language)}</b>
                <span>{getFacilityPlace(facility)}</span>
              </p>
              <small>{facility.note}</small>
              {facility.isCoordinateOutlier && <small className="outlier-warning">{t.coordinateOutlierWarning}</small>}
              <a href={getFacilityGoogleMapsUrl(facility)} target="_blank" rel="noreferrer">
                {t.openGoogleMaps}
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
