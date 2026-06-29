import type { AppData } from "./types";

// Minimal GitHub REST client used directly from the browser (api.github.com
// supports CORS with a bearer token). Powers the Repository module: connect a
// repo and sync the user's knowledge to it as Markdown + a JSON snapshot.

const API = "https://api.github.com";

export class GitHubError extends Error {}

async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (res.status === 404) return null as T;
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new GitHubError(`GitHub ${res.status}: ${t.slice(0, 160)}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

function toB64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function getUser(token: string): Promise<{ login: string }> {
  const u = await gh<{ login: string } | null>(token, "/user");
  if (!u) throw new GitHubError("Could not read GitHub account.");
  return u;
}

/** Ensure a repo `<login>/<name>` exists (create private if missing). */
export async function ensureRepo(
  token: string,
  login: string,
  name: string
): Promise<void> {
  const existing = await gh<unknown>(token, `/repos/${login}/${name}`);
  if (existing) return;
  await gh(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name,
      private: true,
      auto_init: true,
      description: "My KnowHub learning repository",
    }),
  });
  // Give GitHub a moment to finish initializing the default branch.
  await new Promise((r) => setTimeout(r, 1200));
}

async function fileSha(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string | undefined> {
  const f = await gh<{ sha: string } | null>(
    token,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
  );
  return f?.sha;
}

export async function putFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  const sha = await fileSha(token, owner, repo, path);
  await gh(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: toB64(content), sha }),
  });
}

export async function getFileText(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const f = await gh<{ content?: string } | null>(
    token,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
  );
  return f?.content ? fromB64(f.content) : null;
}

/** The portable snapshot stored in the repo (and used to restore). */
export interface KnowHubExport {
  version: 1;
  exportedAt: string;
  nodes: AppData["nodes"];
  pages: AppData["pages"];
  notesList: AppData["notesList"];
  resources: AppData["resources"];
  quizzes: AppData["quizzes"];
}

export function buildExport(data: AppData): KnowHubExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    nodes: data.nodes,
    pages: data.pages,
    notesList: data.notesList,
    resources: data.resources,
    quizzes: data.quizzes,
  };
}

function safeName(s: string): string {
  return (s.trim() || "untitled").replace(/[^\w.-]+/g, "-").slice(0, 60);
}

const HASH_STORE_KEY = "knowhub:sync:hashes";

function quickHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function loadHashes(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(HASH_STORE_KEY) ?? "{}"); } catch { return {}; }
}

function saveHashes(h: Record<string, number>) {
  localStorage.setItem(HASH_STORE_KEY, JSON.stringify(h));
}

/** Push a delta snapshot: only files whose content changed since last sync. */
export async function syncToRepo(
  token: string,
  owner: string,
  repo: string,
  data: AppData,
  onProgress?: (msg: string) => void
): Promise<void> {
  const stamp = new Date().toISOString();
  const hashes = loadHashes();
  let changed = 0;

  async function maybePut(path: string, content: string, message: string) {
    const h = quickHash(content);
    if (hashes[path] === h) return; // unchanged — skip
    await putFile(token, owner, repo, path, content, message);
    hashes[path] = h;
    changed++;
  }

  onProgress?.("Checking knowhub.json…");
  await maybePut(
    "knowhub.json",
    JSON.stringify(buildExport(data), null, 2),
    `knowhub: sync snapshot ${stamp}`
  );

  for (const note of data.notesList) {
    await maybePut(
      `notes/${safeName(note.title)}.md`,
      `# ${note.title}\n\n${note.body}`,
      `notes: ${note.title}`
    );
  }

  const pageIds = Object.keys(data.pages).filter((id) => data.pages[id]?.trim());
  let i = 0;
  for (const id of pageIds) {
    i++;
    const node = data.nodes.find((n) => n.id === id);
    const title = node?.title ?? id;
    onProgress?.(`Checking page ${i}/${pageIds.length}…`);
    await maybePut(
      `knowledge/${id}.md`,
      `# ${title}\n\n${data.pages[id]}`,
      `docs: update ${title}`
    );
  }

  saveHashes(hashes);
  onProgress?.(changed === 0 ? "Everything up to date." : `Done — ${changed} file${changed === 1 ? "" : "s"} updated.`);
}

export async function importFromRepo(
  token: string,
  owner: string,
  repo: string
): Promise<KnowHubExport | null> {
  const text = await getFileText(token, owner, repo, "knowhub.json");
  if (!text) return null;
  return JSON.parse(text) as KnowHubExport;
}
