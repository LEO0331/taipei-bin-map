import type { Translation } from '../i18n';
import type { FacilityWithDistance, Language } from '../types';
import {
  getAcceptedItemsLabel,
  getCommercialEvServiceTypeLabel,
  getDirectDrinkingStatusLabel,
  getElectricMotorcycleChargingLocationCategoryLabel,
  getFacilityGoogleMapsUrl,
  getFacilityTypeLabel,
  getFuelStationServiceTypeLabel,
  getFuelStationStatusLabel,
  getRiversideToiletTypeLabel,
  getToiletCategoryLabel,
} from '../utils/facilityUtils';

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
      {facility.type === 'riverside_toilet' && (
        <>
          {facility.riversidePark && <p>{t.riversidePark}: {facility.riversidePark}</p>}
          {facility.locationDescription && <p>{t.locationDescription}: {facility.locationDescription}</p>}
          {facility.riversideToiletType && <p>{t.toiletType}: {getRiversideToiletTypeLabel(facility.riversideToiletType, language)}</p>}
          {facility.remark && <p>{t.remark}: {facility.remark}</p>}
        </>
      )}
      {facility.type === 'family_friendly_toilet' && (
        <>
          {facility.toiletName && <p>{t.toiletName}: {facility.toiletName}</p>}
          {facility.toiletId && <p>{t.toiletId}: {facility.toiletId}</p>}
          {facility.toiletCategory && <p>{t.toiletCategory}: {facility.toiletCategory}</p>}
          {facility.toiletLocation && <p>{t.toiletLocation}: {facility.toiletLocation}</p>}
          {facility.toiletGrade && <p>{t.toiletGrade}: {facility.toiletGrade}</p>}
          {facility.manager && <p>{t.managingUnit}: {facility.manager}</p>}
          <p>{t.diaperTableCount}: {facility.diaperTableCount ?? 0}</p>
          <p>{t.childSeatCount}: {facility.childSeatCount ?? 0}</p>
          {facility.hasFamilyFriendlyAward && <p>{t.familyFriendlyAward}: {facility.familyFriendlyAwardRaw ?? 'V'}</p>}
        </>
      )}
      {facility.type === 'drinking_fountain' && facility.name && (
        <p>
          {t.placeName}: {facility.name}
        </p>
      )}
      {facility.type === 'direct_drinking_station' && facility.name && (
        <p>{t.placeName}: {facility.name}</p>
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
      {facility.type === 'drinking_fountain' && (
        <>
          {facility.installLocation && (
            <p>
              {t.installLocation}: {facility.installLocation}
            </p>
          )}
          {showPositiveNumber(facility.drinkingFountainCount) && (
            <p>
              {t.drinkingFountainCount}: {facility.drinkingFountainCount}
            </p>
          )}
          {facility.openingHours && (
            <p>
              {t.openingHours}: {facility.openingHours}
            </p>
          )}
          {facility.manager && (
            <p>
              {t.managedBy}: {facility.manager}
            </p>
          )}
          {facility.phone && (
            <p>
              {t.phone}: {facility.phone}
            </p>
          )}
        </>
      )}
      {facility.type === 'timed_collection_point' && (
        <>
          {facility.team && <p>{t.cleaningTeam}: {facility.team}</p>}
          {facility.phone && <p>{t.phone}: {facility.phone}</p>}
          <p>{t.acceptedItems}: {getAcceptedItemsLabel(facility, language)}</p>
          {facility.serviceTimeText && <p>{t.serviceHoursNotes}: {facility.serviceTimeText}</p>}
        </>
      )}
      {facility.type === 'direct_drinking_station' && (
        <>
          {facility.placeType && <p>{t.placeType}: {facility.placeType}</p>}
          {facility.city && <p>{t.city}: {facility.city}</p>}
          {facility.openingHours && <p>{t.openingHours}: {facility.openingHours}</p>}
          {facility.installLocation && <p>{t.installLocation}: {facility.installLocation}</p>}
          <p>{t.status}: {getDirectDrinkingStatusLabel(facility.directDrinkingStatus, language)}</p>
          {facility.latestSamplingDate && <p>{t.latestSamplingDate}: {facility.latestSamplingDate}</p>}
          {facility.maintenanceUrl && <p><a href={facility.maintenanceUrl} target="_blank" rel="noreferrer">{t.waterQualityMaintenanceInfo}</a></p>}
          {facility.photoUrl && <p><a href={facility.photoUrl} target="_blank" rel="noreferrer">{t.photo}</a></p>}
        </>
      )}
      {facility.type === 'used_clothing_recycling_box' && (
        <>
          {facility.village && <p>{t.village}: {facility.village}</p>}
          {facility.approvedLocation && <p>{t.approvedLocation}: {facility.approvedLocation}</p>}
          {facility.organizationName && <p>{t.organizationName}: {facility.organizationName}</p>}
          {facility.phone && <p>{t.phone}: {facility.phone}</p>}
        </>
      )}
      {facility.type === 'lactation_room' && (
        <>
          {facility.openingHours && <p>{t.openingHours}: {facility.openingHours}</p>}
          {facility.locationGuidance && <p>{t.locationGuidance}: {facility.locationGuidance}</p>}
          {facility.phone && <p>{t.phone}: {facility.phone}</p>}
          {facility.extension && <p>{t.extension}: {facility.extension}</p>}
          {facility.mobile && <p>{t.mobile}: {facility.mobile}</p>}
          {facility.basicEquipmentRaw && <p>{t.basicEquipment}: {facility.basicEquipmentRaw}</p>}
          {facility.friendlyEquipmentOrServicesRaw && <p>{t.friendlyEquipmentOrServices}: {facility.friendlyEquipmentOrServicesRaw}</p>}
          {facility.certificationValidityRaw && <p>{t.certificationValidity}: {facility.certificationValidityRaw}</p>}
          {facility.wheelchairAccessibilityRaw && <p>{t.wheelchairAccessibility}: {facility.wheelchairAccessibilityRaw}</p>}
          {facility.notes && <p>{t.notes}: {facility.notes}</p>}
        </>
      )}
      {facility.type === 'motorcycle_inspection_station' && (
        <>
          {facility.stationId && <p>{t.stationId}: {facility.stationId}</p>}
          {facility.brand && <p>{t.brand}: {facility.brand}</p>}
          {facility.stationName && <p>{t.stationName}: {facility.stationName}</p>}
          {facility.postalCode && <p>{t.postalCode}: {facility.postalCode}</p>}
          {facility.phone && <p>{t.phone}: {facility.phone}</p>}
        </>
      )}
      {facility.type === 'electric_motorcycle_charging_station' && (
        <>
          {facility.stationId && <p>{t.stationId}: {facility.stationId}</p>}
          {facility.unitName && <p>{t.unitName}: {facility.unitName}</p>}
          {facility.city && <p>{t.city}: {facility.city}</p>}
          {facility.districtCode && <p>{t.districtCode}: {facility.districtCode}</p>}
          {facility.locationCategory && <p>{t.locationCategory}: {getElectricMotorcycleChargingLocationCategoryLabel(facility.locationCategory, language)}</p>}
        </>
      )}
      {facility.type === 'commercial_ev_charging_swap_station' && (
        <>
          {facility.serviceType && <p>{t.serviceType}: {getCommercialEvServiceTypeLabel(facility.serviceType, language)}</p>}
          {facility.operatorName && <p>{t.operatorName}: {facility.operatorName}</p>}
          {facility.stationName && <p>{t.stationName}: {facility.stationName}</p>}
          {facility.sourceSequenceNumber && <p>{t.sourceSequenceNumber}: {facility.sourceSequenceNumber}</p>}
          {facility.city && <p>{t.city}: {facility.city}</p>}
          {facility.cityCode && <p>{t.cityCode}: {facility.cityCode}</p>}
        </>
      )}
      {facility.type === 'gas_lpg_station' && (
        <>
          {facility.companyName && <p>{t.companyName}: {facility.companyName}</p>}
          {facility.stationName && <p>{t.stationName}: {facility.stationName}</p>}
          {facility.supplier && <p>{t.supplier}: {facility.supplier}</p>}
          {facility.phone && <p>{t.phone}: {facility.phone}</p>}
          {facility.businessHours && <p>{t.businessHours}: {facility.businessHours}</p>}
          <p>{t.hasOil}: {facility.hasOil ? t.yes : t.no}</p>
          <p>{t.hasLpg}: {facility.hasLpg ? t.yes : t.no}</p>
          <p>{t.hasSelfService}: {facility.hasSelfService ? t.yes : t.no}</p>
          {facility.stationServiceTypes?.length && <p>{t.serviceType}: {facility.stationServiceTypes.map((type) => getFuelStationServiceTypeLabel(type, language)).join('、')}</p>}
          <p>{t.stationStatus}: {getFuelStationStatusLabel(facility.stationStatus, language)}</p>
          {facility.xTwd97 && <p>{t.xTwd97}: {facility.xTwd97}</p>}
          {facility.yTwd97 && <p>{t.yTwd97}: {facility.yTwd97}</p>}
        </>
      )}
      {facility.note && <p>{t.notice}: {facility.note}</p>}
      {facility.type === 'timed_collection_point' && <p>{t.notice}: {t.timedCollectionNotice}</p>}
      {facility.type === 'direct_drinking_station' && <p>{t.notice}: {t.directDrinkingNotice}</p>}
      {facility.type === 'used_clothing_recycling_box' && <p>{t.notice}: {t.usedClothingRecyclingNotice}</p>}
      {facility.type === 'lactation_room' && <p>{t.notice}: {t.lactationRoomNotice}</p>}
      {facility.type === 'motorcycle_inspection_station' && <p>{t.notice}: {t.inspectionStationNotice}</p>}
      {facility.type === 'electric_motorcycle_charging_station' && <p>{t.notice}: {t.chargingStationNotice}</p>}
      {facility.type === 'commercial_ev_charging_swap_station' && <p>{t.notice}: {t.commercialEvNotice}</p>}
      {facility.type === 'gas_lpg_station' && <p>{t.notice}: {t.gasLpgPopupNotice}</p>}
      {facility.isCoordinateOutlier && <p className="outlier-warning">{t.coordinateOutlierWarning}</p>}
      <a href={getFacilityGoogleMapsUrl(facility)} target="_blank" rel="noreferrer">
        {t.openGoogleMaps}
      </a>
    </div>
  );
}
