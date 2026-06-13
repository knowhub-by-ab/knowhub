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
  multi-provider with fallback. Providers: OpenAI-compatible (Gemini/Groq/OpenRouter/
  OpenAI) + ApiFreeLLM adapter. Keys are managed in the dashboard (Settings -> AI provider
  keys, ordered = fallback priority, stored locally, sent per request) and/or as Pages
  secrets (deeper fallback).
- AI generation: "Generate with AI" creates a full learning tree from a topic (Learning
  Tree page) and a 5-question MCQ quiz from a topic (Assessments page).
- Build verified green each phase (`npm run build`, ~116 kB gz JS).

## All 11 modules implemented
- Added: Repository (GitHub OAuth connect + sync export/import) and the AI generate actions.
- Firebase Google login + Firestore cross-device sync are live (user completed setup).

## Remaining (polish / optional)
- Code-split the JS bundle (Firebase + Firestore pushed it to ~230 kB gz) -- KH-DEBT-002.
- Native Google sign-in inside the Android WebView (Capacitor Firebase Auth plugin).
- ShadCN/TanStack adoption (spec 02/20); GitHub Actions CI for lint/build.

## Notes
- The external AI proxy has been fully removed (folder, deploy configs, guides, and all
  code/doc references) per user request -- see DEC-006. AI relies solely on the built-in
  Pages Function backend.
- npm audit: a few moderate advisories in transitive build deps (untriaged, non-blocking).
