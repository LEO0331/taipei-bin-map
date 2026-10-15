import { mkdir, writeFile, rm, rename, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { policySources } from './binPolicySources';
import { buildPolicySnapshot } from './convertBinPolicySources';

// Never touch the previous valid snapshots on network or validation failure.
const stage = resolve('data/raw/bin-policy/.incoming');
const published = resolve('public/data/bin-policy/analysis.json');
const previous = existsSync(published) ? JSON.parse(await readFile(published, 'utf8')) : null;
await mkdir(stage, { recursive: true });
try {
  const sources = [];
  for (const source of policySources) {
    const response = await fetch(source.downloadUrl, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100 || bytes.length > 20_000_000) throw new Error(`${source.id}: unexpected resource size`);
    await writeFile(join(stage, source.filename), bytes);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const previousSource = previous?.sources.find((item: { id: string }) => item.id === source.id);
    if (previousSource && previousSource.sha256 !== sha256 && !process.argv.includes('--accept-source-revision')) throw new Error(`${source.id}: source changed; re-audit source dates/schema in binPolicySources.ts, then explicitly accept the revision`);
    sources.push({ ...source, fetchedAt: new Date().toISOString(), httpLastModified: response.headers.get('last-modified'), sha256, byteLength: bytes.length });
  }
  await writeFile(join(stage, 'sources.json'), JSON.stringify(sources, null, 2));
  const snapshot = buildPolicySnapshot(stage);
  const version = snapshot.snapshotId;
  const archive = resolve(`data/raw/bin-policy/${version}`);
  if (existsSync(archive)) {
    await rm(stage, { recursive: true, force: true });
    console.log(`Unchanged source hashes: ${version}; retained original retrieval provenance. Last checked ${new Date().toISOString()}`);
    process.exit(0);
  }
  await rename(stage, archive);
  await mkdir(resolve('public/data/bin-policy'), { recursive: true });
  await writeFile(resolve('public/data/bin-policy/analysis.json.tmp'), JSON.stringify(snapshot));
  await rename(resolve('public/data/bin-policy/analysis.json.tmp'), resolve('public/data/bin-policy/analysis.json'));
  console.log(`Published validated ${version}: ${snapshot.bins.length} bins, ${snapshot.references.length} references`);
} catch (error) {
  await rm(stage, { recursive: true, force: true });
  console.error('Refresh failed. Previous policy snapshot preserved; see its dates before use.');
  throw error;
}
