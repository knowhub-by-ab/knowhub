# TASKS.md

> Purpose: Backlog & priorities. | Last Updated: 2026-06-12

## Done
- [x] KH-001 — Scaffold monorepo + `apps/web` (React/Vite/TS/Tailwind). (2026-06-12)
- [x] KH-002 — Landing page + app shell + dashboard + module placeholders. (2026-06-12)
- [x] KH-003 — Cloudflare Pages config (`_redirects`, build settings, README guide). (2026-06-12)
- [x] KH-004 — Local build verified. (2026-06-12)

## Done (Phase 2 — local-first usable app, 2026-06-13)
- [x] KH-009 — AI Tutor chat via FreeLLMAPI (UI + direct client call). Provider fallback
      is handled by FreeLLMAPI itself. Streaming = follow-up.
- [x] KH-010 — Learning Tree engine: nodes CRUD, nesting, expand/collapse, status.
- [x] KH-014 — Global notes workspace (markdown + autosave).
- [x] KH-015 — Dashboard wired to real store-derived stats. (basic)
- [x] KH-018 — AI provider Settings page (local config).

## Next (MVP build order — each phase ends green + auto-deploys)
- [ ] KH-005 — ShadCN UI + TanStack Router/Query adoption (align to spec 02/20). Priority: med.
- [ ] KH-006 — Firebase Google Sign-In + auth-gated `/app` (spec 10). Priority: high.
- [ ] KH-007 — Cloudflare Worker API skeleton + D1 schema (specs 18,19,03). Priority: high.
- [ ] KH-008 — GitHub OAuth + connect/create repo + read/write/sync (spec 09). Priority: high.
- [ ] KH-011 — Markdown learning pages + Mermaid render (spec 11). Priority: high (client-side feasible).
- [ ] KH-012 — Search (MiniSearch over local content) (spec 08). Priority: med.
- [ ] KH-013 — MCQ assessments + scoring + recommendations (spec 12). Priority: med.
- [ ] KH-019 — AI Tutor streaming + "generate tree/page/quiz into draft" actions. Priority: med.
- [ ] KH-016 — Capacitor Android build + GitHub Releases APK (spec 18). Priority: low.
- [ ] KH-017 — GitHub Actions CI (lint/test/build) (spec 18 §38). Priority: med.

## Tech debt
- [ ] KH-DEBT-001 — Triage 2 npm audit advisories.
