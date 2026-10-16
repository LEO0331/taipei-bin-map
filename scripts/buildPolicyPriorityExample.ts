import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validatePolicySnapshot } from '../src/lib/binPolicyData';
import { allocatePolicyPriority, analyzePolicySensitivity, preparePolicyCoverage, validatePrioritySnapshot } from '../src/lib/policyBalancedCoverage';
import { priorityBriefing, priorityCsv } from '../src/lib/policyPriorityExport';

// Reproducible research example only: never updates the approved snapshot or source status.
const base = validatePolicySnapshot(JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8')));
const bytes = readFileSync('public/data/bin-policy/priority-references.json');
const data = validatePrioritySnapshot(JSON.parse(bytes.toString('utf8')), base.snapshotId, base.sources.find(source => source.id === 'bus')?.sha256);
const prepared = preparePolicyCoverage(base.bins, data.references, { district: '', radius: 300, count: 10, separation: 0, unitCost: null, budget: null }, 'transport');
const result = allocatePolicyPriority(prepared);
const sensitivity = analyzePolicySensitivity(prepared);
const generatedAt = new Date().toISOString();
const briefing = { ...priorityBriefing(data, result, sensitivity, generatedAt), referenceSnapshotSha256: createHash('sha256').update(bytes).digest('hex'), purpose: 'Frozen citywide research example; not installation approval or policy-effect evidence.' };
mkdirSync('reports/bin-policy-v1.2', { recursive: true });
writeFileSync('reports/bin-policy-v1.2/example-analysis.json', JSON.stringify(briefing));
writeFileSync('reports/bin-policy-v1.2/example-analysis.csv', priorityCsv(data, result, sensitivity, generatedAt));
console.log(JSON.stringify({ snapshot: data.snapshotId, references: result.referenceCount, rawGain: result.incrementalCoverage, score: result.incrementalScore, candidates: result.selected.length, scenarios: sensitivity.scenarios.length, approvalStatus: data.approvalStatus }));
