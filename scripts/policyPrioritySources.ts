import type { PrioritySource } from '../src/lib/policyPriorityTypes';

export interface PrioritySourceArchive extends PrioritySource {
  filename: string; downloadUrl: string; httpStatus: number;
  metadataUpdatedAt: string | null; acquisitionStatus: 'available' | 'blocked';
}
export interface PriorityRawManifest {
  schemaVersion: 1; snapshotId: string; generatedAt: string; marketDirectory: string;
  sources: PrioritySourceArchive[];
}
export const PRIORITY_LICENSE_URL = 'https://data.taipei/terms';
export const priorityTransportSources = [
  { id: 'taipei_travel', name: '臺北旅遊網景點 API（繁體中文）', provider: '臺北市政府觀光傳播局',
    datasetUrl: 'https://travel.taipei/open-api/swagger/ui/index', resourceId: 'Attractions/All:zh-tw',
    downloadUrl: 'https://travel.taipei/open-api/zh-tw/Attractions/All?page=1', filename: 'travel-page-1.json',
    resourceUpdatedAt: null, metadataUpdatedAt: null, encoding: 'UTF-8', crs: 'WGS84; requires successful schema validation',
    caveat: 'Acquisition may be blocked by provider WAF. No cached search-result POIs or synthetic replacements are used.' },
  { id: 'taipei_mrt_gis', name: '臺北都會區大眾捷運系統車站點位圖', provider: '臺北市政府捷運工程局',
    datasetUrl: 'https://data.taipei/dataset/detail?id=758e5ae0-e6ee-448b-81f5-316eb68a5ba7',
    resourceId: 'a63e3278-9d10-4916-9f24-e5a4d78afb31', filename: 'mrt-stations.geojson',
    downloadUrl: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=a63e3278-9d10-4916-9f24-e5a4d78afb31',
    resourceUpdatedAt: '2026-10-13T09:53:19+08:00', metadataUpdatedAt: '2026-10-13T09:53:42+08:00',
    encoding: 'UTF-8', crs: 'EPSG:3826 / TWD97 TM2 zone 121',
    caveat: 'Station-centre reference, not entrances or a permissible installation location; source range ends 2026-08-30. Three explicitly reviewed Taipei interchange pairs use one source anchor.' },
] as const;
