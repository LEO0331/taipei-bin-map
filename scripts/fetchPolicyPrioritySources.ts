import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hash } from './binPolicyGovernance';
import { priorityTransportSources, PRIORITY_LICENSE_URL, type PrioritySourceArchive, type PriorityRawManifest } from './policyPrioritySources';
import { acquireMarketSources } from './policyPriorityMarketSources';

/** Complete all official pages or reject the category; never publish a partial tourist population. */
export async function fetchAttractionPages(fetcher: typeof fetch = fetch) {
  const pages: Array<{ url: string; bytes: Buffer; status: number }> = [];
  let total: number | null = null; const ids = new Set<string>(); let count = 0;
  for (let page = 1; page <= 100; page++) {
    const url = `https://travel.taipei/open-api/zh-tw/Attractions/All?page=${page}`;
    const response = await fetcher(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 15_000_000) throw new Error('Oversize tourism response');
    pages.push({ url, bytes, status: response.status });
    if (!response.ok) return { pages, blocked: true };
    const body = JSON.parse(bytes.toString('utf8'));
    if (!Number.isInteger(body.Total) || body.Total < 0 || !Array.isArray(body.data)) throw new Error('Tourism pagination schema drift');
    if (total !== null && total !== body.Total) throw new Error('Tourism population changed during pagination');
    total = body.Total;
    for (const row of body.data) {
      if (row.id === undefined || ids.has(String(row.id))) throw new Error('Repeated or missing attraction identity across pages');
      ids.add(String(row.id)); count++;
    }
    if (count === total) return { pages, blocked: false };
    if (!body.data.length || count > total!) throw new Error('Incomplete tourism pagination');
  }
  throw new Error('Tourism pagination safety limit');
}

export async function acquirePolicyPrioritySources(root = 'data/raw/bin-policy-priority') {
  const output = resolve(root); await mkdir(output, { recursive: true });
  const stage = join(output, `.incoming-${process.pid}`); await mkdir(stage, { recursive: false });
  try {
    const sources: PrioritySourceArchive[] = [];
    const travel = await fetchAttractionPages();
    for (let index = 0; index < travel.pages.length; index++) {
      const page = travel.pages[index], definition = priorityTransportSources[0];
      const filename = `travel-page-${index + 1}.${page.status === 200 ? 'json' : 'html'}`;
      await writeFile(join(stage, filename), page.bytes);
      const fetchedAt = new Date().toISOString();
      sources.push({ ...definition, id: index === 0 ? definition.id : `${definition.id}_page_${index + 1}`, filename,
        downloadUrl: page.url, httpStatus: page.status, fetchedAt, validatedAt: fetchedAt, sha256: hash(page.bytes),
        sourceVersion: hash(page.bytes), acquisitionStatus: travel.blocked ? 'blocked' : 'available',
        approvalStatus: 'review_required', license: 'Open Government Data License 1.0 (portal declaration; blocked API response is not POI data)', licenseUrl: PRIORITY_LICENSE_URL });
    }
    const definition = priorityTransportSources[1], response = await fetch(definition.downloadUrl, { signal: AbortSignal.timeout(60000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok || bytes.length > 15_000_000) throw new Error('MRT acquisition failed or oversize');
    const fetchedAt = new Date().toISOString(); await writeFile(join(stage, definition.filename), bytes);
    sources.push({ ...definition, fetchedAt, validatedAt: fetchedAt, sha256: hash(bytes), sourceVersion: hash(bytes), httpStatus: response.status,
      acquisitionStatus: 'available', approvalStatus: 'review_required', license: 'Open Government Data License 1.0', licenseUrl: PRIORITY_LICENSE_URL });
    const markets = await acquireMarketSources(join(stage, 'markets'));
    for (const source of markets.sources) {
      const marketSource = source as typeof source & { downloadUrl?: string; acquisitionStatus?: 'available' | 'blocked'; httpStatus?: number; metadataUpdatedAt?: string | null };
      sources.push({ ...source, filename: relative(stage, join(markets.directory, source.filename)).replaceAll('\\', '/'),
        downloadUrl: marketSource.downloadUrl ?? `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=${source.resourceId}`,
        acquisitionStatus: marketSource.acquisitionStatus ?? 'available', httpStatus: marketSource.httpStatus ?? 200,
        metadataUpdatedAt: marketSource.metadataUpdatedAt ?? null });
    }
    const snapshotId = `priority-v1-${hash(JSON.stringify(sources.map(source => [source.id, source.sha256]))).slice(0, 16)}`;
    const manifest: PriorityRawManifest = { schemaVersion: 1, snapshotId, generatedAt: fetchedAt, marketDirectory: relative(stage, markets.directory).replaceAll('\\', '/'), sources };
    await writeFile(join(stage, 'sources.json'), JSON.stringify(manifest, null, 2));
    const destination = join(output, snapshotId);
    try { await readFile(join(destination, 'sources.json')); await rm(stage, { recursive: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; await rename(stage, destination); }
    return destination;
  } catch (error) { await rm(stage, { recursive: true, force: true }); throw error; }
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(await acquirePolicyPrioritySources(process.argv[2]));
