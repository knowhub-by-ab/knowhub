import { useState, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";
import type { TreeNode } from "@/lib/types";
import { decks as deckOps } from "@/lib/deckStore";
import { parseMdDirectives, generateSlideOutline, generateFrontmatterFromContent } from "@/lib/deckAi";
import { DEFAULT_FRONTMATTER } from "@/lib/deckStore";
import { useAppData } from "@/lib/store";
import { pollinationsUrl } from "@/lib/deckImages";

type InputMode = "page" | "upload" | "paste" | "url";

interface Props {
  nodes: TreeNode[];
  pages: Record<string, string>;
  onClose: () => void;
  onCreate: (deckId: string) => void;
}

export default function NewDeckModal({ nodes, pages, onClose, onCreate }: Props) {
  const { aiKeys } = useAppData();
  const [mode, setMode] = useState<InputMode>("page");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [pastedMd, setPastedMd] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedMd, setUploadedMd] = useState("");
  const [uploadedName, setUploadedName] = useState("");

  const nodesWithPages = nodes.filter((n) => pages[n.id]?.trim());

  async function handleCreate() {
    setError("");
    setGenerating(true);
    setProgress("Reading content…");

    try {
      let rawMd = "";
      let deckTitle = title.trim();

      if (mode === "page") {
        if (!selectedNodeId) { setError("Select a learning page."); setGenerating(false); return; }
        rawMd = pages[selectedNodeId] ?? "";
        const node = nodes.find((n) => n.id === selectedNodeId);
        if (!deckTitle) deckTitle = node?.title ?? "Untitled";
      } else if (mode === "upload") {
        rawMd = uploadedMd;
        if (!deckTitle) deckTitle = uploadedName.replace(/\.md$/i, "");
      } else if (mode === "paste") {
        rawMd = pastedMd;
        if (!deckTitle) {
          const h = rawMd.match(/^#\s+(.+)/m);
          deckTitle = h ? h[1].trim() : "Untitled Presentation";
        }
      } else if (mode === "url") {
        if (!urlInput.trim()) { setError("Enter a URL."); setGenerating(false); return; }
        setProgress("Fetching markdown…");
        try {
          const res = await fetch(urlInput.trim());
          rawMd = await res.text();
          if (!deckTitle) {
            const h = rawMd.match(/^#\s+(.+)/m);
            deckTitle = h ? h[1].trim() : (urlInput.split("/").pop() ?? "Fetched URL");
          }
        } catch {
          setError("Failed to fetch URL. Make sure it's a public raw Markdown URL.");
          setGenerating(false);
          return;
        }
      }

      if (!rawMd.trim()) { setError("No markdown content found."); setGenerating(false); return; }

      // Parse directives from the MD
      const directives = parseMdDirectives(rawMd);
      const baseFm = { ...DEFAULT_FRONTMATTER, ...directives.frontmatter };

      // AI-infer frontmatter from content if not fully specified in YAML
      setProgress("Analysing content…");
      if (aiKeys.length > 0) {
        try {
          const inferred = await generateFrontmatterFromContent(aiKeys, rawMd);
          Object.assign(baseFm, { ...inferred, ...directives.frontmatter }); // directives override AI
        } catch {
          // Non-fatal — proceed with defaults
        }
      }

      // Create the deck shell
      const deck = deckOps.create(deckTitle || "Untitled", rawMd, mode === "page" ? selectedNodeId : undefined);
      deckOps.updateFrontmatter(deck.id, baseFm);

      // Generate slide outline
      setProgress("Generating slides…");
      if (aiKeys.length > 0) {
        const slides = await generateSlideOutline(aiKeys, rawMd, baseFm);
        // Apply narration overrides and image prompts from directives
        for (const slide of slides) {
          // Apply narration override from MD directive
          const narr = directives.narrationOverrides[slide.title];
          if (narr) slide.narrationScript = narr;

          // Apply explicit image prompt from MD directive
          const explicitPrompt = directives.imagePrompts[slide.title];
          if (explicitPrompt) {
            slide.imagePrompt = explicitPrompt;
            slide.image = {
              source: "pollinations",
              url: pollinationsUrl(explicitPrompt, 800, 450, baseFm.imageStyle ?? "illustration"),
              prompt: explicitPrompt,
              layout: "right-half",
            };
          } else if (slide.type === "content" && slide.bullets?.length > 0) {
            // Auto-generate image for content slides that have no explicit prompt
            const autoPrompt = `${slide.title}: ${slide.bullets[0]}`;
            slide.imagePrompt = autoPrompt;
            slide.image = {
              source: "pollinations",
              url: pollinationsUrl(autoPrompt, 800, 450, baseFm.imageStyle ?? "illustration"),
              prompt: autoPrompt,
              layout: "right-half",
            };
          }

          // Apply quiz slide marker
          if (directives.quizSlides.includes(slide.title)) {
            slide.type = "quiz";
          }
        }
        deckOps.setSlides(deck.id, slides);
      }

      onCreate(deck.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate presentation. Try again.");
    } finally {
      setGenerating(false);
      setProgress("");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadedMd(text);
    setUploadedName(file.name);
    e.target.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-700" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-lg">New Presentation</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Input mode tabs */}
          <div className="grid grid-cols-4 gap-1 bg-zinc-800 rounded-lg p-1">
            {([
              { id: "page" as InputMode, label: "Learning Page" },
              { id: "upload" as InputMode, label: "Upload .md" },
              { id: "paste" as InputMode, label: "Paste MD" },
              { id: "url" as InputMode, label: "URL" },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`py-1.5 text-xs rounded transition-colors ${mode === m.id ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          {mode === "page" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Select a learning page</label>
              {nodesWithPages.length === 0 ? (
                <p className="text-sm text-zinc-500">No learning pages found. Add content to a learning page first.</p>
              ) : (
                <select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose a page…</option>
                  {nodesWithPages.map((n) => (
                    <option key={n.id} value={n.id}>{n.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {mode === "upload" && (
            <div>
              <input ref={fileRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-zinc-600 rounded-lg text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
              >
                <Upload size={24} />
                <span className="text-sm">{uploadedName || "Click to pick a .md file"}</span>
              </button>
              {uploadedMd && <p className="text-xs text-emerald-400 mt-1">✓ {uploadedName} loaded ({uploadedMd.length.toLocaleString()} chars)</p>}
            </div>
          )}

          {mode === "paste" && (
            <textarea
              value={pastedMd}
              onChange={(e) => setPastedMd(e.target.value)}
              placeholder="Paste your Markdown content here…"
              rows={8}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-mono"
            />
          )}

          {mode === "url" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Public Markdown URL</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://raw.githubusercontent.com/…"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Use the raw file URL (GitHub: click Raw button, then copy URL).</p>
            </div>
          )}

          {/* Title override */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Presentation title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-detected from content"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {aiKeys.length === 0 && (
            <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800 rounded px-3 py-2">
              No AI keys configured. Add a key in Settings to enable AI slide generation.
              You can still create a blank presentation and add slides manually.
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={generating}
              className="flex-1 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {progress || "Generating…"}
                </>
              ) : (
                "Generate Presentation"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
