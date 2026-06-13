import type { JSX } from "react";
import LearningTreePage from "@/pages/LearningTreePage";
import KnowledgeGraphPage from "@/pages/KnowledgeGraphPage";
import LearningPagesPage from "@/pages/LearningPagesPage";
import SearchPage from "@/pages/SearchPage";
import ProgressPage from "@/pages/ProgressPage";
import NotesPage from "@/pages/NotesPage";
import ResourcesPage from "@/pages/ResourcesPage";
import AssessmentsPage from "@/pages/AssessmentsPage";
import RepositoryPage from "@/pages/RepositoryPage";
import GuidePage from "@/pages/GuidePage";
import SettingsPage from "@/pages/SettingsPage";
import AiChatPage from "@/pages/AiChatPage";

/**
 * Maps a module id to its implemented page. Modules not listed here fall back
 * to the on-roadmap placeholder. Add an entry as each module is built.
 */
export const IMPLEMENTED_MODULES: Record<string, () => JSX.Element> = {
  "learning-tree": LearningTreePage,
  "knowledge-graph": KnowledgeGraphPage,
  "learning-pages": LearningPagesPage,
  search: SearchPage,
  progress: ProgressPage,
  notes: NotesPage,
  resources: ResourcesPage,
  assessments: AssessmentsPage,
  repository: RepositoryPage,
  guide: GuidePage,
  settings: SettingsPage,
  "ai-chat": AiChatPage,
};
