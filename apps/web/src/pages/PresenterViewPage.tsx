import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useDeckStore } from "@/lib/deckStore";
import SlidePreview from "@/components/deck/SlidePreview";

export default function PresenterViewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { decks } = useDeckStore();
  const deck = decks.find((d) => d.id === deckId);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [autoNarrate, setAutoNarrate] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = deck ? [...deck.slides].sort((a, b) => a.order - b.order) : [];
  const currentSlide = slides[currentIdx];

  // Fullscreen on mount
  useEffect(() => {
    const el = containerRef.current ?? document.documentElement;
    el.requestFullscreen?.().catch(() => {/* ignore — may be blocked */});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      speechSynthesis.cancel();
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") prev();
      else if (e.key === "Escape") handleExit();
      else if (e.key === "n" || e.key === "N") setShowNotes((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const speak = useCallback((text: string) => {
    speechSynthesis.cancel();
    if (!text.trim()) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = deck?.frontmatter.speechRate ?? 1;
    utt.pitch = deck?.frontmatter.speechPitch ?? 1;
    if (deck?.frontmatter.voiceName) {
      const voice = speechSynthesis.getVoices().find((v) => v.name === deck.frontmatter.voiceName);
      if (voice) utt.voice = voice;
    }
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utt);
  }, [deck]);

  // Auto-narrate when slide changes
  useEffect(() => {
    if (autoNarrate && currentSlide?.narrationScript) {
      speak(currentSlide.narrationScript);
    }
  }, [currentIdx, autoNarrate]);

  function next() {
    if (currentIdx < slides.length - 1) setCurrentIdx((i) => i + 1);
  }

  function prev() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  }

  function handleExit() {
    speechSynthesis.cancel();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    navigate(-1);
  }

  // Touch swipe
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -50) next();
    else if (delta > 50) prev();
    touchStartX.current = null;
  }

  if (!deck || slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <p className="mb-3">No slides to present.</p>
          <button onClick={() => navigate(-1)} className="text-indigo-400">← Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen flex flex-col bg-black overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Controls overlay (top) */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm z-10">
        <button onClick={handleExit} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors">
          <X size={16} /> Exit
        </button>
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm">{currentIdx + 1} / {slides.length}</span>
          <button
            onClick={() => setShowNotes((v) => !v)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${showNotes ? "border-indigo-500 text-indigo-400" : "border-zinc-700 text-zinc-500"}`}
          >
            Notes (N)
          </button>
          <button
            onClick={() => {
              if (speaking) { speechSynthesis.cancel(); setSpeaking(false); }
              else if (currentSlide?.narrationScript) speak(currentSlide.narrationScript);
            }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${speaking ? "border-emerald-500 text-emerald-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
          >
            {speaking ? <Volume2 size={12} /> : <VolumeX size={12} />}
            {speaking ? "Speaking…" : "Narrate"}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoNarrate}
              onChange={(e) => setAutoNarrate(e.target.checked)}
              className="accent-indigo-500"
            />
            Auto
          </label>
        </div>
      </div>

      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div className="w-full max-w-5xl">
          <SlidePreview
            slide={currentSlide}
            theme={deck.frontmatter.theme}
            accentColor={deck.frontmatter.accentColor}
            font={deck.frontmatter.font}
            className="w-full shadow-2xl"
          />
        </div>
      </div>

      {/* Speaker notes */}
      {showNotes && currentSlide.speakerNotes && (
        <div className="px-6 py-3 bg-zinc-900/90 border-t border-zinc-800 text-sm text-zinc-300 max-h-28 overflow-y-auto">
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide mr-2">Notes</span>
          {currentSlide.speakerNotes}
        </div>
      )}

      {/* Navigation (bottom) */}
      <div className="flex items-center justify-center gap-4 py-3 bg-black/80">
        <button
          onClick={prev}
          disabled={currentIdx === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} /> Prev
        </button>
        {/* Slide dots */}
        <div className="flex gap-1.5 max-w-xs overflow-hidden">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`rounded-full transition-all ${i === currentIdx ? "bg-indigo-500 w-4 h-2" : "bg-zinc-600 hover:bg-zinc-400 w-2 h-2"}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={currentIdx === slides.length - 1}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
