import { useSyncExternalStore } from "react";
import type {
  AppData,
  TreeNode,
  NodeStatus,
  Resource,
  ResourceType,
  Quiz,
  Question,
  Attempt,
  AttemptItem,
  ProviderKey,
  ProviderId,
  AiRole,
  Note,
  ChatSession,
  ChatMessage,
  ChatFolder,
  QuestionBank,
  Flashcard,
  Highlight,
  VideoRec,
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
  notesList: [],
  resources: [],
  quizzes: [],
  aiKeys: [],
  github: {},
  chatSessions: [],
  questionBanks: [],
  flashcards: [],
  highlights: [],
  videos: [],
  chatFolders: [],
  puterApiToken: undefined,
};

function load(): AppData {
  if (typeof localStorage === "undefined") return structuredClone(DEFAULT_DATA);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw) as Partial<AppData> & {
      // legacy shapes
      settings?: { baseUrl?: string; apiKey?: string; model?: string };
      notes?: string; // legacy single-note string
    };
    // Migrate legacy single notes string into the notes list.
    let notesList = parsed.notesList ?? [];
    if (notesList.length === 0 && typeof parsed.notes === "string" && parsed.notes.trim()) {
      const now = Date.now();
      notesList = [{ id: "migrated", title: "My notes", body: parsed.notes, createdAt: now, updatedAt: now }];
    }
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
      notesList,
      resources: parsed.resources ?? [],
      quizzes: parsed.quizzes ?? [],
      aiKeys,
      github: parsed.github ?? {},
      chatSessions: parsed.chatSessions ?? [],
      questionBanks: parsed.questionBanks ?? [],
      flashcards: parsed.flashcards ?? [],
      highlights: parsed.highlights ?? [],
      videos: parsed.videos ?? [],
      chatFolders: parsed.chatFolders ?? [],
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

/**
 * Light snapshot for Firestore: only small metadata that must survive cross-
 * device without going through GitHub. Heavy content (pages, notesList,
 * resources, quizzes) stays in GitHub only.
 */
export function lightSnapshot() {
  return {
    version: state.version,
    nodes: state.nodes,
    aiKeys: state.aiKeys,
    github: state.github,
    puterApiToken: state.puterApiToken,
  };
}

/** Subscribe to any state change (returns an unsubscribe fn). */
export const subscribeStore = subscribe;

function merged(next: Partial<AppData>): AppData {
  return {
    ...structuredClone(DEFAULT_DATA),
    ...next,
    nodes: next.nodes ?? [],
    pages: next.pages ?? {},
    notesList: next.notesList ?? [],
    resources: next.resources ?? [],
    quizzes: next.quizzes ?? [],
    aiKeys: next.aiKeys ?? [],
    github: next.github ?? {},
    chatSessions: next.chatSessions ?? [],
    questionBanks: next.questionBanks ?? [],
    flashcards: next.flashcards ?? [],
    highlights: next.highlights ?? [],
    videos: next.videos ?? [],
    chatFolders: next.chatFolders ?? [],
    // Preserve local-only fields — puterApiToken is never in remote exports
    puterApiToken: next.puterApiToken ?? state?.puterApiToken,
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

/**
 * Apply only the LIGHT fields (nodes, aiKeys, github) from a Firestore remote
 * snapshot. Heavy content (pages, notesList, resources, quizzes) from local
 * state is preserved unchanged. This keeps Firestore light.
 */
export function applyLightRemoteState(
  light: { nodes?: AppData["nodes"]; aiKeys?: AppData["aiKeys"]; github?: AppData["github"]; puterApiToken?: string },
  remoteUpdatedAt: number
) {
  state = {
    ...state,
    nodes: light.nodes ?? state.nodes,
    aiKeys: light.aiKeys ?? state.aiKeys,
    github: light.github ?? state.github,
    puterApiToken: light.puterApiToken ?? state.puterApiToken,
  };
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

  /** Reorder a node among its siblings (dir -1 = up, +1 = down). */
  reorder(id: string, dir: -1 | 1) {
    setState((prev) => {
      const node = prev.nodes.find((n) => n.id === id);
      if (!node) return prev;
      const sibs = tree.childrenOf(prev.nodes, node.parentId);
      const i = sibs.findIndex((n) => n.id === id);
      const j = i + dir;
      if (j < 0 || j >= sibs.length) return prev;
      [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
      const orderById = new Map(sibs.map((n, idx) => [n.id, idx]));
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          orderById.has(n.id) ? { ...n, order: orderById.get(n.id)! } : n
        ),
      };
    });
  },

  /** Move a node under a new parent (null = root). Prevents cycles. */
  reparent(id: string, newParentId: string | null) {
    setState((prev) => {
      if (id === newParentId) return prev;
      // Disallow moving a node into itself or one of its descendants.
      let p = newParentId;
      while (p) {
        if (p === id) return prev;
        p = prev.nodes.find((n) => n.id === p)?.parentId ?? null;
      }
      const order = prev.nodes.filter((n) => n.parentId === newParentId).length;
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === id ? { ...n, parentId: newParentId, order } : n
        ),
      };
    });
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

// --- Notes (multiple, titled) -----------------------------------------------

export const notes = {
  add(title = "Untitled note"): Note {
    const now = Date.now();
    const n: Note = { id: uid(), title: title.trim() || "Untitled note", body: "", createdAt: now, updatedAt: now };
    setState((prev) => ({ ...prev, notesList: [n, ...prev.notesList] }));
    return n;
  },
  update(id: string, patch: Partial<Pick<Note, "title" | "body">>) {
    setState((prev) => ({
      ...prev,
      notesList: prev.notesList.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
      ),
    }));
  },
  remove(id: string) {
    setState((prev) => ({ ...prev, notesList: prev.notesList.filter((n) => n.id !== id) }));
  },
};

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
  recordAttempt(id: string, score: number, total: number, items: AttemptItem[]) {
    const attempt: Attempt = { id: uid(), takenAt: Date.now(), score, total, items };
    setState((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((q) =>
        q.id === id ? { ...q, attempts: [...q.attempts, attempt] } : q
      ),
    }));
  },
  newQuestionId: () => uid(),
};

// --- Chat sessions ----------------------------------------------------------

export const chatSessions = {
  create(firstMessage?: string): ChatSession {
    const now = Date.now();
    const s: ChatSession = {
      id: uid(),
      title: firstMessage ? firstMessage.slice(0, 40) : "New chat",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setState((prev) => ({ ...prev, chatSessions: [s, ...prev.chatSessions] }));
    return s;
  },
  rename(id: string, title: string) {
    setState((prev) => ({
      ...prev,
      chatSessions: prev.chatSessions.map((s) =>
        s.id === id ? { ...s, title: title.trim() || "Untitled", updatedAt: Date.now() } : s
      ),
    }));
  },
  setMessages(id: string, messages: ChatMessage[]) {
    setState((prev) => ({
      ...prev,
      chatSessions: prev.chatSessions.map((s) =>
        s.id === id ? { ...s, messages, updatedAt: Date.now() } : s
      ),
    }));
  },
  remove(id: string) {
    setState((prev) => ({
      ...prev,
      chatSessions: prev.chatSessions.filter((s) => s.id !== id),
    }));
  },
  setFolder(sessionId: string, folderId: string | undefined) {
    setState((prev) => ({
      ...prev,
      chatSessions: prev.chatSessions.map((s) =>
        s.id === sessionId ? { ...s, folderId, updatedAt: Date.now() } : s
      ),
    }));
  },
};

// --- Chat folders -----------------------------------------------------------

export const chatFolders = {
  create(name: string): ChatFolder {
    const f: ChatFolder = { id: uid(), name: name.trim() || "New folder", createdAt: Date.now() };
    setState((prev) => ({ ...prev, chatFolders: [...prev.chatFolders, f] }));
    return f;
  },
  rename(id: string, name: string) {
    setState((prev) => ({
      ...prev,
      chatFolders: prev.chatFolders.map((f) => f.id === id ? { ...f, name: name.trim() || "Folder" } : f),
    }));
  },
  remove(id: string) {
    setState((prev) => ({
      ...prev,
      chatFolders: prev.chatFolders.filter((f) => f.id !== id),
      chatSessions: prev.chatSessions.map((s) => s.folderId === id ? { ...s, folderId: undefined } : s),
    }));
  },
};

// --- Question banks ---------------------------------------------------------

export const questionBanks = {
  add(title: string, source: string, questions: Question[]): QuestionBank {
    const b: QuestionBank = { id: uid(), title, source, questions, createdAt: Date.now() };
    setState((prev) => ({ ...prev, questionBanks: [b, ...prev.questionBanks] }));
    return b;
  },
  remove(id: string) {
    setState((prev) => ({ ...prev, questionBanks: prev.questionBanks.filter((b) => b.id !== id) }));
  },
};

// --- Flashcards -------------------------------------------------------------

export const flashcards = {
  addDeck(cards: Omit<Flashcard, "id" | "createdAt">[]): Flashcard[] {
    const now = Date.now();
    const deck: Flashcard[] = cards.map((c) => ({ ...c, id: uid(), createdAt: now }));
    setState((prev) => ({ ...prev, flashcards: [...deck, ...prev.flashcards] }));
    return deck;
  },
  remove(id: string) {
    setState((prev) => ({ ...prev, flashcards: prev.flashcards.filter((f) => f.id !== id) }));
  },
};

// --- Videos -----------------------------------------------------------------

export const videos = {
  addBatch(recs: Omit<VideoRec, "id" | "createdAt">[]) {
    const now = Date.now();
    const newRecs: VideoRec[] = recs.map((r) => ({ ...r, id: uid(), createdAt: now }));
    setState((prev) => ({ ...prev, videos: [...newRecs, ...prev.videos] }));
    return newRecs;
  },
  keep(id: string) {
    setState((prev) => ({
      ...prev,
      videos: prev.videos.map((v) => (v.id === id ? { ...v, kept: true } : v)),
    }));
  },
  discard(id: string) {
    setState((prev) => ({ ...prev, videos: prev.videos.filter((v) => v.id !== id) }));
  },
  clearUnsaved(pageId?: string) {
    setState((prev) => ({
      ...prev,
      videos: prev.videos.filter((v) => v.kept || (pageId !== undefined && v.pageId !== pageId)),
    }));
  },
};

// --- Highlights -------------------------------------------------------------

export const highlights = {
  add(h: Highlight) {
    setState((prev) => ({ ...prev, highlights: [h, ...prev.highlights] }));
  },
  remove(id: string) {
    setState((prev) => ({ ...prev, highlights: prev.highlights.filter((h) => h.id !== id) }));
  },
  clearPage(pageId: string) {
    setState((prev) => ({ ...prev, highlights: prev.highlights.filter((h) => h.pageId !== pageId) }));
  },
};

// --- AI provider keys (ordered = fallback priority) -------------------------

export const aiKeys = {
  add(input: { provider: ProviderId; apiKey: string; baseUrl?: string; model?: string; label?: string; roles?: AiRole[] }): ProviderKey {
    const k: ProviderKey = {
      id: uid(),
      provider: input.provider,
      apiKey: input.apiKey.trim(),
      baseUrl: input.baseUrl?.trim() || undefined,
      model: input.model?.trim() || undefined,
      label: input.label?.trim() || undefined,
      roles: input.roles?.length ? input.roles : undefined,
    };
    setState((prev) => ({ ...prev, aiKeys: [...prev.aiKeys, k] }));
    return k;
  },
  remove(id: string) {
    setState((prev) => ({ ...prev, aiKeys: prev.aiKeys.filter((k) => k.id !== id) }));
  },
  updateRoles(id: string, roles: AiRole[]) {
    setState((prev) => ({
      ...prev,
      aiKeys: prev.aiKeys.map((k) =>
        k.id === id ? { ...k, roles: roles.length ? roles : undefined } : k
      ),
    }));
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

/** Save (or clear) the Puter API token. Stored locally only — never synced. */
export function setPuterApiToken(token: string) {
  setState((prev) => ({ ...prev, puterApiToken: token.trim() || undefined }));
}

/** Generic shallow-merge update for top-level AppData fields. */
export function updateAppData(patch: Partial<AppData>) {
  setState((prev) => ({ ...prev, ...patch }));
}
