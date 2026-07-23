import { ensureRepo, importFromRepo, syncToRepo, syncDecksToRepo, importDecksFromRepoFile, syncCoursesToRepo, importCoursesFromRepo, syncTemplatesToRepo, importTemplatesFromRepo } from "./github";
import { getState, replaceAll, setGithub } from "./store";
import { getDeckStoreState, importDecksFromGitHub } from "./deckStore";
import { courseOps } from "./courseStore";
import { templates } from "./templateStore";

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

  // 1b. Push presentations (separate file, same delta logic)
  await syncDecksToRepo(gh.token, gh.login, repo, getDeckStoreState(), onProgress);

  // 1c. Push courses (separate file)
  await syncCoursesToRepo(gh.token, gh.login, repo, courseOps.getAll(), onProgress);

  // 1d. Push templates (PPTX files → release assets + manifest)
  await syncTemplatesToRepo(gh.token, gh.login, repo, templates.getAll(), onProgress);

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
      resourceCollections: mergeById(local.resourceCollections ?? [], (remote as { resourceCollections?: typeof local.resourceCollections }).resourceCollections ?? []),
      flashcards: mergeById(local.flashcards, remote.flashcards),
      flashcardDecks: mergeById(local.flashcardDecks ?? [], (remote as { flashcardDecks?: typeof local.flashcardDecks }).flashcardDecks ?? []),
      questionBanks: mergeById(local.questionBanks, remote.questionBanks),
      chatSessions: mergeById(local.chatSessions, remote.chatSessions),
      videos: mergeById(local.videos, remote.videos),
      videoPlaylists: mergeById(local.videoPlaylists ?? [], (remote as { videoPlaylists?: typeof local.videoPlaylists }).videoPlaylists ?? []),
      contentCollections: mergeById(local.contentCollections ?? [], (remote as { contentCollections?: typeof local.contentCollections }).contentCollections ?? []),
      highlights: mergeById(local.highlights, remote.highlights),
      chatFolders: mergeById(local.chatFolders ?? [], remote.chatFolders ?? []),
      clonedVoiceId: local.clonedVoiceId ?? (remote as { clonedVoiceId?: string }).clonedVoiceId,
      clonedVoiceProvider: local.clonedVoiceProvider ?? (remote as { clonedVoiceProvider?: typeof local.clonedVoiceProvider }).clonedVoiceProvider,
    });
    onProgress?.("Merge complete.");
  }

  // 2b. Pull presentations and merge (last-write-wins by updatedAt)
  const remoteDecks = await importDecksFromRepoFile(gh.token, gh.login, repo);
  if (remoteDecks) {
    importDecksFromGitHub({ decks: remoteDecks.decks, collections: remoteDecks.collections });
    onProgress?.("Presentations merged.");
  }

  // 2c. Pull courses and merge (additive by id)
  const remoteCourses = await importCoursesFromRepo(gh.token, gh.login, repo);
  if (remoteCourses?.courses.length) {
    const localIds = new Set(courseOps.getAll().map((c) => c.id));
    for (const course of remoteCourses.courses) {
      if (!localIds.has(course.id)) courseOps.add(course);
    }
    onProgress?.("Courses merged.");
  }

  // 2d. Pull templates and merge (additive by id)
  const remoteTemplates = await importTemplatesFromRepo(gh.token, gh.login, repo);
  if (remoteTemplates?.length) {
    const localIds = new Set(templates.getAll().map((t) => t.id));
    for (const tpl of remoteTemplates) {
      if (!localIds.has(tpl.id)) templates.add(tpl.name, tpl.fileB64, { backgroundColor: tpl.backgroundColor, accentColor: tpl.accentColor });
    }
    onProgress?.("Templates merged.");
  }

  setGithub({ lastSync: Date.now() });
  return `${gh.login}/${repo}`;
}

// ---------------------------------------------------------------------------
// Debounced auto-sync: fires 10 s after the last local data change
// ---------------------------------------------------------------------------

let _autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
let _autoSyncing = false;

export function scheduleAutoSync() {
  const gh = getState().github ?? {};
  if (!gh.token || !gh.login) return; // not connected — skip
  if (_autoSyncTimer) clearTimeout(_autoSyncTimer);
  _autoSyncTimer = setTimeout(async () => {
    if (_autoSyncing) return; // previous run still in flight
    _autoSyncing = true;
    try {
      await syncGithubNow();
    } catch {
      // Auto-sync failures are silent — user can trigger manually
    } finally {
      _autoSyncing = false;
    }
  }, 10_000);
}
