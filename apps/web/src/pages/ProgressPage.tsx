import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Network } from "lucide-react";
import { summarizeProgress, tree, useAppData } from "@/lib/store";
import type { TreeNode } from "@/lib/types";

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function ProgressPage() {
  const data = useAppData();
  const overall = summarizeProgress(data.nodes);
  const roots = tree.childrenOf(data.nodes, null);

  // Per-topic progress: include the root and all of its descendants.
  const perTopic = useMemo(() => {
    return roots.map((root) => {
      const subtree: TreeNode[] = [];
      const collect = (id: string) => {
        for (const c of tree.childrenOf(data.nodes, id)) {
          subtree.push(c);
          collect(c.id);
        }
      };
      collect(root.id);
      const all = [root, ...subtree];
      return { root, summary: summarizeProgress(all) };
    });
  }, [data.nodes, roots]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <TrendingUp className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Progress</h1>
          <p className="text-sm text-slate-400">Track how far you've come.</p>
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
            and mark nodes complete to see progress here.
          </p>
        </div>
      ) : (
        <>
          {/* Overall */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-end justify-between">
              <h2 className="font-semibold text-white">Overall</h2>
              <span className="text-3xl font-bold text-white">{overall.percent}%</span>
            </div>
            <div className="mt-3">
              <Bar percent={overall.percent} />
            </div>
            <div className="mt-4 flex gap-4 text-xs text-slate-400">
              <span>
                <span className="font-semibold text-emerald-400">{overall.completed}</span>{" "}
                completed
              </span>
              <span>
                <span className="font-semibold text-amber-400">{overall.inProgress}</span>{" "}
                in progress
              </span>
              <span>
                <span className="font-semibold text-slate-300">{overall.pending}</span>{" "}
                pending
              </span>
              <span className="ml-auto">{overall.total} total nodes</span>
            </div>
          </div>

          {/* Per topic */}
          <h2 className="mt-8 text-lg font-semibold text-white">By topic</h2>
          <div className="mt-4 space-y-3">
            {perTopic.map(({ root, summary }) => (
              <div
                key={root.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{root.title}</span>
                  <span className="text-sm text-slate-400">
                    {summary.completed}/{summary.total} · {summary.percent}%
                  </span>
                </div>
                <div className="mt-2">
                  <Bar percent={summary.percent} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
