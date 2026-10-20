import { useEffect, useMemo, useState } from 'react';
import type { Language } from '../types';
import type { ShadeEquityCandidate, ShadeEquityParameters, ShadeEquitySnapshot, ShadeEquityStrategy } from '../types/shadeEquity';
import { loadShadeEquitySnapshot } from '../lib/shadeEquityData';
import { runShadeEquityScenario, buildShadeEquitySensitivity } from '../lib/shadeEquityScenario';
import { shadeEquityBriefing, shadeEquityCsv } from '../lib/shadeEquityExport';
import { ShadeEquitySourceHealth, shadeEvidenceText } from './ShadeEquitySourceHealth';
import { ShadeEquityMap } from './ShadeEquityMap';
import { ShadeEquityToleranceReview } from './ShadeEquityToleranceReview';

const initial: ShadeEquityParameters = { district: '', strategy: 'evidence', capacity: 5, minLengthM: 20, includeAmbiguous: false };
interface InventoryEvidence {
  districtChunks?: Record<string, string>;
  segmentCoverage?: string;
}
const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ShadeEquityDecisionDashboard({ language }: { language: Language }) {
  const t = (cn: string, en: string) => language === 'zh' ? cn : en;
  const [snapshot, setSnapshot] = useState<ShadeEquitySnapshot | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState('observe');
  const [draft, setDraft] = useState(initial);
  const [capacityPreset, setCapacityPreset] = useState('5');
  const [applied, setApplied] = useState(initial);
  const [parameterError, setParameterError] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setError(false); setSnapshot(null);
    loadShadeEquitySnapshot(controller.signal, draft.district).then(data => { if (!controller.signal.aborted) { setSnapshot(data); setApplied(previous => ({ ...previous, district: draft.district })); } }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [retry, draft.district]);
  const result = useMemo(() => snapshot ? runShadeEquityScenario(snapshot, applied) : null, [snapshot, applied]);
  const sensitivity = useMemo(() => snapshot ? buildShadeEquitySensitivity(snapshot, applied) : [], [snapshot, applied]);
  const exportJson = () => snapshot && result && download(JSON.stringify(shadeEquityBriefing(snapshot, result, sensitivity), null, 2), 'shade-equity-briefing.json', 'application/json');
  const exportCsv = () => snapshot && result && download(shadeEquityCsv(snapshot, result, sensitivity), 'shade-equity-briefing.csv', 'text/csv;charset=utf-8');
  if (error) return <section className="policy-panel" role="alert"><h2>{t('樹蔭研究資料無法載入', 'Shade research data unavailable')}</h2><p>{t('來源版本或格式無法驗證，不以替代點位產生排名。', 'Source versions or schema could not be verified. No substitute points or rankings are generated.')}</p><button type="button" onClick={() => setRetry(value => value + 1)}>{t('重試資料', 'Retry data')}</button></section>;
  if (!snapshot || !result) return <p role="status">{t('載入樹蔭公平研究快照中…', 'Loading shade-equity research snapshot…')}</p>;
  const update = <K extends keyof ShadeEquityParameters>(key: K, value: ShadeEquityParameters[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  const districts = [...new Set([...snapshot.districtSummary?.map(row => row.district) ?? [], ...snapshot.segments.map(segment => segment.district)])].sort();
  const active = result.selected.find(item => item.segment.id === activeId);
  const tiers = { A: t('A 優先查核', 'A Verify first'), B: t('B 建議查核', 'B Review'), C: t('C 例行盤點', 'C Routine review') };
  const sensitivityLabels: Record<string, string> = {
    capacity_5_vs_10: t('調查容量 5 與 10', 'Survey capacity 5 versus 10'),
    evidence_vs_balanced: t('證據優先與行政區均衡', 'Evidence first versus district balance'),
    strict_vs_permissive: t('嚴格與寬鬆空間關聯', 'Strict versus permissive associations'),
    minimum_length: t('最短區段長度門檻', 'Minimum segment length threshold'),
    evidence_vs_low_recorded: t('證據優先與低登錄量', 'Evidence first versus low recorded trees'),
  };
  const reasonLabels: Record<string, string> = {
    invalid_identity: t('區段身分無法驗證', 'Unverified segment identity'), unverified_source_identity: t('來源身分無法驗證', 'Unverified source identity'),
    invalid_measurement_definition: t('官方長度定義或單位尚未驗證', 'Official length definition or units not verified'),
    invalid_geometry: t('幾何無法驗證', 'Unverified geometry'), unverified_source: t('來源身分無法驗證', 'Unverified source identity'),
    invalid_district: t('行政區無法驗證', 'Unverified district'), invalid_length: t('有效長度不足', 'Invalid length'),
    unverified_measurement: t('官方長度定義或單位尚未驗證', 'Official length definition or units not verified'),
    tree_source_ineligible: t('行道樹來源不符分析資格', 'Roadside-tree source ineligible'), sidewalk_source_ineligible: t('人行道來源不符分析資格', 'Sidewalk source ineligible'),
    pit_source_ineligible: t('樹穴來源不符分析資格', 'Tree-pit source ineligible'), below_minimum_length: t('低於最短區段門檻', 'Below minimum length'),
    ambiguous_association_excluded: t('嚴格條件排除模糊空間關聯', 'Ambiguous association excluded by strict eligibility'),
    source_population_or_version_changed: t('來源母體或版本改變', 'Source population or version changed'), geographic_scope_changed: t('地理範圍改變', 'Geographic scope changed'),
    minimum_length_changed: t('最短區段長度門檻改變', 'Minimum length changed'), association_eligibility_changed: t('空間關聯資格改變', 'Association eligibility changed'), matching_tolerance_changed: t('空間匹配容許距離改變', 'Matching tolerance changed'),
  };
  const measurementBlocked = snapshot.segments.filter(segment => !segment.measurementVerified).length;
  const inventory = snapshot.inventory;
  const districtSummary = snapshot.districtSummary;
  const dimensions: Record<string, string> = {
    tree_inventory_coverage: t('行道樹盤點涵蓋', 'Tree inventory coverage'), tree_pit_occupancy: t('樹穴占用查核', 'Pit occupancy review'),
    sidewalk_geometry: t('人行道幾何', 'Sidewalk geometry'), spatial_association: t('空間關聯', 'Spatial association'), source_freshness: t('來源時效', 'Source freshness'),
    canopy_evidence: t('樹冠與遮蔭證據', 'Canopy evidence'), field_feasibility: t('現地可行性', 'Field feasibility'),
  };
  const checklist = [
    t('確認樹木／樹穴占用及目前樹況與存活', 'Verify tree / pit occupancy, current condition and survival'),
    t('量測行人淨寬、無障礙與道路設施衝突', 'Measure pedestrian clearance, accessibility and infrastructure conflicts'),
    t('查核地下管線、土壤及根系空間', 'Check utilities, soil and rooting space'),
    t('確認土地權管、主管機關、適合樹種與維護責任', 'Confirm jurisdiction, agency requirements, suitable species and maintenance responsibility'),
    t('視需求實測行人遮蔭，不從登錄樹木推算降溫', 'Measure pedestrian shade where needed; do not infer cooling from registered trees'),
  ];
  const candidateTable = (items: ShadeEquityCandidate[]) => <div className="directory-table-wrap shade-table"><table><caption>{t('官方人行道查核區段（最多顯示 80 筆；匯出包含完整結果）', 'Official sidewalk review units (up to 80 shown; exports contain complete results)')}</caption><thead><tr>{[t('選取／區段', 'Select / segment'), t('行政區／道路', 'District / road'), t('優先層級', 'Review tier'), t('查核長度（公尺）', 'Audited length (m)'), t('登錄樹木／樹穴', 'Recorded trees / pits'), t('獨立問題', 'Independent questions')].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{items.slice(0, 80).map((item, index) => <tr key={item.segment.id} aria-selected={activeId === item.segment.id}><td><button type="button" aria-pressed={activeId === item.segment.id} onClick={() => setActiveId(item.segment.id)}>{index + 1}. {item.segment.id}</button></td><td>{item.segment.district} · {item.segment.road || t('道路未知', 'Road unknown')}</td><td>{tiers[item.tier]}</td><td>{item.segment.lengthM === null ? t('未知', 'Unknown') : number(item.segment.lengthM)}</td><td>{item.segment.treeCount} / {item.recordedPitsPerKm === null ? t('未知', 'Unknown') : item.segment.pitCount}</td><td>{item.independentQuestionCount}<ul>{item.questions.map((question, q) => <li key={q}>{dimensions[question.dimension] ?? question.dimension}: {shadeEvidenceText(question.reason, language)}</li>)}</ul></td></tr>)}</tbody></table></div>;
  return <article className="shade-dashboard bulky-dashboard">
    <header><h2>{t('樹蔭公平與都市熱環境決策分析', 'Shade Equity & Urban Heat Preparedness')}</h2><p>{t('觀察 → 驗證 → 關聯 → 排序 → 模擬 → 現勘 → 匯出。這是獨立研究 POC，不是官方種植計畫。', 'Observe → Validate → Relate → Prioritize → Simulate → Review → Export. An independent research POC, not an official planting plan.')}</p></header>
    {offline && <p role="status" className="shade-callout">{t('目前離線；快取快照不代表來源仍為最新。底圖可能無法載入，清單與匯出仍可使用。', 'Offline. A cached snapshot does not confirm current source status. Basemap tiles may be unavailable; lists and exports remain usable.')}</p>}
    <label className="shade-scope-select">{t('查核資料範圍（選區後載入明細）', 'Evidence scope (choose a district to load details)')}<select value={draft.district} onChange={event => update('district', event.target.value)}><option value="">{t('全市盤點摘要', 'Citywide inventory summary')}</option>{districts.map(district => <option key={district}>{district}</option>)}</select></label>
    {(snapshot as ShadeEquitySnapshot & InventoryEvidence).districtChunks && <p>{t('全市僅載入盤點摘要；各行政區明細按需讀取。當前載入區段數與排除數不是全市合計。', 'Only inventory summaries load citywide; district detail loads on demand. Loaded unit and exclusion counts are not citywide totals.')}</p>}
    <nav className="module-view-tabs" aria-label={t('樹蔭研究檢視', 'Shade research views')}>{[['observe', t('觀察與資料', 'Observe & evidence')], ['prioritize', t('查核優先順序', 'Review priorities')], ['compare', t('容量與敏感度', 'Capacity & sensitivity')], ['briefing', t('現勘摘要與匯出', 'Briefing & export')]].map(([id, label]) => <button type="button" key={id} className={view === id ? 'active' : ''} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</nav>
    <p className="shade-callout">{t('登錄行道樹 ≠ 實測樹冠或遮蔭；樹穴 ≠ 空穴或可種植容量。實測行人熱暴露、遮蔭與種植可行性目前不可用，不列入各區段問題加分。', 'Registered roadside trees ≠ measured canopy or shade; tree pits ≠ vacant or feasible planting capacity. Measured pedestrian heat exposure, shade and planting feasibility are unavailable and do not inflate segment priorities.')}</p>
    {view === 'observe' && <>
      <section className="policy-panel"><h3>{t('A 政策問題與分析限制', 'A Policy question & limitations')}</h3><p>{t('有限現勘資源應先查核哪些有文件依據的人行道區段，以及原因為何？零筆匹配不等於現場無樹；道路樹、園樹與受保護樹木維持不同母體。', 'Which documented sidewalk units warrant earlier review with limited survey resources, and why? Zero matches do not prove absence. Roadside trees, park trees and legally protected trees remain distinct populations.')}</p><a href="https://puma.taipei/hackathon" target="_blank" rel="noreferrer">{t('政策背景（非逐筆移除樹木證據）', 'Policy context (not a tree-removal registry)')}</a></section>
      <ShadeEquitySourceHealth sources={snapshot.sources} language={language}/>
      {inventory && <section className="policy-panel"><h3>{t('已驗證官方盤點與關聯摘要（非排序結果）', 'Validated official inventory & association summary (not ranking results)')}</h3><div className="dashboard-cards">{[
        [t('接受行道樹紀錄', 'Accepted roadside trees'), inventory.acceptedTrees],
        [t('接受人行道幾何', 'Accepted sidewalk geometry'), inventory.acceptedSidewalks],
        [t('接受樹穴幾何', 'Accepted tree-pit geometry'), inventory.acceptedPits],
        [t('樹木：匹配／未匹配／模糊', 'Trees: matched / unmatched / ambiguous'), `${inventory.matchedTrees} / ${inventory.unmatchedTrees} / ${inventory.ambiguousTrees}`],
        [t('樹穴：匹配／未匹配／模糊', 'Pits: matched / unmatched / ambiguous'), `${inventory.matchedPits} / ${inventory.unmatchedPits} / ${inventory.ambiguousPits}`],
        [t('可計算密度的有效長度（公尺）', 'Eligible density denominator (m)'), inventory.eligibleDensityLengthM === null ? t('尚未驗證', 'Not verified') : number(inventory.eligibleDensityLengthM)],
      ].map(([label, value]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div><p>{t('未匹配不等於無效；模糊關聯不加總為單一區段樹木。人行道幾何通過檢查，不表示長度定義與單位已通過密度分析門檻。', 'Unmatched does not mean invalid; ambiguous associations are not added to single-segment counts. Valid sidewalk geometry does not establish that length definitions and units satisfy density-analysis gates.')}</p></section>}
      {districtSummary && <div className="directory-table-wrap shade-table"><table><caption>{t('行政區盤點（非樹蔭公平排名；園樹與受保護樹木不混入）', 'District inventories (not shade-equity rankings; park and protected trees excluded)')}</caption><thead><tr>{[t('行政區', 'District'), t('有效幾何區段', 'Valid geometry units'), t('登錄樹木', 'Registered trees'), t('登錄樹穴', 'Registered pits'), t('匹配樹木／樹穴', 'Matched trees / pits'), t('模糊樹木／樹穴', 'Ambiguous trees / pits'), t('可比較長度（公尺）', 'Comparable length (m)')].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{districtSummary.map(row => <tr key={row.district}><th scope="row">{row.district}</th><td>{row.sidewalkSegments}</td><td>{row.treeObservations}</td><td>{row.pitObservations}</td><td>{row.matchedTrees} / {row.matchedPits}</td><td>{row.ambiguousTrees} / {row.ambiguousPits}</td><td>{row.comparable && row.eligibleLengthM !== null ? number(row.eligibleLengthM) : t('不可比較／未驗證', 'Not comparable / unverified')}</td></tr>)}</tbody></table></div>}
      <section className="policy-panel"><h3>{t('C 行道樹分布', 'C Roadside tree inventory')}</h3><p>{t('僅納入已驗證來源的登錄觀察，不能由高度、胸徑、公園面積或受保護樹木數推算實際遮蔭。', 'Only source-validated observations are eligible. Height, trunk diameter, park area and protected-tree counts cannot establish actual pedestrian shade.')}</p><p>{t('原始與接受的官方盤點筆數見上述來源卡片，與合格查核候選數不同。零個合格候選不代表零棵樹或零個樹穴。園樹與受保護樹木不納入行道樹母體。', 'Official raw and accepted inventory counts appear in the source cards above and differ from eligible review counts. Zero eligible candidates do not imply zero trees or pits. Park trees and legally protected trees are not the roadside-tree population.')}</p></section>
      <section className="policy-panel"><h3>{t('D 人行道與樹穴', 'D Sidewalk & pit infrastructure')}</h3><p>{t('使用官方人行道區段 ID，保留道路兩側；樹穴與植栽槽分開。接近或匹配僅為可能關聯，不證明樹穴占用，更不證明空穴。', 'Use official sidewalk IDs, preserving road sides and separating pits from planters. Proximity or matching indicates possible association, not occupancy or vacancy.')}</p><p>{t('當前載入明細區段數', 'Currently loaded detailed sidewalk units')}: {snapshot.segments.length} · {t('長度定義／單位尚待驗證', 'Length definition / units pending verification')}: {measurementBlocked}</p></section>
      <section className="policy-panel"><h3>{t('E 空間資料治理', 'E GIS & data quality')}</h3><p>{t('固定快照的關聯容許距離（公尺）', 'Frozen association tolerance (m)')}: {snapshot.associationToleranceM ?? t('未知', 'Unknown')}</p><p>{t('更改關聯距離需離線重建與審查新快照，瀏覽器不會以摘要點重做空間匹配。', 'Changing tolerance requires offline regeneration and review; the browser never rematches summary points.')}</p><p>{shadeEvidenceText(snapshot.eligiblePopulation ?? t('分析母體未驗證', 'Analytical population unverified'), language)}</p><ul>{snapshot.limitations.map((item, index) => <li key={index}>{shadeEvidenceText(item, language)}</li>)}</ul></section>
      <section className="policy-panel"><h3>{t('F 分布差異與可比較性', 'F Distribution & comparability')}</h3><p>{snapshot.comparability.eligible ? t('來源涵蓋通過比較門檻；密度僅為每公里已查核區段的登錄觀察。', 'Coverage passes comparison gates; density means observations per audited sidewalk kilometre only.') : t('來源涵蓋不可比較，停用低登錄量排序；不因缺資料推導植被缺口。', 'Source coverage is not comparable. Low-recorded-tree ranking is disabled; missing data do not establish a vegetation gap.')}</p><ul>{snapshot.comparability.reasons.map((item, index) => <li key={index}>{shadeEvidenceText(item, language)}</li>)}</ul></section>
      <details className="policy-panel shade-details"><summary>{t('已載入官方區段明細（不作優先排序）', 'Loaded official segment inventory (not prioritized)')} ({snapshot.segments.length})</summary>
        {!snapshot.segments.length && <p>{t('請選擇行政區載入明細；全市盤點數見上方摘要。', 'Choose a district to load details; citywide inventory counts are summarized above.')}</p>}
        {snapshot.segments.length > 0 && <div className="directory-table-wrap shade-table"><table><caption>{t('最多顯示 80 個官方幾何區段；長度未驗證不計算每公里密度', 'Up to 80 official geometry units; unverified lengths are never used for per-kilometre density')}</caption><thead><tr>{[t('區段 ID', 'Segment ID'), t('行政區／道路', 'District / road'), t('登錄樹木／樹穴觀察', 'Registered tree / pit observations'), t('選定區段模糊關聯', 'Selected ambiguous associations'), t('長度量測狀態', 'Length measurement status')].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{snapshot.segments.slice(0, 80).map(segment => <tr key={segment.id}><th scope="row">{segment.id}</th><td>{segment.district} · {segment.road || t('道路未知', 'Road unknown')}</td><td>{segment.treeCount} / {segment.pitSourceId ? segment.pitCount : t('未知', 'Unknown')}</td><td>{segment.ambiguousTreeCount} / {segment.ambiguousPitCount}</td><td>{segment.measurementVerified && segment.lengthM !== null ? `${number(segment.lengthM)} ${t('公尺', 'm')}` : t('定義／單位未驗證', 'Definition / units unverified')}</td></tr>)}</tbody></table></div>}
      </details>
    </>}
    {(view === 'prioritize' || view === 'compare') && <section className="policy-panel"><h3>{t('G 查核條件與 H 調查容量', 'G Review eligibility & H Survey capacity')}</h3>
      <form onSubmit={event => { event.preventDefault(); try { runShadeEquityScenario(snapshot, draft); setApplied({ ...draft }); setActiveId(null); setParameterError(false); } catch { setParameterError(true); } }}>
        <div className="bulky-filters shade-controls">
          <label>{t('行政區', 'District')}<select value={draft.district} onChange={event => update('district', event.target.value)}><option value="">{t('全部已查核範圍', 'All audited scope')}</option>{districts.map(district => <option key={district}>{district}</option>)}</select></label>
          <label>{t('查核策略', 'Review strategy')}<select value={draft.strategy} onChange={event => update('strategy', event.target.value as ShadeEquityStrategy)}><option value="evidence">{t('證據品質優先', 'Evidence quality first')}</option><option value="balanced">{t('行政區均衡查核', 'Balanced district review')}</option><option value="low-recorded" disabled={!snapshot.comparability.eligible}>{t('低登錄樹木量（需可比較）', 'Low recorded trees (comparability required)')}</option></select></label>
          <label>{t('最大調查名額', 'Maximum survey slots')}<select value={capacityPreset} onChange={event => { setCapacityPreset(event.target.value); if (event.target.value !== 'custom') update('capacity', Number(event.target.value)); }}><option value="5">5</option><option value="10">10</option><option value="0">{t('不限', 'Unlimited')}</option><option value="custom">{t('自訂', 'Custom')}</option></select></label>
          {capacityPreset === 'custom' && <label>{t('自訂調查名額', 'Custom survey slots')}<input type="number" required min="1" step="1" value={draft.capacity || ''} onChange={event => update('capacity', event.target.value === '' ? NaN : Number(event.target.value))}/></label>}
          <label>{t('最短區段長度（公尺）', 'Minimum segment length (m)')}<input type="number" required min="0" step="any" value={Number.isNaN(draft.minLengthM) ? '' : draft.minLengthM} onChange={event => update('minLengthM', event.target.value === '' ? NaN : Number(event.target.value))}/></label>
          <label><input type="checkbox" checked={draft.includeAmbiguous} onChange={event => update('includeAmbiguous', event.target.checked)}/>{t('納入模糊空間關聯', 'Include ambiguous associations')}</label>
          <button type="submit">{t('產生查核清單', 'Generate review shortlist')}</button>
        </div>
      </form>
      {parameterError && <p role="alert">{t('參數無效或證據不足，不會套用或自動修正。', 'Invalid parameters or insufficient evidence; settings were not applied or silently corrected.')}</p>}
      {JSON.stringify(draft) !== JSON.stringify(applied) && <p role="status">{t('條件尚未套用，結果仍為上次產生的清單。', 'Pending changes. Results still reflect the last generated shortlist.')}</p>}
      <p>{t('每個名額代表一項查核，不是種植數或工程預算。A：至少兩項獨立且具實質依據的問題；B：一項或未解空間關聯；C：例行盤點。必要身分、幾何或量測未驗證者為證據不足，排除排序。', 'Each slot represents a review, not a tree or construction budget. A: at least two independent material questions. B: one question or unresolved association. C: routine inventory. Unverified identity, geometry or measurement is insufficient evidence and excluded.')}</p>
    </section>}
    {(view === 'prioritize' || view === 'compare' || view === 'briefing') && <div className="dashboard-cards">{[[t('合格區段', 'Eligible segments'), result.summary.eligibleCount], [t('選定查核', 'Selected reviews'), result.summary.selectedCount], [t('涵蓋行政區', 'Districts represented'), result.summary.districtsRepresented], [t('選定查核長度（公尺）', 'Selected audited length (m)'), number(result.summary.auditedLengthM)], [t('選定區段樹木觀察', 'Selected tree observations'), result.summary.treeObservations], [t('模糊樹木／樹穴關聯', 'Ambiguous tree / pit associations'), `${result.summary.ambiguousTreeAssociations} / ${result.summary.ambiguousPitAssociations}`]].map(([label, value]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div>}
    {view === 'prioritize' && <>
      {(measurementBlocked > 0 || inventory?.eligibleDensityLengthM === null) && <p className="shade-callout">{t('官方長度欄位定義或單位尚未驗證，相關區段暫不作密度或優先排序；仍保留官方盤點與空間查核證據，不將資料不足解讀為環境缺口。', 'Official length field definitions or units are not yet verified. Affected units are excluded from density and priority ranking while retaining inventory and spatial evidence. Insufficient evidence is not an environmental gap.')}</p>}
      {result.selected.length === 0 ? <p role="status" className="shade-callout">{t('目前沒有符合證據門檻的可排序區段；不是沒有樹木，也不是沒有調查需求。請檢視來源狀態與排除原因。', 'No segments currently pass the evidence gates. This does not mean no trees or no review needs; inspect sources and exclusions.')}</p> : candidateTable(result.selected)}
      {active && <aside className="policy-panel" aria-label={t('選定區段證據', 'Selected segment evidence')}><h3>{active.segment.id} · {active.segment.road}</h3><p>{tiers[active.tier]} · {t('登錄觀察／公里', 'Recorded observations / km')}: {number(active.recordedTreesPerKm)}</p><p>{t('行政區、道路與來源紀錄保留中文原文。', 'District, road and source records retain their original Chinese text.')}</p><ul>{checklist.map(item => <li key={item}>{item}</li>)}</ul></aside>}
      <button type="button" aria-expanded={showMap} onClick={() => setShowMap(value => !value)}>{showMap ? t('收合查核地圖', 'Collapse review map') : t('展開查核地圖', 'Expand review map')}</button>
      {showMap && <ShadeEquityMap candidates={result.selected} language={language} activeId={activeId} onSelect={setActiveId}/>}
      <details className="policy-panel"><summary>{t('排除與證據不足', 'Exclusions & insufficient evidence')} ({result.excluded.length})</summary><ul>{result.excluded.slice(0, 80).map(item => <li key={item.id}>{item.id}: {item.reasons.map(reason => reasonLabels[reason] ?? reason).join(' · ')}</li>)}</ul></details>
    </>}
    {view === 'compare' && <section className="policy-panel"><h3>{t('I 容量與敏感度比較', 'I Capacity & sensitivity comparisons')}</h3><p>{t('同證據範圍才可比較策略；最短長度或嚴格／寬鬆關聯改變母體時明示不同證據範圍。排序穩定不證明環境改善。', 'Strategies are compared within the same evidence scope. Length or ambiguity eligibility changes are labelled different evidence scope. Stable rankings do not prove environmental improvement.')}</p><div className="record-card-grid">{sensitivity.map(({ label, comparison }) => <article className="record-card" key={label}><h4>{sensitivityLabels[label] ?? label}</h4><p>{comparison.scope === 'same_evidence_scope' ? t('相同證據範圍', 'Same evidence scope') : t('不同證據範圍', 'Different evidence scope')}</p><p>{t('保留／新增／移除', 'Retained / added / removed')}: {comparison.retainedIds.length} / {comparison.addedIds.length} / {comparison.removedIds.length}</p><p>{comparison.identicalSelection ? t('選定區段相同，未刻意製造差異。', 'Selections are identical; no differences were fabricated.') : t('差異來自容量、策略或證據門檻，不代表降溫效果。', 'Differences reflect capacity, strategy or evidence gates, not cooling effects.')}</p><p>{t('名次改變', 'Rank changes')}: {comparison.rankChanges.map(item => `${item.id} ${item.before}→${item.after}`).join(' · ') || '—'}</p><ul>{comparison.reasons.map((reason, index) => <li key={index}>{reasonLabels[reason] ?? reason}</li>)}</ul></article>)}</div></section>}
    {view === 'briefing' && <section className="policy-panel"><h3>{t('J 樹蔭與行道樹整備調查建議摘要', 'J Shade Equity Field-Review Briefing')}</h3><p>{t('查核單位為官方人行道區段，不是自動生成種植點。來源、日期、母體、座標、排除與理由皆保留於匯出。未知樹穴占用、管線、土壤及法規許可必須現勘。', 'The unit is an official sidewalk segment, not an automatically generated planting site. Exports retain sources, dates, populations, coordinates, exclusions and reasons. Occupancy, utilities, soil and legal approval require field verification.')}</p><ul>{checklist.map(item => <li key={item}>{item}</li>)}</ul>{candidateTable(result.selected)}<div className="policy-actions"><button type="button" onClick={exportJson}>{t('匯出現勘摘要 JSON', 'Export field-review JSON')}</button><button type="button" onClick={exportCsv}>{t('匯出現勘摘要 CSV', 'Export field-review CSV')}</button></div></section>}
    {view === 'compare' && <ShadeEquityToleranceReview snapshot={snapshot} language={language}/>}
    <footer className="policy-panel"><p>{t('快照', 'Snapshot')}: <code>{snapshot.snapshotId}</code> · {snapshot.generatedAt}</p><p><code>{snapshot.methodologyVersion}</code> · <code>{snapshot.configurationVersion}</code></p></footer>
  </article>;
}
