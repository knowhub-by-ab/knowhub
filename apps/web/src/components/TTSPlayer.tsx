import { useEffect, useSyncExternalStore } from "react";
import {
  Play,
  Pause,
  Square,
  Rewind,
  FastForward,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getTTSState,
  subscribeToTTS,
  pauseTTS,
  resumeTTS,
  stopTTS,
  setRate,
  setVoice,
  rewind,
  fastForward,
  getAvailableVoices,
} from "@/lib/tts";
import { useState } from "react";

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function TTSPlayer() {
  const state = useSyncExternalStore(subscribeToTTS, getTTSState, getTTSState);
  const [minimized, setMinimized] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function loadVoices() {
      const v = getAvailableVoices();
      if (v.length) setVoices(v);
    }
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  if (!state.active) return null;

  const progressPct = Math.round(state.progress * 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/95 backdrop-blur-md shadow-2xl">
      {/* Progress bar */}
      <div className="h-0.5 bg-white/10">
        <div
          className="h-full bg-brand-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-2">
        {/* Compact bar (always visible) */}
        <div className="flex items-center gap-3">
          {/* Title */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{state.title || "Listening…"}</p>
            <p className="text-xs text-slate-500">{progressPct}% · {state.playing ? "Playing" : "Paused"}</p>
          </div>

          {/* Core controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => rewind(30)}
              title="Rewind 30s"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <Rewind className="h-4 w-4" />
            </button>
            <button
              onClick={() => state.paused ? resumeTTS() : pauseTTS()}
              title={state.paused ? "Resume" : "Pause"}
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white hover:bg-brand-500 transition"
            >
              {state.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              onClick={() => fastForward(30)}
              title="Fast-forward 30s"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <FastForward className="h-4 w-4" />
            </button>
            <button
              onClick={stopTTS}
              title="Stop & close player"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-400 hover:text-white transition"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Expand/collapse */}
          <button
            onClick={() => setMinimized((v) => !v)}
            className="grid h-7 w-7 place-items-center rounded text-slate-500 hover:text-white"
            title={minimized ? "Show controls" : "Minimize"}
          >
            {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Expanded controls */}
        {!minimized && (
          <div className="mt-2 flex flex-wrap items-center gap-3 pb-1">
            {/* Speed */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Speed:</span>
              <div className="flex rounded-lg border border-white/10 p-0.5 gap-0.5">
                {RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRate(r)}
                    className={`rounded px-2 py-0.5 text-xs transition ${
                      state.rate === r ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            </div>

            {/* Voice selector */}
            {voices.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Voice:</span>
                <select
                  value={state.voiceURI}
                  onChange={(e) => setVoice(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900 px-2 py-0.5 text-xs text-white outline-none focus:border-brand-500 max-w-[200px]"
                >
                  <option value="">Default</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Download note */}
            <p className="text-xs text-slate-600">
              MP3 download isn't available via browser TTS — use a screen recorder or text-to-speech converter app.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
