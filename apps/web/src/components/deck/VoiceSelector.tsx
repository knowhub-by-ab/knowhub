import { useState, useEffect } from "react";
import { Volume2, Play, ChevronDown, ChevronUp } from "lucide-react";
import type { DeckFrontmatter } from "@/lib/deckStore";

interface Props {
  voiceName?: string;
  speechRate: number;
  speechPitch: number;
  language: string;
  onChange: (patch: Partial<DeckFrontmatter>) => void;
}

export default function VoiceSelector({ voiceName, speechRate, speechPitch, language, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function loadVoices() {
      const v = speechSynthesis.getVoices();
      if (v.length) setVoices(v);
    }
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  const filtered = language
    ? voices.filter((v) => v.lang.toLowerCase().startsWith(language.toLowerCase()))
    : voices;

  const displayVoices = filtered.length > 0 ? filtered : voices;
  const selected = voices.find((v) => v.name === voiceName) ?? displayVoices[0];

  function handlePreview() {
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance("This is a preview of how your narration will sound.");
    if (selected) utt.voice = selected;
    utt.rate = speechRate;
    utt.pitch = speechPitch;
    speechSynthesis.speak(utt);
  }

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 text-zinc-200 text-sm font-medium hover:bg-zinc-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Volume2 size={13} />
          <span>Voice & Narration</span>
        </div>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-zinc-900">
          {/* Voice picker */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Voice</label>
            <select
              value={voiceName ?? selected?.name ?? ""}
              onChange={(e) => onChange({ voiceName: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
            >
              {displayVoices.length === 0 && <option value="">No voices available</option>}
              {displayVoices.map((v) => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>

          {/* Rate */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-zinc-400">Rate</label>
              <span className="text-xs text-zinc-500">{speechRate.toFixed(1)}×</span>
            </div>
            <input
              type="range" min={0.5} max={2} step={0.1}
              value={speechRate}
              onChange={(e) => onChange({ speechRate: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Pitch */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-zinc-400">Pitch</label>
              <span className="text-xs text-zinc-500">{speechPitch.toFixed(1)}</span>
            </div>
            <input
              type="range" min={0.5} max={2} step={0.1}
              value={speechPitch}
              onChange={(e) => onChange({ speechPitch: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          <button
            onClick={handlePreview}
            className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-300 transition-colors"
          >
            <Play size={12} /> Test Voice
          </button>
        </div>
      )}
    </div>
  );
}
