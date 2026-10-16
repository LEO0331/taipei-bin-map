import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { createHash } from 'node:crypto';
import { DEFAULT_PRIORITY_WEIGHTS, WEIGHT_CONFIGURATION } from '../src/lib/policyPriorityWeights';
import { allocatePolicyPriority, analyzePolicySensitivity, preparePolicyCoverage, validatePrioritySnapshot } from '../src/lib/policyBalancedCoverage';
import { validatePolicySnapshot } from '../src/lib/binPolicyData';
import type { PolicyParameters } from '../src/lib/binPolicyDecision';
import type { PolicyReference } from '../src/lib/policyPriorityTypes';

const baseline = validatePolicySnapshot(JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8')));
const referenceBytes = readFileSync('public/data/bin-policy/priority-references.json');
const source = validatePrioritySnapshot(JSON.parse(referenceBytes.toString('utf8')), baseline.snapshotId, baseline.sources.find(item => item.id === 'bus')?.sha256);
const parameters: PolicyParameters = { district: '', radius: 300, count: 10, separation: 0, unitCost: null, budget: null };
const fixture: PolicyReference[] = [{ id: 'fixture-a', name: 'Synthetic test fixture only', category: 'bus', canonicalId: 'fixture-a', longitude: 121.5, latitude: 25, district: '大安區', sourceId: 'fixture', sourceRecord: 'a', precision: 'test fixture', sourceVersion: 'test', limitations: ['Never production reference data'] }];
function benchmark(name: string, references: PolicyReference[], bins = baseline.bins) {
  const start = performance.now();
  const prepared = preparePolicyCoverage(bins, references, parameters);
  const indexed = performance.now();
  const result = allocatePolicyPriority(prepared);
  const allocated = performance.now();
  const sensitivity = analyzePolicySensitivity(prepared);
  const finished = performance.now();
  return { name, references: references.length, candidates: result.candidateCount, selected: result.selected.length,
    sensitivityScenarios: sensitivity.scenarios.length, milliseconds: { spatialPreparation: indexed - start, allocation: allocated - indexed, sensitivityReusingNeighbours: finished - allocated, total: finished - start },
    regressionBudgetMs: 15000, withinRegressionBudget: finished - start < 15000,
    equalVsProposed: sensitivity.scenarios.filter(item => ['equal', 'proposed'].includes(item.id)).map(item => ({ id: item.id, score: item.result.incrementalScore, rawGain: item.result.incrementalCoverage, topCandidateIds: item.result.selected.map(candidate => candidate.point.id) })) };
}
const report = { generatedAt: new Date().toISOString(), snapshotId: source.snapshotId, baseSnapshotId: baseline.snapshotId,
  referenceSnapshotSha256: createHash('sha256').update(referenceBytes).digest('hex'), inputValidatedAt: source.analysisValidatedAt ?? null,
  weightConfiguration: WEIGHT_CONFIGURATION, documentedWeights: DEFAULT_PRIORITY_WEIGHTS, busSourceVersion: source.busSourceVersion,
  methodology: 'policy-balanced-coverage-v1', parameters, environment: { node: process.version, platform: process.platform, architecture: process.arch, cpu: cpus()[0]?.model },
  measurementLimitations: ['Node wall-clock measurement on this machine, not representative mobile CPU benchmarking.', 'Mobile viewport E2E verifies responsiveness and flow separately; it does not establish handheld compute latency.', '15-second regression budget is an engineering guard, not a user-experience service-level promise.', 'One measured run includes JIT effects and machine load; exact timings are not deterministic.'],
  runs: [benchmark('small-fixture-test-only', fixture, []), benchmark('citywide-official-sources', source.references)] };
const output = resolve(process.argv[2] ?? 'reports/bin-policy-v1.2/performance.json');
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, runs: report.runs.map(run => ({ name: run.name, milliseconds: run.milliseconds, withinRegressionBudget: run.withinRegressionBudget })) }, null, 2));
if (report.runs.some(run => !run.withinRegressionBudget)) process.exitCode = 1;
