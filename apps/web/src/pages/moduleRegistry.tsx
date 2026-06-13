import { lazy, type ComponentType, type LazyExoticComponent } from "react";

// Each implemented module is lazy-loaded so it ships as its own chunk and only
// downloads when the route is opened. Modules not listed here fall back to the
// on-roadmap placeholder.
export const IMPLEMENTED_MODULES: Record<
  string,
  LazyExoticComponent<ComponentType>
> = {
  "learning-tree": lazy(() => import("@/pages/LearningTreePage")),
  "knowledge-graph": lazy(() => import("@/pages/KnowledgeGraphPage")),
  "learning-pages": lazy(() => import("@/pages/LearningPagesPage")),
  search: lazy(() => import("@/pages/SearchPage")),
  progress: lazy(() => import("@/pages/ProgressPage")),
  notes: lazy(() => import("@/pages/NotesPage")),
  resources: lazy(() => import("@/pages/ResourcesPage")),
  assessments: lazy(() => import("@/pages/AssessmentsPage")),
  repository: lazy(() => import("@/pages/RepositoryPage")),
  guide: lazy(() => import("@/pages/GuidePage")),
  settings: lazy(() => import("@/pages/SettingsPage")),
  "ai-chat": lazy(() => import("@/pages/AiChatPage")),
};
