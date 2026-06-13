# DECISIONS.md

> Purpose: Key technical decisions. | Last Updated: 2026-06-13

## DEC-001 -- Phased delivery instead of one-shot MVP
Ship a deployable foundation, then implement features module-by-module, each ending green
and auto-deploying. Rationale: spec 22 estimates the MVP at 8-12 weeks; a live foundation
gives immediate value and a working CI/CD pipeline.

## DEC-003 -- react-router-dom for now (vs. TanStack Router in spec 02)
Minimal, reliable routing for fast green deploys. Migrate to TanStack later (KH-005).
Routing centralized in `apps/web/src/main.tsx`, low-cost to swap.

## DEC-004 -- npm workspaces + single app (defer pnpm/turbo)
Simplicity and frictionless Cloudflare Pages builds. Adopt pnpm/turbo when `packages/`
and `workers/` are introduced.

## DEC-005 -- AI backend = built-in Cloudflare Pages Function
KnowHub's AI gateway is `functions/api/chat.ts`: same-origin, OpenAI-compatible,
multi-provider with automatic fallback, keys stored as Cloudflare Pages secrets. Free,
no card, always-on, no CORS. A custom OpenAI-compatible endpoint can be set in Settings
as an optional PRIMARY (built-in remains the fallback). Matches spec 02/18.

## DEC-007 -- Cross-device sync via Firestore (2026-06-13)
- Decision: when signed in (Firebase), mirror the whole local-first AppData to Firestore
  at `users/{uid}` (`src/lib/sync.ts`): remote-wins on initial load, debounced writes on
  change, and onSnapshot for real-time updates from other devices. Local mode (signed out
  / unconfigured) keeps using localStorage only.
- Reasoning: the user expects keys + data to follow their account across web and the
  Android app. Firebase auth is already set up, and Firestore is free (no card). Avoids a
  separate backend for now. (GitHub repo sync remains a future content-portability layer
  per spec 09.)
- Consequences: provider keys are stored in the user's Firestore doc (readable only by
  them via security rules). Bundle grew (~227 kB gz) -> code-split as KH-DEBT-002.
- Rollback: sign out (local-only); or remove initSync().

## DEC-006 -- External AI proxy removed entirely (2026-06-13)
- Decision: remove the external AI proxy from the project -- its local project folder, all
  deployment configs/guides (Oracle, Render, Litestream, Filebase), and every code/doc
  reference.
- Reasoning: it was a key manager/router, not a source of free APIs; the user still needed
  their own provider keys. Hosting it free without a card kept hitting walls (Oracle/Fly/R2
  need cards; Supabase pauses) and added significant complexity. The built-in Pages Function
  (DEC-005) already delivers the same outcome -- one endpoint, multiple keys, fallback --
  for free with no card and near-zero maintenance.
- Consequences: AI relies solely on the built-in backend. The optional Settings endpoint is
  now a generic OpenAI-compatible override.
- Rollback: re-add a custom endpoint via Settings anytime; no code depends on the removed proxy.
