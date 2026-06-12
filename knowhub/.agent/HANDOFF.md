# HANDOFF.md

> Purpose: Fast onboarding for the next contributor. | Last Updated: 2026-06-12

## Current state
KnowHub Phase 1 (deployable foundation) is built and verified. Next: confirm first
Cloudflare Pages deploy, then start KH-006 (Firebase auth).

## Run locally (verified)
```bash
cd knowhub        # repo root
npm install
npm run dev       # http://localhost:5173
npm run build     # → apps/web/dist
```

## Where things are
- App code: `apps/web/src` (pages, components, lib/modules.ts).
- Module list (drives all nav): `apps/web/src/lib/modules.ts` — add a module here and it
  appears in sidebar + landing + dashboard, with a placeholder route automatically.
- Specs (source of truth): `agent_docs/01..31`.
- Operational memory: `knowhub/.agent/` (this folder).

## Deployment
- Cloudflare Pages: build command `npm run build`, output `apps/web/dist`, NODE_VERSION 20.
- SPA routing handled by `apps/web/public/_redirects`.

## Next steps (priority order) — see TASKS.md
1. KH-006 Firebase Google auth + gate `/app`.
2. KH-007 Worker API + D1 schema. 3. KH-008 GitHub OAuth + repo sync. 4. KH-009 AI tutor.

## Warnings
- `freellmapi/` is gitignored (external AI backend; do not vendor — see DEC-002).
- Don't commit secrets; backend secrets go in Cloudflare (wrangler), not the repo.
- Module screens are placeholders by design until their phase lands.
