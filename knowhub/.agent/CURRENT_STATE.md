# CURRENT_STATE.md

> Purpose: Current reality of the repo. | Last Updated: 2026-06-12

## Completed (Phase 1 — deployable foundation)
- Monorepo scaffolded (npm workspaces): root `package.json`, `.gitignore`, `README.md`,
  `LICENSE`, `.env.example`.
- `apps/web` — React + Vite + TS + Tailwind app (indigo/violet dark theme):
  - Landing page (hero, principles, module preview, disabled "Download Android App"
    placeholder, footer).
  - App shell with responsive sidebar; Dashboard with stats + module grid.
  - All 11 MVP module routes wired to a shared placeholder screen (honest "on roadmap").
  - SPA `_redirects`, favicon, brand theme tokens.
- **Local build verified:** `npm install` + `npm run build` → `apps/web/dist` (JS ~75 kB gz). No type errors.
- `.agent` operational docs refreshed for KnowHub (were freellmapi-specific).

## In Progress
- Git init + push to `knowhub-by-ab/knowhub`; Cloudflare Pages connection (user-side steps).

## Pending (next phases) — see TASKS.md
- Firebase Google auth (spec 10), GitHub OAuth + repo connect/sync (spec 09),
  Cloudflare Workers API + D1 (specs 18,19,03), AI tutor via FreeLLMAPI (spec 06,17),
  Learning Tree engine (spec 07), search (spec 08), assessments (spec 12), Capacitor (spec 18).

## Blockers
- None code-side. Cloudflare Pages first deploy requires manual user setup (guide provided).

## Notes / Workarounds
- `freellmapi/` is gitignored (third-party AI backend, not vendored).
- npm audit: 2 moderate advisories in transitive build deps (untriaged, non-blocking).
