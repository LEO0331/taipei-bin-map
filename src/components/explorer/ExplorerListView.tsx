import type { MouseEvent } from "react";
import type { ExplorerLabels, ExplorerNode } from "./types";

function MatchText({ text, query }: { text: string; query: string }): JSX.Element {
  const word = query.trim().split(/\s+/)[0];
  const index = word ? text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase()) : -1;
  return index < 0 ? <>{text}</> : <>{text.slice(0, index)}<mark>{text.slice(index, index + word.length)}</mark>{text.slice(index + word.length)}</>;
}
export function ExplorerListView({ nodes, selectedId, query, labels, headingId, onSelectNode, onNavigate }: {
  nodes: readonly ExplorerNode[]; selectedId?: string; query: string; labels: ExplorerLabels; headingId: string;
  onSelectNode: (id: string) => void; onNavigate?: (node: ExplorerNode) => void;
}): JSX.Element {
  function navigate(event: MouseEvent<HTMLAnchorElement>, node: ExplorerNode) {
    if (onNavigate && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(node); }
  }
  return <section className="civic-list" aria-label={labels.listTitle}>
    <h2 id={headingId} tabIndex={-1} className="sr-only">{labels.listTitle}</h2><ol role="list">{nodes.map(node => <li key={node.id} data-case={node.id} data-selected={selectedId === node.id || undefined}>
      <span className="civic-case-number">{node.indexLabel ?? node.caption}</span><div>
        <button type="button" className="civic-case-title" data-explorer-node={node.id} aria-pressed={selectedId === node.id} onClick={() => onSelectNode(node.id)}><MatchText text={node.label} query={query} /></button>
        {node.description && <p>{node.description}</p>}<a href={node.target.href} onClick={event => navigate(event, node)} aria-label={`${labels.full}: ${node.label}`}>{labels.full} <span aria-hidden="true">↗</span></a>
      </div>
    </li>)}</ol>
  </section>;
}
