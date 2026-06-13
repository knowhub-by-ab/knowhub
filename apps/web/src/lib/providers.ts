import type { ProviderId, ProviderKey } from "./types";

export interface ProviderPreset {
  label: string;
  baseUrl: string;
  model: string;
  kind: "openai" | "apifreellm";
  /** Hint shown in the key input. */
  keyHint: string;
  /** Where to get a free key. */
  getKeyUrl?: string;
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
  custom: {
    label: "Custom (OpenAI-compatible)",
    baseUrl: "",
    model: "auto",
    kind: "openai",
    keyHint: "your API key (optional)",
  },
};

/** Convert a stored ProviderKey into the upstream shape the backend expects. */
export function toUpstream(k: ProviderKey) {
  const preset = PROVIDER_PRESETS[k.provider];
  return {
    name: k.label?.trim() || preset.label,
    baseUrl: (k.baseUrl?.trim() || preset.baseUrl).replace(/\/+$/, ""),
    apiKey: k.apiKey.trim(),
    model: k.model?.trim() || preset.model,
    kind: preset.kind,
  };
}
