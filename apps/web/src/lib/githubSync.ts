import { ensureRepo, importFromRepo, syncToRepo } from "./github";
import { getState, replaceAll, setGithub } from "./store";

// Shared "sync to GitHub now" action used by the Repository page and the global
// top-bar Sync button. Bidirectional: push local changes first (delta), then
// pull remote and merge in anything that exists on GitHub but not locally.
export async function syncGithubNow(onProgress?: (msg: string) => void): Promise<string> {
  const gh = getState().github ?? {};
  if (!gh.token || !gh.login) throw new Error("GitHub is not connected.");
  const repo = (gh.repo && gh.repo.trim()) || "knowhub-learning";

  onProgress?.("Ensuring repository…");
  await ensureRepo(gh.token, gh.login, repo);
  setGithub({ repo });

  // 1. Push — delta only (unchanged files are skipped)
  onProgress?.("Pushing local changes…");
  await syncToRepo(gh.token, gh.login, repo, getState(), onProgress);

  // 2. Pull — fetch remote snapshot and merge missing items into local state
  onProgress?.("Pulling remote changes…");
  const remote = await importFromRepo(gh.token, gh.login, repo);
  if (remote) {
    const local = getState();
    // Additive merge: bring in anything from remote that local doesn't have
    const mergedPages = { ...remote.pages, ...local.pages }; // local wins per page
    const localNoteIds = new Set(local.notesList.map((n) => n.id));
    const mergedNotes = [
      ...local.notesList,
      ...(remote.notesList ?? []).filter((n) => !localNoteIds.has(n.id)),
    ];
    const localQuizIds = new Set(local.quizzes.map((q) => q.id));
    const mergedQuizzes = [
      ...local.quizzes,
      ...(remote.quizzes ?? []).filter((q) => !localQuizIds.has(q.id)),
    ];
    const localResourceIds = new Set(local.resources.map((r) => r.id));
    const mergedResources = [
      ...local.resources,
      ...(remote.resources ?? []).filter((r) => !localResourceIds.has(r.id)),
    ];
    // For nodes, only bring in remote nodes that don't exist locally
    const localNodeIds = new Set(local.nodes.map((n) => n.id));
    const mergedNodes = [
      ...local.nodes,
      ...(remote.nodes ?? []).filter((n) => !localNodeIds.has(n.id)),
    ];
    replaceAll({
      ...local,
      nodes: mergedNodes,
      pages: mergedPages,
      notesList: mergedNotes,
      quizzes: mergedQuizzes,
      resources: mergedResources,
    });
    onProgress?.("Merge complete.");
  }

  setGithub({ lastSync: Date.now() });
  return `${gh.login}/${repo}`;
}
