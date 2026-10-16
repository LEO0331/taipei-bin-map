import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Snapshot } from './binPolicyGovernance';
import { containedSourceFile, verifyFrozenPriority } from './monitorPolicyPrioritySources';
import { POLICY_METHOD } from '../src/lib/policyBalancedCoverage';
import { DEFAULT_PRIORITY_WEIGHTS, WEIGHT_CONFIGURATION } from '../src/lib/policyPriorityWeights';

/** Technical PR review evidence only: not a government approval record or publication authorization. */
export interface PriorityReview {
  schemaVersion: 1; status: 'technical_review_complete'; reviewer: string; reviewedAt: string; evidenceUrl: string;
  baseSnapshotId: string; prioritySnapshotId: string; snapshotSha256: string; sourceManifestSha256: string;
  methodologyVersion: string; weightConfigurationVersion: string;
  sourceChecks: Array<{ sourceId: string; resourceId: string; sha256: string; sourcePublishedAt: string | null }>;
  checks: { schema: boolean; coordinates: boolean; identities: boolean; dates: boolean; exclusions: boolean; methodology: boolean; weights: boolean };
}
export async function preparePriorityReview(review: PriorityReview, directory: string, snapshotFile: string, output: string, previous?: Snapshot) {
  const destination = resolve(output);
  const protectedPaths = ['public', 'data', 'src', 'scripts', '.git', '.github'].map(path => resolve(path));
  if (destination === resolve('.') || protectedPaths.some(root => { const relation = relative(root, destination); return relation === '' || (!relation.startsWith('..') && !relation.includes(':')); })) throw new Error('Review output must be a new nonproduction directory');
  const baseline = previous ?? JSON.parse(await readFile('public/data/bin-policy/analysis.json', 'utf8')) as Snapshot;
  if (!review || review.schemaVersion !== 1 || review.status !== 'technical_review_complete' || !review.reviewer?.trim() || !Number.isFinite(Date.parse(review.reviewedAt)) || !/^https:\/\/github\.com\/LEO0331\/taipei-bin-map\/(pull|issues)\/\d+$/.test(review.evidenceUrl ?? '') || !review.checks || !['schema', 'coordinates', 'identities', 'dates', 'exclusions', 'methodology', 'weights'].every(key => review.checks[key as keyof PriorityReview['checks']] === true)) throw new Error('Explicit human technical review evidence is required');
  const frozen = await verifyFrozenPriority(directory, snapshotFile, baseline);
  if (review.baseSnapshotId !== baseline.snapshotId || review.prioritySnapshotId !== frozen.snapshot.snapshotId) throw new Error('Technical review base/source snapshot mismatch');
  if (review.snapshotSha256 !== frozen.snapshotSha256 || review.sourceManifestSha256 !== frozen.manifestSha256) throw new Error('Technical review exact content hash mismatch');
  if (review.methodologyVersion !== POLICY_METHOD || review.weightConfigurationVersion !== WEIGHT_CONFIGURATION) throw new Error('Technical review method/weight version mismatch');
  if (!Array.isArray(review.sourceChecks) || review.sourceChecks.length !== frozen.snapshot.sources.length || new Set(review.sourceChecks.map(item => item.sourceId)).size !== frozen.snapshot.sources.length) throw new Error('Technical review must identify every source exactly once');
  for (const source of frozen.snapshot.sources) {
    const checked = review.sourceChecks.find(item => item.sourceId === source.id);
    if (!checked || checked.resourceId !== source.resourceId || checked.sha256 !== source.sha256 || checked.sourcePublishedAt !== source.resourceUpdatedAt) throw new Error(`Technical review unverified source identity/hash/date: ${source.id}`);
  }
  // Validate everything before creating any output. Refuse existing output; never replace an old bundle.
  await mkdir(dirname(destination), { recursive: true }); await mkdir(destination);
  await writeFile(join(destination, 'priority-references.json'), await readFile(snapshotFile));
  const raw = join(destination, 'raw'); await mkdir(raw);
  await copyFile(join(directory, 'sources.json'), join(raw, 'sources.json'));
  for (const source of frozen.manifest.sources) {
    const target = containedSourceFile(raw, source.filename); await mkdir(dirname(target), { recursive: true });
    await copyFile(containedSourceFile(directory, source.filename), target);
  }
  await writeFile(join(destination, 'technical-review.json'), JSON.stringify(review, null, 2));
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), state: 'review_bundle_only', published: false, approvalStatus: 'review_required', approvedFallbackSnapshotId: baseline.snapshotId, researchSnapshotId: frozen.snapshot.snapshotId, sourceManifestSha256: frozen.manifestSha256, referenceSnapshotSha256: frozen.snapshotSha256, methodologyVersion: POLICY_METHOD, weightConfigurationVersion: WEIGHT_CONFIGURATION, defaultWeights: DEFAULT_PRIORITY_WEIGHTS, interpretation: 'Technical evidence for an independently reviewed PR only; no government sign-off, adoption, installation authorization or approved snapshot replacement.' };
  await writeFile(join(destination, 'ready.json'), JSON.stringify(report, null, 2));
  return report;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [reviewFile, directory, snapshotFile, output] = process.argv.slice(2);
  if (!reviewFile || !directory || !snapshotFile || !output) throw new Error('Usage: preparePolicyPriorityReview.ts <technical-review.json> <frozen-raw-directory> <references.json> <new-nonproduction-directory>');
  console.log(JSON.stringify(await preparePriorityReview(JSON.parse(await readFile(reviewFile, 'utf8')), directory, snapshotFile, output)));
}
