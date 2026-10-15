import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildPolicySnapshot, writePolicySnapshot } from './convertBinPolicySources';

describe('policy raw manifest trust boundary', () => {
  it('rejects same-content provenance edits through the legacy production converter', () => {
    const directory = mkdtempSync(join(tmpdir(), 'policy-metadata-test-'));
    const published = readFileSync('public/data/bin-policy/analysis.json');
    try {
      cpSync('data/raw/bin-policy/v1-14c24bcdbade', directory, { recursive: true });
      const manifest = JSON.parse(readFileSync(join(directory, 'sources.json'), 'utf8'));
      manifest[0].resourceUpdatedAt = '2026-10-15T00:00:00Z';
      writeFileSync(join(directory, 'sources.json'), JSON.stringify(manifest));
      expect(() => writePolicySnapshot(directory)).toThrow(/Metadata revision/);
      expect(readFileSync('public/data/bin-policy/analysis.json')).toEqual(published);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it('rejects redirected manifest filenames before parsing unapproved fixed-name inputs', () => {
    const directory = mkdtempSync(join(tmpdir(), 'policy-manifest-test-'));
    try {
      cpSync('data/raw/bin-policy/v1-14c24bcdbade', directory, { recursive: true });
      const manifest = JSON.parse(readFileSync(join(directory, 'sources.json'), 'utf8'));
      copyFileSync(join(directory, 'bins-current.csv'), join(directory, 'approved-copy.csv'));
      writeFileSync(join(directory, 'bins-current.csv'), Buffer.concat([readFileSync(join(directory, 'bins-current.csv')), Buffer.from('\r\n')]));
      manifest[0].filename = 'approved-copy.csv';
      writeFileSync(join(directory, 'sources.json'), JSON.stringify(manifest));
      expect(() => buildPolicySnapshot(directory)).toThrow(/manifest|identity|filename/i);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
