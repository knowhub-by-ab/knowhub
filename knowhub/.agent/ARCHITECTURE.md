# ARCHITECTURE.md

> Purpose: Operational architecture reference. | Last Updated: 2026-06-12

## Target monorepo layout (spec 26) — built incrementally
```
knowhub/
├── apps/
│   ├── web/      # React+Vite+TS+Tailwind front-end  ← EXISTS (Phase 1)
│   ├── mobile/   # Capacitor Android wrapper          (planned)
│   └── admin/    # Admin dashboard                    (planned)
├── packages/     # ui, types, utils, ai, github, search, assessment,
│                 #   progress, auth, validation        (planned)
├── workers/      # api, ai, github, sync, scheduler (Cloudflare Workers) (planned)
├── infrastructure/  # cloudflare, firebase, github, deployment (planned)
├── agent_docs/   # the 31 specifications + AI workflow (source of truth for specs)
└── knowhub/.agent/  # operational memory (this folder)
```
Dependency direction (spec 26 §58): apps/workers → packages. Never the reverse.

## Phase 1 (current) — apps/web
- `src/main.tsx` — react-router-dom browser router. Routes: `/` (landing),
  `/app` (layout + dashboard), `/app/:module` (placeholders), `*` (404).
- `src/lib/modules.ts` — single source of truth for the MVP module list (label, path,
  icon, summary, PRD reference). Drives sidebar, landing grid, dashboard grid.
- `src/components/AppLayout.tsx` — responsive sidebar shell for the authed app area.
- `src/pages/*` — LandingPage, DashboardPage, ModulePlaceholderPage, NotFoundPage.
- `public/_redirects` — `/* /index.html 200` so SPA client routing works on Pages.

## Planned runtime architecture (specs 02, 18)
```
User → Cloudflare Pages (React) → Cloudflare Workers (API/AI/GitHub/Sync)
     → D1 (progress/analytics/settings) · KV (cache) · R2 (backups)
     → User's GitHub repo (knowledge = source of truth)
     → FreeLLMAPI (AI) + optional user provider keys (encrypted)
```
- AI content flow: Generate → Draft branch → Pull Request → user review → merge.
- Secrets live in Cloudflare (wrangler), never in the repo or frontend.

## Related Documents
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) · spec [02](../../agent_docs/02_SYSTEM_ARCHITECTURE.md) · [26](../../agent_docs/26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md) · [18](../../agent_docs/18_DEPLOYMENT_DEVOPS_AND_INFRASTRUCTURE_SPECIFICATION.md)
