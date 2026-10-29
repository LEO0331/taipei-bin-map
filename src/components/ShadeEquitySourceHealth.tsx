import { useId, useState } from 'react';
import type { Language } from '../types';
import type { ShadeEquitySource, ShadeEquitySuitability } from '../types/shadeEquity';

/** Translate audited interpretation notes; official source names and identifiers stay verbatim. */
export function shadeEvidenceText(text: string, language: Language): string {
  if (language !== 'zh') return text;
  const notes: Record<string, string> = {
    'Audited official sidewalk geometry inventory only; prioritized candidates and length-normalized comparisons disabled pending measurement review.': '目前僅提供已查核官方人行道幾何盤點；長度量測尚待審查，停用優先排序與每公里比較。',
    'Unverified sidewalk length measurement definition and units': '人行道長度量測定義與單位尚未驗證。',
    'Incomplete and temporally different official inventory extents': '官方盤點涵蓋不完整，且來源時間範圍不同。',
    'No segment-scale canopy or heat evidence': '缺乏區段尺度的實測樹冠或熱環境證據。',
    'Source-published coverage only; exclusions and missing sidewalk extent prevent citywide comparability': '僅涵蓋來源發布範圍；排除與缺漏的人行道範圍使全市比較不可行。',
    'EPSG:3826 (TWD97 / TM2 zone 121), metres': 'EPSG:3826（TWD97／TM2 中央經線 121 度），單位為公尺。',
    'EPSG:3826 (TWD97 / TM2 zone 121), projected metres; district.prj declares TWD_1997_TM_Taiwan': 'EPSG:3826（TWD97／TM2 中央經線 121 度），投影單位為公尺；區界 .prj 宣告 TWD_1997_TM_Taiwan。',
    'Audited SHP parser applies existing inverse TWD97-TM2 conversion to WGS84-compatible longitude/latitude before exact district containment; the source shapefile is not raw WGS84.': 'SHP 解析器先以既有 TWD97／TM2 反投影轉為 WGS84 相容經緯度，再做區界包含判斷；原始區界檔不是 WGS84 經緯度。',
    'Existing convertTwd97ToWgs84; projected coordinates retained for exact offline joins': '沿用 convertTwd97ToWgs84；保留投影座標進行精確離線空間關聯。',
    'Registered roadside trees are not measured canopy, shade coverage, heat exposure or verified physical absence.': '登錄行道樹不等於實測樹冠、遮蔭涵蓋、熱暴露或經證實的現場無樹。',
    'Tree-pit geometry and proximity do not establish vacancy, occupancy or planting feasibility.': '樹穴幾何與鄰近關係不能證明空穴、占用或種植可行性。',
    'Published sidewalk length definition and units have not been independently verified: all density denominators and segment priorities are unavailable.': '發布的人行道長度定義及單位尚未獨立驗證；所有密度分母與區段優先排序均不可用。',
    'Partial historical sidewalk geometry and different source periods do not establish comparable citywide or district coverage.': '部分歷史人行道幾何及不同來源期間，無法建立可比較的全市或行政區涵蓋。',
    'Canopy, pedestrian thermal exposure, survival, underground utilities and planting approvals are unavailable; no environmental risk score is produced.': '缺乏樹冠、行人熱暴露、存活、地下管線及種植許可證據，不產生環境風險分數。',
    'Context only; no sidewalk shade or tree-removal inference.': '僅供背景，不推導人行道遮蔭或移除樹木事件。',
    'WGS84 shapefile; exact retained original-byte hash': 'WGS84 Shapefile；保留原始位元組雜湊。',
    'Shared official administrative boundary geometry only; no bin-policy observations or algorithms reused.': '僅共用官方行政區界幾何，不混用垃圾箱政策觀察或演算法。',
    'Published length measurement definition and units require authoritative confirmation; density and prioritization disabled.': '發布的長度量測定義及單位仍需權威確認；停用密度與優先排序。',
    'Tree-pit geometry does not establish vacancy or occupation.': '樹穴幾何不能證明空穴或占用。',
    'Overlapping or multiple possible sidewalk associations require investigation.': '人行道關聯重疊或存在多個可能對象，需要查核。',
  };
  return notes[text] ?? text;
}

function CopyableIdentifier({ label, value, language }: { label: string; value: string | null | undefined; language: Language }) {
  const zh = language === 'zh';
  const [result, setResult] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try {
      if (!value || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setResult('copied');
    } catch { setResult('failed'); }
  };
  return <>
    <dt>{label}</dt>
    <dd>
      <div className="shade-source-copy-field">
        <code>{value ?? (zh ? '未知／未驗證' : 'Unknown / unverified')}</code>
        {value && <button type="button" aria-label={zh ? `複製${label}` : `Copy ${label}`} onClick={copy}>{zh ? '複製' : 'Copy'}</button>}
      </div>
      {result !== 'idle' && <span className="shade-source-copy-status" role="status">{result === 'copied'
        ? (zh ? `已複製${label}` : `Copied ${label}`)
        : (zh ? '無法自動複製，請選取文字手動複製。' : 'Automatic copying is unavailable; select the text and copy it manually.')}</span>}
    </dd>
  </>;
}

function SourceDetails({ source, language, status }: { source: ShadeEquitySource; language: Language; status: string }) {
  const zh = language === 'zh';
  const unknown = zh ? '未知／未驗證' : 'Unknown / unverified';
  const [technicalOpen, setTechnicalOpen] = useState(false);
  return <>
    <p className="shade-source-provider">{status} · {source.provider}</p>
    <a href={source.url} target="_blank" rel="noreferrer" aria-label={zh ? `查看${source.name}官方資料頁` : `View official dataset: ${source.name}`}>{zh ? '查看官方資料頁' : 'View official dataset'}</a>
    <dl className="shade-source-overview">
      <dt>{zh ? '原始／接受筆數' : 'Raw / accepted records'}</dt><dd>{source.rawCount ?? unknown} / {source.acceptedCount ?? unknown}</dd>
      <dt>{zh ? '重複／無效幾何／缺座標' : 'Duplicates / invalid geometry / missing coordinates'}</dt><dd>{source.duplicateCount ?? unknown} / {source.invalidGeometryCount ?? unknown} / {source.missingCoordinateCount ?? unknown}</dd>
      <dt>{zh ? '來源更新日期' : 'Source updated'}</dt><dd>{source.sourceUpdatedAt ?? unknown}</dd>
      <dt>{zh ? '擷取日期' : 'Retrieved'}</dt><dd>{source.retrievedAt ?? unknown}</dd>
      <dt>{zh ? '處理日期' : 'Processed'}</dt><dd>{source.processedAt ?? unknown}</dd>
      <dt>{zh ? '地理與時間涵蓋' : 'Geographic & temporal coverage'}</dt><dd>{shadeEvidenceText(source.geographicCoverage ?? unknown, language)} · {shadeEvidenceText(source.temporalCoverage ?? unknown, language)}</dd>
    </dl>
    {!!source.limitations?.length && <div className="shade-source-limitations"><h4>{zh ? '適用限制' : 'Limitations'}</h4><ul>{source.limitations.map((item, index) => <li key={index}>{shadeEvidenceText(item, language)}</li>)}</ul></div>}
    <details className="shade-source-technical" open={technicalOpen}>
      <summary aria-expanded={technicalOpen} onClick={event => { event.preventDefault(); setTechnicalOpen(value => !value); }}>{zh ? '技術資訊' : 'Technical information'}</summary>
      {technicalOpen && <dl className="shade-source-overview">
        <CopyableIdentifier label={zh ? '資料集 ID' : 'Dataset ID'} value={source.datasetId} language={language}/>
        <CopyableIdentifier label={zh ? '資源 ID' : 'Resource ID'} value={source.resourceId} language={language}/>
        <dt>{zh ? '座標系統與轉換' : 'CRS & transformation'}</dt><dd>{shadeEvidenceText(source.crs ?? unknown, language)} · {shadeEvidenceText(source.transformation ?? unknown, language)}</dd>
        <CopyableIdentifier label="SHA256" value={source.sha256} language={language}/>
      </dl>}
    </details>
  </>;
}

export function ShadeEquitySourceHealth({ sources, language }: { sources: ShadeEquitySource[]; language: Language }) {
  const zh = language === 'zh';
  const [openSourceId, setOpenSourceId] = useState<string | null>(null);
  const id = useId();
  const status: Record<ShadeEquitySuitability, string> = zh
    ? { verified_analysis: '已驗證可分析', context_only: '僅供背景', limited: '有限可用', unavailable: '無法使用', excluded: '已排除' }
    : { verified_analysis: 'Verified for analysis', context_only: 'Context only', limited: 'Limited', unavailable: 'Unavailable', excluded: 'Excluded' };
  const unknown = zh ? '未知／未驗證' : 'Unknown / unverified';
  return <section aria-label={zh ? '官方資料來源' : 'Official data sources'}>
    <h3>{zh ? '官方資料來源與適用性' : 'Official sources & suitability'}</h3>
    <p>{zh ? '來源更新、擷取及處理日期各有不同意義。取得原檔不代表已通過空間分析審查；未知筆數不當作零。' : 'Source update, retrieval and processing dates have distinct meanings. Downloading bytes does not imply spatial approval; unknown counts are not zero.'}</p>
    <div className="shade-source-list">{sources.map((source, index) => {
      const open = openSourceId === source.id;
      const headerId = `${id}-source-${index}-header`, panelId = `${id}-source-${index}-panel`;
      const date = source.sourceUpdatedAt && Number.isFinite(Date.parse(source.sourceUpdatedAt)) ? source.sourceUpdatedAt.slice(0, 10) : null;
      return <details className="shade-source-card shade-source-accordion" key={source.id} open={open}>
        <summary className="shade-source-header" id={headerId} aria-expanded={open} aria-controls={panelId} onClick={event => { event.preventDefault(); setOpenSourceId(current => current === source.id ? null : source.id); }}>
          <span className="shade-source-heading"><span className="shade-source-name">{source.name}</span><span className="shade-source-badge" data-status={source.suitability}>{status[source.suitability]}</span></span>
          <span className="shade-source-updated">{zh ? '來源更新：' : 'Updated: '}{date ? <time dateTime={source.sourceUpdatedAt!}>{date}</time> : unknown}</span>
        </summary>
        <div className="shade-source-body" id={panelId} role="region" aria-labelledby={headerId} hidden={!open}>{open && <SourceDetails source={source} language={language} status={status[source.suitability]}/>}</div>
      </details>;
    })}</div>
  </section>;
}
