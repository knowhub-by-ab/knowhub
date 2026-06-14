import { ensureRepo, syncToRepo } from "./github";
import { getState, setGithub } from "./store";

// Shared "sync to GitHub now" action used by the Repository page and the global
// top-bar Sync button. Uses the connected account + the chosen repo (defaulting
// to "knowhub-learning" if none has been set yet).
export async function syncGithubNow(onProgress?: (msg: string) => void): Promise<string> {
  const gh = getState().github ?? {};
  if (!gh.token || !gh.login) throw new Error("GitHub is not connected.");
  const repo = (gh.repo && gh.repo.trim()) || "knowhub-learning";
  onProgress?.("Ensuring repository…");
  await ensureRepo(gh.token, gh.login, repo);
  setGithub({ repo });
  await syncToRepo(gh.token, gh.login, repo, getState(), onProgress);
  setGithub({ lastSync: Date.now() });
  return `${gh.login}/${repo}`;
}
