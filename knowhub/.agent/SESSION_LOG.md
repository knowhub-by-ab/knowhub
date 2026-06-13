# SESSION_LOG.md

> Append-only continuity log. Newest at the bottom.

## 2026-06-12 / 13 -- Phases 1-3 (foundation -> usable app)
### Contributor: Claude Code (Opus 4.8)
- Phase 1: scaffolded npm-workspaces monorepo + `apps/web` (React + Vite + TS + Tailwind,
  indigo/violet dark theme): landing, app shell + sidebar, dashboard, 11 module routes
  (placeholder). Pushed to `knowhub-by-ab/knowhub`; Cloudflare Pages connected and live at
  https://knowhub-ai.pages.dev (build `npm run build`, output `apps/web/dist`).
- Phase 2: local-first store (localStorage + useSyncExternalStore); Learning Tree, Notes,
  Settings, AI Tutor; dashboard wired to real stats.
- Phase 3: Learning Pages (Markdown + sanitized preview), Search (MiniSearch), Progress;
  then Resources, Assessments (MCQ), Knowledge Graph (SVG).
- Result: 10/11 modules functional client-side. Build green throughout.

## 2026-06-13 -- AI backend
### Contributor: Claude Code (Opus 4.8)
- Built the AI backend as a Cloudflare Pages Function (`functions/api/chat.ts`):
  same-origin, OpenAI-compatible, multi-provider with automatic fallback; keys via Pages
  secrets (`GEMINI_API_KEY`/`GROQ_API_KEY`/..., or `AI_UPSTREAMS` JSON; optional `AI_GATE_KEY`).
- Frontend `ai.ts`: built-in `/api/chat` by default; a custom Settings endpoint becomes
  PRIMARY with the built-in backend as automatic fallback.
- Guide: `docs/AI_BACKEND_SETUP.md`.

## 2026-06-13 -- Removed the external AI proxy (DEC-006)
### Contributor: Claude Code (Opus 4.8)
- Per user request, removed the external AI proxy entirely: deleted its local project
  folder, the `infrastructure/` deploy configs, `render.yaml`, and the Oracle/Render
  deployment guides; cleaned all code references (Settings, ai.ts, modules.ts, types.ts,
  chat.ts) and doc/spec references (README, docs, `agent_docs`, this `.agent` set).
- Rationale: it was a key manager (not free APIs), and free no-card persistent hosting
  proved impractical; the built-in Pages Function already covers the need.
- Build verified green after removal. AI now relies solely on the built-in backend.
### Next
- KH-006 Firebase Google login; KH-008 GitHub sync (Repository module); KH-023 AI streaming.
