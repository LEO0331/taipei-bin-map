import { describe, it, expect } from 'vitest';
import { assertArchiveMetadata } from './stageBinPolicyPublication';
const source = { id: 'bins', sha256: 'same-hash', resourceId: 'verified', resourceUpdatedAt: '2026-09-30', fetchedAt: '2026-10-01' };
describe('publication archive provenance', () => {
  it('rejects source-date changes hidden under an unchanged content-addressed version', () => {
    expect(() => assertArchiveMetadata([source], [{ ...source, resourceUpdatedAt: '2026-10-15' }])).toThrow(/Metadata revision/);
  });
  it('retains original retrieval provenance when identical content is fetched again', () => {
    expect(() => assertArchiveMetadata([source], [{ ...source, fetchedAt: '2026-10-15' }])).not.toThrow();
  });
  it('rejects different archive source identities', () => {
    expect(() => assertArchiveMetadata([source], [{ ...source, resourceId: 'unreviewed' }])).toThrow();
  });
});
