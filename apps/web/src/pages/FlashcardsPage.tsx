import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  Sparkles,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import { flashcards as store, useAppData } from "@/lib/store";
import { generateFlashcardsFromText } from "@/lib/aiActions";
import type { Flashcard } from "@/lib/types";

export default function FlashcardsPage() {
  const data = useAppData();
  const [selectedPageId, setSelectedPageId] = useState("");
  const [count, setCount] = useState(10);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Review mode
  const [reviewDeck, setReviewDeck] = useState<Flashcard[] | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const pagesWithContent = data.nodes.filter((n) => data.pages[n.id]?.trim());

  async function generate() {
    if (genLoading) return;
    const node = data.nodes.find((n) => n.id === selectedPageId);
    const text = selectedPageId ? data.pages[selectedPageId] ?? "" : "";
    if (!text) {
      setGenError("Select a page with content to generate flashcards.");
      return;
    }
    setGenError(null);
    setGenLoading(true);
    try {
      await generateFlashcardsFromText(data.aiKeys, text, selectedPageId, count);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
    void node;
  }

  // Group flashcards by pageId for display
  const byPage: Record<string, Flashcard[]> = {};
  const standalone: Flashcard[] = [];
  for (const f of data.flashcards) {
    if (f.pageId) {
      byPage[f.pageId] = byPage[f.pageId] ?? [];
      byPage[f.pageId].push(f);
    } else {
      standalone.push(f);
    }
  }

  // Review screen
  if (reviewDeck) {
    const card = reviewDeck[cardIndex];
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-10">
        <div className="flex w-full items-center justify-between">
          <button
            onClick={() => { setReviewDeck(null); setCardIndex(0); setFlipped(false); }}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back
          </button>
          <span className="text-sm text-slate-400">{cardIndex + 1} / {reviewDeck.length}</span>
        </div>

        {/* Card */}
        <button
          onClick={() => setFlipped((v) => !v)}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center transition hover:bg-white/[0.06]"
        >
          <p className="text-xs text-slate-500 mb-3">{flipped ? "Answer" : "Question"}</p>
          <p className="text-lg font-medium text-white">
            {flipped ? card.back : card.front}
          </p>
          <p className="mt-4 text-xs text-slate-600">{flipped ? "Click to see question" : "Click to reveal answer"}</p>
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => { setCardIndex((i) => Math.max(0, i - 1)); setFlipped(false); }}
            disabled={cardIndex === 0}
            className="rounded-xl border border-white/10 p-3 text-slate-300 hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setFlipped(false); setCardIndex(0); setReviewDeck([...reviewDeck].sort(() => Math.random() - 0.5)); }}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            <RotateCw className="h-4 w-4" /> Shuffle
          </button>
          <button
            onClick={() => { setCardIndex((i) => Math.min(reviewDeck.length - 1, i + 1)); setFlipped(false); }}
            disabled={cardIndex === reviewDeck.length - 1}
            className="rounded-xl border border-white/10 p-3 text-slate-300 hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Layers className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Flashcards</h1>
          <p className="text-sm text-slate-400">Generate flashcards from your learning pages, then review them.</p>
        </div>
      </div>

      {/* Generator */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <label className="text-xs font-medium text-slate-300">
          Generate from page
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          >
            <option value="">Select a page…</option>
            {pagesWithContent.map((n) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Cards:
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-slate-900/60 px-2 py-1 text-sm text-white outline-none focus:border-brand-500"
            >
              {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button
            onClick={generate}
            disabled={genLoading || !selectedPageId}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
          >
            {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {genLoading ? "Generating…" : "Generate flashcards"}
          </button>
        </div>
        {genError && <p className="text-xs text-rose-300">{genError}</p>}
        {data.aiKeys.length === 0 && (
          <p className="text-xs text-slate-500">
            Add a provider key in{" "}
            <Link to="/app/settings" className="text-brand-300 underline">Settings</Link>{" "}
            to use AI.
          </p>
        )}
      </div>

      {/* Decks */}
      {data.flashcards.length > 0 && (
        <>
          <h2 className="mt-8 font-semibold text-white">Your flashcards ({data.flashcards.length})</h2>
          <div className="mt-3 space-y-3">
            {/* By page */}
            {Object.entries(byPage).map(([pid, cards]) => {
              const node = data.nodes.find((n) => n.id === pid);
              return (
                <div key={pid} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{node?.title ?? "Unknown page"}</p>
                    <p className="text-xs text-slate-500">{cards.length} cards</p>
                  </div>
                  <button
                    onClick={() => { setReviewDeck(cards); setCardIndex(0); setFlipped(false); }}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => cards.forEach((c) => store.remove(c.id))}
                    className="rounded p-1.5 text-slate-400 hover:text-rose-400"
                    title="Delete deck"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {/* Standalone */}
            {standalone.length > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">Standalone cards</p>
                  <p className="text-xs text-slate-500">{standalone.length} cards</p>
                </div>
                <button
                  onClick={() => { setReviewDeck(standalone); setCardIndex(0); setFlipped(false); }}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
                >
                  Review
                </button>
                <button
                  onClick={() => standalone.forEach((c) => store.remove(c.id))}
                  className="rounded p-1.5 text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {data.flashcards.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-500">
          No flashcards yet. Select a page and generate your first deck.
        </p>
      )}
    </div>
  );
}
