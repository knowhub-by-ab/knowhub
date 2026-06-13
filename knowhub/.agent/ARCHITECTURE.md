# ARCHITECTURE.md

> Purpose: Operational architecture reference. | Last Updated: 2026-06-13

## Monorepo layout (current)
```
knowhub/
├── apps/web/            # React + Vite + TS + Tailwind front-end (EXISTS)
├── functions/api/       # Cloudflare Pages Functions (AI backend: chat.ts)
├── agent_docs/          # the 31 product/engineering specifications + AI workflow
├── knowhub/.agent/      # operational memory (this folder)
├── docs/                # setup & how-to guides
└── package.json         # npm workspaces root
```
Planned (spec 26): `packages/*`, `workers/*`, `infrastructure/*`, `apps/mobile`.

## Front-end (apps/web)
- `src/main.tsx` — react-router-dom. Routes: `/` (landing), `/app` (layout + dashboard),
  `/app/:module`, `*` (404).
- `src/lib/modules.ts` — single source of truth for the MVP module list (drives sidebar,
  landing grid, dashboard grid).
- `src/lib/store.ts` — local-first store (localStorage + useSyncExternalStore) holding
  nodes, pages, notes, resources, quizzes, settings. Helpers: `tree.*`, `resources.*`,
  `quizzes.*`, `setPage`, `setNotes`, `setSettings`, `summarizeProgress`.
- `src/lib/ai.ts` — AI client. Calls built-in `/api/chat` by default; if a custom endpoint
  is set in Settings it is PRIMARY with `/api/chat` as automatic fallback.
- `src/pages/*` + `moduleRegistry.tsx` — implemented modules vs on-roadmap placeholder.

## AI backend (functions/api/chat.ts)
- Same-origin Cloudflare Pages Function, OpenAI-compatible, multi-provider with fallback.
- Providers via Pages secrets: `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` /
  `OPENAI_API_KEY` (comma-separated for rotation), or `AI_UPSTREAMS` JSON for full control.
  Optional `AI_GATE_KEY` to restrict access. See `docs/AI_BACKEND_SETUP.md`.

## Planned runtime architecture (specs 02, 18)
```
User → Cloudflare Pages (React + Pages Functions for AI)
     → Cloudflare Workers (API/GitHub/Sync) + D1 + KV + R2   (planned)
     → User's GitHub repo (knowledge = source of truth)       (planned)
```
- AI content flow: Generate → Draft branch → Pull Request → user review → merge.
- Secrets live in the Cloudflare Pages project, never in the repo or browser.

## Related Documents
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) · specs [02](../../agent_docs/02_SYSTEM_ARCHITECTURE.md), [26](../../agent_docs/26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md), [18](../../agent_docs/18_DEPLOYMENT_DEVOPS_AND_INFRASTRUCTURE_SPECIFICATION.md)
