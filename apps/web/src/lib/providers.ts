import type { ProviderId, ProviderKey } from "./types";

export interface ProviderPreset {
  label: string;
  baseUrl: string;
  model: string;
  kind: "openai" | "apifreellm" | "puter" | "fal-image" | "runware-image" | "fish-tts" | "elevenlabs-tts" | "resemble-tts";
  /** Hint shown in the key input. */
  keyHint: string;
  /** Where to get a free key. */
  getKeyUrl?: string;
  /** If true, no API key is required. */
  keyless?: boolean;
}

export const PROVIDER_PRESETS: Record<ProviderId, ProviderPreset> = {
  apifreellm: {
    label: "ApiFreeLLM",
    baseUrl: "https://apifreellm.com/api/v1/chat",
    model: "apifreellm",
    kind: "apifreellm",
    keyHint: "apf_…",
    getKeyUrl: "https://apifreellm.com",
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    kind: "openai",
    keyHint: "AIza…",
    getKeyUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    kind: "openai",
    keyHint: "gsk_…",
    getKeyUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    kind: "openai",
    keyHint: "sk-or-…",
    getKeyUrl: "https://openrouter.ai/keys",
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    kind: "openai",
    keyHint: "sk-…",
    getKeyUrl: "https://platform.openai.com/api-keys",
  },
  puter: {
    label: "Puter.js",
    baseUrl: "",
    model: "gpt-4o-mini",
    kind: "puter",
    keyHint: "Your Puter API token (from puter.com → Account → API Keys)",
    getKeyUrl: "https://puter.com",
  },
  custom: {
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    model: "auto",
    kind: "openai",
    keyHint: "your API key (optional)",
  },
  fal: {
    label: "fal.ai (Image AI)",
    baseUrl: "https://fal.run",
    model: "fal-ai/flux/schnell",
    kind: "fal-image",
    keyHint: "your fal.ai API key",
    getKeyUrl: "https://fal.ai/dashboard/keys",
  },
  runware: {
    label: "Runware (Image AI)",
    baseUrl: "https://api.runware.ai/v1",
    model: "runware:100@1",
    kind: "runware-image",
    keyHint: "your Runware API key",
    getKeyUrl: "https://app.runware.ai/",
  },
  fishaudio: {
    label: "Fish Audio (Voice Cloning)",
    baseUrl: "https://api.fish.audio",
    model: "",
    kind: "fish-tts",
    keyHint: "your Fish Audio API key",
    getKeyUrl: "https://fish.audio/go-api/",
  },
  elevenlabs: {
    label: "ElevenLabs (Voice Cloning)",
    baseUrl: "https://api.elevenlabs.io",
    model: "eleven_multilingual_v2",
    kind: "elevenlabs-tts",
    keyHint: "your ElevenLabs API key",
    getKeyUrl: "https://elevenlabs.io/app/settings/api-keys",
  },
  resembleai: {
    label: "Resemble AI (Voice Cloning)",
    baseUrl: "https://api.resemble.ai",
    model: "",
    kind: "resemble-tts",
    keyHint: "your Resemble AI API key",
    getKeyUrl: "https://app.resemble.ai/",
  },
};

/** Convert a stored ProviderKey into the upstream shape the backend expects. */
export function toUpstream(k: ProviderKey) {
  const preset = PROVIDER_PRESETS[k.provider];
  const isLlm = ["openai", "apifreellm", "puter"].includes(preset.kind);
  return {
    name: k.label?.trim() || preset.label,
    baseUrl: (k.baseUrl?.trim() || preset.baseUrl).replace(/\/+$/, ""),
    apiKey: k.apiKey.trim(),
    model: k.model?.trim() || preset.model,
    kind: preset.kind,
    isLlm,
  };
}
