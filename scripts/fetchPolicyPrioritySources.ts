import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hash } from './binPolicyGovernance';
import { priorityTransportSources, PRIORITY_LICENSE_URL, RETIRED_TRAVEL_SOURCE, priorityRawSnapshotId, validateCurrentPriorityManifest, type PrioritySourceArchive, type PriorityRawManifest } from './policyPrioritySources';
import { acquireMarketSources } from './policyPriorityMarketSources';

/** Acquire a review-only raw v2 candidate. No call can publish a research snapshot. */
export async function acquirePolicyPrioritySources(root = 'data/raw/bin-policy-priority', fetcher: typeof fetch = fetch) {
  const output = resolve(root); await mkdir(output, { recursive: true });
  const stage = join(output, `.incoming-${process.pid}`); await mkdir(stage, { recursive: false });
  try {
    const sources: PrioritySourceArchive[] = [];
    const [definition] = priorityTransportSources;
    const response = await fetcher(definition.downloadUrl, { signal: AbortSignal.timeout(60000), redirect: 'error' });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !bytes.length || bytes.length > 15_000_000) throw new Error('MRT acquisition failed or unexpected source size');
    const fetchedAt = new Date().toISOString();
    const payload = JSON.parse(bytes.toString('utf8'));
    if (payload?.type !== 'FeatureCollection' || payload.crs?.properties?.name !== 'EPSG:3826' || !Array.isArray(payload.features) || !payload.features.length) throw new Error('MRT acquisition CRS or feature schema drift');
    const validatedAt = new Date().toISOString();
    await writeFile(join(stage, definition.filename), bytes);
    sources.push({ ...definition, fetchedAt, validatedAt, sha256: hash(bytes), sourceVersion: hash(bytes), httpStatus: response.status,
      acquisitionStatus: 'available', approvalStatus: 'review_required', license: 'Open Government Data License 1.0', licenseUrl: PRIORITY_LICENSE_URL });
    const markets = await acquireMarketSources(join(stage, 'markets'), fetcher);
    for (const source of markets.sources) {
      const marketSource = source as typeof source & { downloadUrl?: string; acquisitionStatus?: 'available' | 'blocked'; httpStatus?: number; metadataUpdatedAt?: string | null };
      sources.push({ ...source, filename: relative(stage, join(markets.directory, source.filename)).replaceAll('\\', '/'),
        downloadUrl: marketSource.downloadUrl ?? `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${source.resourceId}`,
        acquisitionStatus: marketSource.acquisitionStatus ?? 'available', httpStatus: marketSource.httpStatus ?? 200,
        metadataUpdatedAt: marketSource.metadataUpdatedAt ?? null });
    }
    const snapshotId = priorityRawSnapshotId(2, sources);
    const manifest: PriorityRawManifest = { schemaVersion: 2, snapshotId, generatedAt: fetchedAt, marketDirectory: relative(stage, markets.directory).replaceAll('\\', '/'), sources, retiredSources: [RETIRED_TRAVEL_SOURCE] };
    validateCurrentPriorityManifest(manifest);
    await writeFile(join(stage, 'sources.json'), JSON.stringify(manifest, null, 2));
    const destination = join(output, snapshotId);
    try {
      const existing = JSON.parse(await readFile(join(destination, 'sources.json'), 'utf8')) as PriorityRawManifest;
      validateCurrentPriorityManifest(existing);
      if (existing.snapshotId !== snapshotId) throw new Error('Existing raw archive identity mismatch');
      for (const source of existing.sources) if (hash(await readFile(join(destination, source.filename))) !== source.sha256) throw new Error(`Existing raw archive hash mismatch: ${source.id}`);
      await rm(stage, { recursive: true });
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; await rename(stage, destination); }
    return destination;
  } catch (error) { await rm(stage, { recursive: true, force: true }); throw error; }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(await acquirePolicyPrioritySources(process.argv[2]));
