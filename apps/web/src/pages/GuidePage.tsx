import { Link } from "react-router-dom";
import {
  Compass,
  KeyRound,
  Network,
  FileText,
  ClipboardCheck,
  Search,
  TrendingUp,
  StickyNote,
  GitBranch,
  Smartphone,
  LogIn,
  Layers,
  BookOpen,
  Youtube,
  Highlighter,
  MessagesSquare,
  Volume2,
  Mic,
  Presentation,
  type LucideIcon,
} from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  body: React.ReactNode;
  to?: string;
  tag?: string;
}

const STEPS: Step[] = [
  {
    icon: LogIn,
    title: "1. Sign in (recommended)",
    body: "Signing in with Google links your work to your account — your AI keys, learning tree, notes, quizzes, and progress sync across every device and the Android app. You can also use KnowHub signed-out; data then stays on this device only.",
  },
  {
    icon: KeyRound,
    title: "2. Add an AI provider key",
    body: (
      <>
        Open <b>Settings → AI provider keys</b> and add at least one free key (e.g. Google
        Gemini, Groq, or Puter — Puter is completely free with no API key needed). Add several
        keys and assign them roles: <b>Tree</b> (generates your learning path), <b>Pages</b>{" "}
        (writes content), <b>Assessments</b> (creates quizzes). KnowHub tries keys top-to-bottom
        and falls back automatically when one is rate-limited.
      </>
    ),
    to: "/app/settings",
  },
  {
    icon: Network,
    title: "3. Build a Learning Tree",
    body: (
      <>
        Go to <b>Learning Tree</b>. Type a top-level topic and press Add, then hover a node to
        add sub-topics, rename, or delete. Click a status chip to cycle Pending → In progress →
        Completed. Use <b>A · Free-style Prompt</b> for a plain description, or{" "}
        <b>B · Structured Prompt</b> to pick skill level (Absolute Novice → Industry Standards)
        and writing style. Upload a <b>PDF/DOCX syllabus</b> to auto-generate a tree from it.
        The <b>Improve Tree</b> panel lets you scope improvements to a specific subtree using the
        cascading node pickers — select a root, then optionally narrow to a start node and depth
        limit. All AI suggestions appear in a <b>proposal review panel</b> where you toggle
        which ones to accept before they're added.
      </>
    ),
    to: "/app/learning-tree",
    tag: "Updated",
  },
  {
    icon: FileText,
    title: "4. Write and generate Learning Pages",
    body: (
      <>
        In <b>Learning Pages</b>, pick a topic from the sticky left panel and write notes in
        Markdown. The live preview renders diagrams (Mermaid) automatically. Use the AI bar to{" "}
        <b>Generate</b> a page from scratch or <b>Improve</b> an existing one — choose
        Free-style or Structured mode. Toolbar shortcuts: <b>Copy</b>, <b>Listen</b> (TTS),{" "}
        <b>Download</b> (MD / Word / PDF), <b>Discuss</b> (opens ChatGPT or Gemini with the
        page content pre-filled). Select text in preview to <b>highlight</b> it in four colors
        — highlights are saved and restored on next visit.
      </>
    ),
    to: "/app/learning-pages",
  },
  {
    icon: Volume2,
    title: "5. Listen with the TTS player",
    body: (
      <>
        Click <b>Listen</b> on any Learning Page to start reading it aloud using your browser's
        built-in text-to-speech. A <b>persistent player bar</b> appears at the bottom of the
        screen with full controls: play/pause, stop, ⏪ rewind 30 s, ⏩ fast-forward 30 s,
        speed selector (0.5× → 2×), and voice selector. On Android, <b>lock-screen media
        controls</b> appear automatically via the Media Session API. Configure a{" "}
        <b>global cloned voice</b> (ElevenLabs, Fish Audio, or Resemble AI) in Settings to use
        a realistic voice across all decks and podcasts.
      </>
    ),
    to: "/app/learning-pages",
    tag: "TTS",
  },
  {
    icon: Mic,
    title: "6. Listen to the Podcast",
    body: (
      <>
        The <b>Podcast</b> page turns your Learning Pages into a listenable playlist. Tree
        roots are shown collapsed — tap to expand a section and see its episodes. Each episode
        shows its estimated reading time and your listen progress. Press <b>Play</b> (or{" "}
        <b>Resume</b> if you've started before) to begin. The now-playing banner gives you{" "}
        <b>Prev / Next</b> controls to move between episodes. Click the <b>Download</b> button
        next to any episode to save it as an audio file — KnowHub tries Puter TTS (MP3) first,
        then captures your browser's tab audio via screen share as a fallback.
      </>
    ),
    to: "/app/podcast",
    tag: "Podcast",
  },
  {
    icon: ClipboardCheck,
    title: "7. Test yourself with Assessments",
    body: (
      <>
        In <b>Assessments</b>, generate a multiple-choice quiz by topic or from a specific
        Learning Page. After submitting, see your score, explanations for each answer, and a
        history of all past attempts. The <b>Progress</b> page links directly to weak areas so
        you can jump straight to a quiz with pre-filled settings.
      </>
    ),
    to: "/app/assessments",
  },
  {
    icon: BookOpen,
    title: "8. Build Question Banks",
    body: (
      <>
        In <b>Question Bank</b>, generate a bank of 10–50 questions from a Learning Page, pasted
        text, or an uploaded file. Banks are saved permanently, exportable as Markdown, and great
        for revision or sharing.
      </>
    ),
    to: "/app/question-bank",
  },
  {
    icon: Layers,
    title: "9. Review with Flashcards",
    body: (
      <>
        In <b>Flashcards</b>, pick a Learning Page using the cascading topic picker and generate
        a flashcard deck. Review in flip-card mode with Prev / Next / Shuffle. Decks are grouped
        by page and saved permanently. <b>Rename</b> any deck with the pencil icon and{" "}
        <b>reorder</b> decks with the up/down arrows.
      </>
    ),
    to: "/app/flashcards",
  },
  {
    icon: Youtube,
    title: "10. Find YouTube videos",
    body: (
      <>
        In <b>Videos</b>, enter a topic or select a Learning Page (using the cascading topic
        picker) and AI suggests relevant YouTube videos under 20 minutes. Watch in-app, bookmark
        what you like, discard the rest. Organise saved videos into <b>playlists</b> using the
        sidebar — create named playlists, reorder videos within them with the arrow buttons, and
        add any video to multiple playlists from the playlist icon.
      </>
    ),
    to: "/app/videos",
  },
  {
    icon: Highlighter,
    title: "11. Highlight and annotate",
    body: (
      <>
        In the <b>Learning Pages preview</b>, select any text to reveal a mini color toolbar —
        yellow, green, blue, or pink. Highlights are saved in your browser and reapplied every
        time you open the page. Clear all highlights for a page with one click.
      </>
    ),
    to: "/app/learning-pages",
  },
  {
    icon: TrendingUp,
    title: "12. Track your progress",
    body: (
      <>
        The <b>Progress</b> page shows overall completion percentage, a per-topic breakdown,
        quiz performance trends, and coverage gaps. Click any gap link to jump straight to a
        pre-filled assessment.
      </>
    ),
    to: "/app/progress",
  },
  {
    icon: MessagesSquare,
    title: "13. Chat with the AI Tutor",
    body: (
      <>
        The <b>AI Tutor</b> is context-aware — it knows your learning tree and existing pages.
        Each conversation is a named session (create, rename, delete from the left rail). Ask
        anything: explain a concept, compare two approaches, or ask for page improvement ideas.
      </>
    ),
    to: "/app/ai-chat",
  },
  {
    icon: Search,
    title: "14. Search everything",
    body: (
      <>
        Use <b>Search</b> to instantly find topics, pages, notes, and resources as you type.
      </>
    ),
    to: "/app/search",
  },
  {
    icon: StickyNote,
    title: "15. Notes & Resources",
    body: (
      <>
        Jot anything in your global <b>Notes</b> notebook (multiple titled notes, Markdown). Save
        useful docs, articles, videos, and courses in <b>Resources</b>. Organise resources into
        named <b>collections</b> using the sidebar — create, rename, reorder, and delete
        collections, then filter the resource list by collection.
      </>
    ),
    to: "/app/notes",
  },
  {
    icon: Presentation,
    title: "16. Create Presentations",
    body: (
      <>
        The <b>Presentations</b> tab lets you create slide decks from any Learning Page or
        Markdown document. Use the <b>MD Editor</b> tab to paste/upload content, edit it with AI
        chat, and click <b>Generate Slides →</b> to produce a full deck. Use{" "}
        <code className="rounded bg-white/10 px-1 text-xs">{"<!-- layout: \"two-column\" -->"}</code>{" "}
        directives in Markdown to hint slide layouts. Choose from 8 built-in themes or upload a{" "}
        <b>PPTX/POTX template</b> (Templates tab) for brand-consistent slides. Import an
        existing PPTX to edit it, or export any deck as a .pptx file.
      </>
    ),
    to: "/app/presentations",
    tag: "New",
  },
  {
    icon: GitBranch,
    title: "18. Back up to GitHub",
    body: (
      <>
        In <b>Repository</b>, connect your GitHub account and press <b>Sync to GitHub</b> to
        save a portable copy (Markdown pages + JSON snapshot) to your own private repo — your
        knowledge, fully owned by you. Use <b>Import from GitHub</b> to restore on any device.
        The header sync button keeps both directions up to date. <b>Auto-sync</b> fires
        automatically 10 s after any change when GitHub is connected.
      </>
    ),
    to: "/app/repository",
  },
  {
    icon: Smartphone,
    title: "19. Use it on Android",
    body: (
      <>
        Download the Android app from the "Download Android App" button on the home page or from
        the GitHub Releases page. Sign in with the same Google account to get your fully synced
        workspace on mobile.
      </>
    ),
  },
];

const TAG_COLORS: Record<string, string> = {
  TTS: "bg-violet-500/20 text-violet-300 ring-violet-500/30",
  Podcast: "bg-brand-500/20 text-brand-300 ring-brand-500/30",
  New: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  Updated: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
};

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Compass className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">How to use KnowHub</h1>
          <p className="text-sm text-slate-400">
            A complete walkthrough — from zero to a fully synced personal learning system.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 text-sm text-brand-100">
        <b>The idea:</b> KnowHub turns any topic into a structured learning path from beginner
        to professional. Build your tree, generate and read pages, test yourself, highlight key
        ideas, watch curated videos — all saved to your browser and backed up to your own GitHub
        repo. You own everything.
      </div>

      <ol className="mt-6 space-y-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const inner = (
            <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-brand-500/40 hover:bg-white/[0.05]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-600/20 text-brand-300">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{s.title}</h3>
                  {s.tag && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TAG_COLORS[s.tag] ?? "bg-brand-500/20 text-brand-300 ring-brand-500/30"}`}>
                      {s.tag}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">{s.body}</p>
              </div>
            </div>
          );
          return (
            <li key={s.title}>
              {s.to ? (
                <Link to={s.to} className="block">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 text-center">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
