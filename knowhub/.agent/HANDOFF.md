# HANDOFF.md

> Purpose: Fast onboarding for the next contributor. | Last Updated: 2026-06-13

## Current state
KnowHub is live at https://knowhub-ai.pages.dev with 10/11 modules working client-side.
AI Tutor uses the built-in `/api/chat` Pages Function (needs a provider key as a Pages
secret). Next real features: Firebase Google login and GitHub sync (Repository module).

## Run locally
```bash
cd knowhub
npm install
npm run dev        # http://localhost:5173
npm run build      # -> apps/web/dist
```

## Where things are
- App code: `apps/web/src` (pages, components, lib/{store,ai,markdown,modules,types}.ts).
- AI backend: `functions/api/chat.ts` (Cloudflare Pages Function).
- Add a module: register it in `apps/web/src/lib/modules.ts` and add a page in
  `apps/web/src/pages/moduleRegistry.tsx`.
- Specs: `agent_docs/01..31`. Operational memory: `knowhub/.agent/`.
- Guides: `docs/AI_BACKEND_SETUP.md`, `docs/MANUAL_STEPS.md`, `docs/SETUP_AND_DEPLOYMENT.md`.

## To switch the AI Tutor on
Add a free key (e.g. Gemini) as a Cloudflare Pages secret `GEMINI_API_KEY`, then redeploy.
See `docs/AI_BACKEND_SETUP.md`.

## Next steps (priority)
1. KH-006 Firebase Google login (needs user's Firebase keys -> `docs/MANUAL_STEPS.md` B).
2. KH-008 GitHub OAuth + repo connect/sync (Repository module) via a Pages Function.
3. KH-023 AI Tutor streaming + "generate tree/page/quiz" actions (no setup).

## Warnings
- Don't commit secrets; they go in the Cloudflare Pages project settings.
- Module screens not in `moduleRegistry` fall back to the on-roadmap placeholder by design.
- The external AI proxy was removed (DEC-006); do not reintroduce it.
