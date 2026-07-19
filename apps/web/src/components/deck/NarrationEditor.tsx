import { useState, useEffect } from "react";
import { Mic, RefreshCw, Play, Square, Volume2 } from "lucide-react";
import type { Slide, NarrationTone } from "@/lib/deckStore";

interface Props {
  slide: Slide;
  tone: NarrationTone;
  voiceName?: string;
  speechRate?: number;
  speechPitch?: number;
  onScriptChange: (script: string) => void;
  onGenerateSingle?: () => Promise<void>;
  isGenerating?: boolean;
}

export default function NarrationEditor({
  slide,
  tone,
  voiceName,
  speechRate = 1,
  speechPitch = 1,
  onScriptChange,
  onGenerateSingle,
  isGenerating,
}: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const script = slide.narrationScript ?? "";
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const estSeconds = Math.round(wordCount / 2.5); // ~150 wpm

  useEffect(() => {
    return () => { speechSynthesis.cancel(); };
  }, []);

  function handlePreview() {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!script.trim()) return;
    const utt = new SpeechSynthesisUtterance(script);
    utt.rate = speechRate;
    utt.pitch = speechPitch;
    if (voiceName) {
      const voice = speechSynthesis.getVoices().find((v) => v.name === voiceName);
      if (voice) utt.voice = voice;
    }
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utt);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Mic size={13} className="text-indigo-400" />
          <span className="text-xs font-medium text-zinc-300">Narration Script</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onGenerateSingle && (
            <button
              onClick={onGenerateSingle}
              disabled={isGenerating}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-300 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={10} className={isGenerating ? "animate-spin" : ""} />
              AI
            </button>
          )}
          <button
            onClick={handlePreview}
            disabled={!script.trim()}
            className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors disabled:opacity-40 ${
              isSpeaking
                ? "bg-red-800 border-red-700 text-red-200 hover:bg-red-700"
                : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {isSpeaking ? <Square size={10} /> : <Play size={10} />}
            {isSpeaking ? "Stop" : "Preview"}
          </button>
        </div>
      </div>

      <textarea
        value={script}
        onChange={(e) => onScriptChange(e.target.value)}
        placeholder="Write narration script here, or click AI to generate…"
        rows={4}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
      />

      <div className="flex items-center gap-1 text-xs text-zinc-500">
        <Volume2 size={10} />
        <span>{wordCount} words · ~{estSeconds}s</span>
        {tone && <span className="ml-2 capitalize text-zinc-600">· {tone} tone</span>}
      </div>
    </div>
  );
}
