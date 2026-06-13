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
- [x] KH-006 -- Firebase Google Sign-In + auth-gated `/app` (graceful).
- [x] KH-007a -- Firestore cross-device cloud sync (DEC-007).
- [x] KH-023a -- AI "Generate" actions (learning tree + quiz from a topic).
- [x] KH-008 -- GitHub sync: OAuth (Pages Functions) + Repository page (connect, create/use
      private repo, sync export knowhub.json/notes.md/knowledge pages, import).
- [x] KH-016 -- Android APK: Capacitor config + `.github/workflows/android.yml` (artifact +
      release on tag); landing "Download Android App" wired to releases/latest.
- [x] KH-024 -- Official logo favicon matches Logo.tsx.

## Polish done
- [x] KH-DEBT-002 -- Code-split: lazy routes + manualChunks (firebase/markdown/search/vendor);
      landing chunk ~12 kB, Firebase loads only under /app. >500 kB warning gone.
- [x] KH-017 -- CI workflow (.github/workflows/ci.yml): lint + type-check + build on push/PR.
- [x] KH-023 -- AI Tutor streaming (SSE passthrough for OpenAI providers; JSON for ApiFreeLLM).
- [x] KH-016b -- APK build fixed (Node 22 + Java 21 for Capacitor 7).

## Done (cont.)
- [x] KH-007b -- Sync EVERYTHING across devices incl github + aiKeys, last-write-wins by
      timestamp (fixes data missing on 2nd device). store: getUpdatedAt/applyRemoteState.
- [x] KH-024b -- Android app icon generated from the logo (scripts/gen-icon.mjs +
      @capacitor/assets in the workflow).
- [x] KH-025 -- Native Google sign-in via @capacitor-firebase/authentication (skipNativeAuth
      + signInWithCredential); used when running natively. Needs google-services.json (CI secret).
- [x] KH-026 -- Signed release APK via CI keystore secrets (workflow falls back to debug
      when secrets absent). Manual steps in docs/MANUAL_STEPS.md F.

## Remaining (optional)
- [ ] KH-005 -- ShadCN UI + TanStack adoption (spec 02/20). See note: high-risk full
      migration; recommend incremental, not a big-bang rewrite.
- [ ] Verify native APK end-to-end once F secrets are set (CI may need iteration).
- [ ] KH-008 -- GitHub OAuth + connect/create repo + read/write/sync = Repository module
      (spec 09). Needs a backend (Pages Function) + login.
- [ ] KH-023 -- AI Tutor streaming + "generate tree/page/quiz into draft" actions.
- [ ] KH-005 -- ShadCN UI + TanStack Router/Query (align to spec 02/20).
- [ ] KH-016 -- Capacitor Android build + GitHub Releases APK (spec 18).
- [ ] KH-017 -- GitHub Actions CI (lint/build) (spec 18).

## Tech debt
- [ ] KH-DEBT-001 -- Triage npm audit advisories.
- [ ] KH-DEBT-002 -- Code-split JS bundle (marked + minisearch) if it grows further.
