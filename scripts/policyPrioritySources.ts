import type { PrioritySource } from '../src/lib/policyPriorityTypes';
import { hash } from './binPolicyGovernance';
import { marketSourceDefinitions } from './policyPriorityMarketSources';

export interface PrioritySourceArchive extends PrioritySource {
  filename: string; downloadUrl: string; httpStatus: number;
  metadataUpdatedAt: string | null; acquisitionStatus: 'available' | 'blocked';
}
export interface PriorityRawManifest {
  schemaVersion: 1 | 2; snapshotId: string; generatedAt: string; marketDirectory: string;
  sources: PrioritySourceArchive[];
  retiredSources?: readonly ['taipei_travel'];
  derivedFrom?: { snapshotId: string; manifestSha256: string };
}
export const PRIORITY_LICENSE_URL = 'https://data.taipei/terms';
export const RETIRED_TRAVEL_SOURCE = 'taipei_travel';
export const isRetiredTravelSource = (source: Pick<PrioritySourceArchive, 'id' | 'downloadUrl'>) =>
  /^taipei_travel(?:_page_[1-9]\d*)?$/.test(source.id) || /^https:\/\/(?:[^/.]+\.)*travel\.taipei(?::\d+)?(?:\/|$)/i.test(source.downloadUrl);

export const priorityTransportSources = [
  { id: 'taipei_mrt_gis', name: '臺北都會區大眾捷運系統車站點位圖', provider: '臺北市政府捷運工程局',
    datasetUrl: 'https://data.taipei/dataset/detail?id=758e5ae0-e6ee-448b-81f5-316eb68a5ba7',
    resourceId: 'a63e3278-9d10-4916-9f24-e5a4d78afb31', filename: 'mrt-stations.geojson',
    downloadUrl: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=a63e3278-9d10-4916-9f24-e5a4d78afb31',
    resourceUpdatedAt: null, metadataUpdatedAt: null,
    encoding: 'UTF-8', crs: 'EPSG:3826 / TWD97 TM2 zone 121',
    caveat: 'Station-centre reference, not entrances or a permissible installation location; source range ends 2026-08-30. Three explicitly reviewed Taipei interchange pairs use one source anchor.' },
] as const;

export function priorityRawSnapshotId(schemaVersion: 1 | 2, sources: PriorityRawManifest['sources']) {
  return `priority-v${schemaVersion}-${hash(JSON.stringify(sources.map(source => [source.id, source.sha256]))).slice(0, 16)}`;
}

/** A current manifest must contain the complete active source population and no retired source. */
export function validateCurrentPriorityManifest(manifest: PriorityRawManifest) {
  const active = [
    ...priorityTransportSources,
    ...marketSourceDefinitions.map(([id, , , resourceId]) => ({
      id, resourceId, downloadUrl: `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${resourceId}`,
      filename: `${manifest.marketDirectory}/${id}.csv`,
    })),
  ];
  if (manifest.schemaVersion !== 2 || !/^markets\/markets-[a-f0-9]{16}$/.test(manifest.marketDirectory) ||
      !Array.isArray(manifest.sources) || manifest.sources.length !== active.length ||
      !Array.isArray(manifest.retiredSources) || manifest.retiredSources.length !== 1 || manifest.retiredSources[0] !== RETIRED_TRAVEL_SOURCE ||
      !active.every(expected => manifest.sources.some(source => source.id === expected.id && source.resourceId === expected.resourceId &&
        source.downloadUrl === expected.downloadUrl && source.filename === expected.filename && source.acquisitionStatus === 'available' &&
        source.approvalStatus === (source.id.startsWith('commercial_') ? 'context_only' : 'review_required'))) ||
      manifest.snapshotId !== priorityRawSnapshotId(2, manifest.sources)) throw new Error('Invalid current research manifest identity or retirement scope');
}
