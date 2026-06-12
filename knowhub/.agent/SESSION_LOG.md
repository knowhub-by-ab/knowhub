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
