import type { Translation } from '../i18n';
import type { FacilityWithDistance, Language } from '../types';
import { getFacilityGoogleMapsUrl, getFacilityTypeLabel } from '../utils/facilityUtils';

type FacilityPopupProps = {
  facility: FacilityWithDistance;
  language: Language;
  t: Translation;
};

export function FacilityPopup({ facility, language, t }: FacilityPopupProps) {
  return (
    <div className="map-popup">
      <strong>
        {t.type}: {getFacilityTypeLabel(facility.type, language)}
      </strong>
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
