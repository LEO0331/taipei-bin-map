import type { Translation } from '../i18n';
import type { FacilityWithDistance, Language } from '../types';
import {
  formatDistance,
  getAcceptedItemsLabel,
  getAnnouncedNoSmokingRecordTypeLabel,
  getCommercialEvServiceTypeLabel,
  getDesignatedSmokingAreaTypeLabel,
  getDirectDrinkingStatusLabel,
  getElectricMotorcycleChargingLocationCategoryLabel,
  getFacilityGoogleMapsUrl,
  getFacilityTypeLabel,
  getFuelStationServiceTypeLabel,
  getFuelStationStatusLabel,
  getGreenSpaceAdopterCategoryLabel,
  getGreenSpaceAdoptionTargetCategoryLabel,
  getOpeningHoursTypeLabel,
  getPayTaipeiParkingGeocodingStatusLabel,
  getPayTaipeiParkingLocationPrecisionLabel,
  getPayTaipeiParkingPostalCodeTypeLabel,
  getPayTaipeiParkingSupportStatusLabel,
  getProtectedTreeLocationTypeLabel,
  getRiversideToiletTypeLabel,
  getTreeCircumferenceCategoryLabel,
  getTreeDiameterCategoryLabel,
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
  if (facility.type === 'announced_no_smoking_place') {
    return [facility.address, facility.locationDescription].filter(Boolean).join(' ');
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
              {facility.type === 'gas_lpg_station' && (
                <small>
                  {[
                    facility.companyName ? `${t.companyName}: ${facility.companyName}` : '',
                    facility.supplier ? `${t.supplier}: ${facility.supplier}` : '',
                    facility.businessHours ? `${t.businessHours}: ${facility.businessHours}` : '',
                    facility.stationServiceTypes?.length ? facility.stationServiceTypes.map((type) => getFuelStationServiceTypeLabel(type, language)).join('、') : '',
                    `${t.stationStatus}: ${getFuelStationStatusLabel(facility.stationStatus, language)}`,
                    facility.phone ? `${t.phone}: ${facility.phone}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'designated_smoking_area' && (
                <small>
                  {[
                    facility.smokingAreaType ? `${t.smokingAreaType}: ${getDesignatedSmokingAreaTypeLabel(facility.smokingAreaType, language)}` : '',
                    facility.openingHours ? `${t.openingHours}: ${facility.openingHours}` : '',
                    facility.openingHoursType ? `${t.openingHoursType}: ${getOpeningHoursTypeLabel(facility.openingHoursType, language)}` : '',
                    facility.relativeLocation ? `${t.relativeLocation}: ${facility.relativeLocation}` : '',
                    facility.managingUnit ? `${t.managingUnit}: ${facility.managingUnit}` : '',
                    facility.managingUnitPhone ? `${t.managingUnitPhone}: ${facility.managingUnitPhone}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'announced_no_smoking_place' && (
                <small>
                  {[
                    facility.recordType ? `${t.noSmokingRecordType}: ${getAnnouncedNoSmokingRecordTypeLabel(facility.recordType, language)}` : '',
                    facility.announcementDate ? `${t.announcementDate}: ${facility.announcementDate}` : '',
                    facility.locationDescription ? `${t.locationDescription}: ${facility.locationDescription}` : '',
                    facility.sourceResourceName ? `${t.sourceResource}: ${facility.sourceResourceName}` : '',
                    facility.coordinateStatus === 'missing' ? t.missingCoordinates : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'community_recycling_station' && (
                <small>
                  {[
                    facility.sourceSequenceNumber ? `${t.sourceSequenceNumber}: ${facility.sourceSequenceNumber}` : '',
                    facility.districtCode ? `${t.districtCode}: ${facility.districtCode}` : '',
                    facility.roadName ? `${t.roadName}: ${facility.roadName}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'clean_needle_exchange_service_point' && (
                <small>
                  {[
                    facility.serviceItem ? `${t.serviceItem}: ${facility.serviceItem}` : '',
                    facility.servicePointCategory ? `${t.servicePointCategory}: ${facility.servicePointCategory}` : '',
                    facility.serviceLocationName ? `${t.serviceLocationName}: ${facility.serviceLocationName}` : '',
                    facility.phoneDisplay ? `${t.phone}: ${facility.phoneDisplay}` : '',
                    facility.extensionDisplay ? `${t.extension}: ${facility.extensionDisplay}` : '',
                    facility.serviceHours ? `${t.serviceHours}: ${facility.serviceHours}` : '',
                    facility.isTwentyFourHourService ? t.twentyFourHourService : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'protected_tree' && (
                <small>
                  {[
                    facility.treeId ? `${t.treeId}: ${facility.treeId}` : '',
                    facility.speciesNameZh ? `${t.speciesNameZh}: ${facility.speciesNameZh}` : '',
                    facility.scientificName ? `${t.scientificName}: ${facility.scientificName}` : '',
                    facility.speciesNameEn ? `${t.speciesNameEn}: ${facility.speciesNameEn}` : '',
                    facility.diameterAtBreastHeightMeters ? `${t.diameterAtBreastHeightMeters}: ${facility.diameterAtBreastHeightMeters} m (${getTreeDiameterCategoryLabel(facility.diameterCategory, language)})` : '',
                    facility.circumferenceAtBreastHeightMeters ? `${t.circumferenceAtBreastHeightMeters}: ${facility.circumferenceAtBreastHeightMeters} m (${getTreeCircumferenceCategoryLabel(facility.circumferenceCategory, language)})` : '',
                    facility.locationTypeCategory ? `${t.locationType}: ${getProtectedTreeLocationTypeLabel(facility.locationTypeCategory, language)}` : '',
                    facility.managementUnit ? `${t.managementUnit}: ${facility.managementUnit}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'pay_taipei_cardless_parking_lot' && (
                <small>
                  {[
                    facility.parkingLotId ? `${t.parkingLotId}: ${facility.parkingLotId}` : '',
                    facility.parkingLotName ? `${t.parkingLotName}: ${facility.parkingLotName}` : '',
                    `${t.supportStatus}: ${getPayTaipeiParkingSupportStatusLabel(facility.supportStatusCategory, language)}`,
                    facility.operatorName ? `${t.operatorName}: ${facility.operatorName}` : '',
                    facility.phoneNumber ? `${t.phone}: ${facility.phoneNumber}` : '',
                    facility.postalCode ? `${t.postalCode}: ${facility.postalCode}` : '',
                    facility.postalCodeType ? `${t.postalCodeType}: ${getPayTaipeiParkingPostalCodeTypeLabel(facility.postalCodeType, language)}` : '',
                    facility.roadName ? `${t.roadName}: ${facility.roadName}` : '',
                    facility.payTaipeiParkingLocationPrecision ? `${t.locationPrecision}: ${getPayTaipeiParkingLocationPrecisionLabel(facility.payTaipeiParkingLocationPrecision, language)}` : '',
                    facility.payTaipeiParkingGeocodingStatus ? `${t.geocodingStatus}: ${getPayTaipeiParkingGeocodingStatusLabel(facility.payTaipeiParkingGeocodingStatus, language)}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'green_space_adoption_record' && (
                <small>
                  {[
                    facility.sourceSequenceNumber ? `${t.sourceSequenceNumber}: ${facility.sourceSequenceNumber}` : '',
                    facility.managementUnit ? `${t.managementUnit}: ${facility.managementUnit}` : '',
                    facility.districtCode ? `${t.districtCode}: ${facility.districtCode}` : '',
                    facility.adoptionTargetAttribute ? `${t.adoptionTargetAttribute}: ${facility.adoptionTargetAttribute}` : '',
                    facility.adoptionTargetCategory ? `${t.adoptionTargetCategory}: ${getGreenSpaceAdoptionTargetCategoryLabel(facility.adoptionTargetCategory, language)}` : '',
                    facility.adopterName ? `${t.adopterName}: ${facility.adopterName}` : '',
                    facility.adopterNameCategory ? `${t.adopterCategory}: ${getGreenSpaceAdopterCategoryLabel(facility.adopterNameCategory, language)}` : '',
                    facility.roadName ? `${t.roadName}: ${facility.roadName}` : '',
                  ].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.type === 'accessible_public_parking_facility' && (
                <small>
                  {[facility.parkingFacilityName ? `${t.parkingFacilityName}: ${facility.parkingFacilityName}` : '', `${t.accessibleCarSpaceCount}: ${facility.accessibleCarSpaceCount ?? 0}`, `${t.accessibleMotorcycleSpaceCount}: ${facility.accessibleMotorcycleSpaceCount ?? 0}`, `${t.accessibleFeatures}: ${facility.accessibilityFeatureCount ?? 0}`].filter(Boolean).join(' · ')}
                </small>
              )}
              {facility.note && <small>{facility.note}</small>}
              {facility.type === 'designated_smoking_area' && facility.photoUrl && (
                <a href={facility.photoUrl} target="_blank" rel="noreferrer">{t.photo}</a>
              )}
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
