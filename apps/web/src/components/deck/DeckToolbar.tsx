import { useState } from "react";
import {
  ArrowLeft, Download, FileText, Layers, Play, Save, Share2,
  Loader2, BookOpen, Music, Video,
} from "lucide-react";
import type { PresentationDeck } from "@/lib/deckStore";
import { exportPptx, exportHandoutPdf, exportSrt, exportVtt, exportNarrationTxt, downloadText } from "@/lib/deckExport";

interface Props {
  deck: PresentationDeck;
  onBack: () => void;
  onPresent: () => void;
  onVideo?: () => void;
  onSaveToGitHub?: () => Promise<void>;
  onShareUrl?: () => void;
  isSaving?: boolean;
}

export default function DeckToolbar({ deck, onBack, onPresent, onVideo, onSaveToGitHub, onShareUrl, isSaving }: Props) {
  const [exportingPptx, setExportingPptx] = useState(false);
  const [showMore, setShowMore] = useState(false);

  async function handlePptx() {
    setExportingPptx(true);
    try { await exportPptx(deck); } finally { setExportingPptx(false); }
  }

  function handleHandout() { exportHandoutPdf(deck); }

  function handleSrt() {
    downloadText(exportSrt(deck), `${deck.title}.srt`, "text/plain");
  }

  function handleVtt() {
    downloadText(exportVtt(deck), `${deck.title}.vtt`, "text/vtt");
  }

  function handleNarrationTxt() {
    downloadText(exportNarrationTxt(deck), `${deck.title}-narration.txt`, "text/plain");
  }

  function handleFlashcards() {
    // Import flashcards.addDeck from store lazily to avoid circular
    import("@/lib/store").then(({ flashcards: fc }) => {
      const cards = deck.slides
        .filter((s) => s.type !== "title" && s.type !== "closing" && s.bullets.length > 0)
        .map((s) => ({ front: s.title, back: s.bullets.join("\n"), pageId: deck.sourceNodeId }));
      fc.addDeck(cards);
      alert(`${cards.length} flashcards added to your Flashcards module.`);
    });
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 flex-wrap">
      <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors mr-2">
        <ArrowLeft size={15} />
        Back
      </button>

      <span className="text-zinc-200 font-medium text-sm flex-1 truncate min-w-0">{deck.title}</span>

      {/* Primary actions */}
      <button
        onClick={handlePptx}
        disabled={exportingPptx || deck.slides.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded text-sm text-white transition-colors"
      >
        {exportingPptx ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        PPTX
      </button>

      <button
        onClick={onPresent}
        disabled={deck.slides.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded text-sm text-white transition-colors"
      >
        <Play size={14} />
        Present
      </button>

      {onVideo && (
        <button
          onClick={onVideo}
          disabled={deck.slides.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded text-sm text-white transition-colors"
        >
          <Video size={14} />
          Video
        </button>
      )}

      {/* More exports dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-sm text-zinc-300 transition-colors"
        >
          <FileText size={13} />
          Export ▾
        </button>
        {showMore && (
          <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 py-1 min-w-44" onMouseLeave={() => setShowMore(false)}>
            <button onClick={() => { handleHandout(); setShowMore(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
              <FileText size={13} /> Handout PDF
            </button>
            <button onClick={() => { handleFlashcards(); setShowMore(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
              <Layers size={13} /> Flashcard Deck
            </button>
            <button onClick={() => { handleNarrationTxt(); setShowMore(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
              <Music size={13} /> Narration Script (.txt)
            </button>
            <button onClick={() => { handleSrt(); setShowMore(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
              <BookOpen size={13} /> Subtitles (.srt)
            </button>
            <button onClick={() => { handleVtt(); setShowMore(false); }} className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
              <BookOpen size={13} /> Subtitles (.vtt)
            </button>
          </div>
        )}
      </div>

      {onSaveToGitHub && (
        <button
          onClick={onSaveToGitHub}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 rounded text-sm text-zinc-300 transition-colors"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      )}

      {onShareUrl && (
        <button onClick={onShareUrl} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-sm text-zinc-300 transition-colors">
          <Share2 size={13} />
          Share
        </button>
      )}
    </div>
  );
}
