import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  Copy,
  Volume2,
  VolumeX,
  Download,
  Highlighter,
  X,
  ExternalLink,
  MessagesSquare,
  PanelLeftOpen,
  Youtube,
} from "lucide-react";
import { setPage, tree, highlights as highlightStore, useAppData } from "@/lib/store";
import { selectionToHighlight, applyHighlights, HIGHLIGHT_CLASSES, type HighlightColor } from "@/lib/highlights";
import { renderMarkdown } from "@/lib/markdown";
import { renderMermaidIn } from "@/lib/mermaid";
import { generatePageContent } from "@/lib/aiActions";
import { STATUS_LABELS, STATUS_CYCLE, type NodeStatus, type TreeNode } from "@/lib/types";
import { speak, stopTTS, isSpeaking, isTTSSupported, markdownToSpeakable } from "@/lib/tts";
import { exportMarkdown, exportDoc, exportPdf, exportAudio } from "@/lib/exporters";
import { discussPage } from "@/lib/external";

type Tab = "edit" | "preview";

const STATUS_STYLES: Record<NodeStatus, string> = {
  pending: "bg-slate-600/30 text-slate-300 ring-slate-500/40",
  in_progress: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  completed: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
};
const nextStatus = (s: NodeStatus): NodeStatus =>
  STATUS_CYCLE[(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length];

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
          title={node.title}
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
  const navigate = useNavigate();
  const roots = useMemo(() => tree.childrenOf(data.nodes, null), [data.nodes]);
  const flat = useMemo(() => tree.flatten(data.nodes), [data.nodes]);
  const [treePanelOpen, setTreePanelOpen] = useState(false);

  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(flat[0]?.node.id ?? null);

  // Resolve a topic title (case-insensitive) to a node id.
  function findByTitle(title: string): string | null {
    const t = title.trim().toLowerCase();
    return data.nodes.find((n) => n.title.toLowerCase() === t)?.id ?? null;
  }

  // Allow deep-linking to a page via ?topic=Title or ?node=id.
  useEffect(() => {
    const nodeParam = params.get("node");
    if (nodeParam && data.nodes.some((n) => n.id === nodeParam)) {
      setSelectedId(nodeParam);
      return;
    }
    const topic = params.get("topic");
    if (topic) {
      const id = findByTitle(topic);
      if (id) setSelectedId(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, data.nodes]);

  // Intercept clicks on internal page links inside the preview so they select
  // the target page instead of navigating to a non-existent file (404).
  function onPreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    let topic: string | null = null;
    try {
      const url = new URL(href, window.location.href);
      topic = url.searchParams.get("topic");
      // Also handle AI-style "./Some Title.md" links by using the file name.
      if (!topic && /\.(md|html?)($|[?#])/i.test(href)) {
        const file = decodeURIComponent(href.split(/[?#]/)[0].split("/").pop() || "");
        topic = file.replace(/\.(md|html?)$/i, "");
      }
    } catch {
      /* not a parseable URL */
    }
    if (!topic) return;
    const id = findByTitle(topic);
    if (id) {
      e.preventDefault();
      setSelectedId(id);
      setParams({ topic });
      setTab("preview");
    }
  }
  const [tab, setTab] = useState<Tab>("preview");
  const [draft, setDraft] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showDiscuss, setShowDiscuss] = useState(false);

  async function copyPage() {
    if (!draft.trim()) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleTTS() {
    if (!isTTSSupported()) {
      alert("Text-to-speech is not available in the Android app.\n\nTo listen, open KnowHub in Chrome browser on your phone instead.");
      return;
    }
    if (speaking || isSpeaking()) {
      stopTTS();
      setSpeaking(false);
    } else {
      speak(markdownToSpeakable(draft), { title: selectedTitle ?? "Learning Page" });
      setSpeaking(true);
      const poll = setInterval(() => {
        if (!isSpeaking()) {
          setSpeaking(false);
          clearInterval(poll);
        }
      }, 500);
    }
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Highlight toolbar — for new selections
  const [hlToolbar, setHlToolbar] = useState<{ x: number; y: number } | null>(null);
  const [hlColor, setHlColor] = useState<HighlightColor>("yellow");
  // Highlight edit popup — for clicking an existing mark
  const [hlEdit, setHlEdit] = useState<{ id: string; x: number; y: number } | null>(null);

  function onPreviewMouseUp(e: React.MouseEvent) {
    // Check if user clicked an existing highlight mark
    const mark = (e.target as HTMLElement).closest("[data-hid]") as HTMLElement | null;
    if (mark) {
      const hid = mark.dataset.hid ?? "";
      if (hid) {
        e.stopPropagation();
        setHlEdit({ id: hid, x: e.clientX, y: e.clientY });
        setHlToolbar(null);
        return;
      }
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setHlToolbar(null);
      setHlEdit(null);
      return;
    }
    setHlToolbar({ x: e.clientX, y: e.clientY });
    setHlEdit(null);
  }

  function applyHighlight(color: HighlightColor) {
    const sel = window.getSelection();
    if (!sel || !previewRef.current || !selectedId) return;
    const h = selectionToHighlight(sel, previewRef.current, selectedId, color);
    if (h) highlightStore.add(h);
    sel.removeAllRanges();
    setHlToolbar(null);
  }

  function changeHighlightColor(id: string, color: HighlightColor) {
    const existing = data.highlights.find((h) => h.id === id);
    if (!existing) return;
    highlightStore.remove(id);
    highlightStore.add({ ...existing, id: crypto.randomUUID(), color, createdAt: Date.now() });
    setHlEdit(null);
  }

  function removeHighlight(id: string) {
    highlightStore.remove(id);
    setHlEdit(null);
  }

  // AI assist
  const [genMode, setGenMode] = useState<"A" | "B">("A");
  const [prompt, setPrompt] = useState("");
  const [modeB, setModeB] = useState({ startLevel: "Beginner", topLevel: "Expert", style: "Normal explanation" });
  const LEVELS = ["Absolute Novice", "Beginner", "Intermediate", "Expert", "Advanced", "Professional", "Industry Standards"];
  const STYLES = ["Normal explanation", "Simple & concise", "Story-driven", "Academic / formal", "Practical & example-heavy"];
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
  const selectedNode = data.nodes.find((n) => n.id === selectedId) ?? null;
  const pageHighlights = useMemo(
    () => data.highlights.filter((h) => h.pageId === selectedId),
    [data.highlights, selectedId]
  );
  const previewHtml = useMemo(() => {
    const base = renderMarkdown(draft);
    return selectedId ? applyHighlights(base, pageHighlights, selectedId) : base;
  }, [draft, pageHighlights, selectedId]);

  // Render any ```mermaid diagrams once the preview HTML is in the DOM.
  useEffect(() => {
    if (tab === "preview" && previewRef.current) renderMermaidIn(previewRef.current);
  }, [previewHtml, tab]);

  async function runAi(mode: "generate" | "improve") {
    if (!selectedId || !selectedTitle || aiLoading) return;
    setAiError(null);
    setAiLoading(true);
    try {
      let instruction: string;
      if (mode === "improve") {
        instruction = prompt.trim() || "Improve, expand and correct this page; keep it well structured.";
      } else if (genMode === "A") {
        instruction = `Write a complete learning page for "${selectedTitle}". Target audience: someone starting at ${modeB.startLevel} level, aiming to reach ${modeB.topLevel} level. Writing style: ${modeB.style}.${prompt.trim() ? ` Additional instructions: ${prompt.trim()}` : ""}`;
      } else {
        instruction = prompt.trim() || `Write a complete learning page for "${selectedTitle}".`;
      }
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
        <>
        {/* Mobile tree panel overlay */}
        {treePanelOpen && (
          <div className="fixed inset-0 z-[60] bg-black/60 lg:hidden" onClick={() => setTreePanelOpen(false)} />
        )}
        <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Tree picker panel — fixed drawer on mobile, sticky sidebar on desktop */}
          <aside className={`
            fixed top-0 left-0 z-[70] h-full w-80 p-3
            lg:static lg:z-auto lg:h-auto lg:w-auto lg:p-2
            flex flex-col min-w-0 rounded-none lg:rounded-2xl
            border-r lg:border border-white/10 bg-slate-950 lg:bg-white/[0.03]
            lg:sticky lg:top-4 lg:self-start overflow-y-auto
            transition-transform duration-200
            ${treePanelOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          `}>
            {/* Mobile header row */}
            <div className="mb-2 flex items-center justify-between lg:hidden">
              <span className="text-xs font-semibold text-slate-300">Topics</span>
              <button onClick={() => setTreePanelOpen(false)} className="rounded p-1 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {/* Batch generate toolbar */}
            <div className="mb-2 shrink-0 space-y-2 px-1">
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
            {batch.error && <p className="shrink-0 px-1 pb-1 text-xs text-rose-300">{batch.error}</p>}
            {/* Scrollable tree list — fills remaining height of sticky panel */}
            <ul className="flex-1 overflow-y-auto overflow-x-auto min-h-0 scroll-smooth">
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
            {/* Title row */}
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
              <button
                className="lg:hidden grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white"
                onClick={() => setTreePanelOpen(true)}
                aria-label="Open topics"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                {selectedTitle}
              </div>
            </div>
            {/* Action bar — wraps on mobile so dropdowns are not clipped */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-4 py-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedNode && (
                  <button
                    onClick={() => tree.setStatus(selectedNode.id, nextStatus(selectedNode.status))}
                    title="Click to change progress"
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                      STATUS_STYLES[selectedNode.status]
                    }`}
                  >
                    {STATUS_LABELS[selectedNode.status]}
                  </button>
                )}
                {savedAt && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <button
                  onClick={copyPage}
                  disabled={!draft.trim()}
                  title="Copy markdown to clipboard"
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={toggleTTS}
                  disabled={!draft.trim()}
                  title={speaking ? "Stop listening" : "Listen to this page"}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
                >
                  {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {speaking ? "Stop" : "Listen"}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowDownload((v) => !v)}
                    disabled={!draft.trim()}
                    title="Download page"
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" /> Download ▾
                  </button>
                  {showDownload && (
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-white/10 bg-slate-900 py-1 shadow-xl">
                      {[
                        { label: "Markdown (.md)", action: () => exportMarkdown(selectedTitle ?? "page", draft) },
                        { label: "Word (.doc)", action: () => exportDoc(selectedTitle ?? "page", previewHtml) },
                        { label: "PDF (print)", action: () => exportPdf(selectedTitle ?? "page", previewRef.current?.innerHTML ?? previewHtml) },
                        { label: "Audio (.mp3, via Puter)", action: () => exportAudio(selectedTitle ?? "page", markdownToSpeakable(draft)) },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => { opt.action(); setShowDownload(false); }}
                          className="block w-full px-4 py-1.5 text-left text-xs text-slate-200 hover:bg-white/5"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (selectedId) navigate(`/app/videos?pageId=${selectedId}&autoFetch=1`);
                  }}
                  disabled={!selectedId}
                  title="Find YouTube videos for this page"
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
                >
                  <Youtube className="h-3.5 w-3.5" /> Videos
                </button>
                <div className="relative">
                  <button
                    onClick={() => { setShowDiscuss((v) => !v); setShowDownload(false); }}
                    disabled={!draft.trim()}
                    title="Discuss this page in an AI chat"
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Discuss ▾
                  </button>
                  {showDiscuss && (
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[170px] rounded-lg border border-white/10 bg-slate-900 py-1 shadow-xl">
                      <button
                        onClick={() => { navigate(`/app/ai-chat?newChat=1&pageId=${selectedId ?? ""}`); setShowDiscuss(false); }}
                        className="flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs text-brand-300 hover:bg-white/5"
                      >
                        <MessagesSquare className="h-3.5 w-3.5 shrink-0" />
                        KnowHub AI Tutor
                      </button>
                      {[
                        { label: "ChatGPT", action: () => discussPage(selectedTitle ?? "page", draft, "chatgpt") },
                        { label: "Gemini (copy prompt)", action: () => discussPage(selectedTitle ?? "page", draft, "gemini") },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => { opt.action(); setShowDiscuss(false); }}
                          className="block w-full px-4 py-1.5 text-left text-xs text-slate-200 hover:bg-white/5"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
            <div className="border-b border-white/10 bg-brand-500/5 p-3 space-y-2">
              {/* Mode toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Mode:</span>
                {(["A", "B"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setGenMode(m)}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition ${genMode === m ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    {m === "A" ? "A · Structured Prompt" : "B · Free-style Prompt"}
                  </button>
                ))}
              </div>
              {/* Mode A (Structured) options */}
              {genMode === "A" && (
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-400">
                    From:
                    <select value={modeB.startLevel} onChange={(e) => setModeB((v) => ({ ...v, startLevel: e.target.value }))}
                      className="rounded border border-white/15 bg-slate-900/60 px-1.5 py-0.5 text-xs text-white outline-none focus:border-brand-500">
                      {LEVELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1 text-xs text-slate-400">
                    To:
                    <select value={modeB.topLevel} onChange={(e) => setModeB((v) => ({ ...v, topLevel: e.target.value }))}
                      className="rounded border border-white/15 bg-slate-900/60 px-1.5 py-0.5 text-xs text-white outline-none focus:border-brand-500">
                      {LEVELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1 text-xs text-slate-400">
                    Style:
                    <select value={modeB.style} onChange={(e) => setModeB((v) => ({ ...v, style: e.target.value }))}
                      className="rounded border border-white/15 bg-slate-900/60 px-1.5 py-0.5 text-xs text-white outline-none focus:border-brand-500">
                      {STYLES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={genMode === "A" ? `Optional extra instructions for this structured prompt…` : `Ask AI to write or change this page (e.g. "add a section on edge cases")…`}
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
              <div className="relative min-h-[50vh] p-5">
                {draft.trim() ? (
                  <>
                    <div
                      ref={previewRef}
                      onClick={onPreviewClick}
                      onMouseUp={onPreviewMouseUp}
                      className="md-prose max-w-full break-words"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                    {/* Floating highlight toolbar — for new selection */}
                    {hlToolbar && (
                      <div
                        className="fixed z-50 flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur"
                        style={{ left: hlToolbar.x, top: hlToolbar.y - 52 }}
                      >
                        <Highlighter className="h-3.5 w-3.5 text-slate-400" />
                        {(["yellow", "green", "blue", "pink"] as HighlightColor[]).map((c) => (
                          <button
                            key={c}
                            onClick={() => { setHlColor(c); applyHighlight(c); }}
                            title={c}
                            className={`h-5 w-5 rounded-full ring-2 transition ${hlColor === c ? "ring-white scale-110" : "ring-transparent hover:scale-105"} ${HIGHLIGHT_CLASSES[c].split(" ")[0]}`}
                          />
                        ))}
                        <button onClick={() => setHlToolbar(null)} className="ml-1 text-slate-500 hover:text-white">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Highlight edit popup — appears when clicking an existing highlight */}
                    {hlEdit && (
                      <div
                        className="fixed z-50 flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur"
                        style={{ left: hlEdit.x, top: hlEdit.y - 52 }}
                      >
                        <span className="text-xs text-slate-400 mr-1">Change:</span>
                        {(["yellow", "green", "blue", "pink"] as HighlightColor[]).map((c) => (
                          <button
                            key={c}
                            onClick={() => changeHighlightColor(hlEdit.id, c)}
                            title={c}
                            className={`h-5 w-5 rounded-full ring-2 transition hover:scale-110 ${HIGHLIGHT_CLASSES[c].split(" ")[0]} ring-transparent hover:ring-white`}
                          />
                        ))}
                        <button
                          onClick={() => removeHighlight(hlEdit.id)}
                          title="Remove highlight"
                          className="ml-1 rounded p-0.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Per-page highlight count + clear */}
                    {pageHighlights.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-slate-500">{pageHighlights.length} highlight{pageHighlights.length !== 1 ? "s" : ""}</span>
                        <button
                          onClick={() => selectedId && highlightStore.clearPage(selectedId)}
                          className="text-xs text-slate-500 hover:text-rose-400 underline"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Nothing to preview yet.</p>
                )}
              </div>
            )}
          </section>
        </div>
        </>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Pages save automatically in your browser and sync to your account. Green dot = page has content.
      </p>
    </div>
  );
}
