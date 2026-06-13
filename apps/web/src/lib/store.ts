import { useSyncExternalStore } from "react";
import type {
  AppData,
  TreeNode,
  NodeStatus,
  Resource,
  ResourceType,
  Quiz,
  Question,
  ProviderKey,
  ProviderId,
} from "./types";

// ---------------------------------------------------------------------------
// Local-first store. A single AppData object is persisted to localStorage and
// exposed to React via useSyncExternalStore. All mutations go through helpers
// here so persistence + subscriber notification stay centralized.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "knowhub:data:v1";

const DEFAULT_DATA: AppData = {
  version: 1,
  nodes: [],
  pages: {},
  notes: "",
  resources: [],
  quizzes: [],
  aiKeys: [],
  github: {},
};

function load(): AppData {
  if (typeof localStorage === "undefined") return structuredClone(DEFAULT_DATA);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw) as Partial<AppData> & {
      // legacy shape (pre-key-list): a single custom endpoint
      settings?: { baseUrl?: string; apiKey?: string; model?: string };
    };
    let aiKeys = parsed.aiKeys ?? [];
    // Migrate an old single custom endpoint into a `custom` key entry.
    if (aiKeys.length === 0 && parsed.settings?.baseUrl?.trim()) {
      aiKeys = [
        {
          id: "migrated",
          provider: "custom",
          apiKey: parsed.settings.apiKey ?? "",
          baseUrl: parsed.settings.baseUrl,
          model: parsed.settings.model,
        },
      ];
    }
    return {
      ...structuredClone(DEFAULT_DATA),
      ...parsed,
      nodes: parsed.nodes ?? [],
      pages: parsed.pages ?? {},
      resources: parsed.resources ?? [],
      quizzes: parsed.quizzes ?? [],
      aiKeys,
      github: parsed.github ?? {},
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

// Monotonic "last modified" stamp for last-write-wins cloud sync. Bumped on
// every LOCAL change; set to the remote value when applying remote data.
const STAMP_KEY = "knowhub:updatedAt:v1";
let localUpdatedAt = Number(
  (typeof localStorage !== "undefined" && localStorage.getItem(STAMP_KEY)) || 0
);
function persistStamp() {
  try {
    localStorage.setItem(STAMP_KEY, String(localUpdatedAt));
  } catch {
    /* ignore */
  }
}

function setState(updater: (prev: AppData) => AppData) {
  state = updater(state);
  localUpdatedAt = Date.now();
  persist();
  persistStamp();
  emit();
}

export function getUpdatedAt(): number {
  return localUpdatedAt;
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

// --- Sync hooks (used by the Firestore cloud-sync layer) --------------------

/** Current full state (for the sync writer). */
export function getState(): AppData {
  return state;
}

/** Subscribe to any state change (returns an unsubscribe fn). */
export const subscribeStore = subscribe;

function merged(next: Partial<AppData>): AppData {
  return {
    ...structuredClone(DEFAULT_DATA),
    ...next,
    nodes: next.nodes ?? [],
    pages: next.pages ?? {},
    notes: next.notes ?? "",
    resources: next.resources ?? [],
    quizzes: next.quizzes ?? [],
    aiKeys: next.aiKeys ?? [],
    github: next.github ?? {},
  };
}

/**
 * Replace the entire store from a LOCAL action (e.g. GitHub import). Bumps the
 * updated-at stamp to now so it wins the next sync.
 */
export function replaceAll(next: Partial<AppData>) {
  setState(() => merged(next));
}

/**
 * Apply remote cloud data WITHOUT bumping the stamp past the remote value, so
 * last-write-wins stays correct. Used only by the sync layer.
 */
export function applyRemoteState(next: Partial<AppData>, remoteUpdatedAt: number) {
  state = merged(next);
  localUpdatedAt = remoteUpdatedAt;
  persist();
  persistStamp();
  emit();
}

/** Update the GitHub connection state (merged). */
export function setGithub(patch: Partial<NonNullable<AppData["github"]>>) {
  setState((prev) => ({ ...prev, github: { ...prev.github, ...patch } }));
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
      const pages = { ...prev.pages };
      for (const rid of toRemove) delete pages[rid];
      return {
        ...prev,
        nodes: prev.nodes.filter((n) => !toRemove.has(n.id)),
        pages,
      };
    });
  },

  childrenOf(nodes: TreeNode[], parentId: string | null): TreeNode[] {
    return nodes
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  },

  /** Depth-first flatten in display order, annotated with depth. */
  flatten(nodes: TreeNode[]): { node: TreeNode; depth: number }[] {
    const out: { node: TreeNode; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const node of tree.childrenOf(nodes, parentId)) {
        out.push({ node, depth });
        walk(node.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  },
};

// --- Learning pages ---------------------------------------------------------

export function setPage(nodeId: string, markdown: string) {
  setState((prev) => ({ ...prev, pages: { ...prev.pages, [nodeId]: markdown } }));
}

// --- Notes ------------------------------------------------------------------

export function setNotes(notes: string) {
  setState((prev) => ({ ...prev, notes }));
}

// --- Resources --------------------------------------------------------------

export const resources = {
  add(input: { title: string; url: string; type: ResourceType }): Resource {
    const r: Resource = {
      id: uid(),
      title: input.title.trim() || "Untitled",
      url: input.url.trim(),
      type: input.type,
      createdAt: Date.now(),
    };
    setState((prev) => ({ ...prev, resources: [r, ...prev.resources] }));
    return r;
  },
  remove(id: string) {
    setState((prev) => ({
      ...prev,
      resources: prev.resources.filter((r) => r.id !== id),
    }));
  },
};

// --- Quizzes / assessments --------------------------------------------------

export const quizzes = {
  add(title: string, questions: Question[]): Quiz {
    const q: Quiz = {
      id: uid(),
      title: title.trim() || "Untitled quiz",
      questions,
      attempts: [],
      createdAt: Date.now(),
    };
    setState((prev) => ({ ...prev, quizzes: [q, ...prev.quizzes] }));
    return q;
  },
  remove(id: string) {
    setState((prev) => ({
      ...prev,
      quizzes: prev.quizzes.filter((q) => q.id !== id),
    }));
  },
  recordAttempt(id: string, score: number, total: number) {
    setState((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((q) =>
        q.id === id
          ? { ...q, attempts: [...q.attempts, { at: Date.now(), score, total }] }
          : q
      ),
    }));
  },
  newQuestionId: () => uid(),
};

// --- AI provider keys (ordered = fallback priority) -------------------------

export const aiKeys = {
  add(input: { provider: ProviderId; apiKey: string; baseUrl?: string; model?: string; label?: string }): ProviderKey {
    const k: ProviderKey = {
      id: uid(),
      provider: input.provider,
      apiKey: input.apiKey.trim(),
      baseUrl: input.baseUrl?.trim() || undefined,
      model: input.model?.trim() || undefined,
      label: input.label?.trim() || undefined,
    };
    setState((prev) => ({ ...prev, aiKeys: [...prev.aiKeys, k] }));
    return k;
  },
  remove(id: string) {
    setState((prev) => ({ ...prev, aiKeys: prev.aiKeys.filter((k) => k.id !== id) }));
  },
  move(id: string, dir: -1 | 1) {
    setState((prev) => {
      const arr = [...prev.aiKeys];
      const i = arr.findIndex((k) => k.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...prev, aiKeys: arr };
    });
  },
};

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
