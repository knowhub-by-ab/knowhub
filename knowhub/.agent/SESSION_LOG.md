# SESSION_LOG.md

> Append-only continuity log. Newest at the bottom.

## 2026-06-12 — Session A (FreeLLMAPI evaluation)
### Contributor: Claude Code (Opus 4.8)
- Built/validated the upstream **freellmapi** checkout (462/462 tests pass) to evaluate it
  as KnowHub's AI backend. Artifacts later moved to a `knowhub/` folder, then superseded.

## 2026-06-12 — Session B (KnowHub Phase 1 foundation)
### Contributor: Claude Code (Opus 4.8)
### Completed
- Read core KnowHub specs (01 PRD, 02 architecture, 26 monorepo, 18 deployment, 22 roadmap).
- Scaffolded npm-workspaces monorepo: root `package.json`, `.gitignore` (excludes
  `freellmapi/`), `README.md`, `LICENSE`, `.env.example`.
- Built `apps/web` (React+Vite+TS+Tailwind, indigo/violet dark theme): landing page,
  responsive app shell + sidebar, dashboard, 11 MVP module routes (shared placeholder),
  404, SPA `_redirects`, favicon.
- Verified local build: `npm install` + `npm run build` → `apps/web/dist` (~75 kB gz JS), no type errors.
- Refreshed `knowhub/.agent/` docs from freellmapi-specific to KnowHub.
### Modified / Created
- `package.json`, `.gitignore`, `README.md`, `LICENSE`, `.env.example`
- `apps/web/**` (config + src)
- `knowhub/.agent/*.md`
### Current Status
Phase 1 foundation complete and building. Ready to push + connect Cloudflare Pages.
### Next Recommended Step
Push to `knowhub-by-ab/knowhub`; user connects Cloudflare Pages; then KH-006 (Firebase auth).
### Risks
- First-deploy requires manual Cloudflare setup (guide provided).
- 2 moderate npm audit advisories (non-blocking).
### Notes
- DEC-002: freellmapi is an external dependency, intentionally not vendored.
- DEC-003: react-router-dom used in Phase 1; TanStack adoption tracked as KH-005.

## 2026-06-13 — Session C (KnowHub Phase 2 — local-first usable app)
### Contributor: Claude Code (Opus 4.8)
### Context
- Phase 1 pushed successfully (user fixed GitHub auth) and is LIVE at
  https://knowhub-ai.pages.dev (Cloudflare Pages project "knowhub-ai",
  build `npm run build`, output `apps/web/dist`, NODE_VERSION 20). Auto-deploy works.
### Completed
- Local-first data layer: `src/lib/types.ts`, `src/lib/store.ts` (localStorage +
  useSyncExternalStore), `src/lib/ai.ts` (OpenAI-compatible client).
- Learning Tree (KH-010): nested nodes, add/rename/delete (recursive), expand/collapse,
  click-to-cycle status (pending/in_progress/completed), autosaved.
- Notes (KH-014): global markdown notebook, debounced autosave, word count.
- Settings: AI provider config (FreeLLMAPI base URL/key/model), stored locally.
- AI Tutor (KH-009, partial): chat UI calling configured endpoint directly; graceful
  errors + CORS guidance; links to Settings when unconfigured.
- Dashboard now shows real stats from the store. Route registry
  (`pages/moduleRegistry.tsx`) sends implemented modules to real pages, others to placeholder.
### Modified / Created
- `apps/web/src/lib/{types,store,ai}.ts`
- `apps/web/src/pages/{LearningTreePage,NotesPage,SettingsPage,AiChatPage,moduleRegistry}.tsx`
- `apps/web/src/pages/DashboardPage.tsx`, `apps/web/src/main.tsx`
### Current Status
Build green (JS ~79 kB gz). App is genuinely usable offline/local-first.
### Next Recommended Step
KH-006 Firebase Google auth, or KH-011 markdown learning pages + KH-013 assessments
(both doable client-side), or KH-008 GitHub sync (needs OAuth app + Worker).
### Risks
- AI Tutor needs the user's FreeLLMAPI to allow this origin (CORS / DASHBOARD_ORIGINS).
- Data is browser-local until GitHub sync lands (no cross-device yet).

## 2026-06-13 — Session D (KnowHub Phase 3 — Pages, Search, Progress + manual guide)
### Contributor: Claude Code (Opus 4.8)
### Completed
- Deps: `marked`, `dompurify`, `minisearch`. Added `src/lib/markdown.ts` (sanitized render).
- Data layer: `pages: Record<nodeId,string>` + `setPage`, `tree.flatten`, page cleanup on delete.
- Learning Pages (KH-011): per-node markdown editor + live preview tabs, autosave, node picker.
- Search (KH-012): MiniSearch over topics/pages/notes, prefix+fuzzy, links to source.
- Progress (KH-015): overall % bar + per-top-level-topic breakdown.
- Registered all three in `moduleRegistry.tsx`.
- Wrote `docs/MANUAL_STEPS.md` — full beginner walkthrough for FreeLLMAPI/CORS, Firebase
  Google login, GitHub OAuth app, Android APK, custom domain (what to do now vs after code).
### Modified / Created
- `apps/web/src/lib/{types,store,markdown}.ts`
- `apps/web/src/pages/{LearningPagesPage,SearchPage,ProgressPage,moduleRegistry}.tsx`
- `apps/web/src/index.css` (.md-prose), `docs/MANUAL_STEPS.md`
### Current Status
Build green (JS ~112 kB gz). 7 of 11 modules now functional client-side.
Remaining placeholders: knowledge-graph, assessments, resources, repository.
### Next Recommended Step
KH-013 MCQ assessments (client-side) or KH-006 Firebase login (after user does MANUAL_STEPS B).
### Risks
- JS bundle growing (marked+minisearch). Consider code-splitting (KH-007-fe) later.

## 2026-06-13 — Session E (AI hosting: FreeLLMAPI on Render + fallback)
### Contributor: Claude Code (Opus 4.8)
### Context / Decision
- User has NO payment card → Oracle/Fly ruled out. User chose: host real FreeLLMAPI on
  Render free tier with Litestream→Cloudflare R2 persistence + UptimeRobot keep-alive,
  AND keep the built-in Pages Function (their own multi-provider keys) as automatic fallback.
### Completed
- `infrastructure/freellmapi-render/`: Dockerfile (wraps published FreeLLMAPI image + copies
  Litestream binary), `litestream.yml` (replicate freeapi.db → R2), `entrypoint.sh`
  (restore-then-replicate -exec node server).
- `render.yaml` blueprint: free Docker web service, HOST=0.0.0.0, DASHBOARD_ORIGINS,
  health check /api/ping, secrets (ENCRYPTION_KEY, R2_*) as sync:false.
- Frontend `ai.ts`: external endpoint = PRIMARY, auto-fallback to built-in `/api/chat` on
  failure; combined error if both fail.
- `docs/DEPLOY_FREELLMAPI_RENDER.md`: full beginner guide (R2 bucket + token, Render
  Blueprint, env vars, FreeLLMAPI setup, UptimeRobot, KnowHub Settings, fallback wiring).
### Current Status
Build green. AI architecture: FreeLLMAPI (Render) primary + Pages Function fallback.
All deploy artifacts in repo; remaining work for user is the manual Render/R2/UptimeRobot setup.
### Next Recommended Step
After AI is wired: resume features — Assessments (MCQ), Knowledge Graph, Resources; then
Firebase login (KH-006).
### Risks
- R2 may request a payment method on enable; guide notes a no-card S3 alternative (Supabase) to switch to.
- Litestream version pin (0.3.13) — bump if image tag missing.

## 2026-06-13 — Session F (Assessments + Resources)
### Contributor: Claude Code (Opus 4.8)
### Completed
- Data layer: `resources` + `quizzes` (types + store helpers `resources.*`, `quizzes.*`).
- Resources (KH-019): add/list/filter (doc/article/video/course/book/other), open, delete.
- Assessments (KH-013): create MCQ quizzes (single & multiple correct), take with
  radio/checkbox UI, auto-score, per-question right/wrong review, attempt history + best %.
- Registered both in moduleRegistry. Build green (~115 kB gz).
### Status
9/11 modules functional client-side. Remaining placeholders: knowledge-graph, repository.
### Next
- KH-020 Knowledge Graph visualization (React Flow or lightweight SVG).
- KH-006 Firebase Google login. KH-008 GitHub sync (repository module).
