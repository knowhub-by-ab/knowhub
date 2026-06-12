# DECISIONS.md

> Purpose: Key technical decisions. | Last Updated: 2026-06-12

## DEC-001 — Phased delivery instead of one-shot MVP
- **Decision:** Ship a deployable Phase-1 foundation (app shell + all module routes), then
  implement features module-by-module, each ending green and auto-deploying.
- **Reasoning:** Spec 22 estimates the MVP at 8–12 weeks; a single session cannot complete
  it. A live, building foundation gives immediate value and a working CI/CD pipeline.
- **Consequences:** Module screens are placeholders until their phase; clearly labelled.

## DEC-002 — FreeLLMAPI is an external dependency, not vendored
- **Decision:** Do not commit `freellmapi/` into this repo; connect to it over HTTP.
- **Reasoning:** It is a third-party open-source project (separate git history/license).
  Vendoring it would bloat the repo and risk breaking the Cloudflare build. User confirmed
  it's used "as the AI API component."
- **Consequences:** `freellmapi/` is gitignored; README documents the integration. Kept
  locally, untouched.

## DEC-003 — react-router-dom for Phase 1 (vs. TanStack Router in spec 02)
- **Decision:** Use `react-router-dom` for the initial shell.
- **Reasoning:** Minimal, battle-tested, fastest path to a reliable green build for a first
  deploy. Spec names TanStack Router/Query.
- **Consequences:** Tracked as KH-005 to migrate/adopt TanStack to align with spec 02/20.
- **Rollback:** Routing is centralized in `apps/web/src/main.tsx`; low-cost to swap.

## DEC-005 — AI backend = Cloudflare Pages Function, not self-hosted FreeLLMAPI
- **Decision:** Implement KnowHub's AI gateway as a Pages Function (`functions/api/chat.ts`)
  with multi-provider fallback (Gemini/Groq/OpenRouter/OpenAI via OpenAI-compatible APIs),
  configured by secrets in the Pages project. Frontend calls same-origin `/api/chat` by
  default; an external endpoint (e.g. self-hosted FreeLLMAPI) remains an optional override.
- **Reasoning:** User has no payment card. Self-hosting FreeLLMAPI needs a persistent
  always-on host with disk (it stores keys + the unified key in SQLite; confirmed no
  env-seeding). All no-card free hosts (Render/HF Spaces/Vercel/Netlify) are ephemeral or
  serverless and would reset that DB, changing the unified key and breaking KnowHub.
  Cloudflare Pages Functions are free, no-card, always-on, same-origin (no CORS), and
  match spec 02/18 ("AI orchestration in Cloudflare Workers").
- **Alternatives:** Oracle/Fly (need card); Render/HF Spaces (reset data); separate Worker
  (extra deploy). Rejected for friction/cost/reliability.
- **Consequences:** Keys managed in Cloudflare project settings instead of FreeLLMAPI's
  dashboard. Same end result for KnowHub. Switchable later via Settings.
- **Note:** Streaming and `/v1/models` not yet implemented in the function (follow-up).

## DEC-004 — Single buildable app at apps/web (npm workspaces, no turbo/pnpm yet)
- **Decision:** Start with npm workspaces and one app; defer pnpm + turbo (spec 26).
- **Reasoning:** Simplicity and a frictionless Cloudflare Pages build for a novice owner.
- **Consequences:** Adopt pnpm/turbo when packages/workers are introduced.
