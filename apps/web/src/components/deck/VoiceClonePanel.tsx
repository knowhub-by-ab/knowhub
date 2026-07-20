import { useState, useRef } from "react";
import { Mic, Upload, Loader2, X } from "lucide-react";
import type { ProviderKey } from "@/lib/types";
import type { VoiceProvider } from "@/lib/deckVoiceClone";
import { PROVIDER_PRESETS } from "@/lib/providers";
import { decks as deckOps } from "@/lib/deckStore";

interface VoiceClonePanelProps {
  deckId: string;
  clonedVoiceId?: string;
  clonedVoiceProvider?: "elevenlabs" | "fishaudio" | "resembleai";
  aiKeys: ProviderKey[];
}

const KIND_TO_PROVIDER: Record<string, VoiceProvider> = {
  "elevenlabs-tts": "elevenlabs",
  "fish-tts": "fishaudio",
  "resemble-tts": "resembleai",
};

const PROVIDER_LABELS: Record<VoiceProvider, string> = {
  elevenlabs: "ElevenLabs",
  fishaudio: "Fish Audio",
  resembleai: "Resemble AI",
};

export default function VoiceClonePanel({
  deckId,
  clonedVoiceId,
  clonedVoiceProvider,
  aiKeys,
}: VoiceClonePanelProps) {
  const [voiceName, setVoiceName] = useState("My Voice");
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Find the first available voice cloning provider
  const availableEntry = aiKeys
    .map((k) => {
      const kind = PROVIDER_PRESETS[k.provider]?.kind ?? "";
      const provider = KIND_TO_PROVIDER[kind];
      return provider ? { provider, apiKey: k.apiKey } : null;
    })
    .find(Boolean);

  if (!availableEntry) {
    return (
      <div className="text-xs text-zinc-500 italic">
        No voice cloning provider configured. Add an ElevenLabs, Fish Audio, or Resemble AI key in Settings.
      </div>
    );
  }

  const { provider, apiKey } = availableEntry;

  async function handleClone() {
    if (!sampleFile) { setError("Upload a voice sample first."); return; }
    setError("");
    setCloning(true);
    try {
      const { cloneVoice } = await import("@/lib/deckVoiceClone");
      const result = await cloneVoice(provider, apiKey, sampleFile, voiceName.trim() || "My Voice");
      deckOps.updateFrontmatter(deckId, {
        clonedVoiceId: result.voiceId,
        clonedVoiceProvider: result.provider,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice cloning failed.");
    } finally {
      setCloning(false);
    }
  }

  function handleRemove() {
    deckOps.updateFrontmatter(deckId, {
      clonedVoiceId: undefined,
      clonedVoiceProvider: undefined,
    });
  }

  if (clonedVoiceId && clonedVoiceProvider) {
    return (
      <div className="flex items-center justify-between gap-2 p-2 bg-emerald-900/20 border border-emerald-800 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Mic size={12} />
          Voice clone active — {PROVIDER_LABELS[clonedVoiceProvider]}
        </div>
        <button onClick={handleRemove} className="text-zinc-500 hover:text-red-400 transition-colors">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400">
        Provider: <span className="text-zinc-200">{PROVIDER_LABELS[provider]}</span>
      </p>

      <input
        type="text"
        value={voiceName}
        onChange={(e) => setVoiceName(e.target.value)}
        placeholder="Voice name"
        className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
      />

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => { setSampleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center gap-2 py-2 border border-dashed border-zinc-600 rounded text-xs text-zinc-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors justify-center"
      >
        <Upload size={12} />
        {sampleFile ? sampleFile.name : "Upload voice sample (audio)"}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleClone}
        disabled={cloning || !sampleFile}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded transition-colors"
      >
        {cloning ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />}
        {cloning ? "Cloning…" : "Create Voice Clone"}
      </button>
    </div>
  );
}
