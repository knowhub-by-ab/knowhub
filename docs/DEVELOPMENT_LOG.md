# KnowHub Development Log

Conversation history with Claude Code — preserved for continuity across repo moves.

---

## Session 1 — Feature Batch 1 (12 items)

**What was built:**
- Learning Pages: Copy button, Listen (TTS), Download (MD / DOC / PDF / Audio), Discuss dropdown (KnowHub AI Tutor / ChatGPT / Gemini)
- Podcast page: Prev/Next episode navigation, resume from saved position, MP3 download
- Videos page: group by page/topic, auto-fetch from Learning Pages link
- Bulk Download: added PDF format
- Chat folders (chatFolders) synced via GitHub
- Syllabus import mode on Learning Tree page
- Puter API token in Settings (replacing OAuth login)
- Highlights: add edit popup to change/remove highlight color
- Learning Pages mobile drawer improvements
- Assessment quiz parsing fixes
- Discuss with AI Tutor improvements

---

## Session 2 — Bug Fixes Batch 2

### React error #185 — useSyncExternalStore infinite loop
**File:** `apps/web/src/lib/podcastStore.ts`  
**Cause:** `getPodcastState()` returned a new object `{ episodes, currentIdx }` on every call, causing React to re-render infinitely.  
**Fix:** Cache a `_snapshot` object; only replace it inside `notify()`.

### Puter: replace OAuth with API token
**File:** `apps/web/src/pages/SettingsPage.tsx`  
**Change:** Replaced puter.js OAuth login with a password input for the Puter API token. Token stored in store as `puterApiToken`, synced via Firestore `lightSnapshot`.

### Audio MP3 download failing
**File:** `apps/web/src/lib/exporters.ts`, `apps/web/src/lib/tts.ts`  
**Cause:** `p.authToken = token` on puter.js SDK object didn't work.  
**Fix:** Bypass SDK entirely — direct `fetch` to `https://api.puter.com/drivers/call` with `Authorization: Bearer <token>` header.

### "Content truncated for brevity" in AI Tutor pre-fill
**File:** `apps/web/src/pages/AiChatPage.tsx` line 88  
**Fix:** Removed the text appended to page content pre-fill.

### TTS not working in Android app (WebView)
**Files:** `apps/web/src/lib/tts.ts`, `apps/web/src/pages/LearningPagesPage.tsx`  
**Cause:** `window.speechSynthesis` is undefined in the Capacitor Android WebView.  
**Fix:** Added `speakViaPuter()` using Puter REST API + HTMLAudioElement as fallback.  
*(Later replaced with native Capacitor TTS plugin — see Session 3)*

### Sync: videos, flashcards, questionBanks, chatSessions, chatFolders not appearing in app
**Files:** `apps/web/src/pages/RepositoryPage.tsx`, `apps/web/src/lib/sync.ts`, `apps/web/src/lib/githubSync.ts`  
**Root causes (3):**
1. `importDown()` in RepositoryPage.tsx was missing 6 fields in `replaceAll()` call — silently wiped flashcards, questionBanks, chatSessions, videos, highlights, chatFolders on every Import.
2. Single-timestamp Firestore sync blocked GitHub token from propagating to app when local timestamp was newer.
3. No auto-pull from GitHub when token first received.

### Toolbar horizontal overflow on Learning Pages (mobile)
**File:** `apps/web/src/pages/LearningPagesPage.tsx`  
**Fix 1 (wrong):** Split toolbar into two rows — but used `overflow-x-auto` which clipped dropdown menus.  
**Fix 2 (correct):** Changed to `flex-wrap` so buttons wrap to next line without clipping absolutely-positioned dropdowns.

### Puter token sync across devices
**Files:** `apps/web/src/lib/store.ts`, `apps/web/src/lib/types.ts`, `apps/web/src/lib/sync.ts`  
**Change:** Added `puterApiToken` to `lightSnapshot()`, `applyLightRemoteState()`, and `merged()`. Token now syncs via Firestore to all devices on the same account.

---

## Session 3 — Android TTS + Sync Fixes

### Puter token not appearing in app after sync
**File:** `apps/web/src/lib/sync.ts`  
**Cause:** `applyIfNewer()` extracted `nodes`, `aiKeys`, `github` from remote snapshot but never extracted `puterApiToken`.  
**Fix:** Pass `puterApiToken: (remote as AppData).puterApiToken` to `applyLightRemoteState()` in both branches.

### Android app: Listen/Podcast using Puter TTS instead of device TTS
**Cause:** `window.speechSynthesis` is not available in the Capacitor WebView; the Puter fallback was being triggered.  
**Fix:** Installed `@capacitor-community/text-to-speech@^8.0.0` (Capacitor 8 compatible).  
Added `isNative()` check using `Capacitor.isNativePlatform()`. On native, routes all TTS through the plugin instead of browser speechSynthesis.

**Key bug series fixed during native TTS implementation:**

| Bug | Cause | Fix |
|-----|-------|-----|
| `getVoices()` crash | `isTTSSupported()` widened to return `true` on native, but `getAvailableVoices()` still called `window.speechSynthesis.getVoices()` | Guard with `isNative() \|\| !("speechSynthesis" in window)` |
| Player vanishes instantly | `nativeStop()` was async with `update({...DEFAULT_STATE})` at end; resolved *after* `update({ active:true })` in `speak()` | Made `nativeStop` synchronous (fire-and-forget via `.then`); removed state updates from it |
| Still vanishing | `.catch` handlers on both `TextToSpeech.speak()` and `nativeSpeak` called `update({ active:false })` on any error | Made `nativeSpeak` fully synchronous; all `.catch` paths only `console.warn`, never touch state |
| Wrong plugin version | `^6.0.0` not compatible with Capacitor 8 | Upgraded to `^8.0.0` (version numbering follows Capacitor major) |
| "Failed to read text" | Android TTS hard limit is 4000 chars; full learning pages exceed this | Split text into ≤3800-char chunks at sentence boundaries via `splitIntoChunks()`; speak sequentially |
| No audio (still) | Errors silently swallowed; also language data might not be installed | Added error display in player title; added `isLanguageSupported()` check + `openInstall()` |
| Pause broken | Pause called `nativeStop()` which cleared timer; set `paused:false` | Record `_nativePauseElapsed`; pause sets `paused:true`; resume restarts from remaining text |
| Voice selector missing | `getAvailableVoices()` returned `[]` on native | Added `getNativeVoices()` async fn using `TextToSpeech.getSupportedVoices()`; TTSPlayer loads them on mount |

### Discuss with AI Tutor / ChatGPT — content truncated
**Files:** `apps/web/src/lib/external.ts`, `apps/web/src/pages/AiChatPage.tsx`  
**Fix:** Raised content limit from 2000 → 12000 chars (ChatGPT/Gemini); removed `slice(0, 3000)` for AI Tutor (now sends full page).

### Android APK release flow
- APK is built by GitHub Actions (`.github/workflows/android.yml`)
- Triggered automatically on version tags (`v*`)
- APK attached to GitHub Release → downloadable from KnowHub landing page "Download Android App" button
- To release: `git tag vX.Y.Z && git push origin vX.Y.Z`
- Tags used: v1.0.3 through v1.1.0

---

## Session 4 — Tree Improver + Puter AI Key

### Tree Improver: accept/reject per proposal
**Files:** `apps/web/src/lib/aiActions.ts`, `apps/web/src/pages/LearningTreePage.tsx`  
**Before:** `improveTree()` directly added all AI-proposed nodes to the tree with no user review.  
**After:**
- Added `proposeTreeImprovements()` — returns `TreeProposal[]` without applying anything
- Added `applyTreeProposals(proposals)` — applies only accepted proposals
- LearningTreePage shows a review panel: each proposal is a toggleable chip (all pre-selected), with Accept All / None shortcuts and "Add N selected" button

### Puter as AI provider requires API key
**Files:** `apps/web/src/lib/providers.ts`, `apps/web/src/pages/SettingsPage.tsx`  
**Before:** Puter preset had `keyless: true`; Settings hid the API key input for Puter with a "no key needed" message.  
**After:** Removed `keyless: true`; Settings now shows "Puter API Token" input field when Puter is selected. Same token used for both AI and TTS/MP3 download.

---

## Architecture Notes

### Storage model
- **Firestore** (light): `nodes`, `aiKeys`, `github`, `puterApiToken` — synced across devices in real time
- **GitHub repo** (heavy): `pages`, `notesList`, `resources`, `quizzes`, `flashcards`, `questionBanks`, `chatSessions`, `chatFolders`, `videos`, `highlights`
- **Why:** Firebase free tier has strict quotas; GitHub is free and unlimited for text content

### Android app
- Capacitor wrapper loading live site from `https://knowhub-ai.pages.dev`
- Web JS changes auto-deploy via Cloudflare Pages on push to `main`
- Native plugin changes (e.g. TTS plugin) require APK rebuild via GitHub Actions tag push
- `Capacitor.isNativePlatform()` = true inside APK; used to branch native vs web behavior

### Puter API token
- Stored in `AppData.puterApiToken`
- Synced via Firestore `lightSnapshot` to all devices
- Used for: TTS REST API (`POST https://api.puter.com/drivers/call`), MP3 download, Puter AI provider
- Set in Settings → Puter section

### Key files
| File | Purpose |
|------|---------|
| `apps/web/src/lib/store.ts` | Global state, persistence, sync helpers |
| `apps/web/src/lib/sync.ts` | Firestore real-time sync |
| `apps/web/src/lib/githubSync.ts` | GitHub repo sync (heavy content) |
| `apps/web/src/lib/tts.ts` | TTS: browser speechSynthesis + native Android plugin |
| `apps/web/src/lib/aiActions.ts` | AI generation functions (tree, pages, quizzes, etc.) |
| `apps/web/src/lib/exporters.ts` | MD / DOC / PDF / Audio export |
| `apps/web/src/lib/providers.ts` | AI provider presets |
| `apps/web/src/lib/external.ts` | Discuss page launcher (ChatGPT / Gemini / Share) |
| `apps/web/src/pages/LearningPagesPage.tsx` | Main learning page editor/viewer |
| `apps/web/src/pages/LearningTreePage.tsx` | Topic tree management + tree improver |
| `apps/web/src/pages/SettingsPage.tsx` | AI keys, Puter token, GitHub connection |
| `apps/web/capacitor.config.ts` | Capacitor/Android config |
| `apps/web/scripts/android-build.sh` | APK build script (used by CI) |
| `.github/workflows/android.yml` | GitHub Actions APK workflow |

### Security constraints (never violate)
- NEVER reintroduce FreeLLMAPI (DEC-006)
- NEVER paste secrets in chat — user rotates keys
- `secrets/`, `*.jks`, `*.keystore`, `google-services.json`, `.env`, `.claude/` always gitignored
- Firebase ALWAYS on free tier — keep Firestore writes minimal
- Puter = free plan only
