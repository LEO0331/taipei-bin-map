import type { Translation } from '../i18n';
import type { FacilityWithDistance, Language } from '../types';
import {
  formatDistance,
  getAcceptedItemsLabel,
  getCommercialEvServiceTypeLabel,
  getDirectDrinkingStatusLabel,
  getElectricMotorcycleChargingLocationCategoryLabel,
  getFacilityGoogleMapsUrl,
  getFacilityTypeLabel,
  getRiversideToiletTypeLabel,
  getToiletCategoryLabel,
} from '../utils/facilityUtils';

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
  if (facility.type === 'riverside_toilet') {
    return [facility.riversidePark, facility.locationDescription].filter(Boolean).join(' ');
  }

  return facility.address;
};

const hasPositiveNumber = (value: number | undefined) => typeof value === 'number' && value > 0;

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
                {facility.name && <span>{facility.name}</span>}
                <span>{getFacilityPlace(facility)}</span>
              </p>
              {facility.type === 'public_toilet' && (
                <small>
                  {[
                    facility.category ? getToiletCategoryLabel(facility.category, language) : '',
                    hasPositiveNumber(facility.totalSeats) ? `${t.totalSeats}: ${facility.totalSeats}` : '',
                    hasPositiveNumber(facility.accessibleToiletSeats)
                      ? `${t.accessibleToiletSeats}: ${facility.accessibleToiletSeats}`
                      : '',
                    hasPositiveNumber(facility.parentChildToiletSeats)
                      ? `${t.parentChildToiletSeats}: ${facility.parentChildToiletSeats}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              )}
              {facility.type === 'riverside_toilet' && (
                <small>
                  {[
                    facility.riversidePark ? `${t.riversidePark}: ${facility.riversidePark}` : '',
                    facility.riversideToiletType ? `${t.toiletType}: ${getRiversideToiletTypeLabel(facility.riversideToiletType, language)}` : '',
                    facility.remark ? `${t.remark}: ${facility.remark}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'family_friendly_toilet' && (
                <small>
                  {[
                    facility.toiletCategory ? `${t.toiletCategory}: ${facility.toiletCategory}` : '',
                    facility.toiletLocation ? `${t.toiletLocation}: ${facility.toiletLocation}` : '',
                    `${t.diaperTableCount}: ${facility.diaperTableCount ?? 0}`,
                    `${t.childSeatCount}: ${facility.childSeatCount ?? 0}`,
                    facility.hasFamilyFriendlyAward ? t.familyFriendlyAward : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'drinking_fountain' && (
                <small>
                  {[
                    facility.installLocation ? `${t.installLocation}: ${facility.installLocation}` : '',
                    facility.openingHours ? `${t.openingHours}: ${facility.openingHours}` : '',
                    hasPositiveNumber(facility.drinkingFountainCount)
                      ? `${t.drinkingFountainCount}: ${facility.drinkingFountainCount}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              )}
              {facility.type === 'timed_collection_point' && (
                <small>
                  {[
                    facility.team ? `${t.cleaningTeam}: ${facility.team}` : '',
                    facility.phone ? `${t.phone}: ${facility.phone}` : '',
                    `${t.acceptedItems}: ${getAcceptedItemsLabel(facility, language)}`,
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'direct_drinking_station' && (
                <small>
                  {[
                    facility.placeType ? `${t.placeType}: ${facility.placeType}` : '',
                    facility.city ? `${t.city}: ${facility.city}` : '',
                    `${t.status}: ${getDirectDrinkingStatusLabel(facility.directDrinkingStatus, language)}`,
                    facility.openingHours ? `${t.openingHours}: ${facility.openingHours}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'used_clothing_recycling_box' && (
                <small>
                  {[
                    facility.village ? `${t.village}: ${facility.village}` : '',
                    facility.organizationName ? `${t.organizationName}: ${facility.organizationName}` : '',
                    facility.phone ? `${t.phone}: ${facility.phone}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'lactation_room' && (
                <small>
                  {[
                    facility.openingHours ? `${t.openingHours}: ${facility.openingHours}` : '',
                    facility.locationGuidance ? `${t.locationGuidance}: ${facility.locationGuidance}` : '',
                    facility.phone ? `${t.phone}: ${facility.phone}` : '',
                    facility.certificationValidityRaw ? `${t.certificationValidity}: ${facility.certificationValidityRaw}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'motorcycle_inspection_station' && (
                <small>
                  {[
                    facility.stationId ? `${t.stationId}: ${facility.stationId}` : '',
                    facility.brand ? `${t.brand}: ${facility.brand}` : '',
                    facility.postalCode ? `${t.postalCode}: ${facility.postalCode}` : '',
                    facility.phone ? `${t.phone}: ${facility.phone}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'electric_motorcycle_charging_station' && (
                <small>
                  {[
                    facility.stationId ? `${t.stationId}: ${facility.stationId}` : '',
                    facility.unitName ? `${t.unitName}: ${facility.unitName}` : '',
                    facility.city ? `${t.city}: ${facility.city}` : '',
                    facility.districtCode ? `${t.districtCode}: ${facility.districtCode}` : '',
                    facility.locationCategory ? `${t.locationCategory}: ${getElectricMotorcycleChargingLocationCategoryLabel(facility.locationCategory, language)}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'commercial_ev_charging_swap_station' && (
                <small>
                  {[
                    facility.serviceType ? `${t.serviceType}: ${getCommercialEvServiceTypeLabel(facility.serviceType, language)}` : '',
                    facility.operatorName ? `${t.operatorName}: ${facility.operatorName}` : '',
                    facility.sourceSequenceNumber ? `${t.sourceSequenceNumber}: ${facility.sourceSequenceNumber}` : '',
                    facility.city ? `${t.city}: ${facility.city}` : '',
                    facility.cityCode ? `${t.cityCode}: ${facility.cityCode}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.note && <small>{facility.note}</small>}
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
