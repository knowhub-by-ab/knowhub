import { useEffect, useState } from "react";
import {
  GitBranch,
  Github,
  Loader2,
  UploadCloud,
  DownloadCloud,
  Check,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { setGithub, replaceAll, getState, useAppData } from "@/lib/store";
import {
  getUser,
  ensureRepo,
  syncToRepo,
  importFromRepo,
  GitHubError,
} from "@/lib/github";

function randomState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function RepositoryPage() {
  const data = useAppData();
  const gh = data.github ?? {};
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [repoName, setRepoName] = useState(gh.repo || "knowhub");

  // Handle the OAuth redirect (#gh=token or #gh_error=...).
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const token = params.get("gh");
    const err = params.get("gh_error");
    if (err) {
      setError(`GitHub connection failed: ${err}`);
      history.replaceState(null, "", window.location.pathname);
      return;
    }
    if (token) {
      const expected = sessionStorage.getItem("gh_state");
      const got = params.get("state");
      history.replaceState(null, "", window.location.pathname);
      if (expected && got && expected !== got) {
        setError("Security check failed (state mismatch). Please try connecting again.");
        return;
      }
      setGithub({ token });
      setBusy("Reading your GitHub account…");
      getUser(token)
        .then((u) => setGithub({ login: u.login }))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to read account."))
        .finally(() => setBusy(null));
    }
  }, []);

  function connect() {
    const state = randomState();
    sessionStorage.setItem("gh_state", state);
    window.location.href = `/api/github/start?state=${encodeURIComponent(state)}`;
  }

  function disconnect() {
    setGithub({ token: undefined, login: undefined, repo: undefined, lastSync: undefined });
    setOkMsg(null);
    setError(null);
  }

  async function syncUp() {
    if (!gh.token || !gh.login) return;
    setError(null);
    setOkMsg(null);
    try {
      const name = repoName.trim() || "knowhub";
      setBusy("Ensuring repository exists…");
      await ensureRepo(gh.token, gh.login, name);
      setGithub({ repo: name });
      await syncToRepo(gh.token, gh.login, name, getState(), (m) => setBusy(m));
      setGithub({ lastSync: Date.now() });
      setOkMsg(`Synced to ${gh.login}/${name}.`);
    } catch (e) {
      setError(e instanceof GitHubError ? e.message : e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(null);
    }
  }

  async function importDown() {
    if (!gh.token || !gh.login) return;
    const name = repoName.trim() || "knowhub";
    if (!confirm(`Import knowhub.json from ${gh.login}/${name} and REPLACE current data on this device?`))
      return;
    setError(null);
    setOkMsg(null);
    setBusy("Importing from GitHub…");
    try {
      const snap = await importFromRepo(gh.token, gh.login, name);
      if (!snap) {
        setError("No knowhub.json found in that repository yet. Sync up first.");
        return;
      }
      replaceAll({
        nodes: snap.nodes,
        pages: snap.pages,
        notes: snap.notes,
        resources: snap.resources,
        quizzes: snap.quizzes,
        aiKeys: data.aiKeys,
        github: data.github,
      });
      setOkMsg("Imported from GitHub.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <GitBranch className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Repository</h1>
          <p className="text-sm text-slate-400">
            Sync your knowledge to a GitHub repository you own.
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        {!gh.token ? (
          <>
            <p className="text-sm text-slate-400">
              Connect GitHub to keep a portable copy of your learning tree, pages and notes
              in your own repository — the source of truth you fully own.
            </p>
            <button
              onClick={connect}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              <Github className="h-4 w-4" /> Connect GitHub
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <Github className="h-4 w-4 text-brand-300" />
                {gh.login ? (
                  <>
                    Connected as <span className="font-semibold">{gh.login}</span>
                  </>
                ) : (
                  "Connected"
                )}
              </div>
              <button
                onClick={disconnect}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" /> Disconnect
              </button>
            </div>

            <label className="mt-5 block text-sm font-medium text-slate-300">
              Repository name (created under your account if it doesn't exist)
              <input
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="knowhub"
                className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={syncUp}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" /> Sync to GitHub
              </button>
              <button
                onClick={importDown}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
              >
                <DownloadCloud className="h-4 w-4" /> Import from GitHub
              </button>
              {gh.login && gh.repo && (
                <a
                  href={`https://github.com/${gh.login}/${gh.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 self-center text-xs text-brand-300 hover:underline"
                >
                  Open repo <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {gh.lastSync && (
              <p className="mt-3 text-xs text-slate-500">
                Last synced {new Date(gh.lastSync).toLocaleString()}.
              </p>
            )}
          </>
        )}

        {busy && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" /> {busy}
          </p>
        )}
        {okMsg && (
          <p className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> {okMsg}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </p>
        )}

        <p className="mt-5 text-xs text-slate-500">
          Your repo is created <strong>private</strong>. The connection uses GitHub OAuth;
          the token is stored with your account data. "Sync" writes <code>knowhub.json</code>,{" "}
          <code>notes.md</code> and a <code>knowledge/</code> page per topic.
        </p>
      </section>
    </div>
  );
}
