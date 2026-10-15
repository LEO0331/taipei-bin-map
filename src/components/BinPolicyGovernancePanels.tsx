import { useEffect, useState } from 'react';
import type { Language } from '../types';
import type { PolicySnapshot } from '../lib/binPolicyData';
import { isReportObject, sourceIsStale, usePolicyReport } from '../lib/binPolicyReports';

const classes = {
  confirmed_match: ['已確認對應', 'Confirmed match'], probable_match: ['可能對應', 'Probable match'],
  historical_only: ['僅見於歷史快照', 'Historical only'], current_only: ['僅見於目前來源', 'Current only'],
  possible_location_change: ['可能位置變更', 'Possible location change'], ambiguous: ['多重關係待審', 'Ambiguous'],
  different_scope: ['不同涵蓋範圍', 'Different scope'], invalid_source_record: ['來源紀錄異常', 'Invalid source record'],
  unresolved: ['證據不足待釐清', 'Unresolved'],
} as const;

function downloadReport(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const objects = (data: Record<string, unknown> | null, field: string) =>
  Array.isArray(data?.[field]) ? data[field].filter(isReportObject) : [];

export function BinPolicyGovernancePanels({ snapshot, language }: { snapshot: PolicySnapshot; language: Language }) {
  const t = (cn: string, en: string) => language === 'zh' ? cn : en;
  const unknown = t('未知', 'Unknown');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const health = usePolicyReport('data-health.json', snapshot.snapshotId);
  const reconciliation = usePolicyReport('reconciliation.json', snapshot.snapshotId, reconciliationOpen);
  const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : unknown;
  const counts = isReportObject(reconciliation.data?.counts) ? reconciliation.data.counts : null;
  const sources = objects(health.data, 'sources');

  return <>
    <section id="policy-data-health" className="policy-panel policy-governance">
      <h3>{t('資料健康狀態', 'Data Health')}</h3>
      {!online && <p role="status">{t('目前離線：使用先前快取的快照；無法確認來源目前狀態。', 'Offline: using a previously cached snapshot; current source status cannot be confirmed.')}</p>}
      <p>{t('擷取成功不代表即時資料；日期分別代表不同事件，沒有證據時標示未知。', 'Successful retrieval does not make data live. Dates describe distinct events; missing evidence is unknown.')}</p>
      <p>{t('目前發布快照', 'Published snapshot')}: <code>{snapshot.snapshotId}</code> · {t('發布時間', 'Published at')}: {date(health.data?.published_at)} · {t('最後監測', 'Last checked')}: {date(health.data?.last_checked_at)}</p>
      {health.status === 'unavailable' && <p role="status">{t('健康報告未知、無法取得或與此快照不符；分析仍使用已驗證的既有快照，不推測新資料狀態。', 'Health is unknown, unavailable or incompatible with this snapshot. Analysis retains the validated snapshot without inferring new-source status.')}</p>}
      {snapshot.sources.map(source => {
        const record = sources.find(item => item.source_id === source.id && item.sha256 === source.sha256 && item.resource_id === source.resourceId);
        const stale = sourceIsStale(source.resourceUpdatedAt) === true;
        const statuses: Record<string, string> = { valid: t('驗證通過', 'Validated'), warning: t('需留意限制', 'Warning'), failed: t('驗證失敗', 'Failed'), unknown };
        return <details key={source.id}>
          <summary>{source.name} · {record && typeof record.validation_status === 'string' ? statuses[record.validation_status] ?? unknown : unknown}{stale ? ` · ${t('來源較舊', 'Dated source')}` : ''}</summary>
          <dl className="policy-health-dates">
            <dt>{t('來源發布／更新', 'Source updated at')}</dt><dd>{date(source.resourceUpdatedAt)}</dd>
            <dt>{t('此快照最後成功擷取', 'Last successful retrieval of this snapshot')}</dt><dd>{date(record?.retrieved_at ?? source.fetchedAt)}</dd>
            <dt>{t('最後成功驗證', 'Last successful validation')}</dt><dd>{date(record?.validated_at)}</dd>
            <dt>{t('最後監測', 'Last checked')}</dt><dd>{date(record?.last_checked_at)}</dd>
            <dt>{t('最後偵測變更', 'Last detected change')}</dt><dd>{date(record?.last_detected_change_at)}</dd>
          </dl>
          {stale && <p className="policy-caution">{t('此來源日期距今超過一年；這是篩選提醒，不是主管機關承諾的更新週期。近期下載不能消除此限制。', 'This source date is over one year old: a screening warning, not a publisher SLA. A recent download does not remove this limitation.')}</p>}
          <p>{source.crs}</p><p>{source.caveat}</p><p>{t('來源雜湊', 'Source hash')}: <code>{source.sha256}</code></p>
        </details>;
      })}
    </section>

    <section id="policy-reconciliation" className="policy-panel policy-governance">
      <h3>{t('清潔箱資料對帳', 'Bin Data Reconciliation')}</h3>
      <p>{t('舊地圖 1,197 筆、政策主檔 681 原始列與 679 有效去重位置使用不同版本與計數單位；差異不是撤除證明。', 'The older map has 1,197 records; the policy source has 681 raw rows and 679 valid unique positions. These are different versions and units, not proof of removals.')}</p>
      <p>{t('806 組／1,612 座為另行發布的總量說法；景點商圈附檔有 130 列地點，備註另列多個「處」，不是 130 座箱體，也不直接相加。', 'The separately published 806 groups / 1,612 bins aggregate is not a record inventory. The supplemental file has 130 named-place rows with multiple places in its notes, not 130 individual bins; totals are not added.')}</p>
      <details onToggle={event => setReconciliationOpen(event.currentTarget.open)}>
        <summary>{t('查看對帳分類、待釐清事項與匯出', 'View classifications, unresolved questions and exports')}</summary>
        {counts ? <>
        <div className="dashboard-cards">{Object.entries(classes).map(([key, labels]) => <article key={key}><span>{labels[language === 'zh' ? 0 : 1]}</span><strong>{typeof counts[key] === 'number' ? counts[key].toLocaleString('en-US') : unknown}</strong></article>)}</div>
        <p>{t('分類數是「對應關係」數，不等於清潔箱座數；多對多歧義關係可包含數筆原始紀錄。相近座標本身不證明同一設施。', 'Counts describe relationships, not physical bin units. An ambiguous relationship can contain multiple original records. Nearby coordinates alone do not establish identity.')}</p>
        <h4>{t('應向主管機關確認', 'Questions for the responsible agency')}</h4>
        <ul>{Array.isArray(reconciliation.data?.agencyQuestions) && reconciliation.data.agencyQuestions.filter((item): item is string => typeof item === 'string').map(question => <li key={question}>{question}</li>)}</ul>
        <p>{t('完整原始紀錄、配對理由、來源日期、門檻及待審清單均保留於對帳檔。', 'Original records, match evidence, source dates, thresholds and unresolved relationships remain in the audit files.')}</p>
        <div className="policy-actions">
          <button type="button" onClick={() => downloadReport(reconciliation.data, 'bin-reconciliation.json')}>{t('匯出對帳 JSON', 'Export reconciliation JSON')}</button>
          <a href={`${import.meta.env.BASE_URL}data/bin-policy/reconciliation.csv`} download>{t('下載詳細對帳 CSV', 'Download detailed audit CSV')}</a>
        </div>
        </> : <p role="status">{reconciliation.status === 'loading' ? t('載入對帳證據中…', 'Loading reconciliation evidence…') : t('對帳證據未知或與快照不符；未解釋差異仍保留待釐清，不自行判定已撤除。', 'Reconciliation evidence is unknown or incompatible; unexplained differences remain unresolved, not presumed removals.')}</p>}
      </details>
    </section>
  </>;
}
