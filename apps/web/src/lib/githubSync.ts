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
    function mergeById<T extends { id: string }>(localArr: T[], remoteArr: T[] | undefined): T[] {
      const localIds = new Set(localArr.map((x) => x.id));
      return [...localArr, ...(remoteArr ?? []).filter((x) => !localIds.has(x.id))];
    }
    replaceAll({
      ...local,
      nodes: mergeById(local.nodes, remote.nodes),
      pages: { ...remote.pages, ...local.pages }, // local wins per page
      notesList: mergeById(local.notesList, remote.notesList),
      quizzes: mergeById(local.quizzes, remote.quizzes),
      resources: mergeById(local.resources, remote.resources),
      flashcards: mergeById(local.flashcards, remote.flashcards),
      questionBanks: mergeById(local.questionBanks, remote.questionBanks),
      chatSessions: mergeById(local.chatSessions, remote.chatSessions),
      videos: mergeById(local.videos, remote.videos),
      highlights: mergeById(local.highlights, remote.highlights),
    });
    onProgress?.("Merge complete.");
  }

  setGithub({ lastSync: Date.now() });
  return `${gh.login}/${repo}`;
}
