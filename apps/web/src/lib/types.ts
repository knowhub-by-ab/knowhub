// Core domain types for KnowHub's local-first data layer.
// Phase 2: persisted in the browser (localStorage). Later phases sync this
// model to the user's GitHub repository (the source of truth, per spec 02).

export type NodeStatus = "pending" | "in_progress" | "completed";

export interface TreeNode {
  id: string;
  title: string;
  /** null = root-level node. */
  parentId: string | null;
  status: NodeStatus;
  /** Sort order among siblings. */
  order: number;
  createdAt: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type ProviderId =
  | "apifreellm"
  | "gemini"
  | "groq"
  | "openrouter"
  | "openai"
  | "custom";

/**
 * One configured AI provider key. The list order in AppData.aiKeys is the
 * fallback priority (first = tried first). Stored locally in the browser and
 * sent to the /api/chat backend per request, so keys can be managed from the
 * dashboard without redeploying.
 */
export interface ProviderKey {
  id: string;
  provider: ProviderId;
  apiKey: string;
  /** Required only for `custom`; otherwise filled from the provider preset. */
  baseUrl?: string;
  /** Optional model override; otherwise the preset default / "auto". */
  model?: string;
  /** Optional friendly label. */
  label?: string;
}

export type ResourceType = "doc" | "article" | "video" | "course" | "book" | "other";

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  createdAt: number;
}

export interface Question {
  id: string;
  prompt: string;
  options: string[];
  /** Indices of correct option(s). More than one ⇒ multiple-choice. */
  correct: number[];
}

export interface Attempt {
  at: number;
  score: number;
  total: number;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  attempts: Attempt[];
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface GithubState {
  /** OAuth access token (repo scope). */
  token?: string;
  /** Authenticated GitHub login (username). */
  login?: string;
  /** Connected repo name (under the user's account). */
  repo?: string;
  /** Last successful sync (epoch ms). */
  lastSync?: number;
}

export interface AppData {
  version: 1;
  nodes: TreeNode[];
  /** Markdown learning page per node, keyed by node id (spec: Module 5). */
  pages: Record<string, string>;
  /** Multiple titled markdown notes (spec: Module 13 / 14). */
  notesList: Note[];
  /** Resource library (spec: Module 14). */
  resources: Resource[];
  /** MCQ assessments (spec: Module 9). */
  quizzes: Quiz[];
  /** Configured AI provider keys, in fallback-priority order. */
  aiKeys: ProviderKey[];
  /** GitHub connection (spec 09). */
  github?: GithubState;
}

export const STATUS_LABELS: Record<NodeStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

/** Cycle order used when a user clicks a node's status chip. */
export const STATUS_CYCLE: NodeStatus[] = ["pending", "in_progress", "completed"];
