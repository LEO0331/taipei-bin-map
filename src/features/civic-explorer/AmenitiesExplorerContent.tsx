import { useMemo, useState } from 'react';
import { InteractiveExplorer, type ExplorerLabels } from '../../components/explorer';
import type { Language } from '../../types';
import { createAmenitiesExplorerModel } from './amenitiesExplorerModel';
import './amenitiesExplorer.css';

const labels: Record<Language, ExplorerLabels> = {
  zh: {
    viewMode: '檢視方式', scene: '主題圖', list: '清單', listTitle: '服務清單',
    search: '搜尋服務', searchPlaceholder: '輸入服務名稱或關鍵字', filter: '主題分類',
    all: '所有主題', reset: '重設', back: '所有主題', overview: '主題總覽',
    instructions: '選擇主題或服務，亦可切換至清單。', selectedGroup: '所選主題',
    next: '選擇服務', empty: '找不到符合的服務', clear: '清除篩選',
    full: '開啟模組', detail: '服務資訊', close: '關閉資訊',
    formatCount: (matches, total) => `顯示 ${matches}／${total} 項服務`,
    formatGroupCount: (matches, total) => `${matches}／${total} 項服務`,
  },
  en: {
    viewMode: 'View mode', scene: 'Scene', list: 'List', listTitle: 'Service list',
    search: 'Search services', searchPlaceholder: 'Search by name or keyword', filter: 'Topic',
    all: 'All topics', reset: 'Reset', back: 'All topics', overview: 'Topic overview',
    instructions: 'Choose a topic or service, or switch to the list.', selectedGroup: 'Selected topic',
    next: 'Choose a service', empty: 'No matching services', clear: 'Clear filters',
    full: 'Open module', detail: 'Service details', close: 'Close details',
    formatCount: (matches, total) => `Showing ${matches} of ${total} services`,
    formatGroupCount: (matches, total) => `${matches} of ${total} services`,
  },
};

export default function AmenitiesExplorerContent({ language }: { language: Language }) {
  const [view, setView] = useState<'list' | 'scene'>('list');
  const [group, setGroup] = useState<string>();
  const [node, setNode] = useState<string>();
  const [query, setQuery] = useState('');
  const { nodes, groups, validation } = useMemo(() => createAmenitiesExplorerModel(language), [language]);
  const t = labels[language];
  if (validation.length) throw new Error(validation.join('; '));

  return <InteractiveExplorer
    nodes={nodes} groups={groups} labels={t} view={view}
    selectedGroupId={group} selectedNodeId={node}
    search={{ value: query, onChange: (value) => { setQuery(value); setNode(undefined); } }}
    onSelectGroup={(id) => { setGroup(id); setNode(undefined); }}
    onSelectNode={setNode} onViewChange={setView}
    onReset={() => { setGroup(undefined); setNode(undefined); setQuery(''); }}
    renderDetail={(selected) => <>
      <p>{selected.description}</p>
      <a className="amenities-explorer-open-module" href={selected.target.href}>{t.full}</a>
    </>}
  />;
}
