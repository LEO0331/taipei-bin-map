import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { validatePolicySnapshot } from '../src/lib/binPolicyData';
import { allocatePolicyPriority, analyzePolicySensitivity, preparePolicyCoverage, validatePrioritySnapshot } from '../src/lib/policyBalancedCoverage';
import { priorityBriefing, priorityCsv } from '../src/lib/policyPriorityExport';

// Reproducible research example only: never updates the approved snapshot or source status.
const base = validatePolicySnapshot(JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8')));
const historical = process.argv.includes('--historical-v1');
const output = historical ? 'test-results/policy-priority-example-v1' : 'test-results/policy-priority-example-v2';
const bytes = readFileSync(historical ? 'public/data/bin-policy/priority-references.json' : 'public/data/bin-policy/priority-references-v2.json');
const data = validatePrioritySnapshot(JSON.parse(bytes.toString('utf8')), base.snapshotId, base.sources.find(source => source.id === 'bus')?.sha256);
const prepared = preparePolicyCoverage(base.bins, data.references, { district: '', radius: 300, count: 10, separation: 0, unitCost: null, budget: null }, 'transport', data.schemaVersion);
const result = allocatePolicyPriority(prepared);
const sensitivity = analyzePolicySensitivity(prepared);
const generatedAt = new Date().toISOString();
const briefing = { ...priorityBriefing(data, result, sensitivity, generatedAt), referenceSnapshotSha256: createHash('sha256').update(bytes).digest('hex'), purpose: 'Frozen citywide research example; not installation approval or policy-effect evidence.' };
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'example-analysis.json'), JSON.stringify(briefing));
writeFileSync(join(output, 'example-analysis.csv'), priorityCsv(data, result, sensitivity, generatedAt));
console.log(JSON.stringify({ snapshot: data.snapshotId, references: result.referenceCount, rawGain: result.incrementalCoverage, score: result.incrementalScore, candidates: result.selected.length, scenarios: sensitivity.scenarios.length, approvalStatus: data.approvalStatus }));
