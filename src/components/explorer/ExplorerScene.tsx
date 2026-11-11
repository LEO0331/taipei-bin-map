import type { CSSProperties } from "react";
import { HexIsland } from "./HexIsland";
import { orderedGroupNodes } from "./model";
import type { ExplorerGroup, ExplorerLabels, ExplorerNode } from "./types";

export function ExplorerScene({ groups, nodes, matches, groupId, selectedId, labels, headingId, onSelectGroup, onSelectNode }: {
  groups: readonly ExplorerGroup[]; nodes: readonly ExplorerNode[]; matches: readonly ExplorerNode[];
  groupId?: string; selectedId?: string; labels: ExplorerLabels; headingId: string;
  onSelectGroup: (id: string) => void; onSelectNode: (id: string) => void;
}): JSX.Element {
  const group = groups.find(group => group.id === groupId);
  const visible = group ? orderedGroupNodes(matches, group) : [];
  const rows = Math.ceil((group ? visible.length : groups.length) / 3);
  const mobileRows = group ? visible.length : Math.ceil(groups.length / 2);
  const rowHeight = group && visible.length > 3 ? 280 : 240;
  const constrainTiles = group ? visible.length > 3 : rows > 1 && groups.some(item => !item.visual.position);
  return <section className="civic-scene" aria-label={labels.scene}>
    <div className="civic-scene-heading"><span className="civic-kicker">{group ? labels.selectedGroup : `01 — ${String(groups.length).padStart(2, "0")}`}</span>
      <h2 id={headingId} tabIndex={-1}>{group?.label ?? labels.overview}</h2><p>{group ? group.description ?? labels.next : labels.instructions}</p>
    </div>
    <div className={`civic-islands ${group ? "civic-islands-focused" : ""} ${constrainTiles ? "civic-islands-many" : ""}`} style={{ "--scene-min-height": `${Math.max(group ? 420 : 0, rows * rowHeight)}px`, "--scene-mobile-height": `${Math.max(group ? 650 : 600, mobileRows * (group ? 210 : 200))}px` } as CSSProperties}>
      <svg className="civic-waterlines" viewBox="0 0 900 600" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="450" cy="315" rx="410" ry="245" /><ellipse cx="450" cy="315" rx="350" ry="200" /><ellipse cx="450" cy="315" rx="290" ry="155" /></svg>
      {!group ? groups.map((item, index) => {
        const count = nodes.filter(node => node.groupId === item.id).length;
        const countMatches = matches.filter(node => node.groupId === item.id).length;
        const position = item.visual.position ?? [((index % 3) + .5) * 100 / Math.min(3, groups.length), (Math.floor(index / 3) + .5) * 100 / Math.max(1, rows)];
        const mobile = item.visual.mobilePosition ?? [((index % 2) + .5) * 100 / Math.min(2, groups.length), (Math.floor(index / 2) + .5) * 100 / Math.max(1, mobileRows)];
        return <HexIsland key={item.id} kind="group" nodeId={item.id} color={item.visual.color} motif={item.visual.motif ?? 0} label={item.visual.label ?? item.label} caption={labels.formatGroupCount(countMatches, count)} inactive={!countMatches}
          onSelect={() => onSelectGroup(item.id)} style={{ "--x": `${position[0]}%`, "--y": `${position[1]}%`, "--mx": `${mobile[0]}%`, "--my": `${mobile[1]}%` } as CSSProperties} />;
      }) : visible.map((node, index) => {
        const x = visible.length <= 3 ? visible.length === 1 ? 50 : visible.length === 2 ? 29 + index * 42 : 18 + index * 32 : ((index % 3) + .5) * 100 / 3;
        const y = visible.length <= 3 ? index === 1 && visible.length === 3 ? 35 : 63 : (Math.floor(index / 3) + .5) * 100 / rows;
        return <HexIsland key={node.id} nodeId={node.id} color={group.visual.color} motif={node.icon ?? group.visual.motif ?? 0} label={node.label} caption={node.caption ?? ""}
          selected={selectedId === node.id || node.visualState === "selected"} inactive={node.visualState === "inactive"} onSelect={() => onSelectNode(node.id)}
          style={{ "--x": `${x}%`, "--y": `${y}%`, "--mx": "50%", "--my": `${(index + .5) * 100 / visible.length}%` } as CSSProperties} />;
      })}
    </div>
    {labels.footnote && <p className="civic-scene-footnote"><span aria-hidden="true">↳</span> {labels.footnote}</p>}
  </section>;
}
