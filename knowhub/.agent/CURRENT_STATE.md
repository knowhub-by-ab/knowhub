# CURRENT_STATE.md

> Purpose: Current reality of the repo. | Last Updated: 2026-06-13

## Live
- Deployed at https://knowhub-ai.pages.dev (Cloudflare Pages, auto-deploy on push to `main`).

## Completed
- Monorepo + `apps/web` (React + Vite + TS + Tailwind, indigo/violet dark theme).
- 10 of 11 modules functional, all client-side / local-first (localStorage):
  Learning Tree, Knowledge Graph (SVG), Learning Pages (Markdown + preview), Search
  (MiniSearch), Assessments (MCQ create/take/score), Progress, Notes, Resources,
  Settings, AI Tutor -- plus the Dashboard.
- AI backend: built-in Cloudflare Pages Function (`functions/api/chat.ts`) --
  multi-provider, OpenAI-compatible, with fallback. Needs the user to add a provider key
  (e.g. `GEMINI_API_KEY`) as a Pages secret. Optional custom endpoint override in Settings.
- Build verified green each phase (`npm run build`, ~116 kB gz JS).

## Remaining (next phases)
- Repository module = GitHub OAuth + connect/sync (spec 09) -- needs a backend + login.
- Firebase Google login (spec 10) -- needs the user's Firebase project keys.
- Capacitor Android APK (spec 18); ShadCN/TanStack adoption (spec 02/20).

## Notes
- The external AI proxy has been fully removed (folder, deploy configs, guides, and all
  code/doc references) per user request -- see DEC-006. AI relies solely on the built-in
  Pages Function backend.
- npm audit: a few moderate advisories in transitive build deps (untriaged, non-blocking).
