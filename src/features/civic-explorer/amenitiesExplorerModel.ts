import { validateExplorerModel, type ExplorerGroup, type ExplorerNode } from '../../components/explorer';
import type { DirectoryRoute } from '../../directoryRoutes';
import type { Language } from '../../types';

type Localized = Record<Language, string>;
type Destination = readonly [id: string, route: DirectoryRoute, label: Localized, description: Localized];
type Theme = { id: string; label: Localized; color: string; destinations: readonly Destination[] };

const themes: readonly Theme[] = [
  { id: 'facilities', label: { zh: '公共設施與市民服務', en: 'Public Facilities & Citizen Services' }, color: '#08756f', destinations: [
    ['amenities-map', '', { zh: '公共設施主地圖', en: 'Public Amenities Map' }, { zh: '依設施類型、行政區或關鍵字查找公開資料中的設施。', en: 'Find facilities listed in public datasets by type, district, or keyword.' }],
    ['school-sports', 'public-school-sports-venues', { zh: '公立學校運動場地', en: 'Public School Sports Venues' }, { zh: '查閱校園開放與預約資訊；不代表場地已可預約。', en: 'Review published campus access and booking information, not confirmed availability.' }],
    ['cooling-spots', 'cooling-comfort-spots', { zh: '臺北涼適點', en: 'Taipei Cooling & Comfort Spots' }, { zh: '依資料記載的設施條件尋找涼適場所，不代表即時開放。', en: 'Find cooling locations by listed amenities, without live opening information.' }],
    ['swimming-pools', 'swimming-pools', { zh: '游泳池查詢', en: 'Swimming Pool Finder' }, { zh: '查找名錄中的游泳池、位置與聯絡方式。', en: 'Find listed swimming pools, locations, and contact details.' }],
  ] },
  { id: 'environment', label: { zh: '環境與資源循環', en: 'Environment & Resource Circulation' }, color: '#336a39', destinations: [
    ['bulky-waste', 'bulky-waste-collection-booking', { zh: '大型廢棄物清運', en: 'Bulky Waste Collection' }, { zh: '查閱大型廢棄物清運的聯絡方式與預約資訊。', en: 'Look up bulky waste collection contacts and booking information.' }],
    ['industrial-reuse', 'industrial-waste-reuse-operators', { zh: '工業廢棄物再利用', en: 'Industrial Waste Reuse' }, { zh: '查閱公開名錄中的事業廢棄物再利用機構與登記資訊。', en: 'Browse listed industrial waste reuse operators and registration information.' }],
    ['recycling-analytics', 'recycling-analytics', { zh: '資源回收統計', en: 'Recycling Analytics' }, { zh: '比較行政區與期間的回收量；回收量不等於回收率。', en: 'Compare recorded recycling volumes by district and period, not recycling rates.' }],
  ] },
  { id: 'health', label: { zh: '公共衛生與服務', en: 'Public Health & Services' }, color: '#76549a', destinations: [
    ['medicine-collection', 'unused-medicine-collection-stations', { zh: '廢藥回收站', en: 'Unused Medicine Collection Stations' }, { zh: '查找公開名錄中的廢藥檢收站與聯絡資訊。', en: 'Find listed medicine collection stations and contact information.' }],
    ['certified-bathhouses', 'certified-bathhouses', { zh: '衛生認證浴室', en: 'Certified Bathhouses' }, { zh: '查閱公開名錄的衛生認證紀錄與地址。', en: 'Browse published hygiene certification records and addresses.' }],
  ] },
  { id: 'policy', label: { zh: '政策研究與證據', en: 'Policy Research & Evidence' }, color: '#8a552b', destinations: [
    ['bin-policy', 'bin-policy', { zh: '清潔箱配置決策支援', en: 'Bin Allocation Decision Support' }, { zh: '檢視配置情境與研究假設，不代表正式設置核准。', en: 'Review allocation scenarios and research assumptions, not official installation approvals.' }],
    ['shade-equity', 'shade-equity', { zh: '樹蔭公平研究', en: 'Shade Equity Research' }, { zh: '檢視行道樹與人行道證據；樹木紀錄不等於實測樹冠覆蓋。', en: 'Review street-tree and sidewalk evidence; tree records are not measured canopy coverage.' }],
  ] },
];

export function createAmenitiesExplorerModel(language: Language) {
  const groups: ExplorerGroup[] = themes.map(({ id, label, color, destinations }) => ({
    id, label: label[language], nodeIds: destinations.map(([nodeId]) => nodeId), visual: { color },
  }));
  const nodes: ExplorerNode[] = themes.flatMap(({ id: groupId, destinations }) =>
    destinations.map(([id, route, label, description]) => ({
      id, groupId, label: label[language], description: description[language],
      searchText: `${label.zh} ${label.en}`, target: { href: `#/${route}` },
    })),
  );
  return { groups, nodes, validation: validateExplorerModel(nodes, groups) };
}
