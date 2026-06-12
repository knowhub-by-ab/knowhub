import { useState } from "react";
import { Settings as SettingsIcon, Check, ExternalLink } from "lucide-react";
import { setSettings, useAppData } from "@/lib/store";

export default function SettingsPage() {
  const data = useAppData();
  const [baseUrl, setBaseUrl] = useState(data.settings.baseUrl);
  const [apiKey, setApiKey] = useState(data.settings.apiKey);
  const [model, setModel] = useState(data.settings.model);
  const [saved, setSaved] = useState(false);

  function save() {
    setSettings({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() || "auto" });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <SettingsIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400">Configure your AI provider.</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-semibold text-white">AI Provider</h2>
        <p className="mt-1 text-sm text-slate-400">
          By default the AI Tutor uses <strong>KnowHub's built-in backend</strong> — just
          add a provider key in your Cloudflare Pages project settings. Leave the fields
          below <strong>blank</strong> to use it.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          <em>Advanced (optional):</em> to use your own endpoint instead — e.g. a
          self-hosted{" "}
          <a
            href="https://github.com/tashfeenahmed/freellmapi"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-brand-300 hover:underline"
          >
            FreeLLMAPI <ExternalLink className="h-3 w-3" />
          </a>{" "}
          — enter its URL below.
        </p>

        <label className="mt-5 block text-sm font-medium text-slate-300">
          Endpoint base URL
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:3001/v1"
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-300">
          API key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="freellmapi-…"
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-300">
          Model
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="auto"
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          />
        </label>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Save
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Stored only in this browser. Your server must allow requests from{" "}
          <code className="text-slate-400">{window.location.origin}</code> (CORS) — set
          this with FreeLLMAPI's <code className="text-slate-400">DASHBOARD_ORIGINS</code>.
        </p>
      </section>
    </div>
  );
}
