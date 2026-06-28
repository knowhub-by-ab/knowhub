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
  ArrowUp,
  ArrowDown,
  IndentIncrease,
  IndentDecrease,
} from "lucide-react";
import { tree, useAppData } from "@/lib/store";
import { generateLearningTree, generateTreeChanges, improveTree } from "@/lib/aiActions";
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
  const [dragOver, setDragOver] = useState(false);

  const hasChildren = children.length > 0;

  // Rearrange helpers: position among siblings + indent/outdent targets.
  const siblings = tree.childrenOf(nodes, node.parentId);
  const idx = siblings.findIndex((s) => s.id === node.id);
  const prevSibling = idx > 0 ? siblings[idx - 1] : null;
  const grandparentId = node.parentId
    ? nodes.find((n) => n.id === node.parentId)?.parentId ?? null
    : null;

  return (
    <li>
      <div
        draggable={!editing}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          const src = e.dataTransfer.getData("text/plain");
          if (src && src !== node.id) {
            tree.reparent(src, node.id);
            setExpanded(true);
          }
        }}
        className={`group flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 hover:bg-white/5 ${
          dragOver ? "ring-1 ring-brand-400 bg-brand-600/10" : ""
        }`}
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
        title="Drag onto another topic to make it a sub-topic"
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
            <span className="min-w-[6rem] flex-1 truncate text-sm text-slate-100">
              {node.title}
            </span>

            <button
              onClick={() => tree.setStatus(node.id, nextStatus(node.status))}
              title="Click to change status"
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                STATUS_STYLES[node.status]
              }`}
            >
              {STATUS_LABELS[node.status]}
            </button>

            <div className="flex shrink-0 items-center gap-1 transition sm:opacity-0 sm:group-hover:opacity-100">
              <button
                onClick={() => tree.reorder(node.id, -1)}
                disabled={idx <= 0}
                title="Move up"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => tree.reorder(node.id, 1)}
                disabled={idx >= siblings.length - 1}
                title="Move down"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => prevSibling && tree.reparent(node.id, prevSibling.id)}
                disabled={!prevSibling}
                title="Indent (make a sub-topic of the item above)"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
              >
                <IndentIncrease className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => tree.reparent(node.id, grandparentId)}
                disabled={!node.parentId}
                title="Outdent (move out one level)"
                className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
              >
                <IndentDecrease className="h-3.5 w-3.5" />
              </button>
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
  const [genParent, setGenParent] = useState<string>("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [treeMode, setTreeMode] = useState<"A" | "B">("A");
  const [treeModeB, setTreeModeB] = useState({ startLevel: "Beginner", topLevel: "Expert", style: "Normal explanation" });
  const LEVELS = ["Absolute Novice", "Beginner", "Intermediate", "Expert", "Advanced", "Professional", "Industry Standards"];
  const STYLES = ["Normal explanation", "Simple & concise", "Story-driven", "Academic / formal", "Practical & example-heavy"];
  const flat = tree.flatten(data.nodes);

  function addRoot() {
    if (newRoot.trim()) {
      tree.add(newRoot, null);
      setNewRoot("");
    }
  }

  async function generate() {
    const rawTopic = genTopic.trim();
    if (!rawTopic || genLoading) return;
    const topic = treeMode === "B"
      ? `${rawTopic} (from ${treeModeB.startLevel} to ${treeModeB.topLevel} level, style: ${treeModeB.style})`
      : rawTopic;
    setGenError(null);
    setGenLoading(true);
    try {
      if (genParent === "__force_top__") {
        // Force a brand-new top-level topic + its sub-tree.
        await generateLearningTree(data.aiKeys, topic, null);
      } else if (genParent) {
        // Force everything under the chosen existing node.
        await generateLearningTree(data.aiKeys, topic, genParent);
      } else {
        // Default: let the AI decide what to add and where.
        await generateTreeChanges(data.aiKeys, topic, data.nodes);
      }
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
      <div className="mt-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 space-y-2">
        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Mode:</span>
          {(["A", "B"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTreeMode(m)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${treeMode === m ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {m === "A" ? "A · Free-style Prompt" : "B · Structured Prompt"}
            </button>
          ))}
        </div>
        {treeMode === "B" && (
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1 text-xs text-slate-400">
              From:
              <select value={treeModeB.startLevel} onChange={(e) => setTreeModeB((v) => ({ ...v, startLevel: e.target.value }))}
                className="rounded border border-white/15 bg-slate-900/60 px-1.5 py-0.5 text-xs text-white outline-none focus:border-brand-500">
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-400">
              To:
              <select value={treeModeB.topLevel} onChange={(e) => setTreeModeB((v) => ({ ...v, topLevel: e.target.value }))}
                className="rounded border border-white/15 bg-slate-900/60 px-1.5 py-0.5 text-xs text-white outline-none focus:border-brand-500">
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-400">
              Style:
              <select value={treeModeB.style} onChange={(e) => setTreeModeB((v) => ({ ...v, style: e.target.value }))}
                className="rounded border border-white/15 bg-slate-900/60 px-1.5 py-0.5 text-xs text-white outline-none focus:border-brand-500">
                {STYLES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
        )}
        {flat.length > 0 && (
          <label className="mb-2 block text-xs text-slate-400">
            Placement
            <select
              value={genParent}
              onChange={(e) => setGenParent(e.target.value)}
              disabled={genLoading}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            >
              <option value="">Let AI decide where (recommended)</option>
              <option value="__force_top__">Force: new top-level topic</option>
              {flat.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {"  ".repeat(depth)}
                  ↳ under {node.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={genTopic}
            placeholder={
              genParent && genParent !== "__force_top__"
                ? "What to add here, e.g. 'networking & storage'…"
                : "Tell AI what to add, e.g. 'add CI/CD under DevOps' or 'create a Data Science path'…"
            }
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
        {/* Improve tree */}
        {flat.length > 0 && (
          <button
            onClick={async () => {
              if (genLoading) return;
              setGenError(null);
              setGenLoading(true);
              try {
                const rootTitles = tree.childrenOf(data.nodes, null).map((n) => n.title).join(", ");
                await improveTree(data.aiKeys, data.nodes, rootTitles || "my learning tree");
              } catch (err) {
                setGenError(err instanceof Error ? err.message : "Improve failed.");
              } finally {
                setGenLoading(false);
              }
            }}
            disabled={genLoading}
            className="mt-2 text-xs text-brand-300 hover:underline disabled:opacity-50"
          >
            {genLoading ? "Working…" : "✨ Improve tree — suggest missing topics"}
          </button>
        )}

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

      <div
        className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const src = e.dataTransfer.getData("text/plain");
          if (src) tree.reparent(src, null); // dropped on empty area → top level
        }}
      >
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
        Tip: use ↑/↓ to reorder, the indent/outdent buttons to change level, or{" "}
        <strong>drag a topic onto another</strong> to nest it (drop on empty space for top
        level). Saved automatically and synced to your account.
      </p>
    </div>
  );
}
