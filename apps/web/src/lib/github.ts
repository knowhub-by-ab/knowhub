import type { AppData, ReleaseAsset, AssetsRelease, PresentationDeck, Collection } from "./types";

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
  // Pre-create the assets release so large-file uploads work immediately.
  await ensureAssetsRelease(token, login, name).catch(() => {/* non-fatal */});
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
  version: 2;
  exportedAt: string;
  nodes: AppData["nodes"];
  pages: AppData["pages"];
  notesList: AppData["notesList"];
  resources: AppData["resources"];
  resourceCollections: AppData["resourceCollections"];
  quizzes: AppData["quizzes"];
  flashcards: AppData["flashcards"];
  flashcardDecks: AppData["flashcardDecks"];
  questionBanks: AppData["questionBanks"];
  chatSessions: AppData["chatSessions"];
  videos: AppData["videos"];
  videoPlaylists: AppData["videoPlaylists"];
  highlights: AppData["highlights"];
  chatFolders: AppData["chatFolders"];
  clonedVoiceId?: string;
  clonedVoiceProvider?: AppData["clonedVoiceProvider"];
}

export function buildExport(data: AppData): KnowHubExport {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    nodes: data.nodes,
    pages: data.pages,
    notesList: data.notesList,
    resources: data.resources,
    resourceCollections: data.resourceCollections ?? [],
    quizzes: data.quizzes,
    flashcards: data.flashcards,
    flashcardDecks: data.flashcardDecks ?? [],
    questionBanks: data.questionBanks,
    chatSessions: data.chatSessions,
    videos: data.videos,
    videoPlaylists: data.videoPlaylists ?? [],
    highlights: data.highlights,
    chatFolders: data.chatFolders,
    clonedVoiceId: data.clonedVoiceId,
    clonedVoiceProvider: data.clonedVoiceProvider,
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

// ---------------------------------------------------------------------------
// GitHub Releases — large binary storage (videos, audio, large PPTXes)
// Files >= 50 MB are stored as release assets instead of repo content.
// ---------------------------------------------------------------------------

const LFS_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
const ASSETS_RELEASE_TAG = "knowhub-assets";
const ASSETS_RELEASE_KEY = "knowhub:assets-release-id";

export { LFS_THRESHOLD_BYTES };

function getStoredReleaseId(): number | null {
  try {
    const v = localStorage.getItem(ASSETS_RELEASE_KEY);
    return v ? Number(v) : null;
  } catch { return null; }
}

function storeReleaseId(id: number) {
  try { localStorage.setItem(ASSETS_RELEASE_KEY, String(id)); } catch { /* ignore */ }
}

/** Ensure a single persistent "knowhub-assets" release exists. Returns its id and upload_url. */
export async function ensureAssetsRelease(
  token: string,
  owner: string,
  repo: string
): Promise<AssetsRelease> {
  // Fast path: cached id
  const cached = getStoredReleaseId();
  if (cached) {
    const rel = await gh<AssetsRelease | null>(token, `/repos/${owner}/${repo}/releases/${cached}`);
    if (rel) { storeReleaseId(rel.id); return rel; }
  }
  // Check if the tagged release already exists
  const existing = await gh<AssetsRelease | null>(
    token,
    `/repos/${owner}/${repo}/releases/tags/${ASSETS_RELEASE_TAG}`
  );
  if (existing) { storeReleaseId(existing.id); return existing; }
  // Create it
  const created = await gh<AssetsRelease>(token, `/repos/${owner}/${repo}/releases`, {
    method: "POST",
    body: JSON.stringify({
      tag_name: ASSETS_RELEASE_TAG,
      name: "KnowHub Large File Storage",
      body: "Auto-managed by KnowHub. Do not delete.",
      prerelease: true,
    }),
  });
  storeReleaseId(created.id);
  return created;
}

/**
 * Upload a binary as a GitHub release asset.
 * Uses XMLHttpRequest so upload progress can be reported.
 * Deduplicates by filename — if an asset with the same name exists, returns it without re-uploading.
 */
export async function uploadReleaseAsset(
  token: string,
  owner: string,
  repo: string,
  filename: string,
  buffer: ArrayBuffer,
  mimeType: string,
  onProgress?: (pct: number) => void
): Promise<ReleaseAsset> {
  const release = await ensureAssetsRelease(token, owner, repo);
  // Deduplicate: check existing assets with same name
  const existing = await listReleaseAssets(token, owner, repo, release.id);
  const match = existing.find((a) => a.name === filename);
  if (match) return match;
  // Parse upload_url: "https://uploads.github.com/repos/:owner/:repo/releases/:id/assets{?name,label}"
  const uploadBase = release.upload_url.replace(/\{[^}]+\}/, "");
  const url = `${uploadBase}?name=${encodeURIComponent(filename)}`;
  return new Promise<ReleaseAsset>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.setRequestHeader("Accept", "application/vnd.github+json");
    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as ReleaseAsset);
      } else {
        reject(new GitHubError(`Release asset upload failed: ${xhr.status} ${xhr.responseText.slice(0, 160)}`));
      }
    };
    xhr.onerror = () => reject(new GitHubError("Release asset upload network error"));
    xhr.send(buffer);
  });
}

/** Download a release asset as ArrayBuffer (works for private repos with token). */
export async function downloadReleaseAsset(
  token: string,
  owner: string,
  repo: string,
  assetId: number
): Promise<ArrayBuffer> {
  const res = await fetch(`${API}/repos/${owner}/${repo}/releases/assets/${assetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/octet-stream",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new GitHubError(`Download failed: ${res.status}`);
  return res.arrayBuffer();
}

/** List all assets on the knowhub-assets release. */
export async function listReleaseAssets(
  token: string,
  owner: string,
  repo: string,
  releaseId?: number
): Promise<ReleaseAsset[]> {
  const id = releaseId ?? (await ensureAssetsRelease(token, owner, repo)).id;
  return gh<ReleaseAsset[]>(token, `/repos/${owner}/${repo}/releases/${id}/assets?per_page=100`) ?? [];
}

/** Delete a release asset (e.g. when replacing a file or deleting a deck). */
export async function deleteReleaseAsset(
  token: string,
  owner: string,
  repo: string,
  assetId: number
): Promise<void> {
  await gh(token, `/repos/${owner}/${repo}/releases/assets/${assetId}`, { method: "DELETE" });
}

/**
 * Smart file commit: routes large binaries (>= 50 MB) to GitHub Releases
 * instead of the Contents API. Returns asset metadata for large files, null for small.
 */
export async function putFileSmart(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string | ArrayBuffer,
  message: string,
  onProgress?: (pct: number) => void
): Promise<ReleaseAsset | null> {
  const isText = typeof content === "string";
  const size = isText
    ? new TextEncoder().encode(content).byteLength
    : (content as ArrayBuffer).byteLength;

  if (size >= LFS_THRESHOLD_BYTES) {
    const buffer = isText ? new TextEncoder().encode(content).buffer as ArrayBuffer : (content as ArrayBuffer);
    const filename = path.split("/").pop() ?? "file";
    const ext = filename.split(".").pop() ?? "bin";
    const mimeType = EXT_MIME[ext] ?? "application/octet-stream";
    return uploadReleaseAsset(token, owner, repo, filename, buffer, mimeType, onProgress);
  }

  // Small file: use the existing Contents API
  const textContent = isText ? content as string : new TextDecoder().decode(content as ArrayBuffer);
  await putFile(token, owner, repo, path, textContent, message);
  return null;
}

const EXT_MIME: Record<string, string> = {
  webm: "video/webm",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  potx: "application/vnd.openxmlformats-officedocument.presentationml.template",
  potm: "application/vnd.ms-powerpoint.template.macroEnabled.12",
  pot: "application/vnd.ms-powerpoint",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  zip: "application/zip",
};

export async function importFromRepo(
  token: string,
  owner: string,
  repo: string
): Promise<KnowHubExport | null> {
  const text = await getFileText(token, owner, repo, "knowhub.json");
  if (!text) return null;
  return JSON.parse(text) as KnowHubExport;
}

// ---------------------------------------------------------------------------
// Deck store sync — stored in knowhub-decks.json, separate from knowhub.json
// so presentations don't bloat the main snapshot.
// ---------------------------------------------------------------------------

export interface DecksExport {
  version: 1;
  exportedAt: string;
  decks: PresentationDeck[];
  collections: Collection[];
}

/** Strip base64 dataUrls — local images are device-only and can't be shared. */
function stripLocalImages(decks: PresentationDeck[]): PresentationDeck[] {
  return decks.map((deck) => ({
    ...deck,
    slides: deck.slides.map((slide) => {
      if (!slide.image?.dataUrl) return slide;
      // Keep external url if available; drop the base64 blob
      const { dataUrl: _dropped, ...rest } = slide.image;
      return { ...slide, image: rest.url ? rest : undefined };
    }),
  }));
}

/** Push the deck store to knowhub-decks.json (delta — skips if unchanged). */
export async function syncDecksToRepo(
  token: string,
  owner: string,
  repo: string,
  deckState: { decks: PresentationDeck[]; collections: Collection[] },
  onProgress?: (msg: string) => void
): Promise<void> {
  if (!deckState.decks.length && !deckState.collections.length) return;
  const hashes = loadHashes();
  const path = "knowhub-decks.json";
  const exportData: DecksExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    decks: stripLocalImages(deckState.decks),
    collections: deckState.collections,
  };
  const json = JSON.stringify(exportData, null, 2);
  const h = quickHash(json);
  if (hashes[path] !== h) {
    onProgress?.("Pushing presentations…");
    await putFile(token, owner, repo, path, json, `knowhub: sync presentations ${new Date().toISOString()}`);
    hashes[path] = h;
    saveHashes(hashes);
  }
}

/** Pull knowhub-decks.json from the repo. Returns null if file doesn't exist yet. */
export async function importDecksFromRepoFile(
  token: string,
  owner: string,
  repo: string
): Promise<DecksExport | null> {
  const text = await getFileText(token, owner, repo, "knowhub-decks.json");
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed.version !== 1) return null;
    return parsed as DecksExport;
  } catch { return null; }
}
