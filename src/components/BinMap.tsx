import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Translation } from '../i18n';
import type { BinWithDistance } from '../types';

type UserLocation = {
  latitude: number;
  longitude: number;
};

type BinMapProps = {
  bins: BinWithDistance[];
  userLocation: UserLocation | null;
  t: Translation;
};

const taipeiCenter: [number, number] = [25.0478, 121.5319];

const googleMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

function MapController({
  userLocation,
  bins,
}: {
  userLocation: UserLocation | null;
  bins: BinWithDistance[];
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

    if (bins.length > 0 && bins.length < 80) {
      const bounds = L.latLngBounds(bins.map((bin) => [bin.latitude, bin.longitude]));
      map.fitBounds(bounds.pad(0.15), { animate: true, maxZoom: 16 });
    }
  }, [bins, map, userLocation]);

  return null;
}

export function BinMap({ bins, userLocation, t }: BinMapProps) {
  const binIcon = useMemo(
    () =>
      L.divIcon({
        className: 'bin-marker',
        html: '<span></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    [],
  );

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
      <MapContainer center={taipeiCenter} zoom={13} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController bins={bins} userLocation={userLocation} />
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
            <Popup>{t.userLocation}</Popup>
          </Marker>
        )}
        {bins.map((bin) => (
          <Marker key={bin.id} position={[bin.latitude, bin.longitude]} icon={binIcon}>
            <Popup>
              <div className="map-popup">
                <strong>{bin.district}</strong>
                <p>
                  {t.address}: {bin.address}
                </p>
                <p>
                  {t.note}: {bin.note}
                </p>
                <a href={googleMapsUrl(bin.latitude, bin.longitude)} target="_blank" rel="noreferrer">
                  {t.openGoogleMaps}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </section>
  );
}
