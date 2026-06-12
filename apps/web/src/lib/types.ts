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

export interface AppData {
  version: 1;
  nodes: TreeNode[];
  /** Single global markdown notebook (spec: Module 13 / 14). */
  notes: string;
  settings: AiSettings;
}

export const STATUS_LABELS: Record<NodeStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

/** Cycle order used when a user clicks a node's status chip. */
export const STATUS_CYCLE: NodeStatus[] = ["pending", "in_progress", "completed"];
