import { useState } from "react";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { aiKeys, useAppData } from "@/lib/store";
import { PROVIDER_PRESETS } from "@/lib/providers";
import type { ProviderId } from "@/lib/types";

const PROVIDER_IDS = Object.keys(PROVIDER_PRESETS) as ProviderId[];

function mask(key: string): string {
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export default function SettingsPage() {
  const data = useAppData();
  const [provider, setProvider] = useState<ProviderId>("apifreellm");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");

  const preset = PROVIDER_PRESETS[provider];
  const isCustom = provider === "custom";
  const canAdd = apiKey.trim().length > 0 && (!isCustom || baseUrl.trim().length > 0);

  function add() {
    if (!canAdd) return;
    aiKeys.add({ provider, apiKey, baseUrl: isCustom ? baseUrl : undefined, model });
    setApiKey("");
    setBaseUrl("");
    setModel("");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <SettingsIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400">Manage your AI provider keys.</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <KeyRound className="h-4 w-4 text-brand-300" /> AI provider keys
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          The AI Tutor tries these <strong>in order, top to bottom</strong>. When one is
          rate-limited or out of quota, it automatically falls through to the next — and
          keys are kept, so they work again when their quota renews. Add as many as you like
          (e.g. ApiFreeLLM first, then your 9 Gemini keys).
        </p>

        {/* Existing keys */}
        <ul className="mt-5 space-y-2">
          {data.aiKeys.length === 0 && (
            <li className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-center text-sm text-slate-500">
              No keys yet. Add one below to power the AI Tutor.
            </li>
          )}
          {data.aiKeys.map((k, i) => {
            const p = PROVIDER_PRESETS[k.provider];
            return (
              <li
                key={k.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
              >
                <span className="w-5 text-center text-xs font-semibold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-100">
                    {k.label || p.label}
                    <span className="ml-2 font-mono text-xs text-slate-500">
                      {mask(k.apiKey)}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {k.model || p.model}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => aiKeys.move(k.id, -1)}
                    disabled={i === 0}
                    className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                    title="Move up (higher priority)"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => aiKeys.move(k.id, 1)}
                    disabled={i === data.aiKeys.length - 1}
                    className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => aiKeys.remove(k.id)}
                    className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Add form */}
        <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-300">
              Provider
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderId)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              >
                {PROVIDER_IDS.map((id) => (
                  <option key={id} value={id}>
                    {PROVIDER_PRESETS[id].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-300">
              API key
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={preset.keyHint}
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              />
            </label>
          </div>

          {isCustom && (
            <label className="mt-2 block text-xs font-medium text-slate-300">
              Endpoint base URL (OpenAI-compatible)
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-endpoint/v1"
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              />
            </label>
          )}

          <label className="mt-2 block text-xs font-medium text-slate-300">
            Model <span className="text-slate-500">(optional — default {preset.model})</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={preset.model}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            />
          </label>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={add}
              disabled={!canAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add key
            </button>
            {preset.getKeyUrl && (
              <a
                href={preset.getKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-300 hover:underline"
              >
                Get a {preset.label} key <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Keys are stored only in this browser (this device) and sent over HTTPS to
          KnowHub's backend per request. They are never committed or shared. For use across
          devices, add them on each device — cross-device sync arrives with accounts.
        </p>
      </section>
    </div>
  );
}
