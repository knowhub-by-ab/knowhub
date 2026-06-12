import { Link } from "react-router-dom";
import {
  ArrowRight,
  Github,
  Smartphone,
  ShieldCheck,
  Sparkles,
  GitBranch,
  Network,
  MessagesSquare,
  Infinity as InfinityIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import { MODULES } from "@/lib/modules";

const PILLARS = [
  {
    icon: GitBranch,
    title: "You own your knowledge",
    body: "Every tree, page, note and test lives in your own GitHub repository — never locked inside an app.",
  },
  {
    icon: MessagesSquare,
    title: "AI as your tutor",
    body: "Generate learning paths, pages and quizzes. AI proposes; you approve every change.",
  },
  {
    icon: Network,
    title: "Beginner → professional",
    body: "Each topic is structured to take you from absolute beginner all the way to industry-ready.",
  },
  {
    icon: InfinityIcon,
    title: "Grows with you",
    body: "Unlimited nodes and depth. Your learning repository becomes a lifelong asset.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-aurora">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <a
            href="https://github.com/knowhub-by-ab/knowhub"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white sm:inline-flex"
          >
            <Github className="h-4 w-4" /> GitHub
          </a>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-500"
          >
            Open app <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-200">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered · GitHub-native · Free-first
        </span>
        <h1 className="mt-6 animate-fade-up text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Your personal{" "}
          <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
            learning operating system
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-slate-300">
          KnowHub helps you go from complete beginner to industry professional in any
          domain — with an AI tutor, a living knowledge graph, and a GitHub repository you
          fully own.
        </p>
        <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/app"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-500 sm:w-auto"
          >
            Start learning <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            disabled
            title="Coming soon — distributed via GitHub Releases"
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-slate-300 sm:w-auto"
          >
            <Smartphone className="h-4 w-4" /> Download Android App
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              soon
            </span>
          </button>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" /> No vendor lock-in. Your data stays in
          your GitHub repo.
        </p>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-brand-500/40 hover:bg-white/[0.05]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600/20 text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{p.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modules preview */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-bold text-white">
          Everything you need to learn, in one place
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
          A complete learning workspace — explore the modules already scaffolded in the
          app.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.id}
                to={m.path}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition hover:border-brand-500/40 hover:bg-white/[0.05]"
              >
                <Icon className="h-5 w-5 text-brand-300" />
                <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                  {m.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo />
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} KnowHub · MIT Licensed · Built free-first
          </p>
        </div>
      </footer>
    </div>
  );
}
