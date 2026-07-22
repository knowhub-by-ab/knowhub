/**
 * AI-aided Markdown editor for generating presentations.
 * Source: paste text, load from a learning page, or upload a file.
 * AI chat bar: ask the AI to improve/edit the MD.
 * "Generate Slides →" converts the MD into a full deck.
 */
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Loader2, Send, X, ChevronDown, ArrowRight, Upload,
} from "lucide-react";
import { useAppData } from "@/lib/store";
import { decks as deckOps } from "@/lib/deckStore";
import { chatCompletion, AiError } from "@/lib/ai";
import { generateSlideOutline, generateFrontmatterFromContent, parseMdDirectives } from "@/lib/deckAi";
import type { DeckFrontmatter } from "@/lib/deckStore";

export default function MdEditorTab() {
  const navigate = useNavigate();
  const data = useAppData();
  const [md, setMd] = useState("");
  const [sourceMode, setSourceMode] = useState<"paste" | "page" | "file">("paste");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genProgress, setGenProgress] = useState("");
  const [genError, setGenError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pagesWithContent = data.nodes.filter((n) => data.pages[n.id]?.trim());

  function loadFromPage(pageId: string) {
    const text = data.pages[pageId] ?? "";
    setMd(text);
    setSelectedPageId(pageId);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      let text = "";
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const ab = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url
        ).toString();
        const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
          const pg = await pdf.getPage(i);
          const ct = await pg.getTextContent();
          pages.push(ct.items.map((it) => ("str" in it ? it.str : "")).join(" "));
        }
        text = pages.join("\n\n");
      } else if (file.name.toLowerCase().endsWith(".docx")) {
        const ab = await file.arrayBuffer();
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({ arrayBuffer: ab })).value;
      } else {
        text = await file.text();
      }
      setMd(text.slice(0, 20000));
    } catch {
      setChatError("Could not read file.");
    }
  }

  async function handleAiEdit() {
    const prompt = chatInput.trim();
    if (!prompt || chatLoading || !md.trim()) return;
    setChatInput("");
    setChatError(null);
    setChatLoading(true);
    try {
      const { content } = await chatCompletion(
        data.aiKeys,
        [
          {
            role: "system",
            content:
              "You are an expert technical writer. The user will give you a Markdown document and an editing instruction. " +
              "Output ONLY the revised Markdown — no commentary, no code fences, no preamble. Preserve all <!-- layout: ... --> directives.",
          },
          {
            role: "user",
            content: `Document:\n\n${md}\n\n---\nInstruction: ${prompt}`,
          },
        ],
        "other"
      );
      if (content.trim()) setMd(content.trim());
    } catch (err) {
      setChatError(err instanceof AiError ? err.message : "AI edit failed.");
    } finally {
      setChatLoading(false);
    }
  }

  async function handleGenerate() {
    if (!md.trim() || genLoading) return;
    setGenError(null);
    setGenLoading(true);
    try {
      setGenProgress("Analysing content…");
      const directives = parseMdDirectives(md);
      const deckTitle = ((directives.frontmatter as Record<string, unknown>).title as string | undefined) ?? "Untitled";

      const baseFm: Partial<DeckFrontmatter> = {
        theme: "aurora-dark",
        language: "en",
        narrationTone: "formal",
        ...directives.frontmatter,
      };

      if (data.aiKeys.length > 0) {
        try {
          const inferred = await generateFrontmatterFromContent(data.aiKeys, md);
          Object.assign(baseFm, { ...inferred, ...directives.frontmatter });
        } catch { /* non-fatal */ }
      }

      const deck = deckOps.create(deckTitle, md, selectedPageId || undefined);
      deckOps.updateFrontmatter(deck.id, baseFm);

      setGenProgress("Generating slides…");
      if (data.aiKeys.length > 0) {
        const slides = await generateSlideOutline(data.aiKeys, md, baseFm as DeckFrontmatter);
        deckOps.setSlides(deck.id, slides);
      }

      navigate(`/app/presentations/${deck.id}`);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenLoading(false);
      setGenProgress("");
    }
  }

  return (
    <div className="flex h-full gap-4">
      {/* Left: editor panel */}
      <div className="flex flex-col flex-1 min-w-0 gap-3">
        {/* Source picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400">Source:</span>
          {(["paste", "page", "file"] as const).map((m) => (
            <button key={m} onClick={() => setSourceMode(m)}
              className={`px-3 py-1 rounded text-xs transition-colors ${sourceMode === m ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              {m === "paste" ? "Paste / type" : m === "page" ? "Learning page" : "Upload file"}
            </button>
          ))}
          {sourceMode === "page" && (
            <select value={selectedPageId} onChange={(e) => { setSelectedPageId(e.target.value); if (e.target.value) loadFromPage(e.target.value); }}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-indigo-500">
              <option value="">Select a page…</option>
              {pagesWithContent.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
          )}
          {sourceMode === "file" && (
            <>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 px-3 py-1 rounded bg-zinc-800 text-xs text-zinc-400 hover:bg-zinc-700 border border-dashed border-zinc-600">
                <Upload size={12} /> Choose file
              </button>
              <input ref={fileRef} type="file" accept=".md,.txt,.pdf,.docx" className="hidden" onChange={handleFile} />
            </>
          )}
        </div>

        {/* MD textarea */}
        <div className="relative flex-1">
          <textarea
            value={md}
            onChange={(e) => setMd(e.target.value)}
            placeholder={`Paste or type your Markdown here…\n\nTip: use <!-- layout: "two-column" --> to hint slide layouts.`}
            className="w-full h-full min-h-[300px] resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-200 outline-none focus:border-indigo-500 placeholder-zinc-600"
            spellCheck={false}
          />
          {md && (
            <button onClick={() => setMd("")}
              className="absolute top-2 right-2 rounded p-1 text-zinc-600 hover:text-zinc-300">
              <X size={13} />
            </button>
          )}
        </div>

        {/* AI chat bar */}
        <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2">
          <Sparkles size={14} className="text-indigo-400 shrink-0" />
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void handleAiEdit()}
            placeholder="Ask AI to edit this document… (e.g. 'Make it more concise' or 'Add a section on X')"
            disabled={chatLoading || !md.trim()}
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder-zinc-600 disabled:opacity-40"
          />
          <button onClick={() => void handleAiEdit()} disabled={chatLoading || !md.trim() || !chatInput.trim()}
            className="shrink-0 text-indigo-400 hover:text-indigo-300 disabled:opacity-30">
            {chatLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        {chatError && <p className="text-xs text-rose-400">{chatError}</p>}

        {/* Generate button */}
        <button
          onClick={() => void handleGenerate()}
          disabled={genLoading || !md.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-5 py-3 text-sm font-semibold text-white transition-colors"
        >
          {genLoading ? (
            <><Loader2 size={15} className="animate-spin" /> {genProgress || "Generating…"}</>
          ) : (
            <><Sparkles size={15} /> Generate Slides <ArrowRight size={15} /></>
          )}
        </button>
        {genError && <p className="text-xs text-rose-400">{genError}</p>}
      </div>

      {/* Right: slide preview (word count + layout hints) */}
      <div className="w-64 shrink-0 space-y-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Stats</p>
          <div className="text-sm text-zinc-300 space-y-1">
            <p>{md.trim().split(/\s+/).filter(Boolean).length} words</p>
            <p>{md.split("\n").filter((l) => l.startsWith("#")).length} headings</p>
            <p>{(md.match(/<!--\s*layout:/g) ?? []).length} layout hints</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
            <ChevronDown size={12} /> Layout directives
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Use <code className="text-indigo-300 bg-zinc-800 px-1 rounded">{"<!-- layout: \"two-column\" -->"}</code> before a section to hint the slide layout.
          </p>
          <p className="text-xs text-zinc-500">Available layouts: title, section, content, two-column, image-full, closing</p>
        </div>

        {data.aiKeys.length === 0 && (
          <div className="rounded-xl border border-amber-800/40 bg-amber-900/10 p-4">
            <p className="text-xs text-amber-400">Add an AI provider key in Settings to use AI editing and slide generation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
