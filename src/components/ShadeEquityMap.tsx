import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Language } from '../types';
import type { ShadeEquityCandidate } from '../types/shadeEquity';

function Viewport({ candidates }: { candidates: ShadeEquityCandidate[] }) {
  const map = useMap();
  useEffect(() => {
    if (candidates.length) map.fitBounds(L.latLngBounds(candidates.map(item => [item.segment.latitude, item.segment.longitude])).pad(.1), { maxZoom: 16, animate: false });
  }, [map, candidates]);
  return null;
}

export function ShadeEquityMap({ candidates, language, activeId, onSelect }: { candidates: ShadeEquityCandidate[]; language: Language; activeId: string | null; onSelect: (id: string) => void }) {
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const zh = language === 'zh';
  const visible = candidates.slice(0, 80);
  return <section className="shade-map" aria-label={zh ? '選定查核區段地圖' : 'Selected review segments map'}>
    <p>{zh ? '編號方塊為官方區段的參考位置，不是種植位置；地圖最多呈現 80 個選定區段，完整清單可匯出。' : 'Numbered squares locate official review units, not planting sites. The map shows up to 80 selected segments; export the complete list.'}</p>
    {tilesUnavailable && <p role="status">{zh ? '底圖暫時無法載入；文字清單與匯出仍可使用。' : 'Basemap unavailable; text lists and exports remain available.'}</p>}
    <MapContainer center={[25.05, 121.54]} zoom={12} preferCanvas className="policy-leaflet-map">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' eventHandlers={{ tileerror: () => setTilesUnavailable(true) }}/>
      <Viewport candidates={visible}/>
      {visible.map((item, index) => <Marker key={item.segment.id} position={[item.segment.latitude, item.segment.longitude]} icon={L.divIcon({ className: `shade-numbered-marker${activeId === item.segment.id ? ' active' : ''}`, html: `<span>${index + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] })} eventHandlers={{ click: () => onSelect(item.segment.id) }}>
        <Popup><strong>{index + 1}. {item.segment.road || item.segment.id}</strong><p>{item.segment.district} · {item.segment.id}</p><p>{zh ? '僅供現勘查核，樹穴占用與種植可行性仍待驗證。' : 'Field review only. Pit occupancy and planting feasibility remain unverified.'}</p></Popup>
      </Marker>)}
    </MapContainer>
  </section>;
}
