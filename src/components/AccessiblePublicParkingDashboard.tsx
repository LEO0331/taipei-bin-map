import { useMemo, useState } from 'react';
import type { AccessiblePublicParkingFacilitySummary, Facility, Language } from '../types';
import type { Translation } from '../i18n';

type Props = { records: Facility[]; summary: AccessiblePublicParkingFacilitySummary; language: Language; t: Translation };
type View = 'overview' | 'map' | 'districts' | 'features' | 'directory' | 'quality' | 'notes';

export function AccessiblePublicParkingDashboard({ records, summary, language, t }: Props) {
  const [view, setView] = useState<View>('overview');
  const labels: Array<[View, string]> = [
    ['overview', t.accessibleParkingOverview], ['map', t.accessibleParkingMap], ['districts', t.accessibleParkingDistrictDistribution], ['features', t.accessibleParkingFeatures], ['directory', t.accessibleParkingDirectory], ['quality', t.accessibleParkingDataQuality], ['notes', t.accessibleParkingDataNotes],
  ];
  const featureRows = useMemo(() => [
    [t.accessibleElevator, summary.facilitiesWithAccessibleElevators],
    [t.accessibleToilet, summary.facilitiesWithAccessibleToilets],
    [t.accessibleStairHandrail, summary.facilitiesWithAccessibleStairHandrails],
    [t.accessibleCarSpaceCount, summary.facilitiesWithAccessibleCarSpaces],
    [t.accessibleMotorcycleSpaceCount, summary.facilitiesWithAccessibleMotorcycleSpaces],
  ] as Array<[string, number]>, [summary, t]);
  const maxDistrict = Math.max(...summary.byDistrict.map((row) => row.facilityCount), 1);
  const maxFeature = Math.max(...featureRows.map((row) => row[1]), 1);
  const value = (enabled: boolean | 'unknown' | undefined) => enabled === true ? t.yes : enabled === 'unknown' ? t.unknown : t.no;
  const cardRows = [
    [t.totalFacilities, summary.totalRecords], [t.facilitiesWithValidCoordinates, summary.validCoordinateCount], [t.district, summary.districtCount], [t.totalAccessibleCarSpaces, summary.totalAccessibleCarSpaceCount], [t.totalAccessibleMotorcycleSpaces, summary.totalAccessibleMotorcycleSpaceCount], [t.accessibleElevator, summary.facilitiesWithAccessibleElevators], [t.accessibleToilet, summary.facilitiesWithAccessibleToilets], [t.accessibleStairHandrail, summary.facilitiesWithAccessibleStairHandrails],
  ];
  return (
    <section className="accessible-parking-dashboard" aria-label={t.accessiblePublicParkingFacilities}>
      <nav className="module-view-tabs" aria-label={t.accessiblePublicParkingFacilities}>
        {labels.map(([key, label]) => <button key={key} type="button" className={view === key ? 'active' : ''} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}
      </nav>
      {view === 'overview' && <div className="dashboard-cards">{cardRows.map(([label, count]) => <article key={label}><span>{label}</span><strong>{Number(count).toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US')}</strong></article>)}</div>}
      {view === 'map' && <div className="dashboard-message"><strong>{t.accessibleParkingMap}</strong><p>{summary.validCoordinateCount.toLocaleString()} {t.facilitiesWithValidCoordinates}. Invalid coordinates remain in the directory and are intentionally omitted from markers.</p></div>}
      {view === 'districts' && <div className="dashboard-chart"><h3>{t.accessibleParkingDistrictDistribution}</h3>{summary.byDistrict.map((row) => <div className="bar-row" key={row.district}><span>{row.district}</span><div><i style={{ width: `${(row.facilityCount / maxDistrict) * 100}%` }} /></div><strong>{row.facilityCount}</strong></div>)}</div>}
      {view === 'features' && <div className="dashboard-chart"><h3>{t.accessibleParkingFeatures}</h3>{featureRows.map(([label, count]) => <div className="bar-row" key={label}><span>{label}</span><div><i style={{ width: `${(count / maxFeature) * 100}%` }} /></div><strong>{count}</strong></div>)}<h3>{language === 'zh' ? '每筆資料的無障礙設施項目數' : 'Facilities by accessibility-feature count'}</h3>{summary.byAccessibilityFeatureCount.map((row) => <div className="bar-row" key={row.featureCount}><span>{row.featureCount}</span><div><i style={{ width: `${(row.facilityCount / maxDistrict) * 100}%` }} /></div><strong>{row.facilityCount}</strong></div>)}</div>}
      {view === 'directory' && <div className="directory-table-wrap"><table><thead><tr><th>{t.parkingFacilityName}</th><th>{t.district}</th><th>{t.address}</th><th>{t.accessibleCarSpaceCount}</th><th>{t.accessibleMotorcycleSpaceCount}</th><th>{t.accessibleElevator}</th><th>{t.accessibleToilet}</th><th>{t.accessibleStairHandrail}</th><th>{t.facilitiesWithValidCoordinates}</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.parkingFacilityName}</td><td>{record.district}</td><td>{record.address}</td><td>{record.accessibleCarSpaceCount ?? 0}</td><td>{record.accessibleMotorcycleSpaceCount ?? 0}</td><td>{value(record.hasAccessibleElevator)}</td><td>{value(record.hasAccessibleToilet)}</td><td>{value(record.hasAccessibleStairHandrail)}</td><td>{record.hasValidCoordinates ? t.yes : t.no}</td></tr>)}</tbody></table></div>}
      {view === 'quality' && <div className="quality-grid"><article><span>{t.invalidCoordinate}</span><strong>{summary.invalidCoordinateCount}</strong></article><article><span>{language === 'zh' ? '重複來源編號' : 'Duplicate source IDs'}</span><strong>{summary.dataQuality.duplicateSourceIdCount}</strong></article><article><span>{language === 'zh' ? '重複備援鍵' : 'Duplicate fallback keys'}</span><strong>{summary.dataQuality.duplicateFallbackKeyCount}</strong></article><article><span>{language === 'zh' ? '無效數值' : 'Invalid numbers'}</span><strong>{summary.dataQuality.invalidNumberCount}</strong></article><article><span>{language === 'zh' ? '未知無障礙值' : 'Unknown accessibility values'}</span><strong>{summary.dataQuality.unknownAccessibilityValueCount}</strong></article></div>}
      {view === 'notes' && <div className="dashboard-message"><p>{t.accessiblePublicParkingInterpretationNote}</p><p>{language === 'zh' ? '座標系統依 TMPX/TMPY 實際值判斷；TWD97/TM2 轉換為 WGS84 後才繪製有效座標。' : 'TMPX/TMPY are classified from their observed ranges; TWD97/TM2 values are converted to WGS84 before valid markers are rendered.'}</p></div>}
    </section>
  );
}
