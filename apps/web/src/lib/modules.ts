import {
  LayoutDashboard,
  Network,
  Share2,
  FileText,
  MessagesSquare,
  Search,
  ClipboardCheck,
  TrendingUp,
  StickyNote,
  Library,
  GitBranch,
  Settings,
  Compass,
  BookOpen,
  Layers,
  Youtube,
  Mic,
  Archive,
  type LucideIcon,
} from "lucide-react";

export interface ModuleDef {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** One-line description, shown on dashboard cards. */
  summary: string;
  /** PRD module reference for traceability. */
  prdRef: string;
}

/**
 * The MVP module set, per 01_PRD.md (Core Product Modules) and
 * 22_MVP_TO_V1_ROADMAP.md (MVP Feature Set). Each currently renders a
 * placeholder screen; features are implemented incrementally in later phases.
 */
export const MODULES: ModuleDef[] = [
  {
    id: "learning-tree",
    label: "Learning Tree",
    path: "/app/learning-tree",
    icon: Network,
    summary: "Expandable, nested learning paths from beginner to professional.",
    prdRef: "Module 3",
  },
  {
    id: "knowledge-graph",
    label: "Knowledge Graph",
    path: "/app/knowledge-graph",
    icon: Share2,
    summary: "Cross-domain relationships and dependency mapping between topics.",
    prdRef: "Module 4",
  },
  {
    id: "learning-pages",
    label: "Learning Pages",
    path: "/app/learning-pages",
    icon: FileText,
    summary: "Markdown knowledge pages stored in your GitHub repository.",
    prdRef: "Module 5",
  },
  {
    id: "ai-chat",
    label: "AI Tutor",
    path: "/app/ai-chat",
    icon: MessagesSquare,
    summary: "Ask, explain, and generate pages and tests with your AI tutor.",
    prdRef: "Module 6",
  },
  {
    id: "search",
    label: "Search",
    path: "/app/search",
    icon: Search,
    summary: "Keyword and semantic search across your whole knowledge base.",
    prdRef: "Module 7",
  },
  {
    id: "assessments",
    label: "Assessments",
    path: "/app/assessments",
    icon: ClipboardCheck,
    summary: "MCQ tests with scoring, weak-area detection and recommendations.",
    prdRef: "Module 9",
  },
  {
    id: "progress",
    label: "Progress",
    path: "/app/progress",
    icon: TrendingUp,
    summary: "Track node, tree, domain and overall learning progress.",
    prdRef: "Module 8",
  },
  {
    id: "notes",
    label: "Notes",
    path: "/app/notes",
    icon: StickyNote,
    summary: "A single global notebook for ideas, journals and scratch work.",
    prdRef: "Module 13",
  },
  {
    id: "resources",
    label: "Resources",
    path: "/app/resources",
    icon: Library,
    summary: "Curated docs, articles, videos and courses — free first.",
    prdRef: "Module 14",
  },
  {
    id: "repository",
    label: "Repository",
    path: "/app/repository",
    icon: GitBranch,
    summary: "Connect a GitHub repo as the source of truth for your knowledge.",
    prdRef: "Module 2",
  },
  {
    id: "videos",
    label: "Videos",
    path: "/app/videos",
    icon: Youtube,
    summary: "AI-suggested YouTube videos (<20 min) for your topics.",
    prdRef: "Module G6",
  },
  {
    id: "podcast",
    label: "Podcast",
    path: "/app/podcast",
    icon: Mic,
    summary: "Listen to your learning pages read aloud, one episode at a time.",
    prdRef: "Module G7",
  },
  {
    id: "question-bank",
    label: "Question Bank",
    path: "/app/question-bank",
    icon: BookOpen,
    summary: "Generate question banks from your pages or any text.",
    prdRef: "Module E6",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    path: "/app/flashcards",
    icon: Layers,
    summary: "Generate flashcards from learning pages and review them.",
    prdRef: "Module G5",
  },
  {
    id: "guide",
    label: "KnowHub Guide",
    path: "/app/guide",
    icon: Compass,
    summary: "New here? A step-by-step walkthrough of how to use KnowHub.",
    prdRef: "Onboarding",
  },
  {
    id: "settings",
    label: "Settings",
    path: "/app/settings",
    icon: Settings,
    summary: "AI providers, sync preferences and account configuration.",
    prdRef: "Module 7 (AI Providers)",
  },
  {
    id: "bulk-download",
    label: "Bulk Download",
    path: "/app/bulk-download",
    icon: Archive,
    summary: "Download multiple learning pages as a ZIP file.",
    prdRef: "Module G8",
  },
];

export const DASHBOARD = {
  id: "dashboard",
  label: "Dashboard",
  path: "/app",
  icon: LayoutDashboard,
} as const;

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
}
