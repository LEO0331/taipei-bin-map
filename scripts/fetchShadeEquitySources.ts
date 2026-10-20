import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

export const shadeDatasets = [
  ['roadside_trees', '7a49d00c-a5ff-4a6b-be9e-aaa6dc1ff7e8', '0e96f4b5-8f8c-4935-ae0b-b97b3d031c94', 'roadside-trees.csv'],
  ['sidewalks', '715d3a83-8445-4496-b6bf-b0900538b7e7', 'b11d6142-1d71-41d5-a843-7b7cfcea61ef', 'sidewalks.json'],
  ['tree_pits', '693705fa-4604-4207-bd50-8a9ce9fcfbc6', '3e2b359b-8dae-46e4-a747-5912d8743d0e', 'tree-pits.json'],
  ['parks_context', 'ea732fb5-4bec-4be7-93f2-8ab91e74a6c6', '302a04cd-8dd7-4052-a014-9a7ee8ec8e58', 'parks-context'],
  ['greening_context', '61b59d0e-071e-4e78-b9ae-8fa55a9f8f70', 'a8405bba-f5c9-49d0-bd4d-9e428d3085eb', 'greening-context'],
] as const;
export const shadeHash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');

/** Restore exact original payloads, not a newer live export. Validate every archive before writing. */
export async function restoreShadeEquitySources(root = 'data/raw/shade-equity') {
  const directory = resolve(root), manifest = JSON.parse(await readFile(join(directory, 'sources.json'), 'utf8'));
  const restored: Array<{path: string; bytes: Buffer}> = [];
  for (const source of manifest.sources) {
    if (typeof source.filename !== 'string') throw new Error('Frozen source path missing');
    const path = resolve(directory, source.filename), rel = relative(directory, path);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Frozen source path escapes archive');
    const bytes = gunzipSync(await readFile(`${path}.gz`), { maxOutputLength: 150_000_000 });
    if (shadeHash(bytes) !== source.sha256 || bytes.length !== source.bytes) throw new Error(`Frozen source hash/size mismatch: ${source.filename}`);
    try {
      const existing = await readFile(path);
      if (shadeHash(existing) !== source.sha256) throw new Error(`Existing source differs from frozen hash: ${source.filename}; use a new review directory`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    restored.push({ path, bytes });
  }
  for (const source of restored) await writeFile(source.path, source.bytes);
  return restored.length;
}

/** Resolve only the catalogue's JSON reference table; never execute the downloaded page. */
export function parseShadeCatalogue(html: string): Record<string, any> {
  const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Official catalogue schema changed: no Nuxt data');
  const table = JSON.parse(match[1]) as unknown[];
  const resolveIndex = (index: number): any => {
    if (index < 0) return null;
    const value = table[index];
    if (Array.isArray(value)) return value.map(item => typeof item === 'number' ? resolveIndex(item) : item);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === 'number' ? resolveIndex(item) : item]));
    return value;
  };
  const payloadIndex = table.findIndex(value => value && !Array.isArray(value) && typeof value === 'object' && 'resources' in value && 'pid' in value);
  if (payloadIndex < 0) throw new Error('Official catalogue schema changed: no dataset payload');
  return resolveIndex(payloadIndex);
}

/** Raw payloads stay local and hash locked. This never writes production browser snapshots. */
export async function fetchShadeEquitySources(root = 'data/raw/shade-equity', fetcher: typeof fetch = fetch) {
  const directory = resolve(root); await mkdir(directory, { recursive: true });
  const sources: Record<string, any>[] = [];
  let previous: { generatedAt: string; sources: Record<string, any>[] } | null = null;
  try { previous = JSON.parse(await readFile(join(directory, 'sources.json'), 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  for (const [id, datasetId, expectedResourceId, basename] of shadeDatasets) {
    const datasetUrl = `https://data.taipei/dataset/detail?id=${datasetId}`;
    const metadataResponse = await fetcher(datasetUrl, { signal: AbortSignal.timeout(120_000) });
    if (!metadataResponse.ok) throw new Error(`${id} catalogue HTTP ${metadataResponse.status}`);
    const catalogueBytes = Buffer.from(await metadataResponse.arrayBuffer());
    const metadata = parseShadeCatalogue(catalogueBytes.toString('utf8'));
    if (metadata.pid !== datasetId) throw new Error(`${id} dataset identity changed`);
    const resource = expectedResourceId ? metadata.resources.find((item: any) => item.rid === expectedResourceId) : metadata.resources.find((item: any) => /csv/i.test(item.file_format)) ?? metadata.resources.find((item: any) => /json/i.test(item.file_format));
    if (!resource) throw new Error(`${id} reviewed resource unavailable`);
    const format = String(resource.file_format ?? '').toLowerCase();
    if (!['csv', 'json'].includes(format)) throw new Error(`${id} Unsupported source format; review catalogue changes before acquisition`);
    const downloadUrl = resource.url?.startsWith('https://') ? resource.url : `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${resource.rid}`;
    if (!/^https:\/\//.test(downloadUrl)) throw new Error(`${id} insecure source URL`);
    const response = await fetcher(downloadUrl, { signal: AbortSignal.timeout(180_000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 150_000_000) throw new Error(`${id} source exceeds acquisition limit`);
    if (!response.ok) {
      const failureDirectory = join(directory, 'blocked-responses'); await mkdir(failureDirectory, { recursive: true });
      await writeFile(join(failureDirectory, `${id}-http-${response.status}-${shadeHash(bytes).slice(0,16)}.bin`), bytes);
      throw new Error(`${id} HTTP ${response.status}; response preserved separately, known-good source unchanged`);
    }
    const sha256 = shadeHash(bytes), archived = previous?.sources.find(item => item.id === id);
    if (archived && (sha256 !== archived.sha256 || resource.rid !== archived.resourceId)) throw new Error(`${id} source changed; preserve last known-good bytes and review a new output directory`);
    const filename = `${basename}${basename.includes('.') ? '' : `.${format}`}`;
    const fetchedAt = archived?.fetchedAt ?? new Date().toISOString();
    await writeFile(join(directory, filename), bytes);
    const catalogue = { datasetId, title: metadata.title, provider: metadata.maintainer_organization_name, publicationDate: metadata.publish_date, metadataUpdatedAt: metadata.metadata_changed, coverageStart: metadata.coverage_temporal_start || null, coverageEnd: metadata.coverage_temporal_end || null, coverageSpatial: metadata.coverage_spatial, fieldDescription: metadata.field_description, resources: metadata.resources };
    await writeFile(join(directory, `${id}-catalogue.json`), JSON.stringify(catalogue, null, 2) + '\n');
    sources.push({ id, datasetId, resourceId: resource.rid, name: metadata.title, provider: metadata.maintainer_organization_name,
      datasetUrl, downloadUrl, filename, sha256, bytes: bytes.length, httpStatus: response.status, fetchedAt,
      resourceUpdatedAt: resource.last_modified || null, metadataUpdatedAt: metadata.metadata_changed || null,
      resourcePublicationDate: null, datasetPublishedAt: metadata.publish_date || null, coverageStart: metadata.coverage_temporal_start || null, coverageEnd: metadata.coverage_temporal_end || null,
      encoding: resource.encoding || null, format: resource.file_format, approvalStatus: 'review_required',
      lastModified: response.headers.get('last-modified'), etag: response.headers.get('etag'), catalogueSha256: shadeHash(catalogueBytes) });
    console.log(`${id}: HTTP ${response.status}; ${bytes.length} bytes; ${sha256}`);
  }
  const snapshotId = `shade-source-v1-${shadeHash(JSON.stringify(sources.map(source => [source.id, source.resourceId, source.sha256]))).slice(0, 16)}`;
  const manifest = { schemaVersion: 1, snapshotId, generatedAt: previous?.generatedAt ?? new Date().toISOString(), sources };
  await writeFile(join(directory, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2] === '--restore-frozen' ? restoreShadeEquitySources(process.argv[3]) : fetchShadeEquitySources(process.argv[2]);
  command.catch(error => { console.error(error); process.exitCode = 1; });
}
