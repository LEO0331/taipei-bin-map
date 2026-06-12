import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Translation } from '../i18n';
import type { FacilityWithDistance, Language } from '../types';
import { FacilityPopup } from './FacilityPopup';
import { MapLegend } from './MapLegend';

type UserLocation = {
  latitude: number;
  longitude: number;
};

type FacilityMapProps = {
  facilities: FacilityWithDistance[];
  language: Language;
  userLocation: UserLocation | null;
  t: Translation;
};

const taipeiCenter: [number, number] = [25.0478, 121.5319];

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

const markerStyleByType = {
  pedestrian_bin: {
    color: '#ffffff',
    fillColor: '#08756d',
  },
  dog_waste_bag_box: {
    color: '#ffffff',
    fillColor: '#b85d17',
  },
};

export function FacilityMap({ facilities, language, userLocation, t }: FacilityMapProps) {
  const userIcon = useMemo(
    () =>
      L.divIcon({
        className: 'user-marker',
        html: '<span></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
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
        {facilities.map((facility) => (
          <CircleMarker
            key={facility.id}
            center={[facility.latitude, facility.longitude]}
            className={`facility-marker ${facility.type}`}
            radius={facility.isCoordinateOutlier ? 7 : 5}
            pathOptions={{
              ...markerStyleByType[facility.type],
              dashArray: facility.isCoordinateOutlier ? '3 3' : undefined,
              fillOpacity: 0.92,
              opacity: 1,
              weight: facility.isCoordinateOutlier ? 3 : 2,
            }}
          >
            <Popup>
              <FacilityPopup facility={facility} language={language} t={t} />
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <MapLegend t={t} />
    </section>
  );
}
