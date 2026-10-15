import { readFileSync, existsSync, mkdirSync, copyFileSync, cpSync, renameSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPolicySnapshot, writePolicySnapshot } from './convertBinPolicySources';
import { validateApproval, type SourceApproval } from './binPolicyGovernance';
import { assertArchiveMetadata } from './binPolicyManifest';
export { assertArchiveMetadata } from './binPolicyManifest';

/** Used only on the workflow's new review branch; never pushes or merges. */
export function stagePublication(bundleDirectory: string) {
  const bundle = resolve(bundleDirectory);
  const ready = JSON.parse(readFileSync(join(bundle, 'ready.json'), 'utf8'));
  const approval = JSON.parse(readFileSync(join(bundle, 'approval.json'), 'utf8')) as SourceApproval;
  const previous = JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8'));
  const proposed = buildPolicySnapshot(join(bundle, 'raw'));
  if (ready.validated !== true || ready.snapshotId !== proposed.snapshotId) throw new Error('Incomplete or incompatible review bundle');
  validateApproval(approval, previous, proposed);
  const archive = resolve('data/raw/bin-policy', proposed.snapshotId);
  if (existsSync(archive)) {
    assertArchiveMetadata(JSON.parse(readFileSync(join(archive, 'sources.json'), 'utf8')), proposed.sources);
  } else cpSync(join(bundle, 'raw'), archive, { recursive: true, errorOnExist: true, force: false });
  // Rebuild from the retained raw manifest, not fresh retrieval metadata discarded from that archive.
  const staged = join(bundle, 'archive-reproduced-analysis.json');
  writePolicySnapshot(archive, staged);
  mkdirSync('data/reports/bin-policy', { recursive: true });
  copyFileSync(join(bundle, 'source-change-and-impact.json'), `data/reports/bin-policy/${proposed.snapshotId}.json`);
  const target = resolve('public/data/bin-policy/analysis.json');
  const temporary = `${target}.${process.pid}.tmp`;
  try { copyFileSync(staged, temporary); renameSync(temporary, target); }
  finally { rmSync(temporary, { force: true }); }
  return proposed.snapshotId;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (!process.argv[2]) throw new Error('Supply a validated review bundle directory');
  console.log(stagePublication(process.argv[2]));
}
