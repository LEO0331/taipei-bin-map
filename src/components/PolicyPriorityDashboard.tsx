import { useEffect, useMemo, useState } from 'react';
import type { Language } from '../types';
import type { PolicyParameters } from '../lib/binPolicyDecision';
import { validatePolicySnapshot, type PolicySnapshot } from '../lib/binPolicyData';
import { POLICY_CATEGORIES, type CandidatePool, type PrioritySnapshot, type PriorityWeights } from '../lib/policyPriorityTypes';
import { DEFAULT_PRIORITY_WEIGHTS, WEIGHT_BOUNDS, WEIGHT_CONFIGURATION, validatePriorityWeights } from '../lib/policyPriorityWeights';
import { preparePolicyCoverage, allocatePolicyPriority, analyzePolicySensitivity, validatePrioritySnapshot, POLICY_METHOD } from '../lib/policyBalancedCoverage';
import { categoryLabel } from '../lib/policyPriorityPresentation';
import { priorityBriefing, priorityCsv, priorityCoverageScores } from '../lib/policyPriorityExport';
import { BinPolicyMap } from './BinPolicyMap';
import { BinPolicyGovernancePanels } from './BinPolicyGovernancePanels';
import { BinPolicySourceComparisonPanel } from './BinPolicySourceComparisonPanel';

const initial: PolicyParameters = { district: '中正區', radius: 300, count: 5, separation: 0, unitCost: null, budget: null };
const weightStrings = () => Object.fromEntries(POLICY_CATEGORIES.map(key => [key, String(DEFAULT_PRIORITY_WEIGHTS[key])])) as Record<typeof POLICY_CATEGORIES[number], string>;
const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 4 });
function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PolicyPriorityDashboard({ language }: { language: Language }) {
  const t = (cn: string, en: string) => language === 'zh' ? cn : en;
  const [inputs, setInputs] = useState<{ base: PolicySnapshot; priority: PrioritySnapshot } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const [draft, setDraft] = useState(initial);
  const [weightsDraft, setWeightsDraft] = useState(weightStrings);
  const [poolDraft, setPoolDraft] = useState<CandidatePool>('transport');
  const [parameterError, setParameterError] = useState(false);
  const [applied, setApplied] = useState({ parameters: initial, weights: { ...DEFAULT_PRIORITY_WEIGHTS } as PriorityWeights, pool: 'transport' as CandidatePool, generatedAt: new Date().toISOString() });
  useEffect(() => {
    const controller = new AbortController(); setLoadError(false);
    const read = async (name: string) => {
      const response = await fetch(`${import.meta.env.BASE_URL}data/bin-policy/${name}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Policy input unavailable'); return response.json() as Promise<unknown>;
    };
    Promise.all([read('analysis.json'), read('priority-references.json')]).then(([baseInput, priorityInput]) => {
      const base = validatePolicySnapshot(baseInput);
      const busVersion = base.sources.find(source => source.id === 'bus')?.sha256;
      if (!busVersion) throw new Error('Bus provenance missing');
      const priority = validatePrioritySnapshot(priorityInput, base.snapshotId, busVersion);
      setInputs({ base, priority });
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [retry]);
  const prepared = useMemo(() => inputs ? preparePolicyCoverage(inputs.base.bins, inputs.priority.references, applied.parameters, applied.pool) : null, [inputs, applied]);
  const result = useMemo(() => prepared ? allocatePolicyPriority(prepared, applied.weights) : null, [prepared, applied.weights]);
  const sensitivity = useMemo(() => prepared ? analyzePolicySensitivity(prepared, applied.weights) : null, [prepared, applied.weights]);
  const mapBins = useMemo(() => inputs?.base.bins.filter(point => !applied.parameters.district || point.district === applied.parameters.district) ?? [], [inputs, applied.parameters.district]);
  if (loadError) return <section className="policy-panel" role="alert"><h2>{t('政策優先資料無法載入', 'Policy-priority data unavailable')}</h2><p>{t('來源版本、座標或格式不相容；不使用替代資料產生建議。可重試或切回模式 A。', 'The source versions, coordinates or schema are incompatible. No substitute recommendations are generated; retry or return to Mode A.')}</p><button type="button" onClick={() => setRetry(value => value + 1)}>{t('重試政策資料', 'Retry policy data')}</button></section>;
  if (!inputs || !prepared || !result || !sensitivity) return <p role="status">{t('載入政策優先研究快照中…', 'Loading policy-priority research snapshot…')}</p>;
  const { base, priority } = inputs;
  const districts = [...new Set(priority.references.map(point => point.district))].sort();
  const edited = JSON.stringify(draft) !== JSON.stringify(applied.parameters) || POLICY_CATEGORIES.some(key => weightsDraft[key] !== String(applied.weights[key])) || poolDraft !== applied.pool;
  const equal = sensitivity.scenarios.find(scenario => scenario.id === 'equal')!.result;
  const proposed = sensitivity.scenarios.find(scenario => scenario.id === 'proposed')!.result;
  const briefing = priorityBriefing(priority, result, sensitivity, applied.generatedAt);
  const coverageScore = priorityCoverageScores(result);
  const update = <K extends keyof PolicyParameters>(key: K, value: PolicyParameters[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  const optionalNumber = (value: string) => value === '' ? null : Number(value);
  const scenarioLabel = (id: string) => {
    if (id === 'equal') return t('A. 類別等優先', 'A. Equal category priorities');
    if (id === 'proposed') return t('B. 文件預設政策權重', 'B. Documented policy defaults');
    if (id === 'active') return t('目前套用權重', 'Active weights');
    const [category, factor] = id.split(':');
    return `${categoryLabel(category as typeof POLICY_CATEGORIES[number], language)} ${factor === '0.75' ? '−25%' : '+25%'}`;
  };
  return <article className="bin-policy bulky-dashboard priority-dashboard">
    <header><h2>{t('政策優先配置研究', 'Policy Priority Allocation Study')}</h2><p>{t('以類別平衡覆蓋，評估值得安排現勘的公共服務缺口。這不是政府核定配置或需求預測。', 'Use category-balanced coverage to screen gaps worth field review, not government-approved siting or demand prediction.')}</p></header>
    {offline && <p className="policy-panel" role="status">{t('目前離線：使用先前快取的研究快照，無法確認來源目前狀態。', 'Offline: using previously cached research data; current source status cannot be confirmed.')}</p>}
    <section className="policy-panel" id="priority-objective">
      <h3>{t('政策目標與研究界線', 'Policy objective & boundaries')}</h3>
      <p>{t('依 2026 年 8 月 10 日政策脈絡，檢視商圈、攤販集中場、市場、觀光與交通公共活動場所。4／4／3／3／2／1 是分析假設，不是官方係數，也不表示四倍垃圾量。', 'Study commercial, vendor, market, tourism and transport activity locations in the August 10, 2026 policy context. The 4/4/3/3/2/1 priorities are assumptions, not official coefficients or four times the waste volume.')}</p>
      <p><a href="https://www.gov.taipei/News_Content.aspx?n=F0DDAF49B89E9413&s=798A998A29BE46CD" target="_blank" rel="noreferrer">{t('官方政策背景', 'Official policy context')}</a> · <a href="https://laws.gov.taipei/Law/LawSearch/LawArticleContent/FL076512" target="_blank" rel="noreferrer">{t('歷史程序已於 2022 年停止適用', 'Historical procedure stopped in 2022')}</a></p>
      <p className="policy-caution">{t('本模式使用待審查的研究資料，不取代已發布基線。景點或市場中心不是設箱點，捷運站中心不是出入口；最小距離僅為分析假設，不是現行法律要求。', 'This mode uses review-required research data without replacing the published baseline. POI or market centres are not installation sites; station centres are not entrances. Minimum separation is an assumption, not a current legal requirement.')}</p>
      <p><code>{POLICY_METHOD}</code> · <code>{WEIGHT_CONFIGURATION}</code></p>
    </section>

    <section className="policy-panel" id="priority-controls"><h3>{t('類別權重與配置情境', 'Category weights & allocation scenario')}</h3>
      <p>{t('增益 = Σ（類別權重 × 本次新增覆蓋數 ÷ 該類別固定有效母體數）。母體包含已覆蓋位置，整個情境不變。缺漏類別不計分，也不把其權重分配給其他類別。', 'Gain = Σ(category weight × newly covered entities / fixed eligible category population). Denominators include baseline-covered entities and stay fixed. Missing categories contribute no term and their weights are not redistributed.')}</p>
      <form onSubmit={event => {
        event.preventDefault();
        try {
          const weights = validatePriorityWeights(Object.fromEntries(POLICY_CATEGORIES.map(key => [key, weightsDraft[key].trim() === '' ? NaN : Number(weightsDraft[key])])));
          preparePolicyCoverage([], [], draft, poolDraft);
          setApplied({ parameters: { ...draft }, weights, pool: poolDraft, generatedAt: new Date().toISOString() }); setParameterError(false);
        } catch { setParameterError(true); }
      }}>
        <div className="priority-weight-grid">{POLICY_CATEGORIES.map(category => {
          const coverage = result.categories.find(row => row.category === category)!;
          return <label key={category}>{categoryLabel(category, language)}<input aria-label={`${t('權重', 'Weight')}: ${categoryLabel(category, language)}`} type="number" step="any" min={WEIGHT_BOUNDS.min} max={WEIGHT_BOUNDS.max} required value={weightsDraft[category]} onChange={event => setWeightsDraft(previous => ({ ...previous, [category]: event.target.value }))}/><small>{coverage.available ? `${t('本區有效母體', 'Eligible area population')}: ${coverage.denominator}${coverage.sparse ? ` · ${t('樣本稀少', 'Sparse sample')}` : ''}` : t('本區無可用資料；不是零需求', 'Unavailable in this area; not zero demand')}</small></label>;
        })}</div>
        <button className="priority-reset" type="button" onClick={() => setWeightsDraft(weightStrings())}>{t('重設文件預設權重', 'Reset documented default weights')}</button>
        <div className="bulky-filters priority-parameters">
          <label>{t('分析行政區', 'Analysis district')}<select aria-label={t('分析行政區', 'Analysis district')} value={draft.district} onChange={event => update('district', event.target.value)}><option value="">{t('全臺北市', 'All Taipei')}</option>{districts.map(district => <option key={district}>{district}</option>)}</select></label>
          <label>{t('直線半徑（公尺）', 'Straight-line radius (m)')}<select aria-label={t('直線半徑（公尺）', 'Straight-line radius (m)')} value={draft.radius} onChange={event => update('radius', Number(event.target.value))}>{[200, 300, 500].map(radius => <option key={radius}>{radius}</option>)}</select></label>
          <label>{t('新增箱數上限', 'Additional bin limit')}<input type="number" required min="0" max="50" value={draft.count} onChange={event => update('count', Number(event.target.value))}/></label>
          <label>{t('每箱假設成本（NT$）', 'Illustrative unit cost (NT$)')}<input type="number" min="1" value={draft.unitCost ?? ''} onChange={event => update('unitCost', optionalNumber(event.target.value))}/></label>
          <label>{t('假設預算（NT$）', 'Illustrative budget (NT$)')}<input type="number" min="0" value={draft.budget ?? ''} onChange={event => update('budget', optionalNumber(event.target.value))}/></label>
          <label>{t('距既有箱最小距離（分析假設，公尺）', 'Minimum distance from listed bins (assumption, m)')}<input type="number" required min="0" max="1000" value={draft.separation} onChange={event => update('separation', Number(event.target.value))}/></label>
          <label>{t('現勘參考錨點來源', 'Field-review anchor pool')}<select aria-label={t('現勘參考錨點來源', 'Field-review anchor pool')} value={poolDraft} onChange={event => setPoolDraft(event.target.value as CandidatePool)}><option value="transport">{t('公車站位與捷運站參考位置', 'Bus and MRT reference anchors')}</option><option value="bus_only">{t('僅既有公車站位', 'Existing bus references only')}</option></select></label>
          <button type="submit">{t('執行政策情境', 'Run policy scenario')}</button>
        </div>
      </form>
      {edited && <p role="status">{t('條件已編輯；結果仍為上次套用的情境，請執行後再比較。', 'Assumptions edited; results still show the last applied scenario. Run before comparing.')}</p>}
      {parameterError && <p role="alert">{t('請輸入完整且有限的有效值；權重範圍為 0–10，不會自動修正。', 'Enter complete finite values. Weights must be within 0–10; invalid values are not silently corrected.')}</p>}
      {draft.budget !== null && draft.unitCost === null && <p>{t('未填每箱成本，預算限制尚未啟用。成本不含維護、清運與工程。', 'Budget is not applied without unit cost. Cost excludes maintenance, collection and civil works.')}</p>}
    </section>

    <section className="policy-panel" id="priority-coverage"><h3>{t('基線與新增類別覆蓋', 'Baseline & incremental category coverage')}</h3>
      <p>{t('類別平衡覆蓋（目前套用權重）：基線', 'Category-balanced coverage (active weights): baseline')} {number(coverageScore.baseline)} → {t('新增情境', 'addition scenario')} {number(coverageScore.post)}.</p>
      <div className="dashboard-cards">{[[t('政策優先新增分數', 'Incremental policy-priority score'), number(result.incrementalScore)], [t('未加權新增參考實體', 'Unweighted newly covered entities'), result.incrementalCoverage], [t('現勘錨點數', 'Field-review anchors'), result.selected.length], [t('有效參考實體', 'Eligible reference entities'), result.referenceCount]].map(([label, value]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p data-testid="priority-score-unit">{t('分數是類別平衡覆蓋，不是服務人數、垃圾減量、棄置預測或官方施政成效。不同模式的分數不能直接比較。', 'Scores measure category-balanced coverage, not persons served, waste reduction, dumping prediction or official policy effectiveness. Scores across modes are not comparable.')}</p>
      <div className="priority-table-scroll" role="region" aria-label={t('類別覆蓋表', 'Category coverage table')} tabIndex={0}><table><thead><tr>{[t('類別', 'Category'), t('套用權重', 'Applied weight'), 'N', t('基線覆蓋', 'Baseline covered'), t('基線缺口', 'Baseline uncovered'), t('新增覆蓋', 'Newly covered'), t('新增分數貢獻', 'Score contribution')].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{result.categories.map(row => <tr key={row.category}><th>{categoryLabel(row.category, language)}{!row.available && <small> · {t('無可用母體', 'Unavailable')}</small>}{row.sparse && <small> · {t('稀少', 'Sparse')}</small>}</th><td>{row.weight}</td><td>{row.denominator}</td><td>{row.baselineCovered}</td><td>{row.baselineUncovered}</td><td>{row.newlyCovered}</td><td>{row.available ? number(row.contribution) : '—'}</td></tr>)}</tbody></table></div>
      <p>{t('原始 POI 數不等於使用人數。稀少樣本 N<5、缺漏資料與涵蓋範圍不完整會限制解讀；權重 0 是不給此類優先分數，不代表沒有需求。', 'Published POI counts are not people. Sparse N<5, missing data and incomplete scope limit interpretation. A zero weight removes priority contribution, not real-world demand.')}</p>
    </section>

    <section id="priority-map"><h3>{t('空間分布與服務缺口', 'Geographic coverage & gaps')}</h3><p>{t('綠點：既有箱；灰點：政策參考實體；編號方塊：須現勘的交通錨點。只有後者是候選錨點，沒有核准設置點。', 'Green: listed bins; grey: policy references; numbered squares: transport anchors requiring field review. No approved installation sites are shown.')}</p><BinPolicyMap bins={mapBins} references={prepared.references} candidates={result.selected} language={language} referenceLabel={t('政策參考實體（灰色點）', 'Policy reference entities (grey points)')} referenceNote={t('來源支持的公共活動參考實體；不是人流或需求量。', 'Source-backed public-activity reference entity, not footfall or waste demand.')}/></section>

    <section className="policy-panel" id="priority-candidates"><h3>{t('建議現勘錨點與理由', 'Field-review candidates & explanations')}</h3>
      {!result.selected.length && <p role="status">{t('此情境沒有正增益候選點。可能受零權重、資料缺漏、已覆蓋、箱數、距離或預算限制；不補造建議。', 'No positive-gain candidates under these weights, data, coverage, count, separation or budget assumptions. No suggestions are fabricated.')}</p>}
      <ol className="policy-candidate-list">{result.selected.map((candidate, index) => {
        const stability = sensitivity.rankings.find(row => row.id === candidate.point.id);
        return <li key={candidate.point.id}><h4>{index + 1}. {candidate.point.name} <small>{candidate.point.district}</small></h4><p>{t('須現勘，不是核准設置位置', 'Field review required; not approved siting')} · <code>{candidate.point.id}</code></p>
          <p>{t('本步新增分數', 'Incremental score')}: {number(candidate.incrementalScore)} · {t('未加權新增實體', 'Raw newly covered entities')}: {candidate.incrementalCoverage}</p>
          <ul>{POLICY_CATEGORIES.filter(category => candidate.contributions[category].newlyCovered > 0).map(category => { const contribution = candidate.contributions[category]; return <li key={category}>{categoryLabel(category, language)}: {contribution.weight} × {contribution.newlyCovered} / {contribution.denominator} = {number(contribution.score)}</li>; })}</ul>
          <p>{t('最近既有箱直線距離', 'Nearest listed bin, straight line')}: {candidate.nearestBinMeters === null ? t('未知', 'Unknown') : `${number(candidate.nearestBinMeters)} m`} · {t('敏感度情境入選', 'Selected in sensitivity scenarios')}: {stability?.selectedScenarios ?? 0}/{stability?.totalScenarios ?? 0}</p>
          <details><summary>{t('來源、覆蓋證據與現勘要求', 'Sources, coverage evidence & field checks')}</summary><p>{candidate.point.latitude}, {candidate.point.longitude} · {candidate.point.precision}</p><p>{candidate.point.sourceId} · {candidate.point.sourceRecord} · {candidate.point.sourceVersion}</p><p>{t('本步新增實體 ID', 'New entity IDs')}: {candidate.newlyCoveredIds.join(', ')}</p><p>{t('附近既有箱（本半徑內）', 'Listed bins within the radius')}: {candidate.nearbyListedBins.map(bin => `${bin.id} (${number(bin.meters)}m)`).join(', ') || t('來源未見', 'None listed')}</p><p>{t('確認目前設施、土地權管、行人淨寬、障礙物、商家居民影響及清運能力；原始座標可能是站體中心，不是人行道。', 'Verify current facilities, jurisdiction, pedestrian clearance, obstacles, residents/businesses and collection capacity. Source coordinates may be station centres rather than sidewalks.')}</p></details>
        </li>;
      })}</ol>
    </section>

    <section className="policy-panel" id="priority-sensitivity"><h3>{t('權重敏感度：同來源、同半徑與同預算', 'Weight sensitivity: same sources, radius & budget')}</h3>
      <div className="policy-comparison">{[{ id: 'equal', result: equal }, { id: 'proposed', result: proposed }, { id: 'active', result }].map(scenario => <article key={scenario.id}><h4>{scenarioLabel(scenario.id)}</h4><p>{t('新增分數', 'Incremental score')}: {number(scenario.result.incrementalScore)} · {t('未加權新增', 'Raw gain')}: {scenario.result.incrementalCoverage}</p><ol>{scenario.result.selected.slice(0, 5).map(candidate => <li key={candidate.point.id}>{candidate.point.name}</li>)}</ol></article>)}</div>
      <p>{t('各可用類別從文件預設權重單獨上下調整 25%，其他權重不變。另列目前自訂權重。分數尺度隨權重改變；請看候選順位與各類貢獻，不把較高分數稱為成效改善。', 'Each available category varies individually ±25% around documented defaults while others stay fixed; active custom weights are also shown. Weight changes alter the score scale: compare rankings and category contributions, not policy effectiveness.')}</p>
      <details><summary>{t('查看完整情境順位與類別分數', 'Inspect all scenario rankings and category scores')}</summary>
        <div className="priority-table-scroll" role="region" aria-label={t('敏感度順位表', 'Sensitivity rankings table')} tabIndex={0}><table><thead><tr><th>{t('候選錨點', 'Candidate anchor')}</th>{sensitivity.scenarios.map(scenario => <th key={scenario.id}>{scenarioLabel(scenario.id)}</th>)}<th>{t('未入選次數', 'Omitted scenarios')}</th></tr></thead><tbody>{sensitivity.rankings.map(row => <tr key={row.id}><th><code>{row.id}</code></th>{row.ranks.map(rank => <td key={rank.scenario}>{rank.rank ?? '—'}</td>)}<td>{row.omittedScenarios}</td></tr>)}</tbody></table></div>
        {sensitivity.scenarios.map(scenario => <details key={scenario.id}><summary>{scenarioLabel(scenario.id)}</summary><ol>{scenario.result.selected.map(candidate => <li key={candidate.point.id}>{candidate.point.name} · {number(candidate.incrementalScore)}<ul>{POLICY_CATEGORIES.filter(category => candidate.contributions[category].newlyCovered > 0).map(category => <li key={category}>{categoryLabel(category, language)}: {number(candidate.contributions[category].score)}</li>)}</ul></li>)}</ol></details>)}
      </details>
      <p>{t('「—」表示未入選，不是名次不變；缺漏與小母體會降低判讀把握，不額外宣稱候選點穩健。', '“—” means not selected, not an unchanged rank. Missing and sparse populations limit interpretation; no additional robustness claim is made.')}</p>
    </section>

    <section className="policy-panel" id="priority-briefing"><h3>{t('決策摘要與可重現匯出', 'Decision briefing & reproducible export')}</h3>
      <p>{applied.parameters.district || t('全臺北市', 'All Taipei')} · {applied.parameters.radius}m · {t('基線覆蓋', 'Baseline covered')} {result.baselineCovered}/{result.referenceCount} → {result.postCovered}/{result.referenceCount} · {t('現勘錨點', 'Field anchors')} {result.selected.length}.</p>
      <p>{t('建議先檢查缺漏類別、來源年代及敏感度，再安排現場調查。現有資料不包含人流、垃圾量、人行網路、合法設置空間或完整維運成本，不能推估政策實施效果。', 'Review missing categories, source age and sensitivity before field surveys. Footfall, waste volume, walking networks, legal siting space and full operating costs are absent; implementation effects cannot be estimated.')}</p>
      <p><code>{priority.snapshotId}</code> · {t('既有箱快照', 'Bin baseline')}: <code>{base.snapshotId}</code> · {t('公車版本', 'Bus version')}: <code>{priority.busSourceVersion}</code></p>
      <p>{t('情境產生時間', 'Scenario generated at')}: {applied.generatedAt} · {t('假設安裝總成本', 'Illustrative installation cost')}: {result.illustrativeCost === null ? t('未提供', 'Not supplied') : `NT$ ${number(result.illustrativeCost)}`}</p>
      <div className="policy-actions"><button type="button" onClick={() => download(JSON.stringify(briefing, null, 2), 'bin-policy-priority-briefing.json', 'application/json')}>{t('匯出政策摘要 JSON', 'Export policy briefing JSON')}</button><button type="button" onClick={() => download(priorityCsv(priority, result, sensitivity, applied.generatedAt), 'bin-policy-priority-report.csv', 'text/csv;charset=utf-8')}>{t('匯出政策分析 CSV', 'Export policy analysis CSV')}</button><button type="button" onClick={() => window.print()}>{t('列印政策摘要', 'Print policy briefing')}</button></div>
    </section>

    <details className="policy-panel" id="priority-sources"><summary>{t('研究資料健康、類別缺漏與來源版本', 'Research data health, missing categories & source versions')}</summary>
      <p>{t('所有新增政策來源均待技術審查；擷取或驗證成功不代表核准發布、即時資料或現場可設置。', 'New policy sources remain review-required. Retrieval or validation does not imply publication approval, live data or siting feasibility.')}</p>
      <p>{t('研究快照的空間與契約驗證時間', 'Research snapshot spatial and contract validation')}: {priority.analysisValidatedAt ?? t('未知', 'Unknown')}</p>
      <ul>{POLICY_CATEGORIES.map(category => <li key={category}>{categoryLabel(category, language)} · {priority.categoryStatus[category].status === 'available' ? t('有可用來源', 'Source available') : t('來源缺漏／不可空間分析', 'Missing / not spatially eligible')}<p>{priority.categoryStatus[category].reason}</p></li>)}</ul>
      {priority.sources.map(source => <details key={source.id}><summary>{source.name}</summary><p><a href={source.datasetUrl} target="_blank" rel="noreferrer">{source.provider}</a> · {source.resourceId}</p><p>{t('來源日期', 'Source date')}: {source.resourceUpdatedAt ?? t('未知', 'Unknown')} · {t('擷取', 'Retrieved')}: {source.fetchedAt} · {t('原檔封存檢查（非空間驗證）', 'Raw archive check (not spatial validation)')}: {source.validatedAt ?? t('未知', 'Unknown')}</p><p>{source.crs} · {source.caveat}</p><code>{source.sha256}</code></details>)}
    </details>
    <details className="policy-panel"><summary>{t('沿用的清潔箱對帳與公車來源比較', 'Retained bin reconciliation & bus source comparison')}</summary><BinPolicyGovernancePanels snapshot={base} language={language}/><BinPolicySourceComparisonPanel snapshot={base} language={language}/></details>
  </article>;
}
