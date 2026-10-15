import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BinPolicyGovernancePanels } from './BinPolicyGovernancePanels';
import type { PolicySnapshot } from '../lib/binPolicyData';

const snapshot: PolicySnapshot = {
  schemaVersion: 1, snapshotId: 'published', generatedAt: '2026-10-15T00:00:00Z', bins: [], references: [],
  sources: [{ id: 'bus', name: '官方站位', provider: '公運處', datasetUrl: 'https://data.taipei/', resourceId: 'r', resourceUpdatedAt: '2021-04-11T00:00:00Z', fetchedAt: '2026-10-15T00:00:00Z', sha256: 'abc', encoding: 'UTF-8', crs: 'WGS84', license: 'Open', licenseUrl: '', caveat: 'Historical geometry' }],
  quality: { binSourceRows: 0, validBins: 0, referenceSourceRows: 0, validReferences: 0, duplicateBins: 0, duplicateReferences: 0, excluded: [], previousBinSnapshot: { records: 1197, sourceRowDifference: -516, metadata: { generatedAt: '' } } },
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('policy governance panels', () => {
  it('does not load large reconciliation evidence before opening the disclosure', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ schemaVersion: 1, snapshotId: 'published', sources: [] }) }));
    vi.stubGlobal('fetch', fetcher);
    render(<BinPolicyGovernancePanels snapshot={snapshot} language="zh" />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(String(fetcher.mock.calls[0])).not.toContain('reconciliation.json');
  });
  it('marks incompatible health evidence unknown without hiding the published snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ schemaVersion: 1, snapshotId: 'other' }) })));
    render(<BinPolicyGovernancePanels snapshot={snapshot} language="zh" />);
    expect(await screen.findByText(/健康報告未知/)).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
  });
  it('does not replace an unknown publication date with the generation date', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ schemaVersion: 1, snapshotId: 'published', generatedAt: snapshot.generatedAt, published_at: null, sources: [] }) })));
    render(<BinPolicyGovernancePanels snapshot={snapshot} language="en" />);
    expect(screen.getByText(/Published at/)).toHaveTextContent('Published at: Unknown');
  });
  it('warns about an old source despite a recent retrieval date', () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    render(<BinPolicyGovernancePanels snapshot={snapshot} language="zh" />);
    expect(screen.getByText(/官方站位/)).toHaveTextContent('來源較舊');
  });
});
