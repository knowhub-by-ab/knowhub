import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Share2, Network } from "lucide-react";
import { tree, useAppData } from "@/lib/store";
import type { NodeStatus, TreeNode } from "@/lib/types";

const COL_W = 210;
const ROW_H = 58;
const NODE_W = 176;
const NODE_H = 38;
const PAD = 24;

const STATUS_FILL: Record<NodeStatus, string> = {
  pending: "#475569",
  in_progress: "#b45309",
  completed: "#047857",
};
const STATUS_STROKE: Record<NodeStatus, string> = {
  pending: "#64748b",
  in_progress: "#f59e0b",
  completed: "#10b981",
};

interface Pos {
  x: number;
  y: number;
}

export default function KnowledgeGraphPage() {
  const data = useAppData();

  const { positions, width, height, maxDepth, leaves } = useMemo(() => {
    const nodes = data.nodes;
    const pos: Record<string, Pos> = {};
    let leafCounter = 0;
    let maxD = 0;

    const layout = (nodeId: string, depth: number): number => {
      maxD = Math.max(maxD, depth);
      const kids = tree.childrenOf(nodes, nodeId);
      let y: number;
      if (kids.length === 0) {
        y = leafCounter++;
      } else {
        const ys = kids.map((k) => layout(k.id, depth + 1));
        y = (ys[0] + ys[ys.length - 1]) / 2;
      }
      pos[nodeId] = { x: depth, y };
      return y;
    };

    tree.childrenOf(nodes, null).forEach((r) => layout(r.id, 0));

    return {
      positions: pos,
      maxDepth: maxD,
      leaves: leafCounter,
      width: (maxD + 1) * COL_W + PAD * 2,
      height: Math.max(leafCounter, 1) * ROW_H + PAD * 2,
    };
  }, [data.nodes]);

  const px = (p: Pos) => PAD + p.x * COL_W;
  const py = (p: Pos) => PAD + p.y * ROW_H;

  const byId = useMemo(() => {
    const m: Record<string, TreeNode> = {};
    data.nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [data.nodes]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Share2 className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Graph</h1>
          <p className="text-sm text-slate-400">
            A map of your learning tree and how topics connect.
          </p>
        </div>
      </div>

      {data.nodes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <Network className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-3 text-sm text-slate-400">
            Nothing to map yet. Add topics in the{" "}
            <Link to="/app/learning-tree" className="text-brand-300 underline">
              Learning Tree
            </Link>{" "}
            and they'll appear here as a graph.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            <Legend color={STATUS_STROKE.pending} label="Pending" />
            <Legend color={STATUS_STROKE.in_progress} label="In progress" />
            <Legend color={STATUS_STROKE.completed} label="Completed" />
            <span className="ml-auto">
              {data.nodes.length} nodes · depth {maxDepth + 1} · {leaves} leaves
            </span>
          </div>

          <div className="mt-3 overflow-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="min-w-full"
            >
              {/* Edges */}
              {data.nodes.map((n) => {
                if (!n.parentId || !positions[n.id] || !positions[n.parentId]) return null;
                const c = positions[n.id];
                const p = positions[n.parentId];
                const x1 = px(p) + NODE_W;
                const y1 = py(p) + NODE_H / 2;
                const x2 = px(c);
                const y2 = py(c) + NODE_H / 2;
                const mx = (x1 + x2) / 2;
                return (
                  <path
                    key={`e-${n.id}`}
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={1.5}
                  />
                );
              })}

              {/* Nodes */}
              {data.nodes.map((n) => {
                const p = positions[n.id];
                if (!p) return null;
                const x = px(p);
                const y = py(p);
                const node = byId[n.id];
                const label =
                  node.title.length > 22 ? node.title.slice(0, 21) + "…" : node.title;
                return (
                  <g key={`n-${n.id}`}>
                    <rect
                      x={x}
                      y={y}
                      width={NODE_W}
                      height={NODE_H}
                      rx={8}
                      fill={STATUS_FILL[node.status]}
                      fillOpacity={0.25}
                      stroke={STATUS_STROKE[node.status]}
                      strokeWidth={1.5}
                    />
                    <text
                      x={x + 12}
                      y={y + NODE_H / 2 + 4}
                      fontSize={13}
                      fill="#e2e8f0"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Edges show prerequisite relationships (parent → child). Node colour reflects
            status. Manage topics in the Learning Tree.
          </p>
        </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-3 w-3 rounded"
        style={{ backgroundColor: `${color}40`, border: `1.5px solid ${color}` }}
      />
      {label}
    </span>
  );
}
