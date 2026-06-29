import { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { aiKeys, useAppData } from "@/lib/store";
import { PROVIDER_PRESETS } from "@/lib/providers";
import type { AiRole, ProviderId } from "@/lib/types";

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

const CURRENT_VERSION = "1.0.3";

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
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (window as any).puter;
    if (p?.auth?.isSignedIn) {
      setSignedIn(p.auth.isSignedIn());
    } else {
      setSignedIn(null); // Puter not loaded yet
    }
  }, []);

  async function connectPuter() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (window as any).puter;
    if (!p?.auth?.signIn) return;
    setLoading(true);
    try {
      await p.auth.signIn();
      setSignedIn(p.auth.isSignedIn());
    } catch {
      // User cancelled
    } finally {
      setLoading(false);
    }
  }

  async function disconnectPuter() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (window as any).puter;
    if (!p?.auth?.signOut) return;
    await p.auth.signOut();
    setSignedIn(false);
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600/20 text-violet-300">
          <Music className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-semibold text-white">Puter AI (Free TTS & MP3 download)</h2>
          <p className="text-sm text-slate-400">
            Puter provides free AI services including text-to-speech for MP3 audio download.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {signedIn === null && (
          <p className="text-sm text-slate-500">Loading Puter status…</p>
        )}
        {signedIn === false && (
          <>
            <p className="text-sm text-slate-400">
              Not connected. Sign in to Puter for higher TTS limits and MP3 download support.
              Basic TTS (without sign-in) may still work with lower quotas.
            </p>
            <button
              onClick={connectPuter}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {loading ? "Connecting…" : "Connect Puter"}
            </button>
          </>
        )}
        {signedIn === true && (
          <>
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Connected to Puter — MP3 audio download is available.
            </p>
            <button
              onClick={disconnectPuter}
              className="text-xs text-slate-500 hover:text-rose-400 underline"
            >
              Disconnect
            </button>
          </>
        )}
        <p className="text-xs text-slate-600">
          Puter is completely free. No credit card needed.{" "}
          <a href="https://puter.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300">
            Learn more ↗
          </a>
        </p>
      </div>
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
            {!isPuter && (
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
            )}
          </div>

          {isPuter && (
            <p className="mt-2 rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
              Puter.js is free and keyless — no API key needed. It calls AI directly from
              your browser using Puter's free quota.
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
