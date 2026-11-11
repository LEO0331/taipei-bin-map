import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validatePolicySnapshot } from '../src/lib/binPolicyData';
import { analyzePolicySensitivity, preparePolicyCoverage, validatePrioritySnapshot } from '../src/lib/policyBalancedCoverage';
import { priorityBriefing, priorityCsv } from '../src/lib/policyPriorityExport';
import type { PolicyReference, PriorityAllocation } from '../src/lib/policyPriorityTypes';
import { hash } from './binPolicyGovernance';

const read = (filename: string) => readFileSync(`public/data/bin-policy/${filename}`);
const baseBytes = read('analysis.json');
const base = validatePolicySnapshot(JSON.parse(baseBytes.toString('utf8')));
const bus = base.sources.find(source => source.id === 'bus')!;
const oldBytes = read('priority-references.json'), newBytes = read('priority-references-v2.json');
const legacy = validatePrioritySnapshot(JSON.parse(oldBytes.toString('utf8')), base.snapshotId, bus.sha256);
const active = validatePrioritySnapshot(JSON.parse(newBytes.toString('utf8')), base.snapshotId, bus.sha256);
assert.equal(legacy.schemaVersion, 1);
assert.equal(active.schemaVersion, 2);
assert.equal(legacy.categoryStatus.tourism?.status, 'unavailable');
assert(!legacy.references.some(point => point.category === 'tourism'));
assert.deepEqual(active.sources, legacy.sources.filter(source => source.id !== 'taipei_travel'));

const withoutValidationTime = ({ validatedAt: _, ...point }: PolicyReference) => point;
assert.deepEqual(active.references.map(withoutValidationTime), legacy.references.map(withoutValidationTime));
const omitTourism = <T,>({ tourism: _, ...rest }: { tourism?: T } & Record<string, unknown>) => rest;
const project = ({ methodology: _, weightConfiguration: __, ...result }: PriorityAllocation) => ({
  ...result, weights: omitTourism(result.weights),
  categories: result.categories.filter(item => item.category !== 'tourism'),
  selected: result.selected.map(candidate => ({ ...candidate, point: withoutValidationTime(candidate.point), contributions: omitTourism(candidate.contributions) })),
});

const parameters = { radius: 300, count: 5, separation: 0, unitCost: null, budget: null };
const districts = [...new Set(base.references.map(point => point.district))].sort();
assert.equal(districts.length, 12);
const scopes = ['', ...districts].map(district => {
  const scenario = { ...parameters, district };
  const before = analyzePolicySensitivity(preparePolicyCoverage(base.bins, legacy.references, scenario, 'transport', 1));
  const after = analyzePolicySensitivity(preparePolicyCoverage(base.bins, active.references, scenario, 'transport', 2));
  assert.deepEqual(before.rankings, after.rankings, district);
  assert.deepEqual(before.skipped, after.skipped, district);
  assert.deepEqual(before.sparseCategories, after.sparseCategories, district);
  assert.deepEqual(before.unavailableCategories.filter(category => category !== 'tourism'), after.unavailableCategories, district);
  assert.deepEqual(before.scenarios.map(item => ({ id: item.id, result: project(item.result) })),
    after.scenarios.map(item => ({ id: item.id, result: project(item.result) })), district);
  const oldResult = before.scenarios.find(item => item.id === 'proposed')!.result;
  const result = after.scenarios.find(item => item.id === 'proposed')!.result;
  const generatedAt = active.analysisValidatedAt ?? active.generatedAt;
  const oldExport = priorityBriefing(legacy, oldResult, before, generatedAt);
  const json = priorityBriefing(active, result, after, generatedAt);
  const csv = priorityCsv(active, result, after, generatedAt);
  assert.deepEqual(oldExport.weightedCoverage, json.weightedCoverage);
  assert.deepEqual(omitTourism(oldExport.documentedDefaults), json.documentedDefaults);
  assert.deepEqual(omitTourism(oldExport.categoryDefinitions), { ...json.categoryDefinitions, night_market: oldExport.categoryDefinitions.night_market });
  assert.deepEqual(omitTourism(oldExport.categoryStatus), json.categoryStatus);
  assert.equal(json.methodology, 'policy-balanced-coverage-v2');
  assert.equal(json.weightConfiguration, 'policy-priority-weights-v2');
  assert(!Object.prototype.hasOwnProperty.call(json.categoryDefinitions, 'tourism'));
  assert(csv.includes('"policy-balanced-coverage-v2","policy-priority-weights-v2"'));
  assert(!csv.includes('"tourism"'));
  return { district: district || 'citywide', scenarioCount: after.scenarios.length, referenceCount: result.referenceCount,
    candidateCount: result.candidateCount, baselineCovered: result.baselineCovered, postCovered: result.postCovered,
    incrementalCoverage: result.incrementalCoverage, incrementalScore: result.incrementalScore,
    denominators: Object.fromEntries(result.categories.map(item => [item.category, item.denominator])),
    selectedCandidateIds: result.selected.map(item => item.point.id) };
});
const evidence = { baseSnapshotId: base.snapshotId, baseSha256: hash(baseBytes), busSha256: bus.sha256,
  legacy: { id: legacy.snapshotId, sha256: hash(oldBytes) }, active: { id: active.snapshotId, sha256: hash(newBytes) },
  parameters: { ...parameters, candidatePool: 'transport' },
  comparison: 'All allocations, ranks, coverage IDs, denominators, scores and sensitivity results match after excluding only retired empty tourism fields, version identifiers and validation event time.',
  scopes };
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
if (process.argv[2]) writeFileSync(process.argv[2], serialized, { flag: 'wx' });
else process.stdout.write(serialized);
