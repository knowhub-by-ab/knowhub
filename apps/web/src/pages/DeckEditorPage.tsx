import { useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Plus, Wand2, Languages } from "lucide-react";
import { useDeckStore, decks as deckOps } from "@/lib/deckStore";
import type { DeckFrontmatter, Slide } from "@/lib/deckStore";
import { useAppData } from "@/lib/store";
import {
  generateNarrationScripts,
  generateSlideOutline,
  translateSlides,
} from "@/lib/deckAi";
import SlideList from "@/components/deck/SlideList";
import SlideCard from "@/components/deck/SlideCard";
import FrontmatterPanel from "@/components/deck/FrontmatterPanel";
import DeckToolbar from "@/components/deck/DeckToolbar";
import VoiceSelector from "@/components/deck/VoiceSelector";
import VoiceClonePanel from "@/components/deck/VoiceClonePanel";
import LargeFileSaveModal from "@/components/deck/LargeFileSaveModal";
import DuplicateAssetModal from "@/components/deck/DuplicateAssetModal";
import type { DuplicateAssetResult } from "@/components/deck/DuplicateAssetModal";

const VideoExportModal = lazy(() => import("@/components/deck/VideoExportModal"));

export default function DeckEditorPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { decks } = useDeckStore();
  const { aiKeys, github } = useAppData();

  const deck = decks.find((d) => d.id === deckId);

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(
    deck?.slides[0]?.id ?? null
  );
  const [generatingNarration, setGeneratingNarration] = useState(false);
  const [generatingSlideId, setGeneratingSlideId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  // Large-file / duplicate modals state
  const [largeFileState, setLargeFileState] = useState<{ blob: Blob; filename: string; uploading: boolean; progress: number } | null>(null);
  const [duplicateState, setDuplicateState] = useState<{ blob: Blob; filename: string; existingAssetId: number } | null>(null);
  const [preTranslateSlides, setPreTranslateSlides] = useState<Slide[] | null>(null);

  if (!deck) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <p className="text-lg mb-3">Presentation not found.</p>
          <button onClick={() => navigate("/app/presentations")} className="text-indigo-400 hover:text-indigo-300">
            ← Back to Presentations
          </button>
        </div>
      </div>
    );
  }

  const sortedSlides = [...deck.slides].sort((a, b) => a.order - b.order);

  function handleFrontmatterChange(patch: Partial<DeckFrontmatter>) {
    deckOps.updateFrontmatter(deck!.id, patch);
  }

  function handleReorder(orderedIds: string[]) {
    deckOps.reorderSlides(deck!.id, orderedIds);
  }

  function handleAddSlide() {
    const newSlide = deckOps.addSlide(deck!.id, selectedSlideId ?? undefined);
    setSelectedSlideId(newSlide.id);
  }

  function handleDeleteSlide(slideId: string) {
    deckOps.removeSlide(deck!.id, slideId);
    const remaining = deck!.slides.filter((s) => s.id !== slideId);
    setSelectedSlideId(remaining[0]?.id ?? null);
  }

  async function handleGenerateAllNarration() {
    if (!aiKeys.length) { setError("No AI keys configured. Go to Settings to add one."); return; }
    setError("");
    setGeneratingNarration(true);
    try {
      const scripts = await generateNarrationScripts(aiKeys, deck!.slides, deck!.frontmatter.narrationTone);
      for (const [slideId, script] of Object.entries(scripts)) {
        deckOps.updateSlide(deck!.id, slideId, { narrationScript: script });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate narration.");
    } finally {
      setGeneratingNarration(false);
    }
  }

  async function handleGenerateSingleNarration(slideId: string) {
    if (!aiKeys.length) return;
    setGeneratingSlideId(slideId);
    try {
      const scripts = await generateNarrationScripts(
        aiKeys,
        [deck!.slides.find((s) => s.id === slideId)!],
        deck!.frontmatter.narrationTone
      );
      const script = scripts[slideId];
      if (script) deckOps.updateSlide(deck!.id, slideId, { narrationScript: script });
    } catch { /* non-fatal */ }
    finally { setGeneratingSlideId(null); }
  }

  async function handleRegenerateSlides() {
    if (!aiKeys.length || !deck!.sourceMd) { setError("No source markdown to regenerate from."); return; }
    setRegenerating(true);
    setError("");
    try {
      const slides = await generateSlideOutline(aiKeys, deck!.sourceMd, deck!.frontmatter);
      deckOps.setSlides(deck!.id, slides);
      setSelectedSlideId(slides[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleTranslate(targetLang: string) {
    if (!aiKeys.length) return;
    if (targetLang === "en-revert" && preTranslateSlides !== null) {
      deckOps.setSlides(deck!.id, preTranslateSlides);
      deckOps.updateFrontmatter(deck!.id, { language: "en" });
      setPreTranslateSlides(null);
      return;
    }
    try {
      if (preTranslateSlides === null) {
        setPreTranslateSlides(deck!.slides.map(s => ({ ...s })));
      }
      const translated = await translateSlides(aiKeys, deck!.slides, targetLang);
      deckOps.setSlides(deck!.id, translated);
      deckOps.updateFrontmatter(deck!.id, { language: targetLang });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed.");
    }
  }

  async function handleSaveToGitHub() {
    if (!github?.token || !github?.login || !github?.repo) {
      setError("Connect a GitHub repo in the Repository module first.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      // Deck JSON is always small — use putFile directly
      const { putFile } = await import("@/lib/github");
      await putFile(
        github.token,
        github.login,
        github.repo,
        `presentations/${deck!.id}.json`,
        JSON.stringify(deck, null, 2),
        `presentations: save ${deck!.title}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  // Called by VideoExportModal (and future PPTX blob save) for large binary assets
  async function handleSaveBlobToGitHub(blob: Blob, filename: string): Promise<void> {
    if (!github?.token || !github?.login || !github?.repo) {
      setError("Connect a GitHub repo in the Repository module first.");
      return;
    }
    const { LFS_THRESHOLD_BYTES } = await import("@/lib/github");

    if (blob.size >= LFS_THRESHOLD_BYTES) {
      // Show large-file modal — resolution handled in handleLargeFileChoice
      await new Promise<void>((resolve) => {
        setLargeFileState({ blob, filename, uploading: false, progress: 0 });
        (window as any).__largeFileResolve = resolve;
      });
    } else {
      // Small enough — commit directly (putFile handles base64 encoding)
      const { putFile } = await import("@/lib/github");
      const ab = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
      await putFile(github.token, github.login, github.repo, `assets/${filename}`, b64, `assets: add ${filename}`);
    }
  }

  async function handleLargeFileChoice(action: "github" | "download" | "cancel") {
    if (!largeFileState) return;
    const { blob, filename } = largeFileState;

    if (action === "download") {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      setLargeFileState(null);
      (window as any).__largeFileResolve?.();
      return;
    }
    if (action === "cancel") {
      setLargeFileState(null);
      (window as any).__largeFileResolve?.();
      return;
    }

    // action === "github" — upload to release assets
    if (!github?.token || !github?.login || !github?.repo) return;
    try {
      const { ensureAssetsRelease, listReleaseAssets, uploadReleaseAsset } = await import("@/lib/github");
      const assetRelease = await ensureAssetsRelease(github.token, github.login, github.repo);
      const existing = await listReleaseAssets(github.token, github.login, github.repo, assetRelease.id);
      const dup = existing.find((a) => a.name === filename);

      if (dup) {
        // Show duplicate modal
        setLargeFileState(null);
        await new Promise<void>((dupResolve) => {
          setDuplicateState({ blob, filename, existingAssetId: dup.id });
          (window as any).__dupResolve = dupResolve;
        });
      } else {
        // No conflict — upload directly
        setLargeFileState((s) => s ? { ...s, uploading: true } : null);
        await uploadReleaseAsset(
          github.token!, github.login!, github.repo!,
          filename, await blob.arrayBuffer(),
          blob.type || "application/octet-stream",
          (pct: number) => setLargeFileState((s) => s ? { ...s, progress: pct } : null)
        );
        setLargeFileState(null);
        (window as any).__largeFileResolve?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setLargeFileState(null);
      (window as any).__largeFileResolve?.();
    }
  }

  async function handleDuplicateChoice(result: DuplicateAssetResult) {
    if (!duplicateState || !github?.token || !github?.login || !github?.repo) return;
    const { blob, filename, existingAssetId } = duplicateState;
    setDuplicateState(null);

    if (result.action === "download-only") {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      (window as any).__dupResolve?.();
      return;
    }

    try {
      const { uploadReleaseAsset, deleteReleaseAsset } = await import("@/lib/github");
      const uploadName = result.action === "rename" ? (result.newName ?? filename) : filename;
      if (result.action === "replace") {
        await deleteReleaseAsset(github.token, github.login, github.repo, existingAssetId);
      }
      await uploadReleaseAsset(
        github.token, github.login, github.repo,
        uploadName, await blob.arrayBuffer(),
        blob.type || "application/octet-stream"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
    (window as any).__dupResolve?.();
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <DeckToolbar
        deck={deck}
        onBack={() => navigate("/app/presentations")}
        onPresent={() => navigate(`/app/presentations/${deck.id}/present`)}
        onVideo={() => setShowVideo(true)}
        onSaveToGitHub={github?.token ? handleSaveToGitHub : undefined}
        isSaving={isSaving}
        onTitleChange={(newTitle) => deckOps.update(deck.id, { title: newTitle })}
      />

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-b border-red-800 text-red-300 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-200 ml-4">×</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Left panel — slide list */}
        <div className="w-48 flex-shrink-0 border-r border-zinc-800 overflow-y-auto bg-zinc-900">
          <SlideList
            slides={sortedSlides}
            frontmatter={deck.frontmatter}
            selectedId={selectedSlideId}
            onSelect={setSelectedSlideId}
            onReorder={handleReorder}
          />
          <div className="p-2">
            <button
              onClick={handleAddSlide}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-zinc-400 hover:text-white border border-dashed border-zinc-700 hover:border-zinc-500 rounded transition-colors"
            >
              <Plus size={12} /> Add Slide
            </button>
          </div>
        </div>

        {/* Centre — selected slide editor */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Action bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={handleGenerateAllNarration}
              disabled={generatingNarration || deck.slides.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 rounded text-xs text-zinc-300 transition-colors"
            >
              {generatingNarration ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              Generate All Narration
            </button>
            {deck.sourceMd && (
              <button
                onClick={handleRegenerateSlides}
                disabled={regenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 rounded text-xs text-zinc-300 transition-colors"
              >
                {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                Regenerate Slides
              </button>
            )}
            <TranslateButton onTranslate={handleTranslate} hasOriginal={preTranslateSlides !== null} />
          </div>

          {sortedSlides.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <p className="text-sm mb-3">No slides yet.</p>
              <button onClick={handleAddSlide} className="text-indigo-400 hover:text-indigo-300 text-sm">
                + Add your first slide
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSlides.map((slide) => (
                <SlideCard
                  key={slide.id}
                  slide={slide}
                  frontmatter={deck.frontmatter}
                  isSelected={selectedSlideId === slide.id}
                  onSelect={() => setSelectedSlideId(slide.id)}
                  onChange={(patch) => deckOps.updateSlide(deck.id, slide.id, patch)}
                  onDelete={() => handleDeleteSlide(slide.id)}
                  onAddAfter={() => {
                    const newSlide = deckOps.addSlide(deck.id, slide.id);
                    setSelectedSlideId(newSlide.id);
                  }}
                  onGenerateNarration={() => handleGenerateSingleNarration(slide.id)}
                  isGeneratingNarration={generatingSlideId === slide.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel — settings */}
        <div className="w-64 flex-shrink-0 border-l border-zinc-800 overflow-y-auto p-3 space-y-4 bg-zinc-900">
          <FrontmatterPanel
            frontmatter={deck.frontmatter}
            onChange={handleFrontmatterChange}
          />
          <VoiceSelector
            voiceName={deck.frontmatter.voiceName}
            speechRate={deck.frontmatter.speechRate ?? 1}
            speechPitch={deck.frontmatter.speechPitch ?? 1}
            language={deck.frontmatter.language}
            onChange={handleFrontmatterChange}
          />
          <div className="border-t border-zinc-800 pt-3">
            <p className="text-xs font-medium text-zinc-400 mb-2">Voice Cloning</p>
            <VoiceClonePanel aiKeys={aiKeys} />
          </div>
        </div>
      </div>

      {/* Video export modal */}
      {showVideo && (
        <Suspense fallback={null}>
          <VideoExportModal
            deck={deck}
            onClose={() => setShowVideo(false)}
            onSaveToGitHub={github?.token ? handleSaveBlobToGitHub : undefined}
          />
        </Suspense>
      )}

      {/* Large-file save modal */}
      {largeFileState && (
        <LargeFileSaveModal
          filename={largeFileState.filename}
          sizeMb={largeFileState.blob.size / 1024 / 1024}
          uploading={largeFileState.uploading}
          uploadProgress={largeFileState.progress}
          onChoose={(r) => handleLargeFileChoice(r.action)}
        />
      )}

      {/* Duplicate asset modal */}
      {duplicateState && (
        <DuplicateAssetModal
          existingName={duplicateState.filename}
          onChoose={handleDuplicateChoice}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Translate button with language picker
// ---------------------------------------------------------------------------
const TRANSLATE_LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" }, { code: "fr", label: "French" },
  { code: "de", label: "German" }, { code: "pt", label: "Portuguese" },
  { code: "hi", label: "Hindi" }, { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" }, { code: "bn", label: "Bengali" },
  { code: "ko", label: "Korean" }, { code: "ja", label: "Japanese" },
];

function TranslateButton({ onTranslate, hasOriginal }: { onTranslate: (lang: string) => void; hasOriginal: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-300 transition-colors"
      >
        <Languages size={12} /> Translate ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 py-1 min-w-36" onMouseLeave={() => setOpen(false)}>
          {hasOriginal && (
            <button
              key="en-revert"
              onClick={() => { onTranslate("en-revert"); setOpen(false); }}
              className="w-full text-left px-4 py-1.5 text-xs text-emerald-400 hover:bg-zinc-800"
            >
              ↩ Revert to original
            </button>
          )}
          {TRANSLATE_LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { onTranslate(l.code); setOpen(false); }}
              className="w-full text-left px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
