import { Link } from "react-router-dom";
import { ArrowRight, Github, Info } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { summarizeProgress, tree, useAppData } from "@/lib/store";

export default function DashboardPage() {
  const data = useAppData();
  const p = summarizeProgress(data.nodes);
  const topics = tree.childrenOf(data.nodes, null).length;
  const noteCount = data.notesList.length;

  const STATS = [
    { label: "Topics", value: String(topics), hint: "Top-level learning topics" },
    { label: "Total nodes", value: String(p.total), hint: "Across your whole tree" },
    { label: "Completed", value: String(p.completed), hint: `${p.percent}% of all nodes` },
    { label: "Notes", value: String(noteCount), hint: "Saved notebooks" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-slate-400">
            Welcome to KnowHub. Connect your GitHub repository to start building your
            learning knowledge base.
          </p>
        </div>
        <Link
          to="/app/repository"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          <Github className="h-4 w-4" /> Connect repository
        </Link>
      </div>

      {/* Phase banner — honest status for early build */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm text-brand-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Foundation preview.</strong> The app shell, navigation and all module
          screens are in place and deploying automatically. Features (Google login, GitHub
          sync, AI tutor, tests) are being added module by module.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="text-3xl font-bold text-white">{s.value}</div>
            <div className="mt-1 text-sm font-medium text-slate-300">{s.label}</div>
            <div className="mt-1 text-xs text-slate-500">{s.hint}</div>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <h2 className="mt-10 text-lg font-semibold text-white">Modules</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.id}
              to={m.path}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-brand-500/40 hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600/20 text-brand-300">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-brand-300" />
              </div>
              <h3 className="mt-4 font-semibold text-white">{m.label}</h3>
              <p className="mt-1 text-sm text-slate-400">{m.summary}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
