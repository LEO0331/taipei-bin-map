import { useEffect, useState } from 'react';
import type { Language } from '../types';
import type { ShadeEquitySnapshot } from '../types/shadeEquity';
import { shadeDataUrl } from '../lib/shadeEquityData';

interface Row { snapshotId: string; toleranceM: number; acceptedTrees: number; matchedTrees: number; unmatchedTrees: number; ambiguousTrees: number; acceptedPits: number; matchedPits: number; unmatchedPits: number; ambiguousPits: number }
interface Evidence { schemaVersion: number; snapshotId: string; methodologyVersion: string; configurationVersion: string; scope: string; sourceHashes: { id: string; sha256: string | null }[]; scenarios: Row[] }
export function ShadeEquityToleranceReview({ snapshot, language }: { snapshot: ShadeEquitySnapshot; language: Language }) {
  const zh = language === 'zh';
  const [data, setData] = useState<Row[] | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setFailed(false);
    fetch(shadeDataUrl('tolerance-sensitivity.json'), { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Tolerance evidence unavailable');
      const value = await response.json() as Evidence;
      const hashes = (items: { id: string; sha256: string | null }[]) => JSON.stringify(items.map(item => [item.id, item.sha256]).sort());
      if (!value || value.schemaVersion !== 1 || value.snapshotId !== snapshot.snapshotId || value.methodologyVersion !== snapshot.methodologyVersion || value.configurationVersion !== snapshot.configurationVersion || value.scope !== 'different_evidence_scope' || !Array.isArray(value.sourceHashes) || hashes(value.sourceHashes) !== hashes(snapshot.sources) || !Array.isArray(value.scenarios)) throw new Error('Tolerance source mismatch');
      const rows = value.scenarios;
      if (rows.length !== 3 || rows.some((row, index) => !row || row.toleranceM !== [0, 2, 5][index] || typeof row.snapshotId !== 'string' || ![row.acceptedTrees, row.matchedTrees, row.unmatchedTrees, row.ambiguousTrees, row.acceptedPits, row.matchedPits, row.unmatchedPits, row.ambiguousPits].every(n => Number.isSafeInteger(n) && n >= 0) || row.matchedTrees + row.unmatchedTrees + row.ambiguousTrees !== row.acceptedTrees || row.matchedPits + row.unmatchedPits + row.ambiguousPits !== row.acceptedPits)) throw new Error('Invalid tolerance population');
      if (!controller.signal.aborted) setData(rows);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [snapshot]);
  return <section className="policy-panel">
    <h3>{zh ? '離線空間容許距離比較' : 'Offline proximity-tolerance comparison'}</h3>
    <p>{zh ? '0／2／5 公尺使用相同原始資料重新關聯，屬不同證據範圍，不是樹木增減、空穴數或環境改善；長度驗證門檻仍關閉。' : '0 / 2 / 5 metres reuse the same raw sources with offline reassociation. Different evidence scopes do not imply tree changes, vacancies or environmental improvement. Measurement gates remain closed.'}</p>
    {failed ? <p role="status">{zh ? '距離比較檔無法驗證；不以零或其他版本替代。' : 'Tolerance evidence could not be verified; no zero values or other versions substituted.'}</p> : !data ? <p role="status">{zh ? '載入已查核的距離比較…' : 'Loading audited tolerance evidence…'}</p> : <div className="directory-table-wrap shade-table"><table><caption>{zh ? '原始資料相同、關聯範圍不同' : 'Same raw sources, different association scopes'}</caption><thead><tr>{[zh ? '容許距離（公尺）' : 'Tolerance (m)', zh ? '樹木：匹配／未匹配／模糊' : 'Trees: matched / unmatched / ambiguous', zh ? '樹穴：匹配／未匹配／模糊' : 'Pits: matched / unmatched / ambiguous', zh ? '衍生快照' : 'Derived snapshot'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.map(row => <tr key={row.toleranceM}><td>{row.toleranceM}</td><td>{row.matchedTrees} / {row.unmatchedTrees} / {row.ambiguousTrees}</td><td>{row.matchedPits} / {row.unmatchedPits} / {row.ambiguousPits}</td><td><code>{row.snapshotId}</code></td></tr>)}</tbody></table></div>}
  </section>;
}
