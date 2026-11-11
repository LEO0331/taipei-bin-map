import type { ExplorerGroup, ExplorerNode } from "./types";

export function validateExplorerModel(nodes: readonly ExplorerNode[], groups: readonly ExplorerGroup[]): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(nodes.map(node => node.id));
  const groupIds = new Set(groups.map(group => group.id));
  if (nodeIds.size !== nodes.length) errors.push("Duplicate node IDs");
  if (groupIds.size !== groups.length) errors.push("Duplicate group IDs");
  for (const group of groups) {
    if (!group.id || !group.label) errors.push("Group ID and label are required");
    if (new Set(group.nodeIds).size !== group.nodeIds.length) errors.push(`Duplicate membership: ${group.id}`);
    for (const id of group.nodeIds) if (!nodes.some(node => node.id === id && node.groupId === group.id)) errors.push(`Invalid membership: ${group.id}/${id}`);
    for (const position of [group.visual.position, group.visual.mobilePosition]) if (position !== undefined && (!Array.isArray(position) || position.length !== 2 || [position[0], position[1]].some(value => !Number.isFinite(value) || value < 0 || value > 100))) errors.push(`Invalid position: ${group.id}`);
  }
  for (const node of nodes) {
    if (!node.id || !node.label || !node.target.href) errors.push("Node ID, label and navigation target are required");
    if (!groupIds.has(node.groupId) || !groups.find(group => group.id === node.groupId)?.nodeIds.includes(node.id)) errors.push(`Unassigned node: ${node.id}`);
  }
  return errors;
}

export function filterExplorerNodes(nodes: readonly ExplorerNode[], groupId: string | undefined, query: string, match?: (node: ExplorerNode, query: string) => boolean): ExplorerNode[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return nodes.filter(node => (!groupId || node.groupId === groupId) && (match ? match(node, query) : words.every(word =>
    [node.label, node.description, node.category, node.caption, node.searchText].filter(Boolean).join(" ").toLocaleLowerCase().includes(word)
  )));
}

export function orderedGroupNodes(nodes: readonly ExplorerNode[], group: ExplorerGroup): ExplorerNode[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  return group.nodeIds.flatMap(id => { const node = byId.get(id); return node ? [node] : []; });
}
