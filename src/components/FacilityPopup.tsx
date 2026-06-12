import type { Translation } from '../i18n';
import type { FacilityWithDistance, Language } from '../types';
import { getFacilityGoogleMapsUrl, getFacilityTypeLabel, getToiletCategoryLabel } from '../utils/facilityUtils';

type FacilityPopupProps = {
  facility: FacilityWithDistance;
  language: Language;
  t: Translation;
};

export function FacilityPopup({ facility, language, t }: FacilityPopupProps) {
  const showPositiveNumber = (value: number | undefined) => typeof value === 'number' && value > 0;

  return (
    <div className="map-popup">
      <strong>
        {t.type}: {getFacilityTypeLabel(facility.type, language)}
      </strong>
      {facility.type === 'public_toilet' && (
        <>
          {facility.name && (
            <p>
              {t.toiletName}: {facility.name}
            </p>
          )}
          {facility.category && (
            <p>
              {t.toiletCategory}: {getToiletCategoryLabel(facility.category, language)}
            </p>
          )}
        </>
      )}
      <p>
        {t.district}: {facility.district}
      </p>
      {facility.type === 'dog_waste_bag_box' ? (
        <>
          <p>
            {t.road}: {facility.road}
          </p>
          <p>
            {t.location}: {facility.location}
          </p>
        </>
      ) : (
        <p>
          {t.address}: {facility.address}
        </p>
      )}
      {facility.type === 'public_toilet' && (
        <>
          {facility.manager && (
            <p>
              {t.managedBy}: {facility.manager}
            </p>
          )}
          {showPositiveNumber(facility.totalSeats) && (
            <p>
              {t.totalSeats}: {facility.totalSeats}
            </p>
          )}
          {showPositiveNumber(facility.accessibleToiletSeats) && (
            <p>
              {t.accessibleToiletSeats}: {facility.accessibleToiletSeats}
            </p>
          )}
          {showPositiveNumber(facility.parentChildToiletSeats) && (
            <p>
              {t.parentChildToiletSeats}: {facility.parentChildToiletSeats}
            </p>
          )}
        </>
      )}
      <p>
        {t.notice}: {facility.note}
      </p>
      {facility.isCoordinateOutlier && <p className="outlier-warning">{t.coordinateOutlierWarning}</p>}
      <a href={getFacilityGoogleMapsUrl(facility)} target="_blank" rel="noreferrer">
        {t.openGoogleMaps}
      </a>
    </div>
  );
}
