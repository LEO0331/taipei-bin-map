import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Translation } from '../i18n';
import type { FacilityType, FacilityWithDistance, Language } from '../types';
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
      </MapContainer>
      {markerLimitExceeded && <p className="map-marker-limit">{t.mapMarkerLimitNotice}</p>}
      <MapLegend t={t} />
    </section>
  );
}
