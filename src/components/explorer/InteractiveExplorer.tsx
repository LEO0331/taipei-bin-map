import { useEffect, useId, useMemo, useRef } from "react";
import { ExplorerControls } from "./ExplorerControls";
import { ExplorerScene } from "./ExplorerScene";
import { ExplorerListView } from "./ExplorerListView";
import { filterExplorerNodes, orderedGroupNodes } from "./model";
import type { ExplorerProps } from "./types";
import "./explorer.css";

/** Controlled explorer: hosts own content, routing, localization and detail IO. */
export function InteractiveExplorer(props: ExplorerProps): JSX.Element {
  const { nodes, groups, selectedGroupId, selectedNodeId, view, labels, search, onSelectGroup, onSelectNode, onViewChange, onReset, onNavigate, renderDetail, renderOverview } = props;
  const root = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLElement>(null);
  const id = useId();
  const headingId = `${id}-detail`;
  const resultsHeadingId = `${id}-results`;
  const forceReturn = useRef(false);
  const previous = useRef({ nodeId: selectedNodeId, groupId: selectedGroupId });
  const selected = nodes.find(node => node.id === selectedNodeId);
  const group = groups.find(group => group.id === selectedGroupId);
  const matches = useMemo(() => {
    const filtered = filterExplorerNodes(nodes, selectedGroupId, search.value, search.match);
    return group ? orderedGroupNodes(filtered, group) : filtered;
  }, [nodes, group, selectedGroupId, search.value, search.match]);

  useEffect(() => {
    if (selected && renderDetail) detail.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [selected?.id, selected?.label, Boolean(renderDetail)]);

  useEffect(() => {
    const before = previous.current;
    const active = document.activeElement;
    // Search and select inputs keep their focus when they deliberately dismiss
    // a panel. History and removed controls need a semantic node-ID fallback.
    const lostFocus = !active || active === document.body || !active.isConnected;
    if (before.nodeId && !selectedNodeId && (forceReturn.current || lostFocus)) {
      const target = [...(root.current?.querySelectorAll<HTMLElement>("[data-explorer-node]") ?? [])].find(element => element.dataset.explorerNode === before.nodeId);
      (target ?? root.current?.querySelector<HTMLElement>(".civic-empty button") ?? document.getElementById(resultsHeadingId))?.focus();
    } else if (before.groupId !== selectedGroupId && !selectedNodeId && lostFocus) {
      document.getElementById(resultsHeadingId)?.focus();
    }
    forceReturn.current = false;
    previous.current = { nodeId: selectedNodeId, groupId: selectedGroupId };
  }, [selectedNodeId, selectedGroupId, view, resultsHeadingId]);

  function close() { forceReturn.current = true; onSelectNode(undefined); }
  function select(id: string) {
    if (id === selectedNodeId && renderDetail) detail.current?.querySelector<HTMLElement>("h2")?.focus();
    onSelectNode(id);
  }
  return <div ref={root} className="civic-explorer interactive-explorer" onKeyDown={event => {
    if (event.key === "Escape" && selectedNodeId && renderDetail) { event.stopPropagation(); close(); }
  }}>
    <ExplorerControls id={id} groups={groups} view={view} selectedGroupId={selectedGroupId} search={search} labels={labels} onSelectGroup={onSelectGroup} onViewChange={onViewChange} />
    <div className="civic-statebar"><p role="status" aria-live="polite">{labels.formatCount(matches.length, nodes.length)}<span className="sr-only"> — {group?.label ?? labels.all}</span></p><div>
      {selectedGroupId && <button type="button" onClick={() => onSelectGroup(undefined)}>← {labels.back}</button>}
      <button type="button" onClick={onReset}>{labels.reset} <span aria-hidden="true">↺</span></button>
    </div></div>
    <div className={`civic-workspace ${selected ? "has-selection" : ""} ${!renderOverview && !(selected && renderDetail) ? "civic-workspace-alone" : ""}`}>
      <div className="civic-browser">
        {view === "scene" ? <ExplorerScene groups={groups} nodes={nodes} matches={matches} groupId={selectedGroupId} selectedId={selectedNodeId} labels={labels} headingId={resultsHeadingId} onSelectGroup={onSelectGroup} onSelectNode={select} />
          : <ExplorerListView nodes={matches} selectedId={selectedNodeId} query={search.value} labels={labels} headingId={resultsHeadingId} onSelectNode={select} onNavigate={onNavigate} />}
        {!matches.length && <div className="civic-empty"><h2>{labels.empty}</h2><button type="button" onClick={onReset}>{labels.clear}</button></div>}
      </div>
      {selected && renderDetail ? <aside ref={detail} className="civic-detail" aria-labelledby={headingId}>
        <div className="civic-detail-top"><span className="civic-kicker">{selected.caption}</span><button type="button" onClick={close}>{labels.close} <span aria-hidden="true">×</span></button></div>
        <h2 id={headingId} data-explorer-detail-title tabIndex={-1}>{selected.label}</h2>
        {renderDetail(selected, { headingId, onClose: close })}
      </aside> : renderOverview?.({ onSelectGroup })}
    </div>
  </div>;
}
