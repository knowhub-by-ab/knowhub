import { useSyncExternalStore } from "react";
import type { AppData, AiSettings, TreeNode, NodeStatus } from "./types";

// ---------------------------------------------------------------------------
// Local-first store. A single AppData object is persisted to localStorage and
// exposed to React via useSyncExternalStore. All mutations go through helpers
// here so persistence + subscriber notification stay centralized.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "knowhub:data:v1";

const DEFAULT_DATA: AppData = {
  version: 1,
  nodes: [],
  notes: "",
  settings: { baseUrl: "", apiKey: "", model: "auto" },
};

function load(): AppData {
  if (typeof localStorage === "undefined") return structuredClone(DEFAULT_DATA);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...structuredClone(DEFAULT_DATA),
      ...parsed,
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings ?? {}) },
      nodes: parsed.nodes ?? [],
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

let state: AppData = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full / unavailable — ignore; in-memory state still works.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(updater: (prev: AppData) => AppData) {
  state = updater(state);
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppData {
  return state;
}

/** Subscribe to the whole AppData object. */
export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// --- ID helper ---
function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toLowerCase();
}

// --- Tree node operations ---------------------------------------------------

export const tree = {
  add(title: string, parentId: string | null): TreeNode {
    const node: TreeNode = {
      id: uid(),
      title: title.trim() || "Untitled",
      parentId,
      status: "pending",
      order: 0,
      createdAt: Date.now(),
    };
    setState((prev) => {
      const siblings = prev.nodes.filter((n) => n.parentId === parentId);
      node.order = siblings.length;
      return { ...prev, nodes: [...prev.nodes, node] };
    });
    return node;
  },

  rename(id: string, title: string) {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === id ? { ...n, title: title.trim() || "Untitled" } : n
      ),
    }));
  },

  setStatus(id: string, status: NodeStatus) {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, status } : n)),
    }));
  },

  /** Remove a node and all of its descendants. */
  remove(id: string) {
    setState((prev) => {
      const toRemove = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const n of prev.nodes) {
          if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
            toRemove.add(n.id);
            changed = true;
          }
        }
      }
      return { ...prev, nodes: prev.nodes.filter((n) => !toRemove.has(n.id)) };
    });
  },

  childrenOf(nodes: TreeNode[], parentId: string | null): TreeNode[] {
    return nodes
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  },
};

// --- Notes ------------------------------------------------------------------

export function setNotes(notes: string) {
  setState((prev) => ({ ...prev, notes }));
}

// --- Settings ---------------------------------------------------------------

export function setSettings(settings: AiSettings) {
  setState((prev) => ({ ...prev, settings }));
}

// --- Derived progress -------------------------------------------------------

export interface ProgressSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  /** 0–100 */
  percent: number;
}

export function summarizeProgress(nodes: TreeNode[]): ProgressSummary {
  const total = nodes.length;
  const completed = nodes.filter((n) => n.status === "completed").length;
  const inProgress = nodes.filter((n) => n.status === "in_progress").length;
  const pending = total - completed - inProgress;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, inProgress, pending, percent };
}
