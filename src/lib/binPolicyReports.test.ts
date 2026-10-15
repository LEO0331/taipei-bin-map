import { describe, expect, it } from 'vitest';
import { reportMatchesSnapshot, sourceIsStale } from './binPolicyReports';

describe('policy sidecar reports', () => {
  it('rejects evidence generated for another published snapshot', () => {
    expect(reportMatchesSnapshot({ schemaVersion: 1, policySnapshotId: 'old' }, 'current')).toBe(false);
  });
  it('accepts a compatible report associated with the published snapshot', () => {
    expect(reportMatchesSnapshot({ schemaVersion: 1, snapshotId: 'current' }, 'current')).toBe(true);
  });
  it('rejects unsupported report schemas', () => {
    expect(reportMatchesSnapshot({ schemaVersion: 2, snapshotId: 'current' }, 'current')).toBe(false);
  });
  it('leaves missing publication dates unknown rather than fresh', () => {
    expect(sourceIsStale(null, new Date('2026-10-15T00:00:00Z'))).toBeNull();
  });
  it('flags an old source even after a recent retrieval', () => {
    expect(sourceIsStale('2021-04-11T00:00:00Z', new Date('2026-10-15T00:00:00Z'))).toBe(true);
  });
  it('keeps an exactly one-year-old date inside the documented freshness threshold', () => {
    expect(sourceIsStale('2025-10-15T00:00:00Z', new Date('2026-10-15T00:00:00Z'))).toBe(false);
  });
});
