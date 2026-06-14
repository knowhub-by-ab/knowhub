import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Network,
  ChevronRight,
  ChevronDown,
  FileText,
  ClipboardCheck,
  ArrowRight,
  Award,
  AlertTriangle,
} from "lucide-react";
import { summarizeProgress, tree, useAppData } from "@/lib/store";
import type { AppData, TreeNode } from "@/lib/types";

const pageLink = (title: string) => `/app/learning-pages?topic=${encodeURIComponent(title)}`;

function subtree(nodes: TreeNode[], rootId: string): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (id: string) => {
    for (const c of tree.childrenOf(nodes, id)) {
      out.push(c);
      walk(c.id);
    }
  };
  walk(rootId);
  return out;
}

function Ring({ percent, size = 56 }: { percent: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f2937" strokeWidth={6} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#8b5cf6"
        strokeWidth={6}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={13} fill="#e2e8f0">
        {percent}%
      </text>
    </svg>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 140;
  const h = 32;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - (Math.max(0, Math.min(100, v)) / 100) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#a78bfa" strokeWidth={2} />
    </svg>
  );
}

function quizMatchesTitle(quizTitle: string, nodeTitle: string): boolean {
  const q = quizTitle.toLowerCase();
  const t = nodeTitle.toLowerCase();
  return q === t || (t.length >= 4 && q.includes(t)) || (q.length >= 4 && t.includes(q));
}

export default function ProgressPage() {
  const data = useAppData();
  const overall = summarizeProgress(data.nodes);
  const roots = tree.childrenOf(data.nodes, null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "high" | "low">("low");
  const [hideDone, setHideDone] = useState(false);

  // ---- Quiz analytics (C) ----
  const quizStats = useMemo(() => {
    const withAttempts = data.quizzes.filter((q) => q.attempts.length);
    const bestPctOf = (qz: AppData["quizzes"][number]) =>
      Math.max(...qz.attempts.map((a) => (a.total ? (a.score / a.total) * 100 : 0)));
    const bests = withAttempts.map(bestPctOf);
    const allAttempts = data.quizzes
      .flatMap((q) => q.attempts.map((a) => ({ at: a.at, pct: a.total ? (a.score / a.total) * 100 : 0 })))
      .sort((a, b) => a.at - b.at);
    const passRate =
      allAttempts.length === 0
        ? 0
        : Math.round((allAttempts.filter((a) => a.pct >= 70).length / allAttempts.length) * 100);
    return {
      quizzes: data.quizzes.length,
      taken: withAttempts.length,
      attempts: allAttempts.length,
      avgBest: bests.length ? Math.round(bests.reduce((s, x) => s + x, 0) / bests.length) : 0,
      passRate,
      trend: allAttempts.slice(-20).map((a) => a.pct),
      weakest: withAttempts
        .map((q) => ({ title: q.title, best: Math.round(bestPctOf(q)) }))
        .filter((q) => q.best < 70)
        .sort((a, b) => a.best - b.best)
        .slice(0, 4),
    };
  }, [data.quizzes]);

  // ---- Actionable lists (B) ----
  const continueItems = useMemo(() => {
    const inProgress = data.nodes.filter((n) => n.status === "in_progress");
    const pending = data.nodes.filter((n) => n.status === "pending");
    return [...inProgress, ...pending].slice(0, 6);
  }, [data.nodes]);

  const noPage = useMemo(
    () => data.nodes.filter((n) => !data.pages[n.id]?.trim()),
    [data.nodes, data.pages]
  );
  const completedUntested = useMemo(
    () =>
      data.nodes.filter(
        (n) => n.status === "completed" && !data.quizzes.some((q) => quizMatchesTitle(q.title, n.title))
      ),
    [data.nodes, data.quizzes]
  );

  // ---- Mastery (C-10): completed AND a matching quiz with best >= 80% ----
  const mastered = useMemo(() => {
    return data.nodes.filter((n) => {
      if (n.status !== "completed") return false;
      const qs = data.quizzes.filter((q) => q.attempts.length && quizMatchesTitle(q.title, n.title));
      if (!qs.length) return false;
      const best = Math.max(
        ...qs.flatMap((q) => q.attempts.map((a) => (a.total ? (a.score / a.total) * 100 : 0)))
      );
      return best >= 80;
    }).length;
  }, [data.nodes, data.quizzes]);

  // ---- Per-topic breakdown (A) ----
  const perTopic = useMemo(() => {
    const list = roots.map((root) => {
      const all = [root, ...subtree(data.nodes, root.id)];
      return { root, summary: summarizeProgress(all), children: tree.childrenOf(data.nodes, root.id) };
    });
    let filtered = hideDone ? list.filter((t) => t.summary.percent < 100) : list;
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.root.title.localeCompare(b.root.title);
      if (sortBy === "high") return b.summary.percent - a.summary.percent;
      return a.summary.percent - b.summary.percent;
    });
    return filtered;
  }, [roots, data.nodes, sortBy, hideDone]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <TrendingUp className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Progress</h1>
          <p className="text-sm text-slate-400">Track how far you've come and what to do next.</p>
        </div>
      </div>

      {overall.total === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <Network className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-3 text-sm text-slate-400">
            No topics yet. Build your{" "}
            <Link to="/app/learning-tree" className="text-brand-300 underline">
              Learning Tree
            </Link>{" "}
            to see progress here.
          </p>
        </div>
      ) : (
        <>
          {/* Overall + status bar (A-1) */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center gap-5">
              <Ring percent={overall.percent} size={72} />
              <div className="min-w-0 flex-1">
                <div className="flex items-end justify-between">
                  <h2 className="font-semibold text-white">Overall completion</h2>
                  <span className="text-sm text-slate-400">{overall.total} nodes</span>
                </div>
                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="bg-emerald-500" style={{ width: `${(overall.completed / overall.total) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${(overall.inProgress / overall.total) * 100}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span><span className="font-semibold text-emerald-400">{overall.completed}</span> completed</span>
                  <span><span className="font-semibold text-amber-400">{overall.inProgress}</span> in progress</span>
                  <span><span className="font-semibold text-slate-300">{overall.pending}</span> pending</span>
                  {mastered > 0 && (
                    <span className="inline-flex items-center gap-1 text-brand-300">
                      <Award className="h-3.5 w-3.5" /> {mastered} mastered
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quiz performance (C-8/9) */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-semibold text-white">Assessment performance</h2>
            {quizStats.attempts === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                No quizzes taken yet.{" "}
                <Link to="/app/assessments" className="text-brand-300 underline">
                  Create or take a quiz
                </Link>{" "}
                to track scores.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <Stat label="Avg best score" value={`${quizStats.avgBest}%`} />
                <Stat label="Pass rate" value={`${quizStats.passRate}%`} />
                <Stat label="Quizzes taken" value={`${quizStats.taken}/${quizStats.quizzes}`} />
                <Stat label="Attempts" value={`${quizStats.attempts}`} />
                <div className="ml-auto">
                  <div className="text-xs text-slate-500">Score trend</div>
                  <Spark values={quizStats.trend} />
                </div>
              </div>
            )}
          </div>

          {/* Continue learning (B-5) */}
          {continueItems.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="font-semibold text-white">Continue learning</h2>
              <div className="mt-3 space-y-2">
                {continueItems.map((n) => (
                  <Link
                    key={n.id}
                    to={pageLink(n.title)}
                    className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:border-brand-500/40 hover:bg-white/[0.05]"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        n.status === "in_progress" ? "bg-amber-400" : "bg-slate-500"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-slate-200">{n.title}</span>
                    <span className="text-xs text-slate-500">
                      {n.status === "in_progress" ? "In progress" : "Pending"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-brand-300" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Coverage gaps + recommendations (B-6/7) */}
          {(noPage.length > 0 || completedUntested.length > 0 || quizStats.weakest.length > 0) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {noPage.length > 0 && (
                <GapCard
                  icon={FileText}
                  title={`${noPage.length} topic${noPage.length === 1 ? "" : "s"} without a page`}
                  items={noPage.slice(0, 5).map((n) => ({ id: n.id, title: n.title, to: pageLink(n.title) }))}
                  cta="Write or generate it"
                />
              )}
              {completedUntested.length > 0 && (
                <GapCard
                  icon={ClipboardCheck}
                  title={`${completedUntested.length} completed topic${completedUntested.length === 1 ? "" : "s"} not tested`}
                  items={completedUntested.slice(0, 5).map((n) => ({ id: n.id, title: n.title, to: "/app/assessments" }))}
                  cta="Make a quiz"
                />
              )}
              {quizStats.weakest.length > 0 && (
                <GapCard
                  icon={AlertTriangle}
                  title="Weak areas to revisit"
                  items={quizStats.weakest.map((q) => ({ id: q.title, title: `${q.title} — ${q.best}%`, to: "/app/assessments" }))}
                  cta="Retake quiz"
                />
              )}
            </div>
          )}

          {/* Per-topic breakdown (A-2/3/4) */}
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">By topic</h2>
            <div className="flex items-center gap-2 text-xs">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-md border border-white/15 bg-slate-900/60 px-2 py-1 text-slate-200 outline-none"
              >
                <option value="low">Least complete</option>
                <option value="high">Most complete</option>
                <option value="name">Name</option>
              </select>
              <label className="inline-flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-violet-500" />
                Hide 100%
              </label>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {perTopic.map(({ root, summary, children }) => {
              const isOpen = expanded.has(root.id);
              return (
                <div key={root.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <Ring percent={summary.percent} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-slate-100">{root.title}</span>
                        <span className="shrink-0 text-sm text-slate-400">
                          {summary.completed}/{summary.total}
                        </span>
                      </div>
                      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="bg-emerald-500" style={{ width: `${(summary.completed / summary.total) * 100}%` }} />
                        <div className="bg-amber-500" style={{ width: `${(summary.inProgress / summary.total) * 100}%` }} />
                      </div>
                    </div>
                    {children.length > 0 && (
                      <button
                        onClick={() => toggle(root.id)}
                        className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                        title={isOpen ? "Collapse" : "Show sub-topics"}
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                  </div>

                  {isOpen && children.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                      {children.map((c) => {
                        const cs = summarizeProgress([c, ...subtree(data.nodes, c.id)]);
                        return (
                          <Link
                            key={c.id}
                            to={pageLink(c.title)}
                            className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-white/5"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{c.title}</span>
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full bg-brand-500" style={{ width: `${cs.percent}%` }} />
                            </div>
                            <span className="w-10 shrink-0 text-right text-xs text-slate-500">{cs.percent}%</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function GapCard({
  icon: Icon,
  title,
  items,
  cta,
}: {
  icon: typeof FileText;
  title: string;
  items: { id: string; title: string; to: string }[];
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-brand-300" /> {title}
      </h3>
      <ul className="mt-2 space-y-1">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              to={it.to}
              className="group flex items-center justify-between gap-2 rounded px-2 py-1 text-sm text-slate-300 hover:bg-white/5"
            >
              <span className="min-w-0 truncate">{it.title}</span>
              <span className="shrink-0 text-xs text-brand-300 opacity-0 group-hover:opacity-100">{cta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
