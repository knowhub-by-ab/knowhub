import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Check,
  Eye,
  Pencil,
  Network,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import { setPage, tree, useAppData } from "@/lib/store";
import { renderMarkdown } from "@/lib/markdown";
import { renderMermaidIn } from "@/lib/mermaid";
import { generatePageContent } from "@/lib/aiActions";
import type { TreeNode } from "@/lib/types";

type Tab = "edit" | "preview";

// --- Collapsible tree picker (mirrors the Learning Tree layout) -------------
function PickerNode({
  node,
  nodes,
  depth,
  selectedId,
  onSelect,
  hasPage,
  checked,
  onToggleCheck,
}: {
  node: TreeNode;
  nodes: TreeNode[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasPage: (id: string) => boolean;
  checked: Set<string>;
  onToggleCheck: (id: string) => void;
}) {
  const children = tree.childrenOf(nodes, node.id);
  const [expanded, setExpanded] = useState(true);
  return (
    <li>
      <div
        className={`flex items-center gap-1 rounded-lg pr-2 ${
          node.id === selectedId ? "bg-brand-600/20 ring-1 ring-brand-500/40" : "hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 hover:text-white ${
            children.length ? "" : "invisible"
          }`}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <input
          type="checkbox"
          checked={checked.has(node.id)}
          onChange={() => onToggleCheck(node.id)}
          className="h-3.5 w-3.5 shrink-0 accent-violet-500"
          title="Select for batch AI generation"
        />
        <button
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm text-slate-200"
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              hasPage(node.id) ? "bg-emerald-400" : "bg-slate-600"
            }`}
          />
          <span className="truncate">{node.title}</span>
        </button>
      </div>
      {expanded && children.length > 0 && (
        <ul>
          {children.map((c) => (
            <PickerNode
              key={c.id}
              node={c}
              nodes={nodes}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              hasPage={hasPage}
              checked={checked}
              onToggleCheck={onToggleCheck}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function LearningPagesPage() {
  const data = useAppData();
  const roots = useMemo(() => tree.childrenOf(data.nodes, null), [data.nodes]);
  const flat = useMemo(() => tree.flatten(data.nodes), [data.nodes]);

  const [selectedId, setSelectedId] = useState<string | null>(flat[0]?.node.id ?? null);
  const [tab, setTab] = useState<Tab>("edit");
  const [draft, setDraft] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // AI assist
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Batch generation
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [batchPrompt, setBatchPrompt] = useState("");
  const [batch, setBatch] = useState<{ running: boolean; done: number; total: number; error: string | null }>(
    { running: false, done: 0, total: 0, error: null }
  );
  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  async function batchGenerate() {
    const ids = [...checked];
    if (!ids.length || batch.running) return;
    setBatch({ running: true, done: 0, total: ids.length, error: null });
    const failed: string[] = [];
    let done = 0;
    for (const id of ids) {
      const n = data.nodes.find((x) => x.id === id);
      if (n) {
        try {
          const md = await generatePageContent(
            data.aiKeys,
            n.title,
            batchPrompt.trim() || `Write a complete learning page for "${n.title}".`
          );
          setPage(id, md);
          if (id === selectedId) setDraft(md);
        } catch {
          failed.push(n.title);
        }
      }
      done++;
      setBatch((b) => ({ ...b, done }));
    }
    setBatch({ running: false, done, total: ids.length, error: failed.length ? `Failed: ${failed.join(", ")}` : null });
    setChecked(new Set());
  }

  useEffect(() => {
    if (!selectedId && flat.length) setSelectedId(flat[0].node.id);
    if (selectedId && !flat.some((f) => f.node.id === selectedId)) {
      setSelectedId(flat[0]?.node.id ?? null);
    }
  }, [flat, selectedId]);

  useEffect(() => {
    setDraft(selectedId ? data.pages[selectedId] ?? "" : "");
    setSavedAt(null);
    setAiError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    if (draft === (data.pages[selectedId] ?? "")) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPage(selectedId, draft);
      setSavedAt(Date.now());
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, selectedId, data.pages]);

  const selectedTitle = flat.find((f) => f.node.id === selectedId)?.node.title;
  const previewHtml = useMemo(() => renderMarkdown(draft), [draft]);

  // Render any ```mermaid diagrams once the preview HTML is in the DOM.
  useEffect(() => {
    if (tab === "preview" && previewRef.current) renderMermaidIn(previewRef.current);
  }, [previewHtml, tab]);

  async function runAi(mode: "generate" | "improve") {
    if (!selectedId || !selectedTitle || aiLoading) return;
    setAiError(null);
    setAiLoading(true);
    try {
      const instruction =
        mode === "improve"
          ? prompt.trim() || "Improve, expand and correct this page; keep it well structured."
          : prompt.trim() || `Write a complete learning page for "${selectedTitle}".`;
      const result = await generatePageContent(
        data.aiKeys,
        selectedTitle,
        instruction,
        mode === "improve" ? draft : undefined
      );
      setDraft(result);
      setTab("preview");
      setPrompt("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <FileText className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Learning Pages</h1>
          <p className="text-sm text-slate-400">
            Write a topic's page yourself, or generate/improve it with AI. Saved automatically.
          </p>
        </div>
      </div>

      {flat.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <Network className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-3 text-sm text-slate-400">
            You need a topic first. Create one in the{" "}
            <Link to="/app/learning-tree" className="text-brand-300 underline">
              Learning Tree
            </Link>
            , then write its page here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Collapsible picker */}
          <aside className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            {/* Batch generate toolbar */}
            <div className="mb-2 space-y-2 px-1">
              <div className="text-xs text-slate-500">
                {checked.size > 0
                  ? `${checked.size} topic${checked.size === 1 ? "" : "s"} selected`
                  : "Tick topics below to batch-generate their pages"}
              </div>
              <input
                value={batchPrompt}
                onChange={(e) => setBatchPrompt(e.target.value)}
                placeholder="Optional instruction for all selected (e.g. 'concise, with examples')"
                disabled={batch.running}
                className="w-full rounded-md border border-white/15 bg-slate-900/60 px-2 py-1.5 text-xs text-white outline-none focus:border-brand-500 disabled:opacity-50"
              />
              <button
                onClick={batchGenerate}
                disabled={checked.size === 0 || batch.running}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
                title="Generate pages for the selected topics"
              >
                {batch.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {batch.running ? `Generating ${batch.done}/${batch.total}…` : `Generate ${checked.size || ""} selected`}
              </button>
            </div>
            {batch.error && <p className="px-1 pb-1 text-xs text-rose-300">{batch.error}</p>}
            <ul className="max-h-[60vh] overflow-y-auto">
              {roots.map((n) => (
                <PickerNode
                  key={n.id}
                  node={n}
                  nodes={data.nodes}
                  depth={0}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  hasPage={(id) => Boolean(data.pages[id]?.trim())}
                  checked={checked}
                  onToggleCheck={toggleCheck}
                />
              ))}
            </ul>
          </aside>

          {/* Editor + AI */}
          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
              <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                {selectedTitle}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {savedAt && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <div className="flex rounded-lg border border-white/10 p-0.5">
                  <button
                    onClick={() => setTab("edit")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${
                      tab === "edit" ? "bg-brand-600 text-white" : "text-slate-300"
                    }`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setTab("preview")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${
                      tab === "preview" ? "bg-brand-600 text-white" : "text-slate-300"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                </div>
              </div>
            </div>

            {/* AI assist bar */}
            <div className="border-b border-white/10 bg-brand-500/5 p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Ask AI to write or change this page (e.g. "add a section on edge cases")…`}
                  disabled={aiLoading}
                  className="flex-1 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500 disabled:opacity-50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => runAi("generate")}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
                    title="Generate this page (replaces content)"
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate
                  </button>
                  <button
                    onClick={() => runAi("improve")}
                    disabled={aiLoading || !draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40"
                    title="Improve the current content"
                  >
                    Improve
                  </button>
                </div>
              </div>
              {aiError && <p className="mt-2 text-xs text-rose-300">{aiError}</p>}
              {data.aiKeys.length === 0 && !aiError && (
                <p className="mt-2 text-xs text-slate-500">
                  Add a provider key in{" "}
                  <Link to="/app/settings" className="text-brand-300 underline">
                    Settings
                  </Link>{" "}
                  to use AI. You can always write/edit manually below.
                </p>
              )}
            </div>

            {tab === "edit" ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`# ${selectedTitle}\n\nStart writing in Markdown…`}
                className="min-h-[50vh] w-full resize-none bg-transparent p-5 font-mono text-sm leading-relaxed text-slate-100 outline-none"
              />
            ) : (
              <div className="min-h-[50vh] p-5">
                {draft.trim() ? (
                  <div
                    ref={previewRef}
                    className="md-prose max-w-full break-words"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <p className="text-sm text-slate-500">Nothing to preview yet.</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Pages save automatically in your browser and sync to your account. Green dot = page has content.
      </p>
    </div>
  );
}
