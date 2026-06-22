import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
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
};

const taipeiCenter: [number, number] = [25.0478, 121.5319];
const INITIAL_MARKER_BATCH_SIZE = 240;
const MARKER_BATCH_SIZE = 320;

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
  drinking_fountain: '🚰',
  timed_collection_point: '♻️',
  direct_drinking_station: '🚰',
  used_clothing_recycling_box: '👕',
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

export function FacilityMap({ facilities, language, markerLimitExceeded, userLocation, t }: FacilityMapProps) {
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
      </MapContainer>
      {markerLimitExceeded && <p className="map-marker-limit">{t.mapMarkerLimitNotice}</p>}
      <MapLegend t={t} />
    </section>
  );
}
