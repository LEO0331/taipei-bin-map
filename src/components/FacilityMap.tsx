import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Translation } from '../i18n';
import type {
  CommercialEvServiceType,
  ElectricMotorcycleChargingLocationCategory,
  FacilityType,
  FacilityWithDistance,
  Language,
} from '../types';
import {
  getCommercialEvServiceTypeLabel,
  getElectricMotorcycleChargingLocationCategoryLabel,
} from '../utils/facilityUtils';
import { FacilityPopup } from './FacilityPopup';
import { MapLegend } from './MapLegend';

type UserLocation = {
  latitude: number;
  longitude: number;
};

type FacilityMapProps = {
  facilities: FacilityWithDistance[];
  language: Language;
  markerLimitExceeded: boolean;
  userLocation: UserLocation | null;
  t: Translation;
  lactationDistrictSummaries: Array<{
    district: string;
    count: number;
    withOpeningHours: number;
    withLocationGuidance: number;
    withCertificationValidity: number;
  }>;
  inspectionDistrictSummaries: Array<{
    district: string;
    count: number;
    topBrands: Array<{ brand: string; count: number }>;
  }>;
  chargingDistrictSummaries: Array<{
    district: string;
    count: number;
    topLocationCategories: Array<{
      locationCategory: ElectricMotorcycleChargingLocationCategory;
      locationCategoryRaw?: string;
      count: number;
    }>;
  }>;
  commercialEvDistrictSummaries: Array<{
    district: string;
    count: number;
    electricCarChargingCount: number;
    electricMotorcycleChargingCount: number;
    electricMotorcycleBatterySwapCount: number;
    topOperators: Array<{ operatorName: string; count: number }>;
  }>;
  communityRecyclingDistrictSummaries: Array<{
    district: string;
    count: number;
    uniqueAddressCount: number;
  }>;
  cleanNeedleDistrictSummaries: Array<{
    district: string;
    count: number;
    healthEducationConsultationStationCount: number;
    needleReturnBoxCount: number;
    automaticServiceMachineCount: number;
    twentyFourHourServiceCount: number;
  }>;
  payTaipeiParkingDistrictSummaries: Array<{
    district: string;
    count: number;
    supportedCount: number;
    stoppedCount: number;
    topOperators: Array<{ operatorName: string; count: number }>;
  }>;
};

const taipeiCenter: [number, number] = [25.0478, 121.5319];
const INITIAL_MARKER_BATCH_SIZE = 240;
const MARKER_BATCH_SIZE = 320;
const districtCentroids: Record<string, [number, number]> = {
  中正區: [25.0324, 121.5199], 大同區: [25.0634, 121.513], 中山區: [25.0642, 121.5335],
  松山區: [25.0497, 121.5778], 大安區: [25.0268, 121.543], 萬華區: [25.033, 121.497],
  信義區: [25.033, 121.5668], 士林區: [25.095, 121.5246], 北投區: [25.131, 121.501],
  內湖區: [25.0837, 121.5924], 南港區: [25.0327, 121.6112], 文山區: [24.9886, 121.5736],
};

function MapController({
  userLocation,
  facilities,
}: {
  userLocation: UserLocation | null;
  facilities: FacilityWithDistance[];
}) {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 0);
  }, [map]);

  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 16, { animate: true });
      return;
    }

    if (facilities.length > 0 && facilities.length < 80) {
      const bounds = L.latLngBounds(facilities.map((facility) => [facility.latitude, facility.longitude]));
      map.fitBounds(bounds.pad(0.15), { animate: true, maxZoom: 16 });
    }
  }, [facilities, map, userLocation]);

  return null;
}

const markerEmojiByType = {
  pedestrian_bin: '🗑️',
  dog_waste_bag_box: '🐾',
  public_toilet: '🚻',
  riverside_toilet: '🌊',
  family_friendly_toilet: '🚼',
  drinking_fountain: '🚰',
  timed_collection_point: '♻️',
  direct_drinking_station: '🚰',
  used_clothing_recycling_box: '👕',
  lactation_room: '🍼',
  motorcycle_inspection_station: '🏍️',
  electric_motorcycle_charging_station: '🔌',
  commercial_ev_charging_swap_station: '🔋',
  gas_lpg_station: '⛽',
  designated_smoking_area: '⌖',
  announced_no_smoking_place: '🚭',
  community_recycling_station: '🏘️',
  clean_needle_exchange_service_point: '🏥',
  protected_tree: '🌳',
  pay_taipei_cardless_parking_lot: '🅿️',
} satisfies Record<FacilityType, string>;

function useChunkedFacilities(facilities: FacilityWithDistance[]) {
  const [renderedFacilities, setRenderedFacilities] = useState(() =>
    facilities.slice(0, INITIAL_MARKER_BATCH_SIZE),
  );

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let nextCount = Math.min(INITIAL_MARKER_BATCH_SIZE, facilities.length);

    setRenderedFacilities(facilities.slice(0, nextCount));

    const renderNextBatch = () => {
      if (cancelled) {
        return;
      }

      nextCount = Math.min(nextCount + MARKER_BATCH_SIZE, facilities.length);
      setRenderedFacilities(facilities.slice(0, nextCount));

      if (nextCount < facilities.length) {
        frame = window.requestAnimationFrame(renderNextBatch);
      }
    };

    if (nextCount < facilities.length) {
      frame = window.requestAnimationFrame(renderNextBatch);
    }

    return () => {
      cancelled = true;
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [facilities]);

  return renderedFacilities;
}

export function FacilityMap({
  facilities,
  language,
  markerLimitExceeded,
  userLocation,
  t,
  lactationDistrictSummaries,
  inspectionDistrictSummaries,
  chargingDistrictSummaries,
  commercialEvDistrictSummaries,
  communityRecyclingDistrictSummaries,
  cleanNeedleDistrictSummaries,
  payTaipeiParkingDistrictSummaries,
}: FacilityMapProps) {
  const renderedFacilities = useChunkedFacilities(facilities);
  const userIcon = useMemo(
    () =>
      L.divIcon({
        className: 'user-marker',
        html: '<span>📍</span>',
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      }),
    [],
  );

  const facilityIcons = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(markerEmojiByType).map(([type, emoji]) => [
          type,
          L.divIcon({
            className: `facility-div-marker ${type}`,
            html: `<span aria-hidden="true">${emoji}</span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 28],
          }),
        ]),
      ) as Record<FacilityType, L.DivIcon>,
    [],
  );

  return (
    <section className="map-panel" aria-label={t.appTitle}>
      <MapContainer center={taipeiCenter} zoom={13} scrollWheelZoom preferCanvas className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapController facilities={facilities} userLocation={userLocation} />
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
            <Popup>{t.userLocation}</Popup>
          </Marker>
        )}
        {renderedFacilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.latitude, facility.longitude]}
            icon={facilityIcons[facility.type]}
          >
            <Popup>
              <FacilityPopup facility={facility} language={language} t={t} />
            </Popup>
          </Marker>
        ))}
        {lactationDistrictSummaries.map((summary) => {
          const center = districtCentroids[summary.district];
          if (!center) return null;
          return (
            <CircleMarker
              key={`lactation-${summary.district}`}
              center={center}
              radius={Math.min(26, 10 + Math.sqrt(summary.count) * 1.8)}
              pathOptions={{ color: '#8b3d72', fillColor: '#f0b8dc', fillOpacity: 0.78, weight: 2 }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{t.lactationRooms}</strong>
                  <p>{t.district}: {summary.district}</p>
                  <p>{t.facilityCount}: {summary.count}</p>
                  <p>{t.recordsWithOpeningHours}: {summary.withOpeningHours}</p>
                  <p>{t.recordsWithLocationGuidance}: {summary.withLocationGuidance}</p>
                  <p>{t.recordsWithCertificationValidity}: {summary.withCertificationValidity}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {inspectionDistrictSummaries.map((summary) => {
          const center = districtCentroids[summary.district];
          if (!center) return null;
          return (
            <CircleMarker
              key={`inspection-${summary.district}`}
              center={center}
              radius={Math.min(26, 10 + Math.sqrt(summary.count) * 1.8)}
              pathOptions={{ color: '#61451f', fillColor: '#f2ce7e', fillOpacity: 0.78, weight: 2 }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{t.motorcycleInspectionStations}</strong>
                  <p>{t.district}: {summary.district}</p>
                  <p>{t.stationCount}: {summary.count}</p>
                  <p>{t.topBrands}: {summary.topBrands.map((item) => `${item.brand} ${item.count}`).join('、')}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {chargingDistrictSummaries.map((summary) => {
          const center = districtCentroids[summary.district];
          if (!center) return null;
          return (
            <CircleMarker
              key={`charging-${summary.district}`}
              center={center}
              radius={Math.min(26, 10 + Math.sqrt(summary.count) * 1.8)}
              pathOptions={{ color: '#255f57', fillColor: '#8fd6c8', fillOpacity: 0.78, weight: 2 }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{t.electricMotorcycleChargingStations}</strong>
                  <p>{t.district}: {summary.district}</p>
                  <p>{t.stationCount}: {summary.count}</p>
                  <p>{t.topLocationCategories}: {summary.topLocationCategories.map((item) => `${getElectricMotorcycleChargingLocationCategoryLabel(item.locationCategory, language)} ${item.count}`).join('、')}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {commercialEvDistrictSummaries.map((summary) => {
          const center = districtCentroids[summary.district];
          if (!center) return null;
          const serviceCounts: Array<[CommercialEvServiceType, number]> = [
            ['electric_car_charging', summary.electricCarChargingCount],
            ['electric_motorcycle_charging', summary.electricMotorcycleChargingCount],
            ['electric_motorcycle_battery_swap', summary.electricMotorcycleBatterySwapCount],
          ];
          return (
            <CircleMarker
              key={`commercial-ev-${summary.district}`}
              center={center}
              radius={Math.min(26, 10 + Math.sqrt(summary.count) * 1.8)}
              pathOptions={{ color: '#2f4a75', fillColor: '#b9d4ff', fillOpacity: 0.78, weight: 2 }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{t.commercialEvChargingSwapStations}</strong>
                  <p>{t.district}: {summary.district}</p>
                  <p>{t.stationCount}: {summary.count}</p>
                  <p>{t.serviceType}: {serviceCounts.map(([type, count]) => `${getCommercialEvServiceTypeLabel(type, language)} ${count}`).join('、')}</p>
                  <p>{t.topOperators}: {summary.topOperators.map((item) => `${item.operatorName} ${item.count}`).join('、')}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {communityRecyclingDistrictSummaries.map((summary) => {
          const center = districtCentroids[summary.district];
          if (!center) return null;
          return (
            <CircleMarker
              key={`community-recycling-${summary.district}`}
              center={center}
              radius={Math.min(28, 10 + Math.sqrt(summary.count) * 1.8)}
              pathOptions={{ color: '#2f6b4f', fillColor: '#a7dfba', fillOpacity: 0.78, weight: 2 }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{t.communityRecyclingStationDistrictDistribution}</strong>
                  <p>{t.district}: {summary.district}</p>
                  <p>{t.communityRecyclingStationCount}: {summary.count}</p>
                  <p>{t.uniqueAddressCount}: {summary.uniqueAddressCount}</p>
                  <p>{t.notice}: {t.communityRecyclingStationPopupNotice}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {cleanNeedleDistrictSummaries.map((summary) => {
          const center = districtCentroids[summary.district];
          if (!center) return null;
          return (
            <CircleMarker
              key={`clean-needle-${summary.district}`}
              center={center}
              radius={Math.min(26, 10 + Math.sqrt(summary.count) * 1.8)}
              pathOptions={{ color: '#7a3458', fillColor: '#f1b8d2', fillOpacity: 0.78, weight: 2 }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{t.cleanNeedleServicePointDistrictDistribution}</strong>
                  <p>{t.district}: {summary.district}</p>
                  <p>{t.cleanNeedleServicePointCount}: {summary.count}</p>
                  <p>{t.serviceItem}: {t.healthEducationConsultationStation} {summary.healthEducationConsultationStationCount}、{t.needleReturnBox} {summary.needleReturnBoxCount}、{t.automaticServiceMachine} {summary.automaticServiceMachineCount}</p>
                  <p>{t.twentyFourHourService}: {summary.twentyFourHourServiceCount}</p>
                  <p>{t.notice}: {t.cleanNeedlePopupNotice}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {payTaipeiParkingDistrictSummaries.map((summary) => {
          const center = districtCentroids[summary.district];
          if (!center) return null;
          return (
            <CircleMarker
              key={`pay-taipei-parking-${summary.district}`}
              center={center}
              radius={Math.min(26, 10 + Math.sqrt(summary.count) * 1.8)}
              pathOptions={{ color: '#51576d', fillColor: '#c9d1f0', fillOpacity: 0.78, weight: 2 }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{t.payTaipeiCardlessParkingLots}</strong>
                  <p>{t.district}: {summary.district}</p>
                  <p>{t.facilityCount}: {summary.count}</p>
                  <p>{t.supportedRecordCount}: {summary.supportedCount}</p>
                  <p>{t.notSupportedOrStoppedRecordCount}: {summary.stoppedCount}</p>
                  <p>{t.topOperators}: {summary.topOperators.map((item) => `${item.operatorName} ${item.count}`).join('、')}</p>
                  <p>{t.notice}: {t.payTaipeiParkingPopupNotice}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {markerLimitExceeded && <p className="map-marker-limit">{t.mapMarkerLimitNotice}</p>}
      <MapLegend t={t} />
    </section>
  );
}
