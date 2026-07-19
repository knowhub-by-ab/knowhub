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
  | "puter"
  | "custom";

/** Role tag for routing AI requests to the right key. */
export type AiRole = "tree" | "pages" | "assessments" | "other" | "any";

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
  /**
   * Role tags for routing: requests prefer keys that include the matching role
   * (or "any"). Omitting roles is equivalent to ["any"].
   */
  roles?: AiRole[];
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
  /** One-line explanation shown after submission. */
  explanation?: string;
}

export interface AttemptItem {
  questionId: string;
  prompt: string;
  options: string[];
  correct: number[];
  chosen: number[];
  isCorrect: boolean;
  explanation?: string;
}

export interface Attempt {
  id: string;
  takenAt: number;
  score: number;
  total: number;
  /** Full snapshot of the attempt (questions + answers). */
  items: AttemptItem[];
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

export interface QuestionBank {
  id: string;
  title: string;
  source: string;
  questions: Question[];
  createdAt: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  pageId?: string;
  createdAt: number;
}

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export interface Highlight {
  id: string;
  pageId: string;
  text: string;
  prefix: string;
  suffix: string;
  color: HighlightColor;
  createdAt: number;
}

export interface ChatFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  folderId?: string;
  messages: ChatMessage[];
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
  /** AI Tutor chat sessions (heavy → GitHub). */
  chatSessions: ChatSession[];
  /** Question banks generated from pages, docs, or text. */
  questionBanks: QuestionBank[];
  /** Flashcard decks. */
  flashcards: Flashcard[];
  /** Text highlights on learning pages. */
  highlights: Highlight[];
  /** YouTube video recommendations. */
  videos: VideoRec[];
  /** Chat session folders. */
  chatFolders: ChatFolder[];
  /** Puter API token for TTS/MP3 download (stored locally only, never synced). */
  puterApiToken?: string;
}

export interface VideoRec {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  /** Duration in seconds (0 = unknown). */
  durationSec: number;
  /** Learning page node id this was suggested for, if any. */
  pageId?: string;
  /** Free-text topic if not tied to a page. */
  topic?: string;
  /** Validated via YouTube Data API (true) or oEmbed/AI-claimed (false). */
  validated: boolean;
  /** User kept this rec (vs. discarded). */
  kept: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Presentations — Slide Deck, Video, Collections
// ---------------------------------------------------------------------------

export type SlideType = "title" | "content" | "section" | "quiz" | "closing";

export type ImageLayout =
  | "full-background"
  | "right-half"
  | "top-banner"
  | "inline-below-title"
  | "bottom-strip"
  | "none";

export type ImageSource = "pollinations" | "svgrepo" | "openclipart" | "local" | "none";

export interface SlideImage {
  source: ImageSource;
  /** Text prompt sent to Pollinations AI. */
  prompt?: string;
  /** Resolved public URL (Pollinations result, SVGRepo, OpenClipart). */
  url?: string;
  /** Base64 data URI for locally-picked files. */
  dataUrl?: string;
  layout: ImageLayout;
  altText?: string;
}

export interface Slide {
  id: string;
  type: SlideType;
  title: string;
  bullets: string[];
  /** Shown in presenter view and handout PDF — not on the slide itself. */
  speakerNotes: string;
  /** Spoken text fed to Web Speech API / audio export. */
  narrationScript: string;
  /** AI-suggested image prompt; user may edit before fetching. */
  imagePrompt: string;
  image?: SlideImage;
  /** Reference to a Question id in the existing QuestionBank, for quiz slides. */
  quizQuestionId?: string;
  order: number;
}

export type NarrationTone = "formal" | "conversational" | "enthusiastic";
export type AudienceLevel = "beginner" | "intermediate" | "expert";
export type SlideTheme =
  | "aurora-dark"
  | "corporate-blue"
  | "edu-warm"
  | "minimal-white"
  | "tech-green"
  | "sunset-orange"
  | "ocean-teal"
  | "slate-pro";

export type ImageStyle = "photorealistic" | "illustration" | "minimal" | "flat-icon" | "none";

export interface DeckFrontmatter {
  theme: SlideTheme;
  accentColor?: string;
  font?: string;
  imageStyle: ImageStyle;
  slideCount?: number;
  audienceLevel: AudienceLevel;
  language: string;
  narrationTone: NarrationTone;
  /** Voice name from Web Speech API getVoices(). */
  voiceName?: string;
  speechRate?: number;
  speechPitch?: number;
}

export interface PresentationDeck {
  id: string;
  title: string;
  /** KnowHub learning-page node id, if generated from one. */
  sourceNodeId?: string;
  /** Raw markdown that was transformed into this deck. */
  sourceMd?: string;
  frontmatter: DeckFrontmatter;
  slides: Slide[];
  /** GitHub release asset id for the exported .pptx, if uploaded. */
  pptxAssetId?: number;
  pptxAssetUrl?: string;
  /** GitHub release asset id for the exported .webm video, if uploaded. */
  videoAssetId?: number;
  videoAssetUrl?: string;
  /** Path to thumbnail PNG committed in the repo. */
  thumbnailPath?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// GitHub Release Assets (for large binary storage)
// ---------------------------------------------------------------------------

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  /** Direct browser download URL (works with auth header for private repos). */
  url: string;
  browser_download_url: string;
  created_at: string;
}

export interface AssetsRelease {
  id: number;
  upload_url: string;
}

// ---------------------------------------------------------------------------
// Collections — folders / playlists / albums grouping decks and videos
// ---------------------------------------------------------------------------

export type CollectionType = "folder" | "playlist" | "album";

export interface CollectionItem {
  type: "deck" | "video";
  /** deckId for decks, VideoRec.id for videos. */
  refId: string;
  order: number;
  addedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  type: CollectionType;
  /** deckId whose thumbnail is used as the collection cover. */
  coverDeckId?: string;
  items: CollectionItem[];
  createdAt: number;
  updatedAt: number;
}

export const STATUS_LABELS: Record<NodeStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

/** Cycle order used when a user clicks a node's status chip. */
export const STATUS_CYCLE: NodeStatus[] = ["pending", "in_progress", "completed"];
