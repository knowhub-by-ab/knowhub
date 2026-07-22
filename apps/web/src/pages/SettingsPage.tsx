import { useState } from "react";
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  KeyRound,
  ExternalLink,
  RefreshCw,
  Music,
} from "lucide-react";
import { aiKeys, useAppData, setPuterApiToken } from "@/lib/store";
import { PROVIDER_PRESETS } from "@/lib/providers";
import type { AiRole, ProviderId } from "@/lib/types";
import { githubSync, type SyncConfig } from "@/lib/gistSync";
import { Github } from "lucide-react";

const PROVIDER_IDS = Object.keys(PROVIDER_PRESETS) as ProviderId[];

const ALL_ROLES: AiRole[] = ["tree", "pages", "assessments", "other", "any"];
const ROLE_LABELS: Record<AiRole, string> = {
  tree: "Tree",
  pages: "Pages",
  assessments: "Assessments",
  other: "Tutor/Other",
  any: "Any (all uses)",
};

function mask(key: string): string {
  if (!key) return "(keyless)";
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

declare const __APP_VERSION__: string;
const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.1.0";

function CheckForUpdates() {
  const [status, setStatus] = useState<"idle" | "checking" | "latest" | "update">("idle");
  const [remoteVersion, setRemoteVersion] = useState("");

  async function check() {
    setStatus("checking");
    try {
      const res = await fetch("https://knowhub-ai.pages.dev/version.json?t=" + Date.now());
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setRemoteVersion(data.version ?? "");
      setStatus(data.version !== CURRENT_VERSION ? "update" : "latest");
    } catch {
      setStatus("latest"); // Treat network error as "can't check, assume fine"
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600/20 text-brand-300">
          <RefreshCw className="h-4 w-4" />
        </span>
        <h2 className="font-semibold text-white">Check for Updates</h2>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        Current version: <span className="font-mono text-slate-200">{CURRENT_VERSION}</span>
      </p>
      {status === "latest" && (
        <p className="mt-2 text-sm text-emerald-400">You're on the latest version.</p>
      )}
      {status === "update" && (
        <p className="mt-2 text-sm text-amber-400">
          Update available: <span className="font-mono">{remoteVersion}</span>.{" "}
          <a
            href="https://github.com/knowhub-by-ab/knowhub/releases"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white"
          >
            View releases ↗
          </a>
        </p>
      )}
      <button
        onClick={check}
        disabled={status === "checking"}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${status === "checking" ? "animate-spin" : ""}`} />
        {status === "checking" ? "Checking…" : "Check now"}
      </button>
    </section>
  );
}

function PuterSection() {
  const data = useAppData();
  const [tokenInput, setTokenInput] = useState(data.puterApiToken ?? "");
  const [saved, setSaved] = useState(false);

  function save() {
    setPuterApiToken(tokenInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const isConnected = Boolean(data.puterApiToken);

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600/20 text-violet-300">
          <Music className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-semibold text-white">Puter API Token (Free TTS & MP3 download)</h2>
          <p className="text-sm text-slate-400">
            Required for MP3 audio download from Learning Pages and Podcast.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {/* Connected indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-slate-600"}`} />
          <span className={isConnected ? "text-emerald-400" : "text-slate-500"}>
            {isConnected ? "Connected — MP3 audio download is available." : "No token set — MP3 download disabled."}
          </span>
        </div>

        <label className="block text-xs font-medium text-slate-300">
          Puter API Token
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => { setTokenInput(e.target.value); setSaved(false); }}
            placeholder="Paste your Puter API token here"
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            {saved ? "Saved!" : "Save Token"}
          </button>
          {isConnected && (
            <button
              onClick={() => { setTokenInput(""); setPuterApiToken(""); }}
              className="text-xs text-slate-500 hover:text-rose-400 underline"
            >
              Remove token
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Get your free API token at{" "}
          <a href="https://puter.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300">
            puter.com ↗
          </a>{" "}
          → Account → API Keys. No credit card needed.
        </p>
      </div>
    </section>
  );
}

function GitHubSyncSection() {
  const [cfg, setCfg] = useState<SyncConfig | null>(() => githubSync.getConfig());
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleConnect() {
    if (!token.trim()) return;
    setBusy(true);
    try {
      const newCfg = await githubSync.configure(token.trim());
      setCfg(newCfg);
      setToken("");
      flash("Connected! Your data has been pushed to a private GitHub Gist.");
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e), false);
    } finally {
      setBusy(false);
    }
  }

  async function handlePush() {
    setBusy(true);
    try {
      await githubSync.push();
      setCfg(githubSync.getConfig());
      flash("Data pushed to GitHub Gist.");
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e), false);
    } finally {
      setBusy(false);
    }
  }

  async function handlePull() {
    setBusy(true);
    try {
      await githubSync.pull();
      flash("Data pulled from GitHub Gist. Reloading…");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e), false);
      setBusy(false);
    }
  }

  function handleDisconnect() {
    githubSync.clear();
    setCfg(null);
    flash("GitHub sync disconnected.");
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-700/60 text-slate-300">
          <Github className="h-4 w-4" />
        </span>
        <h2 className="font-semibold text-white">GitHub Gist Sync</h2>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        Sync all your KnowHub data (notes, courses, quizzes) to a private GitHub Gist so it's
        available across all your devices and browsers.
      </p>

      {msg && (
        <div className={`mt-3 rounded-lg px-4 py-2 text-sm font-medium ${msg.ok ? "bg-green-900/50 text-green-300 border border-green-700" : "bg-red-900/50 text-red-300 border border-red-700"}`}>
          {msg.text}
        </div>
      )}

      {!cfg ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-sm text-slate-300 font-medium">Connect your GitHub account</p>
          <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
            <li>Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
            <li>Generate a token with the <code className="bg-slate-700 px-1 rounded">gist</code> scope</li>
            <li>Paste it below</li>
          </ol>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
              className="flex-1 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-500 transition-colors"
            />
            <button
              onClick={handleConnect}
              disabled={busy || !token.trim()}
              className="rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 transition-colors inline-flex items-center gap-1.5"
            >
              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              Connect
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-400 font-medium">Connected to GitHub Gist</span>
          </div>
          <p className="text-xs text-slate-400">
            Gist ID: <code className="bg-slate-700 px-1 rounded">{cfg.gistId}</code>
          </p>
          {cfg.lastPushedAt && (
            <p className="text-xs text-slate-500">
              Last pushed: {new Date(cfg.lastPushedAt).toLocaleString()}
            </p>
          )}
          {cfg.lastPulledAt && (
            <p className="text-xs text-slate-500">
              Last pulled: {new Date(cfg.lastPulledAt).toLocaleString()}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              onClick={handlePush}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
              Push (save to GitHub)
            </button>
            <button
              onClick={handlePull}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-200 text-sm font-semibold px-4 py-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
              Pull (restore from GitHub)
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="rounded-lg border border-white/15 bg-white/5 hover:bg-red-900/40 disabled:opacity-50 text-red-400 hover:text-red-300 text-sm font-semibold px-4 py-2 transition-colors"
            >
              Disconnect
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            <strong>Push</strong> saves your current data to GitHub. <strong>Pull</strong> replaces your current data with what's on GitHub (useful when switching devices).
          </p>
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const data = useAppData();
  const [provider, setProvider] = useState<ProviderId>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AiRole[]>([]);

  const preset = PROVIDER_PRESETS[provider];
  const isCustom = provider === "custom";
  const isPuter = provider === "puter";
  const canAdd = isPuter || (apiKey.trim().length > 0 && (!isCustom || baseUrl.trim().length > 0));

  function toggleRole(role: AiRole) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function add() {
    if (!canAdd) return;
    aiKeys.add({
      provider,
      apiKey: isPuter ? "" : apiKey,
      baseUrl: isCustom ? baseUrl : undefined,
      model: model.trim() || undefined,
      roles: selectedRoles.length ? selectedRoles : undefined,
    });
    setApiKey("");
    setBaseUrl("");
    setModel("");
    setSelectedRoles([]);
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

      <GitHubSyncSection />

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <KeyRound className="h-4 w-4 text-brand-300" /> AI provider keys
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          The AI Tutor tries these <strong>in order, top to bottom</strong>. Tag each key
          with a role so the router sends the right requests to the right key. Keys without
          a role tag are used for everything. Recommended: add Puter.js (free, no key
          needed) + OpenRouter free models as fallbacks.
        </p>

        {/* Existing keys */}
        <ul className="mt-5 space-y-2">
          {data.aiKeys.length === 0 && (
            <li className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-center text-sm text-slate-500">
              No keys yet. Add one below to power the AI features.
            </li>
          )}
          {data.aiKeys.map((k, i) => {
            const p = PROVIDER_PRESETS[k.provider];
            return (
              <li
                key={k.id}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
              >
                <span className="mt-1 w-5 text-center text-xs font-semibold text-slate-500">
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
                  {/* Role chips */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ALL_ROLES.map((role) => {
                      const active = k.roles?.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            const current = k.roles ?? [];
                            const next = current.includes(role)
                              ? current.filter((r) => r !== role)
                              : [...current, role];
                            aiKeys.updateRoles(k.id, next);
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 transition ${
                            active
                              ? "bg-brand-600/30 text-brand-200 ring-brand-500/50"
                              : "bg-white/5 text-slate-500 ring-white/10 hover:text-slate-300"
                          }`}
                          title={active ? `Remove "${role}" tag` : `Tag as "${role}"`}
                        >
                          {ROLE_LABELS[role]}
                        </button>
                      );
                    })}
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
                onChange={(e) => {
                  setProvider(e.target.value as ProviderId);
                  setApiKey("");
                }}
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
                {isPuter ? "Puter API Token" : "API key"}
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={preset.keyHint}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
                />
              </label>
          </div>

          {isPuter && (
            <p className="mt-2 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
              Get your free Puter API token at puter.com → Account → API Keys. The same token works for both AI and TTS/MP3 download.
            </p>
          )}

          {provider === "openrouter" && (
            <p className="mt-2 text-xs text-slate-400">
              OpenRouter offers <strong>free models</strong> (e.g.{" "}
              <code className="text-slate-300">meta-llama/llama-3.3-70b-instruct:free</code>).
              Great for adding extra fallback capacity at zero cost.
            </p>
          )}

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

          {/* Role selector for new key */}
          <div className="mt-2">
            <span className="text-xs font-medium text-slate-300">
              Roles <span className="text-slate-500">(optional — leave blank to use for everything)</span>
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded px-2 py-0.5 text-xs font-medium ring-1 transition ${
                    selectedRoles.includes(role)
                      ? "bg-brand-600/30 text-brand-200 ring-brand-500/50"
                      : "bg-white/5 text-slate-400 ring-white/10 hover:text-slate-200"
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

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
          When signed in, your keys and data sync across devices. Signed out, they're
          stored only in this browser. Keys are sent over HTTPS per request and never
          committed or shared.
        </p>
      </section>
      <PuterSection />
      <CheckForUpdates />
    </div>
  );
}
