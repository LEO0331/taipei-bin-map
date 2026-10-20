import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShadeEquityDecisionDashboard } from './ShadeEquityDecisionDashboard';
import { ShadeEquitySourceHealth } from './ShadeEquitySourceHealth';
import type { ShadeEquitySnapshot } from '../types/shadeEquity';

vi.mock('./ShadeEquityMap', () => ({ ShadeEquityMap: () => <div>Map boundary</div> }));
const snapshot: ShadeEquitySnapshot = {
  schemaVersion: 1, methodologyVersion: 'shade-equity-evidence-review-v1', configurationVersion: '1.0.0', snapshotId: 'shade-test-only', generatedAt: '2026-10-20T00:00:00Z',
  sources: [], segments: [], limitations: ['Synthetic test fixture; not Taipei analysis.'], comparability: { eligible: false, reasons: ['No audited geometry'] },
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const mockData = (data = snapshot) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })));
function populatedSnapshot(): ShadeEquitySnapshot {
  return { ...snapshot,
    sources: (['roadside_trees', 'sidewalks', 'tree_pits'] as const).map(id => ({ id, population: id, name: id, provider: 'Test agency', datasetId: id, resourceId: id, url: 'https://data.taipei/', sha256: 'a'.repeat(64), suitability: 'verified_analysis' })),
    segments: Array.from({ length: 12 }, (_, index) => ({ id: `review-${index}`, district: '大安區', road: '測試道路', lengthM: 100, widthM: 3, latitude: 25.03, longitude: 121.54, geometryValid: true, sourceVerified: true, measurementVerified: true, treeCount: 2, pitCount: 1, ambiguousTreeCount: 0, ambiguousPitCount: 0, questions: [], confidence: 'high', surveyDate: '2025-01-01', treeSourceId: 'roadside_trees', pitSourceId: 'tree_pits', sidewalkSourceId: 'sidewalks' })),
  };
}
describe('shade equity dashboard', () => {
  it('shows a loading state before the snapshot arrives', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<ShadeEquityDecisionDashboard language="zh"/>);
    expect(screen.getByRole('status')).toHaveTextContent('載入樹蔭公平研究快照');
  });
  it('offers retry after a snapshot request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, json: async () => snapshot }));
    render(<ShadeEquityDecisionDashboard language="zh"/>);
    fireEvent.click(await screen.findByRole('button', { name: '重試資料' }));
    expect(await screen.findByRole('heading', { name: 'A 政策問題與分析限制' })).toBeInTheDocument();
  });
  it('does not rank unavailable source data as a vegetation gap', async () => {
    mockData(); render(<ShadeEquityDecisionDashboard language="zh"/>);
    fireEvent.click(await screen.findByRole('button', { name: '查核優先順序' }));
    expect(screen.getByText(/目前沒有符合證據門檻/)).toHaveTextContent('不是沒有樹木');
  });
  it('disables low-recorded-tree ranking when coverage is not comparable', async () => {
    mockData(); render(<ShadeEquityDecisionDashboard language="zh"/>);
    fireEvent.click(await screen.findByRole('button', { name: '查核優先順序' }));
    expect(screen.getByRole('option', { name: '低登錄樹木量（需可比較）' })).toBeDisabled();
  });
  it('keeps capacity edits pending until the user generates a shortlist', async () => {
    mockData(); render(<ShadeEquityDecisionDashboard language="en"/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Review priorities' }));
    fireEvent.change(screen.getByLabelText('Maximum survey slots'), { target: { value: '10' } });
    expect(screen.getByText(/Pending changes/)).toBeInTheDocument();
  });
  it('offers the complete JSON briefing export', async () => {
    mockData(); render(<ShadeEquityDecisionDashboard language="en"/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Briefing & export' }));
    expect(screen.getByRole('button', { name: 'Export field-review JSON' })).toBeInTheDocument();
  });
  it('offers the complete CSV briefing export', async () => {
    mockData(); render(<ShadeEquityDecisionDashboard language="en"/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Briefing & export' }));
    expect(screen.getByRole('button', { name: 'Export field-review CSV' })).toBeInTheDocument();
  });
  it('shows five review units at the default survey capacity', async () => {
    mockData(populatedSnapshot()); render(<ShadeEquityDecisionDashboard language="en"/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Review priorities' }));
    expect(screen.getAllByRole('button', { name: /^\d+\. review-/ })).toHaveLength(5);
  });
  it('shows ten review units after applying capacity ten', async () => {
    mockData(populatedSnapshot()); render(<ShadeEquityDecisionDashboard language="en"/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Review priorities' }));
    fireEvent.change(screen.getByLabelText('Maximum survey slots'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate review shortlist' }));
    expect(screen.getAllByRole('button', { name: /^\d+\. review-/ })).toHaveLength(10);
  });
  it('synchronizes the selected table unit with its field-review checklist', async () => {
    mockData(populatedSnapshot()); render(<ShadeEquityDecisionDashboard language="en"/>);
    fireEvent.click(await screen.findByRole('button', { name: 'Review priorities' }));
    fireEvent.click(screen.getAllByRole('button', { name: /^\d+\. review-/ })[0]);
    expect(screen.getByRole('complementary', { name: 'Selected segment evidence' })).toHaveTextContent('Verify tree / pit occupancy');
  });
  it('explains the measurement gate when official geometry exists but lengths are unverified', async () => {
    const data = populatedSnapshot(); data.segments.forEach(segment => { segment.measurementVerified = false; segment.lengthM = null; });
    mockData(data); render(<ShadeEquityDecisionDashboard language="zh"/>);
    fireEvent.click(await screen.findByRole('button', { name: '查核優先順序' }));
    expect(screen.getByText(/官方長度欄位定義或單位尚未驗證/)).toBeInTheDocument();
  });
  it('loads district details only after a district is chosen', async () => {
    const data = populatedSnapshot();
    const metadata = { ...data, segments: [], districtChunks: { '大安區': 'district-test.json' }, districtSummary: [{ district: '大安區', sidewalkSegments: 12, treeObservations: 24, pitObservations: 12, matchedTrees: 24, matchedPits: 12, ambiguousTrees: 0, ambiguousPits: 0, eligibleLengthM: null, comparable: false }] };
    const fetcher = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('district-test.json') ? { schemaVersion: 1, snapshotId: data.snapshotId, district: '大安區', segments: data.segments } : metadata }));
    vi.stubGlobal('fetch', fetcher);
    render(<ShadeEquityDecisionDashboard language="en"/>);
    const scope = await screen.findByLabelText('Evidence scope (choose a district to load details)');
    fireEvent.change(scope, { target: { value: '大安區' } });
    expect(await screen.findByText(/Loaded official segment inventory.*\(12\)/)).toBeInTheDocument();
  });
  it('keeps documented inventory observations visible when no review candidates are eligible', async () => {
    const data = { ...snapshot, inventory: { rawTreeRows: 11, acceptedTrees: 10, rawSidewalkFeatures: 2, acceptedSidewalks: 2, rawPitFeatures: 8, acceptedPits: 7, matchedTrees: 6, unmatchedTrees: 4, ambiguousTrees: 0, matchedPits: 5, unmatchedPits: 2, ambiguousPits: 0, eligibleDensityLengthM: null } };
    mockData(data); render(<ShadeEquityDecisionDashboard language="en"/>);
    expect((await screen.findByText('Accepted roadside trees')).nextElementSibling).toHaveTextContent('10');
  });
});
describe('shade source health', () => {
  it('collapses detailed source provenance by default', () => {
    const { container } = render(<ShadeEquitySourceHealth language="zh" sources={[{ id: 'trees', name: '行道樹', provider: '主管機關', datasetId: 'dataset', resourceId: null, url: 'https://data.taipei/', sha256: null, suitability: 'unavailable' }]}/>);
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });
  it('keeps missing source counts unknown instead of displaying zero', () => {
    render(<ShadeEquitySourceHealth language="zh" sources={[{ id: 'trees', name: '行道樹', provider: '主管機關', datasetId: 'dataset', resourceId: null, url: 'https://data.taipei/', sha256: null, suitability: 'unavailable' }]}/>);
    expect(screen.getByText('原始／接受筆數').nextElementSibling).toHaveTextContent('未知／未驗證 / 未知／未驗證');
  });
  it('renders the English suitability label without altering the source name', () => {
    const { container } = render(<ShadeEquitySourceHealth language="en" sources={[{ id: 'park', name: '園樹', provider: 'Agency', datasetId: 'dataset', resourceId: null, url: 'https://data.taipei/', sha256: null, suitability: 'context_only' }]}/>);
    fireEvent.click(container.querySelector('summary')!);
    expect(screen.getByText('Context only · Agency')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '園樹' })).toBeInTheDocument();
  });
});
