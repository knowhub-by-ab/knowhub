/**
 * Cascading dropdown for selecting a tree node or page.
 * Each level shows children of the selected parent.
 * Emits the selected node id (or "" for "all").
 */
import { useMemo } from "react";
import type { TreeNode } from "@/lib/types";

interface Props {
  nodes: TreeNode[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** If true, includes only nodes that have a learning page (pageIds set). */
  pagesOnly?: boolean;
  pageIds?: Set<string>;
  /** If set, cascade starts from children of this node (limits scope to its subtree). */
  rootId?: string;
  className?: string;
}

export default function CascadingNodePicker({
  nodes,
  value,
  onChange,
  placeholder = "All",
  pagesOnly = false,
  pageIds,
  rootId,
  className = "",
}: Props) {
  // If rootId is set, limit visible nodes to descendants of that root.
  const effectiveNodes = useMemo(() => {
    if (!rootId) return nodes;
    const inSubtree = new Set<string>();
    const queue = [rootId];
    while (queue.length) {
      const cur = queue.pop()!;
      inSubtree.add(cur);
      nodes.filter((n) => n.parentId === cur).forEach((n) => queue.push(n.id));
    }
    // Remap rootId's children to parentId=null so the cascade starts there
    return nodes
      .filter((n) => inSubtree.has(n.id) && n.id !== rootId)
      .map((n) => (n.parentId === rootId ? { ...n, parentId: null } : n));
  }, [nodes, rootId]);
  // Build ancestor chain of currently selected node
  const ancestorChain = useMemo(() => {
    if (!value) return [];
    const chain: string[] = [];
    let current: TreeNode | undefined = effectiveNodes.find((n) => n.id === value);
    while (current) {
      chain.unshift(current.id);
      current = current.parentId ? effectiveNodes.find((n) => n.id === current!.parentId) : undefined;
    }
    return chain;
  }, [value, effectiveNodes]);

  // Build the cascade levels: level[0] = roots, level[1] = children of selected root, etc.
  const levels: Array<{ parentId: string | null; items: TreeNode[]; selectedId: string }> = useMemo(() => {
    const result: Array<{ parentId: string | null; items: TreeNode[]; selectedId: string }> = [];

    let parentId: string | null = null;
    let depth = 0;

    while (true) {
      const children = effectiveNodes.filter((n) => {
        if (n.parentId !== parentId) return false;
        if (pagesOnly && pageIds && !pageIds.has(n.id)) {
          // Only include if it has a page OR has descendants with pages
          const hasDescendantPage = (id: string): boolean => {
            const kids = effectiveNodes.filter((x) => x.parentId === id);
            return kids.some((k) => pageIds.has(k.id) || hasDescendantPage(k.id));
          };
          return pageIds.has(n.id) || hasDescendantPage(n.id);
        }
        return true;
      });

      if (children.length === 0) break;

      const selectedId = ancestorChain[depth] ?? "";
      result.push({ parentId, items: children, selectedId });

      if (!selectedId) break; // no selection at this level — stop cascading
      parentId = selectedId;
      depth++;
    }

    return result;
  }, [effectiveNodes, ancestorChain, pagesOnly, pageIds]);

  function handleChange(levelIdx: number, newId: string) {
    if (!newId) {
      // User cleared this level — propagate clear up if it was the deepest selected
      const clearedAncestorId = levelIdx > 0 ? ancestorChain[levelIdx - 1] : "";
      onChange(clearedAncestorId);
    } else {
      onChange(newId);
    }
  }

  const selectClass = `rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500 ${className}`;

  if (levels.length === 0) {
    return (
      <select value="" onChange={() => {}} className={selectClass} disabled>
        <option value="">No nodes yet</option>
      </select>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {levels.map((level, idx) => (
        <select
          key={idx}
          value={level.selectedId}
          onChange={(e) => handleChange(idx, e.target.value)}
          className={selectClass}
        >
          <option value="">{idx === 0 ? placeholder : "— any —"}</option>
          {level.items.map((n) => (
            <option key={n.id} value={n.id}>{n.title}</option>
          ))}
        </select>
      ))}
    </div>
  );
}
