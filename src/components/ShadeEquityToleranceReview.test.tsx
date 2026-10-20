import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ShadeEquityToleranceReview } from './ShadeEquityToleranceReview';
import type { ShadeEquitySnapshot } from '../types/shadeEquity';
const snapshot: ShadeEquitySnapshot = { schemaVersion: 1, snapshotId: 'test-only', generatedAt: '2026-10-20T00:00:00Z', methodologyVersion: 'shade-equity-evidence-review-v1', configurationVersion: '1.0.0', sources: [], segments: [], limitations: [], comparability: { eligible: false, reasons: [] } };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('does not substitute zero counts when tolerance evidence fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(<ShadeEquityToleranceReview snapshot={snapshot} language="zh"/>);
  expect(await screen.findByText(/不以零或其他版本替代/)).toBeInTheDocument();
});
it('rejects tolerance evidence from another snapshot', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...snapshot, snapshotId: 'wrong', sourceHashes: [], scope: 'different_evidence_scope', scenarios: [] }) }));
  render(<ShadeEquityToleranceReview snapshot={snapshot} language="en"/>);
  expect(await screen.findByText(/could not be verified/)).toBeInTheDocument();
});
