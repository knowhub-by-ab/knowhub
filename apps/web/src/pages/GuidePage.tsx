import { Link } from "react-router-dom";
import {
  Compass,
  KeyRound,
  Network,
  Sparkles,
  FileText,
  ClipboardCheck,
  Search,
  TrendingUp,
  StickyNote,
  GitBranch,
  Smartphone,
  LogIn,
  type LucideIcon,
} from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  body: React.ReactNode;
  to?: string;
}

const STEPS: Step[] = [
  {
    icon: LogIn,
    title: "1. Sign in (recommended)",
    body: "Signing in with Google links your work to your account, so your keys, learning tree, notes, quizzes and progress sync across every device and the Android app. You can also use KnowHub signed-out — data then stays on this device only.",
  },
  {
    icon: KeyRound,
    title: "2. Add an AI key",
    body: (
      <>
        Open <b>Settings → AI provider keys</b> and add at least one free key (e.g. Google
        Gemini). Add several and drag the order — KnowHub tries them top-to-bottom and falls
        back automatically when one is rate-limited. This powers the AI Tutor and the
        “Generate” buttons.
      </>
    ),
    to: "/app/settings",
  },
  {
    icon: Network,
    title: "3. Build a Learning Tree",
    body: (
      <>
        Go to <b>Learning Tree</b>. Type a top-level topic and press Add, then hover a node
        to add sub-topics, rename, or delete. Click a status chip to cycle Pending → In
        progress → Completed.
      </>
    ),
    to: "/app/learning-tree",
  },
  {
    icon: Sparkles,
    title: "4. Or let AI build it for you",
    body: (
      <>
        On the Learning Tree (and Assessments) pages there's a <b>Generate</b> bar — type a
        topic like “Kubernetes” and AI creates a full nested path (or a quiz) for you.
      </>
    ),
    to: "/app/learning-tree",
  },
  {
    icon: FileText,
    title: "5. Write Learning Pages",
    body: (
      <>
        In <b>Learning Pages</b>, pick a topic and write notes in Markdown with a live
        preview. A green dot marks topics that already have a page.
      </>
    ),
    to: "/app/learning-pages",
  },
  {
    icon: ClipboardCheck,
    title: "6. Test yourself",
    body: (
      <>
        In <b>Assessments</b>, create a multiple-choice quiz (or generate one with AI), take
        it, and see your score and which answers were right. Your best score is tracked.
      </>
    ),
    to: "/app/assessments",
  },
  {
    icon: TrendingUp,
    title: "7. Track progress",
    body: (
      <>
        The <b>Progress</b> page shows your overall completion and a breakdown per topic. The{" "}
        <b>Dashboard</b> summarises everything at a glance.
      </>
    ),
    to: "/app/progress",
  },
  {
    icon: Search,
    title: "8. Find anything",
    body: (
      <>
        Use <b>Search</b> to instantly find topics, pages and notes as you type.
      </>
    ),
    to: "/app/search",
  },
  {
    icon: StickyNote,
    title: "9. Keep notes & resources",
    body: (
      <>
        Jot anything in your global <b>Notes</b> notebook, and save useful docs/videos/courses
        in <b>Resources</b>.
      </>
    ),
    to: "/app/notes",
  },
  {
    icon: GitBranch,
    title: "10. Back up to GitHub",
    body: (
      <>
        In <b>Repository</b>, connect GitHub and click <b>Sync to GitHub</b> to save a
        portable copy (Markdown + a JSON snapshot) to your own private repo — knowledge you
        fully own. Use <b>Import</b> to restore it anywhere.
      </>
    ),
    to: "/app/repository",
  },
  {
    icon: Smartphone,
    title: "11. Use it on Android",
    body: (
      <>
        Grab the Android app from the “Download Android App” button on the home page, or from
        the project's GitHub Releases. Signed in, it shows the same synced workspace.
      </>
    ),
  },
];

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
            A quick end-to-end walkthrough — from zero to a synced learning system.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 text-sm text-brand-100">
        <b>The idea:</b> KnowHub turns any topic into a structured path from beginner to
        professional. You own everything — it syncs to your account and backs up to your own
        GitHub repo.
      </div>

      <ol className="mt-6 space-y-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const inner = (
            <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-brand-500/40 hover:bg-white/[0.05]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-600/20 text-brand-300">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-white">{s.title}</h3>
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
