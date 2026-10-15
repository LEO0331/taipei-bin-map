import { describe, expect, it } from 'vitest';
import { distance } from './binPolicyDecision';
import { normalizeBinAddress, reconcileBinRecords, type ReconciliationInput } from './binPolicyReconciliation';

const point = (id: string, changes: Partial<ReconciliationInput> = {}): ReconciliationInput => ({ id, sourceId: 'test-source', scope: 'main', district: '中正區', address: '臺北市中正區測試路１號', longitude: 121.52, latitude: 25.03, ...changes });
describe('conservative bin record reconciliation', () => {
  it('confirms a unique address, district and exact coordinate match', () => { expect(reconcileBinRecords([point('a')], [point('b')])[0].classification).toBe('confirmed_match'); });
  it('normalizes full-width formatting and 台臺 without discarding house-number separators', () => { expect(normalizeBinAddress(' 臺北 路１號（公園） ')).toBe('台北路1號公園'); });
  it('does not merge a hyphenated house number with a different house number', () => { expect(normalizeBinAddress('路1-2號')).not.toBe(normalizeBinAddress('路12號')); });
  it('does not merge a slash-delimited house number with a different house number', () => { expect(normalizeBinAddress('路1/2號')).not.toBe(normalizeBinAddress('路12號')); });
  it('matches a verified namespaced stable identifier despite a changed address', () => { const identity = { officialId: '001', officialIdNamespace: 'agency-facility' }; expect(reconcileBinRecords([point('a', identity)], [point('b', { ...identity, address: '新地址' })])[0].classification).toBe('confirmed_match'); });
  it('does not override conflicting verified stable identifiers with an address match', () => { expect(reconcileBinRecords([point('a', { officialId: '1', officialIdNamespace: 'agency' })], [point('b', { officialId: '2', officialIdNamespace: 'agency' })]).some(r => r.classification === 'confirmed_match')).toBe(false); });
  it('retains duplicate official identifiers as ambiguous before weaker matching', () => { const identity = { officialId: '1', officialIdNamespace: 'agency' }; const result = reconcileBinRecords([point('a', identity), point('c', { ...identity, address: '不同地址' })], [point('b', identity)]); expect(result).toHaveLength(1); expect(result[0].classification).toBe('ambiguous'); });
  it('includes a coordinate review lead on the configured threshold boundary', () => { const a = point('a'), b = point('b', { latitude: 25.0301, address: '不同地址' }); expect(reconcileBinRecords([a], [b], { nearMeters: distance(a, b) })[0].classification).toBe('ambiguous'); });
  it('does not associate coordinate review leads outside the threshold', () => { const a = point('a'), b = point('b', { latitude: 25.0301, address: '不同地址' }); expect(reconcileBinRecords([a], [b], { nearMeters: distance(a, b) - 0.001 })).toHaveLength(2); });
  it('does not resolve one-to-many address matches arbitrarily', () => { const result = reconcileBinRecords([point('a')], [point('b'), point('c')]); expect(result).toHaveLength(1); expect(result[0].currentIds).toEqual(['b', 'c']); expect(result[0].classification).toBe('ambiguous'); });
  it('does not identify two records solely by duplicate coordinates', () => { expect(reconcileBinRecords([point('a')], [point('b', { address: '不同地址' })])[0].classification).toBe('ambiguous'); });
  it('keeps differently scoped resources outside inventory matching', () => { expect(reconcileBinRecords([point('a')], [point('b', { scope: 'tourist' })]).every(r => r.classification === 'different_scope')).toBe(true); });
  it('accepts absent official identifiers without treating local IDs as official', () => { expect(reconcileBinRecords([point('local-1')], [point('local-2')])[0].evidence).toEqual(['normalized_address_and_district']); });
  it('rejects a malformed explicitly supplied official identifier', () => { expect(reconcileBinRecords([point('a', { officialId: 'bad id', officialIdNamespace: 'agency' })], [])[0].classification).toBe('invalid_source_record'); });
  it('rejects invalid source coordinates without inventing a match', () => { expect(reconcileBinRecords([point('a', { latitude: 0 })], [])[0].classification).toBe('invalid_source_record'); });
  it('classifies a same-address displacement as possible location change rather than a confirmed move', () => { expect(reconcileBinRecords([point('a')], [point('b', { latitude: 25.04 })])[0].classification).toBe('possible_location_change'); });
  it('preserves unexplained historical differences without claiming removal', () => { expect(reconcileBinRecords([point('a')], [point('b', { latitude: 25.04, address: '遠處' })])[0].classification).toBe('historical_only'); });
  it('keeps incomplete identity evidence unresolved', () => { expect(reconcileBinRecords([point('a', { address: '' })], [])[0].classification).toBe('different_scope'); const result = reconcileBinRecords([point('a', { address: '' })], [point('b', { latitude: 25.04 })]); expect(result.find(r => r.historicalIds.includes('a'))?.classification).toBe('unresolved'); });
  it('produces the same ordered relationships when inputs are reversed', () => { const a = [point('a'), point('d', { latitude: 25.04 })], b = [point('b'), point('c')]; expect(reconcileBinRecords(a, b)).toEqual(reconcileBinRecords([...a].reverse(), [...b].reverse())); });
  it('rejects duplicate record IDs instead of dropping source rows in a map', () => { expect(() => reconcileBinRecords([point('a'), point('a')], [])).toThrow('Duplicate'); });
});
