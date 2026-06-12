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

export interface AiSettings {
  /** Base URL of an OpenAI-compatible endpoint, e.g. http://localhost:3001/v1 */
  baseUrl: string;
  /** Bearer key (stored locally only). */
  apiKey: string;
  /** Model id; "auto" lets FreeLLMAPI's router choose. */
  model: string;
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

export interface AppData {
  version: 1;
  nodes: TreeNode[];
  /** Markdown learning page per node, keyed by node id (spec: Module 5). */
  pages: Record<string, string>;
  /** Single global markdown notebook (spec: Module 13 / 14). */
  notes: string;
  /** Resource library (spec: Module 14). */
  resources: Resource[];
  /** MCQ assessments (spec: Module 9). */
  quizzes: Quiz[];
  settings: AiSettings;
}

export const STATUS_LABELS: Record<NodeStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

/** Cycle order used when a user clicks a node's status chip. */
export const STATUS_CYCLE: NodeStatus[] = ["pending", "in_progress", "completed"];
