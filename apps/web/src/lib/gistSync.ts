// GitHub Gist sync — stores all KnowHub localStorage data in a single Gist.
// Usage:
//   await githubSync.configure(token)   — save token, create/find gist
//   await githubSync.push()             — write localStorage → Gist
//   await githubSync.pull()             — read Gist → localStorage (then reload)
//   githubSync.getConfig()              — returns current config or null
//   githubSync.clear()                  — remove config

const CONFIG_KEY = "knowhub:github-sync:v1";
const GIST_FILENAME = "knowhub-data.json";
const GIST_DESCRIPTION = "KnowHub sync data";

// Keys to include in sync
const SYNC_KEYS = [
  "knowhub:data:v1",
  "knowhub:courses:v1",
];

export interface SyncConfig {
  token: string;
  gistId: string;
  lastPushedAt?: number;
  lastPulledAt?: number;
}

function loadConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveConfig(cfg: SyncConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res;
}

// Find existing KnowHub gist or return null
async function findGist(token: string): Promise<string | null> {
  const res = await apiFetch("/gists?per_page=100", token);
  const gists = await res.json() as Array<{ id: string; description: string; files: Record<string, unknown> }>;
  const found = gists.find(
    (g) => g.description === GIST_DESCRIPTION && g.files[GIST_FILENAME]
  );
  return found?.id ?? null;
}

async function createGist(token: string, content: string): Promise<string> {
  const res = await apiFetch("/gists", token, {
    method: "POST",
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content } },
    }),
  });
  const data = await res.json() as { id: string };
  return data.id;
}

async function updateGist(token: string, gistId: string, content: string) {
  await apiFetch(`/gists/${gistId}`, token, {
    method: "PATCH",
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content } },
    }),
  });
}

async function readGist(token: string, gistId: string): Promise<string> {
  const res = await apiFetch(`/gists/${gistId}`, token);
  const data = await res.json() as { files: Record<string, { content?: string; raw_url?: string }> };
  const file = data.files[GIST_FILENAME];
  if (!file) throw new Error("Gist file not found");
  // If content is truncated, fetch raw
  if (file.raw_url && (!file.content || file.content.length >= 1024 * 1024)) {
    const raw = await fetch(file.raw_url);
    return raw.text();
  }
  return file.content ?? "{}";
}

export const githubSync = {
  getConfig(): SyncConfig | null {
    return loadConfig();
  },

  // Validate token and set up (or find existing) gist
  async configure(token: string): Promise<SyncConfig> {
    // Verify token works
    await apiFetch("/user", token);

    let gistId = await findGist(token);
    if (!gistId) {
      // Push current data into a new gist
      const snapshot = buildSnapshot();
      gistId = await createGist(token, JSON.stringify(snapshot, null, 2));
    }

    const cfg: SyncConfig = { token, gistId, lastPushedAt: Date.now() };
    saveConfig(cfg);
    return cfg;
  },

  // Push current localStorage data to Gist
  async push(): Promise<void> {
    const cfg = loadConfig();
    if (!cfg) throw new Error("GitHub sync not configured");

    const snapshot = buildSnapshot();
    await updateGist(cfg.token, cfg.gistId, JSON.stringify(snapshot, null, 2));

    cfg.lastPushedAt = Date.now();
    saveConfig(cfg);
  },

  // Pull from Gist and restore to localStorage, then reload
  async pull(): Promise<void> {
    const cfg = loadConfig();
    if (!cfg) throw new Error("GitHub sync not configured");

    const raw = await readGist(cfg.token, cfg.gistId);
    const snapshot = JSON.parse(raw) as Record<string, unknown>;

    for (const key of SYNC_KEYS) {
      if (key in snapshot && snapshot[key] !== null) {
        localStorage.setItem(key, JSON.stringify(snapshot[key]));
      }
    }

    cfg.lastPulledAt = Date.now();
    saveConfig(cfg);
  },

  clear(): void {
    localStorage.removeItem(CONFIG_KEY);
  },
};

function buildSnapshot(): Record<string, unknown> {
  const snap: Record<string, unknown> = { _syncedAt: Date.now() };
  for (const key of SYNC_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      snap[key] = raw ? JSON.parse(raw) : null;
    } catch {
      snap[key] = null;
    }
  }
  return snap;
}
