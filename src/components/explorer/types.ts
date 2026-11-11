import type { ReactNode } from "react";

export type ExplorerView = "scene" | "list";
export type ExplorerMotif = 0 | 1 | 2 | 3 | 4 | 5;
export interface ExplorerNode {
  id: string;
  groupId: string;
  label: string;
  description?: string;
  icon?: ExplorerMotif;
  category?: string;
  caption?: string;
  indexLabel?: string;
  target: { href: string };
  visualState?: "default" | "selected" | "inactive";
  /** Derived metadata only; the host remains the content source of truth. */
  searchText?: string;
}
export interface ExplorerGroup {
  id: string;
  label: string;
  description?: string;
  nodeIds: readonly string[];
  visual: {
    color: string;
    motif?: ExplorerMotif;
    label?: string;
    position?: readonly [number, number];
    mobilePosition?: readonly [number, number];
  };
}
export interface ExplorerLabels {
  viewMode: string; scene: string; list: string; listTitle: string;
  search: string; searchPlaceholder: string; filter: string; all: string;
  reset: string; back: string; overview: string; instructions: string;
  selectedGroup: string; next: string; footnote?: string;
  empty: string; clear: string; full: string; detail: string; close: string;
  formatCount: (matches: number, total: number) => string;
  formatGroupCount: (matches: number, total: number) => string;
}
export interface ExplorerProps {
  nodes: readonly ExplorerNode[];
  groups: readonly ExplorerGroup[];
  selectedGroupId?: string;
  selectedNodeId?: string;
  view: ExplorerView;
  labels: ExplorerLabels;
  search: { value: string; onChange: (value: string) => void; maxLength?: number; match?: (node: ExplorerNode, query: string) => boolean };
  onSelectGroup: (id: string | undefined) => void;
  onSelectNode: (id: string | undefined) => void;
  onViewChange: (view: ExplorerView) => void;
  onReset: () => void;
  /** Intercepts only unmodified primary clicks; modified clicks keep native URLs. */
  onNavigate?: (node: ExplorerNode) => void;
  renderDetail?: (node: ExplorerNode, controls: { headingId: string; onClose: () => void }) => ReactNode;
  renderOverview?: (controls: { onSelectGroup: ExplorerProps["onSelectGroup"] }) => ReactNode;
}
