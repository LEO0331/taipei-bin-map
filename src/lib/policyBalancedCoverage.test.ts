import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { allocateBins, distance, type PolicyParameters } from './binPolicyDecision';
import { allocatePolicyPriority, analyzePolicySensitivity, preparePolicyCoverage, validatePrioritySnapshot } from './policyBalancedCoverage';
import { DEFAULT_PRIORITY_WEIGHTS, EQUAL_PRIORITY_WEIGHTS, validatePriorityWeights } from './policyPriorityWeights';
import { POLICY_CATEGORIES, type PolicyReference, type PriorityCategory, type PrioritySnapshot, type PriorityWeights } from './policyPriorityTypes';

const reference = (id: string, category: PriorityCategory = 'bus', longitude = 121.5, latitude = 25): PolicyReference => ({ id, name: id, category, canonicalId: id, longitude, latitude, district: '大安區', sourceId: category, sourceRecord: id, precision: 'official source point, not installation site', sourceVersion: 'a'.repeat(64), limitations: ['requires field review'] });
const parameters: PolicyParameters = { district: '', radius: 100, count: 3, separation: 0, unitCost: null, budget: null };
const run = (references: PolicyReference[], weights = { ...DEFAULT_PRIORITY_WEIGHTS }, overrides = {}) => allocatePolicyPriority(preparePolicyCoverage([], references, { ...parameters, ...overrides }), weights);
const snapshot = (): PrioritySnapshot => ({ schemaVersion: 1, snapshotId: 'priority-v1', baseSnapshotId: 'base-v1', busSourceVersion: 'a'.repeat(64), generatedAt: '2026-10-15T00:00:00Z', approvalStatus: 'review_required', sources: [{ id: 'bus', approvalStatus: 'existing_baseline', name: 'Bus', provider: 'Official', datasetUrl: 'https://data.taipei/', resourceId: 'bus', resourceUpdatedAt: null, fetchedAt: '2026-10-15T00:00:00Z', sha256: 'a'.repeat(64), encoding: 'UTF-8', crs: 'WGS84', license: 'open', licenseUrl: 'https://data.gov.tw/', caveat: 'old snapshot' }], references: [reference('bus')], categoryStatus: Object.fromEntries(POLICY_CATEGORIES.map(category => [category, { status: category === 'bus' ? 'available' : 'unavailable', reason: 'audited' }])) as PrioritySnapshot['categoryStatus'], quality: { exclusions: [] } });

describe('category-balanced policy coverage', () => {
  it('rejects non-text reference names before they can reach React rendering', () => {
    const data = snapshot(); data.references[0].name = { invalid: true } as unknown as string;
    expect(() => validatePrioritySnapshot(data, data.baseSnapshotId)).toThrow();
  });
  it('rejects non-text snapshot identities instead of accepting a truthy object', () => {
    const data = snapshot(); data.snapshotId = {} as unknown as string;
    expect(() => validatePrioritySnapshot(data, data.baseSnapshotId)).toThrow();
  });
  it('rejects context-only commercial coordinates reassigned into weighted references', () => {
    const data = JSON.parse(readFileSync('public/data/bin-policy/priority-references.json', 'utf8'));
    const context = data.sources.find((source: { id: string }) => source.id === 'commercial_associations');
    const bus = data.references.find((reference: { category: string }) => reference.category === 'bus');
    data.references.push({ ...bus, id: 'context-reassigned', canonicalId: 'context-reassigned', category: 'commercial', sourceId: context.id, sourceVersion: context.sourceVersion, contentHash: context.sha256 });
    expect(() => validatePrioritySnapshot(data, data.baseSnapshotId, data.busSourceVersion)).toThrow();
  });
  it('uses the documented six default weights', () => { expect(DEFAULT_PRIORITY_WEIGHTS).toEqual({ tourism: 4, night_market: 4, traditional_market: 3, commercial: 3, mrt: 2, bus: 1 }); });
  it('gives each available category equal total priority under equal weights', () => { const result = run([reference('bus'), reference('tour', 'tourism')], { ...EQUAL_PRIORITY_WEIGHTS }); expect(result.incrementalScore).toBe(2); });
  it('uses four tourism priority units plus one bus unit under documented defaults', () => { expect(run([reference('bus'), reference('tour', 'tourism')]).incrementalScore).toBe(5); });
  it('retains positive gain and ranking when all valid weights are scaled very small', () => {
    const refs = [reference('a'), reference('z', 'mrt', 121.6), reference('tour', 'tourism', 121.6)];
    const small = Object.fromEntries(POLICY_CATEGORIES.map(category => [category, DEFAULT_PRIORITY_WEIGHTS[category] * 1e-14])) as PriorityWeights;
    expect(run(refs, small, { count: 1 }).selected.map(row => row.point.id)).toEqual(run(refs, { ...DEFAULT_PRIORITY_WEIGHTS }, { count: 1 }).selected.map(row => row.point.id));
  });
  it('normalizes each category by its fixed eligible population', () => { const result = run([reference('a'), reference('b', 'bus', 121.6)], { ...EQUAL_PRIORITY_WEIGHTS }, { count: 1 }); expect(result.incrementalScore).toBe(0.5); });
  it('keeps the denominator fixed after earlier selections', () => { expect(run([reference('a'), reference('b', 'bus', 121.6)], { ...EQUAL_PRIORITY_WEIGHTS }).selected.map(candidate => candidate.incrementalScore)).toEqual([0.5, 0.5]); });
  it('does not let thousands of bus records overwhelm one tourist reference', () => {
    const buses = Array.from({ length: 2000 }, (_, index) => reference(`bus-${index}`, 'bus', 121.5 + index * 0.000000001));
    const result = run([...buses, reference('tour-anchor', 'mrt', 121.6), reference('tour', 'tourism', 121.6)], { ...DEFAULT_PRIORITY_WEIGHTS }, { count: 1 });
    expect(result.selected[0].point.id).toBe('tour-anchor');
  });
  it('changes rankings when competing category weights change', () => {
    const refs = [reference('a'), reference('z', 'mrt', 121.6), reference('tour', 'tourism', 121.6)];
    expect(run(refs, { ...DEFAULT_PRIORITY_WEIGHTS, tourism: 0, mrt: 0, bus: 10 }, { count: 1 }).selected[0].point.id).toBe('a');
  });
  it('subtracts prior incremental coverage before the next selection', () => {
    const result = run([reference('a'), reference('b', 'bus', 121.5005), reference('c', 'bus', 121.502)]);
    expect(result.selected.map(candidate => candidate.incrementalCoverage)).toEqual([2, 1]);
  });
  it('never double-counts a reference in overlapping candidate gains', () => { const result = run([reference('a'), reference('b', 'bus', 121.5005), reference('c', 'bus', 121.501)]); expect(new Set(result.selected.flatMap(candidate => candidate.newlyCoveredIds)).size).toBe(result.incrementalCoverage); });
  it('collapses verified canonical aliases within one category', () => { expect(run([reference('a'), { ...reference('b'), canonicalId: 'a' }]).referenceCount).toBe(1); });
  it('uses documented primary category order for cross-category canonical aliases', () => { const result = run([reference('a'), { ...reference('tour', 'tourism'), canonicalId: 'a' }]); expect(result.categories.find(category => category.category === 'tourism')?.denominator).toBe(1); expect(result.categories.find(category => category.category === 'bus')?.denominator).toBe(0); });
  it('keeps the global primary category when alias district labels disagree', () => { const refs = [reference('a'), { ...reference('tour', 'tourism'), canonicalId: 'a', district: '信義區' }]; expect(run(refs, undefined, { district: '大安區' }).referenceCount).toBe(0); });
  it('preserves distinct canonical places at identical coordinates', () => { expect(run([reference('a'), reference('b')]).referenceCount).toBe(2); });
  it('marks zero-record categories unavailable without redistributing weights', () => { expect(run([reference('a')]).categories.find(category => category.category === 'tourism')).toMatchObject({ available: false, weight: 4, contribution: 0 }); });
  it('marks fewer than five eligible references as sparse', () => { expect(run([reference('a')]).categories.find(category => category.category === 'bus')?.sparse).toBe(true); });
  it.each([-1, NaN, Infinity, 11])('rejects an invalid category weight %s', weight => { expect(() => validatePriorityWeights({ ...DEFAULT_PRIORITY_WEIGHTS, bus: weight })).toThrow(); });
  it('rejects a missing weight instead of supplying a hidden default', () => { expect(() => validatePriorityWeights({ tourism: 4 })).toThrow(); });
  it('selects no candidate when all weights are zero', () => { expect(run([reference('a')], Object.fromEntries(POLICY_CATEGORIES.map(category => [category, 0])) as typeof DEFAULT_PRIORITY_WEIGHTS).selected).toHaveLength(0); });
  it('does not round a valid tiny positive weight down to zero', () => { expect(run([reference('a')], { ...DEFAULT_PRIORITY_WEIGHTS, bus: 1e-14 }).selected).toHaveLength(1); });
  it('breaks equal-score ties by stable ID independent of input order', () => { const refs = [reference('z', 'bus', 121.6), reference('a')]; expect(run(refs).selected).toEqual(run([...refs].reverse()).selected); });
  it('includes baseline references exactly on the radius boundary', () => { const a = reference('bin'), b = reference('ref', 'bus', 121.501); expect(allocatePolicyPriority(preparePolicyCoverage([a], [b], { ...parameters, radius: distance(a, b) })).baselineCovered).toBe(1); });
  it('respects the maximum candidate count', () => { expect(run([reference('a'), reference('b', 'bus', 121.6)], undefined, { count: 1 }).selected).toHaveLength(1); });
  it('applies the illustrative budget cap', () => { expect(run([reference('a'), reference('b', 'bus', 121.6)], undefined, { unitCost: 100, budget: 100 }).selected).toHaveLength(1); });
  it('makes zero additions for zero budget', () => { expect(run([reference('a')], undefined, { unitCost: 100, budget: 0 }).selected).toHaveLength(0); });
  it('retains baseline coverage when zero additions are requested', () => { const refs = [reference('a')]; expect(allocatePolicyPriority(preparePolicyCoverage(refs, refs, { ...parameters, count: 0 }))).toMatchObject({ baselineCovered: 1, postCovered: 1, incrementalCoverage: 0, selected: [] }); });
  it.each([{ radius: NaN }, { radius: -1 }, { count: 51 }, { count: 0.5 }, { separation: -1 }, { unitCost: 0 }, { budget: -1 }])('rejects invalid scenario assumptions %j', overrides => { expect(() => run([], undefined, overrides)).toThrow(); });
  it('preserves the original independent Mode A result', () => { const refs = [reference('a'), reference('b', 'bus', 121.6)]; const before = allocateBins([], refs, parameters); run(refs); expect(allocateBins([], refs, parameters)).toEqual(before); });
  it('returns a degraded empty result for missing spatial categories', () => { expect(run([])).toMatchObject({ referenceCount: 0, incrementalScore: 0, selected: [] }); });
  it('excludes invalid GIS records from the denominator', () => { expect(run([reference('a'), reference('invalid', 'tourism', 0)]).invalidReferences).toBe(1); });
  it('includes bins across district boundaries', () => { expect(allocatePolicyPriority(preparePolicyCoverage([{ ...reference('bin'), district: '信義區' }], [reference('ref')], { ...parameters, district: '大安區' })).baselineCovered).toBe(1); });
  it('does not convert attraction coordinates into candidate anchors', () => { expect(run([reference('tour', 'tourism')]).candidateCount).toBe(0); });
  it('supports bus-only anchors while retaining all category references', () => { const result = allocatePolicyPriority(preparePolicyCoverage([], [reference('bus'), reference('mrt', 'mrt', 121.6)], parameters, 'bus_only')); expect(result.candidateCount).toBe(1); });
  it('treats separation as distance from listed bins, not an undisclosed new-to-new rule', () => { const result = run([reference('a'), reference('b', 'bus', 121.502)], undefined, { separation: 1000 }); expect(result.selected).toHaveLength(2); });
  it('reports category score contributions summing to the selected score', () => { const candidate = run([reference('a'), reference('tour', 'tourism')]).selected[0]; expect(Object.values(candidate.contributions).reduce((sum, item) => sum + item.score, 0)).toBe(candidate.incrementalScore); });
  it('reuses fixed category denominators across sensitivity scenarios', () => { const result = analyzePolicySensitivity(preparePolicyCoverage([], [reference('a'), reference('tour', 'tourism')], parameters)); expect(result.scenarios.every(scenario => scenario.result.categories.find(category => category.category === 'tourism')?.denominator === 1)).toBe(true); });
  it('produces deterministic sensitivity rankings', () => { const refs = [reference('z', 'mrt', 121.6), reference('a')]; expect(analyzePolicySensitivity(preparePolicyCoverage([], refs, parameters))).toEqual(analyzePolicySensitivity(preparePolicyCoverage([], [...refs].reverse(), parameters))); });
  it('exports reference coverage metrics without persons or impact estimates', () => { const json = JSON.stringify(run([reference('a')])); expect(json).not.toMatch(/personsServed|wasteReduction|officialEffectiveness|predictedDemand/); });
  it('rejects a snapshot bound to a different approved baseline', () => { expect(() => validatePrioritySnapshot(snapshot(), 'wrong')).toThrow(); });
  it('rejects an unexpected bus-source version', () => { expect(() => validatePrioritySnapshot(snapshot(), 'base-v1', 'wrong')).toThrow(); });
  it('rejects an entity whose source version does not match provenance', () => { const data = snapshot(); data.references[0].sourceVersion = 'wrong'; expect(() => validatePrioritySnapshot(data, 'base-v1')).toThrow(); });
  it('accepts explicit unknown publication dates without pretending freshness', () => { expect(validatePrioritySnapshot(snapshot(), 'base-v1').sources[0].resourceUpdatedAt).toBeNull(); });
  it('retains an explicitly dated historical approved bus version rather than silently adopting a newer source', () => { const data = snapshot(); data.sources[0].resourceUpdatedAt = '2021-04-11T19:47:33+08:00'; expect(validatePrioritySnapshot(data, 'base-v1').busSourceVersion).toBe('a'.repeat(64)); });
  it('rejects a malformed source publication date', () => { const data = snapshot(); data.sources[0].resourceUpdatedAt = 'not a date'; expect(() => validatePrioritySnapshot(data, 'base-v1')).toThrow(); });
});
