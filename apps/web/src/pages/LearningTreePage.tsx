import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Network,
  Sparkles,
  Loader2,
} from "lucide-react";
import { tree, useAppData } from "@/lib/store";
import { generateLearningTree } from "@/lib/aiActions";
import {
  STATUS_LABELS,
  STATUS_CYCLE,
  type NodeStatus,
  type TreeNode,
} from "@/lib/types";

const STATUS_STYLES: Record<NodeStatus, string> = {
  pending: "bg-slate-600/30 text-slate-300 ring-slate-500/40",
  in_progress: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  completed: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
};

function nextStatus(s: NodeStatus): NodeStatus {
  return STATUS_CYCLE[(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length];
}

function NodeRow({
  node,
  nodes,
  depth,
}: {
  node: TreeNode;
  nodes: TreeNode[];
  depth: number;
}) {
  const children = tree.childrenOf(nodes, node.id);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);
  const [adding, setAdding] = useState(false);
  const [childTitle, setChildTitle] = useState("");

  const hasChildren = children.length > 0;

  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-white ${
            hasChildren ? "" : "invisible"
          }`}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  tree.rename(node.id, draft);
                  setEditing(false);
                }
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 rounded-md border border-white/15 bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-brand-500"
            />
            <button
              onClick={() => {
                tree.rename(node.id, draft);
                setEditing(false);
              }}
              className="text-emerald-400 hover:text-emerald-300"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 truncate text-sm text-slate-100">{node.title}</span>

            <button
              onClick={() => tree.setStatus(node.id, nextStatus(node.status))}
              title="Click to change status"
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                STATUS_STYLES[node.status]
              }`}
            >
              {STATUS_LABELS[node.status]}
            </button>

            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => {
                  setAdding(true);
                  setExpanded(true);
                }}
                title="Add child"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-brand-300"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setDraft(node.title);
                  setEditing(true);
                }}
                title="Rename"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Delete "${node.title}"${
                        hasChildren ? " and all its sub-topics" : ""
                      }?`
                    )
                  )
                    tree.remove(node.id);
                }}
                title="Delete"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {adding && (
        <div
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: `${(depth + 1) * 18 + 28}px` }}
        >
          <input
            autoFocus
            value={childTitle}
            placeholder="New sub-topic…"
            onChange={(e) => setChildTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && childTitle.trim()) {
                tree.add(childTitle, node.id);
                setChildTitle("");
                setAdding(false);
              }
              if (e.key === "Escape") {
                setAdding(false);
                setChildTitle("");
              }
            }}
            className="flex-1 rounded-md border border-white/15 bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-brand-500"
          />
          <button
            onClick={() => {
              if (childTitle.trim()) tree.add(childTitle, node.id);
              setChildTitle("");
              setAdding(false);
            }}
            className="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-500"
          >
            Add
          </button>
        </div>
      )}

      {expanded && hasChildren && (
        <ul>
          {children.map((c) => (
            <NodeRow key={c.id} node={c} nodes={nodes} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function LearningTreePage() {
  const data = useAppData();
  const roots = tree.childrenOf(data.nodes, null);
  const [newRoot, setNewRoot] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  function addRoot() {
    if (newRoot.trim()) {
      tree.add(newRoot, null);
      setNewRoot("");
    }
  }

  async function generate() {
    const topic = genTopic.trim();
    if (!topic || genLoading) return;
    setGenError(null);
    setGenLoading(true);
    try {
      await generateLearningTree(data.aiKeys, topic);
      setGenTopic("");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Network className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Learning Tree</h1>
          <p className="text-sm text-slate-400">
            Build your learning path. Click a status chip to mark progress.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <input
          value={newRoot}
          placeholder="Add a top-level topic (e.g. Python, System Design)…"
          onChange={(e) => setNewRoot(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRoot()}
          className="flex-1 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        />
        <button
          onClick={addRoot}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Generate with AI */}
      <div className="mt-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={genTopic}
            placeholder="Generate a full learning path with AI, e.g. 'Kubernetes'…"
            onChange={(e) => setGenTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            disabled={genLoading}
            className="flex-1 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500 disabled:opacity-50"
          />
          <button
            onClick={generate}
            disabled={genLoading || !genTopic.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
          >
            {genLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {genLoading ? "Generating…" : "Generate"}
          </button>
        </div>
        {genError && (
          <p className="mt-2 text-xs text-rose-300">
            {genError}{" "}
            {data.aiKeys.length === 0 && (
              <Link to="/app/settings" className="underline">
                Add an AI key in Settings.
              </Link>
            )}
          </p>
        )}
        {data.aiKeys.length === 0 && !genError && (
          <p className="mt-2 text-xs text-slate-500">
            Tip: add a provider key in{" "}
            <Link to="/app/settings" className="text-brand-300 underline">
              Settings
            </Link>{" "}
            to use AI generation.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        {roots.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No topics yet. Add your first top-level topic above to start building your
            learning tree.
          </div>
        ) : (
          <ul>
            {roots.map((n) => (
              <NodeRow key={n.id} node={n} nodes={data.nodes} depth={0} />
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Saved automatically in your browser. GitHub sync arrives in a later phase.
      </p>
    </div>
  );
}
