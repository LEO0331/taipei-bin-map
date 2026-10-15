import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import Papa from 'papaparse';
import iconv from 'iconv-lite';
import { normalizeBinAddress, reconcileBinRecords, reconciliationClasses, type ReconciliationInput, type ReconciliationReport, type ReconciliationSource } from '../src/lib/binPolicyReconciliation';

const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
export const touristResource = {
  id: 'bins-tourist-commercial', resourceId: '2030d728-9597-437d-81a4-cf2a44c7f114',
  name: '行人專用清潔箱總表（景點商圈周邊130點）', source_updated_at: '2026-08-18T16:27:22+08:00',
  datasetUrl: 'https://data.taipei/dataset/detail?id=a835f3ba-7f50-4b0d-91a6-9df128632d1c',
  downloadUrl: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=2030d728-9597-437d-81a4-cf2a44c7f114',
};
const rawDirectory = resolve('data/raw/bin-policy-reconciliation');
const supplementalPath = join(rawDirectory, 'tourist-commercial.csv');
const metadataPath = join(rawDirectory, 'tourist-commercial.source.json');

/** Explicit one-time audit retrieval; never modifies the approved policy input. */
export async function fetchReconciliationSupplement() {
  const response = await fetch(touristResource.downloadUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Supplement retrieval HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100 || bytes.length > 1_000_000) throw new Error('Unexpected supplemental payload size');
  // Refuse silent replacement: a changed resource needs a new audited raw revision.
  if (existsSync(supplementalPath) && sha(readFileSync(supplementalPath)) !== sha(bytes)) throw new Error('Supplement content changed: create a reviewed version before replacement');
  mkdirSync(rawDirectory, { recursive: true });
  if (!existsSync(supplementalPath)) {
    writeFileSync(supplementalPath, bytes);
    writeFileSync(metadataPath, JSON.stringify({ ...touristResource, retrieved_at: new Date().toISOString(), sha256: sha(bytes), bytes: bytes.length, httpLastModified: response.headers.get('last-modified'), metadataVerifiedAt: '2026-10-15', encoding: 'CP950', scope: 'tourist-commercial-resource-unconfirmed-overlap', licenseUrl: 'https://data.gov.tw/license' }, null, 2) + '\n');
  }
}

export function buildBinReconciliation(options: { nearMeters?: number; locationChangeMeters?: number } = {}): ReconciliationReport {
  const policy = JSON.parse(readFileSync(resolve('public/data/bin-policy/analysis.json'), 'utf8'));
  const oldBytes = readFileSync(resolve('public/data/pedestrian-bins.json'));
  const old = JSON.parse(oldBytes.toString('utf8')) as Array<Record<string, unknown>>;
  const oldMeta = JSON.parse(readFileSync(resolve('public/data/bins.metadata.json'), 'utf8'));
  const binSource = policy.sources.find((s: { id: string }) => s.id === 'bins');
  const currentBytes = readFileSync(resolve(`data/raw/bin-policy/${policy.snapshotId}/bins-current.csv`));
  if (sha(currentBytes) !== binSource.sha256) throw new Error('Policy raw source hash mismatch');
  const parse = (bytes: Buffer) => {
    const parsed = Papa.parse<Record<string, string>>(iconv.decode(bytes, 'cp950'), { header: true, skipEmptyLines: true, transformHeader: s => s.replace(/^\uFEFF/, '').trim(), transform: s => s.trim() });
    if (parsed.errors.length || !['行政區', '地址', '經度', '緯度'].every(h => parsed.meta.fields?.includes(h))) throw new Error('Reconciliation CSV schema mismatch');
    return parsed.data;
  };
  const rows = parse(currentBytes);
  const historical: ReconciliationInput[] = old.map((row, index) => ({ id: `historical:${index + 1}`, sourceId: 'historical-map', scope: 'pedestrian-bin-main', district: String(row.district ?? ''), address: String(row.address ?? ''), longitude: Number(row.longitude), latitude: Number(row.latitude), raw: row }));
  const current: ReconciliationInput[] = rows.map((row, index) => ({ id: `current:${index + 2}`, sourceId: 'bins', scope: 'pedestrian-bin-main', district: row['行政區'], address: row['地址'], longitude: row['經度'] ? Number(row['經度']) : NaN, latitude: row['緯度'] ? Number(row['緯度']) : NaN, raw: row }));
  const supplementalBytes = readFileSync(supplementalPath), supplementalMeta = JSON.parse(readFileSync(metadataPath, 'utf8'));
  if (sha(supplementalBytes) !== supplementalMeta.sha256) throw new Error('Supplement hash mismatch');
  const supplementalRows = parse(supplementalBytes);
  const supplemental: ReconciliationInput[] = supplementalRows.map((row, index) => ({ id: `tourist:${index + 2}`, sourceId: touristResource.id, scope: 'tourist-commercial-resource-unconfirmed-overlap', district: row['行政區'], address: row['地址'], longitude: row['經度'] ? Number(row['經度']) : NaN, latitude: row['緯度'] ? Number(row['緯度']) : NaN, raw: row }));
  const records = reconcileBinRecords(historical, [...current, ...supplemental], options);
  const counts = Object.fromEntries(reconciliationClasses.map(c => [c, records.filter(r => r.classification === c).length])) as ReconciliationReport['counts'];
  const sources: ReconciliationSource[] = [
    { id: 'historical-map', name: 'Original public facilities snapshot', source_updated_at: null, retrieved_at: null, sha256: sha(oldBytes), recordCount: old.length, unit: 'published map rows, not physical bins', scope: 'pedestrian-bin-main', transformed_at: oldMeta.generatedAt, sourceMetadata: oldMeta, resourceId: null, stableIdentifierAvailable: false },
    { ...binSource, id: 'bins', source_updated_at: binSource.resourceUpdatedAt, retrieved_at: binSource.fetchedAt, recordCount: rows.length, unit: 'CSV rows; policy deduplicates validated coordinates', scope: 'pedestrian-bin-main', stableIdentifierAvailable: false },
    { ...supplementalMeta, recordCount: supplementalRows.length, unit: 'named-place rows; notes describe multiple 處, not verified physical bins', stableIdentifierAvailable: false, sourceNotePlaceCount: supplementalRows.reduce((sum, row) => sum + (/^\d+處$/.test(row['備註']) ? Number(row['備註'].replace('處', '')) : 0), 0) },
  ];
  const nearMeters = options.nearMeters ?? 25, locationChangeMeters = options.locationChangeMeters ?? 50;
  const methodology = { version: 'conservative-one-to-one-bin-reconciliation-v1', nearMeters, locationChangeMeters, identityRules: ['verified namespaced official ID if present', 'normalized address AND source district; unique pairs only', 'exact/proximate coordinates provide review leads only without identity evidence', 'no operational removal/addition inference', 'separate tourist/commercial scope: no additive inventory assumption'] };
  const reportId = `reconcile-v1-${sha(JSON.stringify({ hashes: sources.map(s => s.sha256), methodology, records })).slice(0, 12)}`;
  const unresolvedRecords = records.filter(r => !['confirmed_match', 'probable_match'].includes(r.classification));
  return { schemaVersion: 1, reportId, generatedAt: new Date().toISOString(), policySnapshotId: policy.snapshotId, sources, methodology, counts, records, unresolvedRecords, sourceRecords: [...historical, ...current, ...supplemental],
    statisticalDefinitionDifferences: [
      `Historical map: ${old.length} published rows; original resource publication date unknown; generatedAt is transformation time only.`,
      `Current main resource: ${rows.length} CSV rows; ${policy.quality.validBins} validated unique coordinates; ${policy.quality.duplicateBins} coordinate duplicate and ${policy.quality.excluded.filter((e: { source: string }) => e.source === 'bins').length} excluded bin record(s).`,
      `Separate tourist/commercial resource: ${supplementalRows.length} rows; not automatically additive. ${supplemental.filter(s => current.some(c => s.district === c.district && normalizeBinAddress(s.address) === normalizeBinAddress(c.address))).length} rows share a normalized district/address with main resource; overlap does not establish scope or identity.`,
      `All ${supplementalRows.filter(row => /^\d+處$/.test(row['備註'])).length} supplemental remarks use an integer 處 count (sum ${supplementalRows.reduce((sum, row) => sum + (/^\d+處$/.test(row['備註']) ? Number(row['備註'].replace('處', '')) : 0), 0)} 處). Named-place rows are not individual-bin inventory; do not substitute the sum for groups, bins or current main-resource rows.`,
      'The 2026-08-10 announcement reports groups and physical bins, not CSV rows or validated map positions; dates and units are not interchangeable.',
      'Classification counts are relationships, not inventory totals; ambiguous components can contain multiple rows. Source record counts remain separate.',
    ],
    agencyQuestions: [
      '1,197 列歷史清單的原始資源版本、盤點基準日與範圍為何？可否提供具有穩定設施 ID 的歷史版本？',
      '681 列清單的一列代表地址、組、座、箱體或有效設施嗎？同址不同座是否應保留？',
      '806 組／1,612 座（2026-08-10）與 2026-09-30 CSV 的口徑與生效日期如何對照？有無可公開的逐筆交叉表？',
      '景點商圈周邊 130 列各備註 n處，合計 940 處；一列與一處的定義、座標代表位置為何？是主清單子集、增補或不同盤點範圍？能否提供逐處清單與穩定設施 ID？',
      '無法配對的歷史列是否仍在營運、搬遷、重複或未收錄？請提供正式異動紀錄，勿僅依清單差額推定撤除。',
      '地址相同但座標偏移、座標相同但地址不同，以及無效座標的列，正確資料與座標精度為何？',
    ],
    aggregateClaims: [{ sourceUrl: 'https://www.tldep.gov.taipei/Public/News/TpeDep_Detail.aspx?SN=9686320', publishedAt: '2026-08-10', groups: 806, physicalBins: 1612, caveat: 'Published aggregate claim; not a row-level reconciliation or current operational confirmation.' }],
  };
}

export function reconciliationCsv(report: ReconciliationReport): string {
  const safe = (value: unknown) => { const text = String(value ?? ''); return /^[=+\-@]/.test(text) ? `'${text}` : text; };
  const index = new Map(report.sourceRecords.map(record => [record.id, record]));
  const auditValues = (ids: string[], select: (record: ReconciliationInput) => string) => ids.map(id => { const record = index.get(id); return record ? select(record) : ''; }).join(' | ');
  return '\uFEFF' + Papa.unparse(report.records.map(row => ({ report_id: report.reportId, classification: row.classification, confidence: row.confidence, historical_ids: row.historicalIds.join('|'), current_ids: row.currentIds.join('|'), historical_addresses: auditValues(row.historicalIds, p => `${p.district} ${p.address}`), current_addresses: auditValues(row.currentIds, p => `${p.district} ${p.address}`), historical_coordinates: auditValues(row.historicalIds, p => `${p.longitude},${p.latitude}`), current_coordinates: auditValues(row.currentIds, p => `${p.longitude},${p.latitude}`), current_sources: auditValues(row.currentIds, p => p.sourceId), distance_meters: row.distanceMeters ?? '', evidence: row.evidence.join('|'), methodology: report.methodology.version, near_meters: report.methodology.nearMeters, location_change_meters: report.methodology.locationChangeMeters })).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safe(value)]))));
}

export function reconciliationSummary(report: ReconciliationReport): string {
  return `# 清潔箱資料對帳摘要\n\n報告版本：${report.reportId}；政策快照：${report.policySnapshotId}。\n\n這是跨版本資料對帳，不是現場盤點或撤除清單。\n\n| 分類 | 關係數 |\n|---|---:|\n${reconciliationClasses.map(c => `| ${c} | ${report.counts[c]} |`).join('\n')}\n\n分類數計算「關係」，不是箱體數；一對多模糊群組可包含多列。每一來源列僅屬於一個關係。\n\n## 統計定義與未解釋差異\n\n${report.statisticalDefinitionDifferences.map(s => `- ${s}`).join('\n')}\n\nconfirmed_match 表示來源身分／地址及座標證據一致，不等於營運確認；probable_match 仍需人工確認。historical_only 不代表撤除、current_only 不代表新增。possible_location_change 只有地址相同而位置差異的線索，不能證實搬遷。ambiguous 不強制配對。different_scope 不加入主清單。\n\n## 方法\n\n${report.methodology.identityRules.map(s => `- ${s}`).join('\n')}\n\n近鄰線索半徑 ${report.methodology.nearMeters} 公尺；同址疑似位置變動門檻 ${report.methodology.locationChangeMeters} 公尺。來源沒有經驗證的穩定 ID；本地列號只供稽核，不用來判定跨版本身分。地址僅正規化 Unicode 全半形、臺／台、空白及括號逗號；保留 -、/、# 等可能影響門牌的符號。\n\n## 待主管機關確認\n\n${report.agencyQuestions.map(s => `- ${s}`).join('\n')}\n\n## 來源\n\n${report.sources.map(s => `- ${s.id}: ${s.recordCount} 列；來源更新 ${s.source_updated_at ?? 'unknown'}；擷取 ${s.retrieved_at ?? 'unknown'}；SHA256 ${s.sha256}`).join('\n')}\n\n公告彙總：${report.aggregateClaims.map(s => `${s.publishedAt}，${s.groups} 組／${s.physicalBins} 座（${s.sourceUrl}）`).join('；')}。僅保存公開統計聲明，不與逐筆列數相加或互相換算。\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv.includes('--fetch-supplement')) await fetchReconciliationSupplement();
  const value = (key: string) => { const index = process.argv.indexOf(key); return index < 0 ? undefined : Number(process.argv[index + 1]); };
  const report = buildBinReconciliation({ nearMeters: value('--near-meters'), locationChangeMeters: value('--location-change-meters') });
  const output = resolve('public/data/bin-policy'); mkdirSync(output, { recursive: true });
  const versionPath = join(output, `${report.reportId}.json`);
  if (existsSync(versionPath)) report.generatedAt = JSON.parse(readFileSync(versionPath, 'utf8')).generatedAt;
  const json = JSON.stringify(report);
  writeFileSync(`${versionPath}.tmp`, json); renameSync(`${versionPath}.tmp`, versionPath);
  writeFileSync(join(output, 'reconciliation.json.tmp'), json); renameSync(join(output, 'reconciliation.json.tmp'), join(output, 'reconciliation.json'));
  writeFileSync(join(output, 'reconciliation.csv'), reconciliationCsv(report));
  writeFileSync(join(output, 'reconciliation-summary.md'), reconciliationSummary(report));
  console.log(JSON.stringify({ reportId: report.reportId, sources: report.sources.map(s => ({ id: s.id, count: s.recordCount })), counts: report.counts, unresolved: report.unresolvedRecords.length }));
}
