import { useState } from 'react';
import type { PolicySnapshot } from '../lib/binPolicyData';
import { isReportObject, usePolicyReport } from '../lib/binPolicyReports';
import type { Language } from '../types';

export function BinPolicySourceComparisonPanel({ snapshot, language }: { snapshot: PolicySnapshot; language: Language }) {
  const t = (cn: string, en: string) => language === 'zh' ? cn : en;
  const [open, setOpen] = useState(false);
  const comparison = usePolicyReport('bus-source-comparison.json', snapshot.snapshotId, open);
  const impact = usePolicyReport('bus-decision-impact.json', snapshot.snapshotId, open);
  const stats = isReportObject(comparison.data?.statistics) ? comparison.data.statistics : null;
  const impactStats = isReportObject(impact.data?.statistics) ? impact.data.statistics : null;
  const versions = isReportObject(comparison.data?.sourceVersions) ? comparison.data.sourceVersions : null;
  const params = isReportObject(impact.data?.parameters) ? impact.data.parameters : null;
  const metric = (row: unknown, key: string) => isReportObject(row) && typeof row[key] === 'number' ? row[key].toLocaleString('en-US', { maximumFractionDigits: 1 }) : t('未知', 'Unknown');
  return <section id="policy-bus-versions" className="policy-panel policy-governance">
    <h3>{t('公車來源版本與敏感度比較', 'Bus Source Versions & Sensitivity')}</h3>
    <p>{t('預設仍為已稽核的 2021 年公車參考點。較新來源僅供版本審查，不自動切換或混合參考母體。', 'The audited 2021 bus references remain the default. The newer source is a review proposal, not an automatic switch or a mixed reference population.')}</p>
    <details onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>{t('查看新舊來源及同參數決策差異', 'Review sources and same-parameter decision differences')}</summary>
      <p className="policy-caution">{t('這是資料版本敏感度，不是政策介入效果；覆蓋百分比不同不代表施政改善或惡化。站位、站群、方向月臺與唯一座標不是同一單位。', 'This is data-version sensitivity, not an intervention effect. Percentage changes do not show policy improvement or deterioration. Stops, stations, directional platforms and unique coordinates are different units.')}</p>
      {stats ? <div className="policy-comparison">{(['old', 'proposed'] as const).map(key => {
        const version = isReportObject(versions?.[key]) ? versions[key] : null;
        return <article key={key}><h4>{key === 'old' ? t('已發布的 2021 來源', 'Published 2021 source') : t('較新來源：待審查', 'Newer source: review required')}</h4>
          <p>{t('版本', 'Version')}: <code>{typeof version?.versionId === 'string' ? version.versionId : t('未知', 'Unknown')}</code></p>
          <p>{t('有效參考位置', 'Valid reference locations')}: {metric(stats[key], 'referenceCount')}</p>
          <p>{t('比較範圍內參考點', 'References in comparison area')}: {metric(impactStats?.[key], 'referenceCount')}</p>
          <p>{t('基線覆蓋', 'Baseline covered')}: {metric(impactStats?.[key], 'baselineCovered')} ({metric(impactStats?.[key], 'baselineCoveragePercent')}%)</p>
          <p>{t('新增情境覆蓋', 'Addition-scenario coverage')}: {metric(impactStats?.[key], 'postCovered')}</p>
        </article>;
      })}</div> : <p role="status">{t('來源比較證據尚未取得或與快照不相容；不推測新來源優劣。', 'Source comparison is unavailable or incompatible; no source superiority is inferred.')}</p>}
      {params && <p>{t('固定審查情境（不隨上方情境表單變動）', 'Fixed review scenario (independent of the interactive form)')}: {String(params.district ?? '')} · {String(params.radius ?? '')} m · {t('新增上限', 'Addition limit')} {String(params.count ?? '')} · {t('距既有箱最小距離', 'Minimum separation')} {String(params.separation ?? '')} m</p>}
      <p>{t('跨來源 ID 命名空間尚未證實一致；地理相近配對僅是查核線索，未對應不等於站位撤除。完整座標位移、順位與行政區比較見匯出。', 'Shared ID namespaces have not been established. Spatial matches are review leads; missing counterparts are not confirmed closures. Full spatial, ranking and district comparisons are in the reports.')}</p>
      <div className="policy-actions">{['bus-source-comparison', 'bus-decision-impact'].map((name, i) => <a key={name} href={`${import.meta.env.BASE_URL}data/bin-policy/${name}.json`} download>{i === 0 ? t('下載來源比較 JSON', 'Download source comparison JSON') : t('下載決策敏感度 JSON', 'Download decision sensitivity JSON')}</a>)}</div>
    </details>
  </section>;
}
