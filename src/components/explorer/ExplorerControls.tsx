import type { ExplorerGroup, ExplorerProps } from "./types";

export function ExplorerControls({ groups, view, selectedGroupId, search, labels, onSelectGroup, onViewChange, id }: Pick<ExplorerProps, "groups" | "view" | "selectedGroupId" | "search" | "labels" | "onSelectGroup" | "onViewChange"> & { id: string }): JSX.Element {
  return <div className="civic-controls">
    <div className="civic-view-switch" role="group" aria-label={labels.viewMode}>
      <button type="button" aria-pressed={view === "scene"} onClick={() => onViewChange("scene")}><span aria-hidden="true">⬡</span> {labels.scene}</button>
      <button type="button" aria-pressed={view === "list"} onClick={() => onViewChange("list")}><span aria-hidden="true">☷</span> {labels.list}</button>
    </div>
    <div className="civic-search"><label htmlFor={`${id}-search`}>{labels.search}</label><input id={`${id}-search`} type="search" maxLength={search.maxLength ?? 160} placeholder={labels.searchPlaceholder} value={search.value} onChange={event => search.onChange(event.target.value)} /></div>
    <div className="civic-filter"><label htmlFor={`${id}-filter`}>{labels.filter}</label><select id={`${id}-filter`} value={selectedGroupId ?? ""} onChange={event => onSelectGroup(event.target.value || undefined)}>
      <option value="">{labels.all}</option>{groups.map((group: ExplorerGroup) => <option key={group.id} value={group.id}>{group.label}</option>)}
    </select></div>
  </div>;
}
