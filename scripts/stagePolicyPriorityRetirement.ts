import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Snapshot } from './binPolicyGovernance';
import { containedSourceFile, verifyFrozenPriority } from './monitorPolicyPrioritySources';
import { isRetiredTravelSource, priorityRawSnapshotId, RETIRED_TRAVEL_SOURCE, validateCurrentPriorityManifest, type PriorityRawManifest } from './policyPrioritySources';

const historicalId = 'priority-v1-113edf6ed5e09ada';
const historicalDirectory = join('data/raw/bin-policy-priority', historicalId);

/** Freeze a retirement-only input version from already reviewed bytes. This never goes online. */
export async function stagePolicyPriorityRetirement(root = 'data/raw/bin-policy-priority') {
  const approved = JSON.parse(await readFile('public/data/bin-policy/analysis.json', 'utf8')) as Snapshot;
  const historical = await verifyFrozenPriority(historicalDirectory, 'public/data/bin-policy/priority-references.json', approved);
  if (historical.snapshot.snapshotId !== historicalId || historical.snapshot.schemaVersion !== 1 ||
      !historical.manifest.sources.some(isRetiredTravelSource) || historical.snapshot.references.some(point => point.category === 'tourism')) throw new Error('Retirement inputs must be the historical snapshot with no eligible tourism references');
  const sources = historical.manifest.sources.filter(source => !isRetiredTravelSource(source));
  const manifest: PriorityRawManifest = {
    schemaVersion: 2, snapshotId: priorityRawSnapshotId(2, sources), generatedAt: new Date().toISOString(),
    marketDirectory: historical.manifest.marketDirectory, retiredSources: [RETIRED_TRAVEL_SOURCE],
    derivedFrom: { snapshotId: historicalId, manifestSha256: historical.manifestSha256 }, sources,
  };
  validateCurrentPriorityManifest(manifest);
  const destination = join(root, manifest.snapshotId);
  await mkdir(root, { recursive: true });
  await mkdir(destination); // No overwrite of any version, including a prior retirement archive.
  for (const source of sources) {
    const target = containedSourceFile(destination, source.filename);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(containedSourceFile(historicalDirectory, source.filename), target, constants.COPYFILE_EXCL);
  }
  await writeFile(join(destination, 'sources.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  return destination;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(await stagePolicyPriorityRetirement(process.argv[2]));
