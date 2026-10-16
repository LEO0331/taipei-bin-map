import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PolicyPriorityDashboard } from './PolicyPriorityDashboard';
vi.mock('./BinPolicyMap', () => ({ BinPolicyMap: () => <div>Map test boundary</div> }));
vi.mock('./BinPolicyGovernancePanels', () => ({ BinPolicyGovernancePanels: () => null }));
vi.mock('./BinPolicySourceComparisonPanel', () => ({ BinPolicySourceComparisonPanel: () => null }));
const base = JSON.parse(readFileSync('public/data/bin-policy/analysis.json', 'utf8'));
const priority = JSON.parse(readFileSync('public/data/bin-policy/priority-references.json', 'utf8'));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function mockData() { vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('analysis.json') ? base : priority }))); }
describe('policy priority dashboard', () => {
  it('keeps edited weights pending until the user runs the scenario', async () => {
    mockData(); render(<PolicyPriorityDashboard language="zh" />);
    const input = await screen.findByLabelText('權重: 公車站位參考位置', { exact: true });
    fireEvent.change(input, { target: { value: '5' } });
    expect(screen.getByRole('status')).toHaveTextContent('結果仍為上次套用');
  });
  it('restores the documented default weight through the reset control', async () => {
    mockData(); render(<PolicyPriorityDashboard language="zh" />);
    const input = await screen.findByLabelText('權重: 公車站位參考位置', { exact: true });
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: '重設文件預設權重' }));
    expect(input).toHaveValue(1);
  });
  it('rejects an empty weight instead of treating it as zero', async () => {
    mockData(); const { container } = render(<PolicyPriorityDashboard language="zh" />);
    const input = await screen.findByLabelText('權重: 公車站位參考位置', { exact: true });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('不會自動修正');
  });
  it('does not substitute recommendations when the source snapshot is incompatible', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('analysis.json') ? base : { ...priority, baseSnapshotId: 'other' } })));
    render(<PolicyPriorityDashboard language="zh" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('不使用替代資料');
  });
});
