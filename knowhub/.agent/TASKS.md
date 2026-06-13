# TASKS.md

> Purpose: Backlog & priorities. | Last Updated: 2026-06-13

## Done
- [x] KH-001 -- Scaffold monorepo + `apps/web`. (2026-06-12)
- [x] KH-002 -- Landing + app shell + dashboard + module placeholders. (2026-06-12)
- [x] KH-003 -- Cloudflare Pages config + auto-deploy. (2026-06-12)
- [x] KH-004 -- Local build verified. (2026-06-12)
- [x] KH-009 -- AI Tutor chat (built-in `/api/chat` backend + optional custom endpoint).
- [x] KH-010 -- Learning Tree (nodes CRUD, nesting, expand/collapse, status).
- [x] KH-011 -- Learning Pages (Markdown editor + sanitized preview, autosave).
- [x] KH-012 -- Search (MiniSearch over topics/pages/notes).
- [x] KH-013 -- Assessments (MCQ create/take/score, attempts).
- [x] KH-014 -- Notes (global Markdown notebook + autosave).
- [x] KH-015 -- Progress (overall + per-topic).
- [x] KH-019 -- Resources library.
- [x] KH-020 -- Knowledge Graph (SVG visualization).
- [x] KH-021 -- AI backend = built-in Cloudflare Pages Function (multi-provider + fallback).
- [x] KH-022 -- Remove the external AI proxy entirely (DEC-006).

## Done (cont.)
- [x] KH-006 -- Firebase Google Sign-In + auth-gated `/app` (graceful: app runs without
      config; gate activates when VITE_FIREBASE_* env is set). User adds Firebase keys.
- [x] KH-023a -- AI "Generate" actions (learning tree + quiz from a topic).

## Next
- [ ] KH-DEBT-002 -- Code-split (Firebase + marked + minisearch pushed JS >500 kB).
- [ ] KH-008 -- GitHub OAuth + connect/create repo + read/write/sync = Repository module
      (spec 09). Needs a backend (Pages Function) + login.
- [ ] KH-023 -- AI Tutor streaming + "generate tree/page/quiz into draft" actions.
- [ ] KH-005 -- ShadCN UI + TanStack Router/Query (align to spec 02/20).
- [ ] KH-016 -- Capacitor Android build + GitHub Releases APK (spec 18).
- [ ] KH-017 -- GitHub Actions CI (lint/build) (spec 18).

## Tech debt
- [ ] KH-DEBT-001 -- Triage npm audit advisories.
- [ ] KH-DEBT-002 -- Code-split JS bundle (marked + minisearch) if it grows further.
