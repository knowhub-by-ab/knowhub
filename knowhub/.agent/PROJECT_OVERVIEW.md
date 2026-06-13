# PROJECT_OVERVIEW.md

> Purpose: Stable, high-level description of the project. | Last Updated: 2026-06-13 | Owner: knowhub-by-ab

## Project Purpose
**KnowHub** is an AI-powered, GitHub-native **Personal Learning Operating System** that
takes a learner from complete beginner to industry professional in any domain. It combines
an LMS, personal knowledge management, an AI tutor, a knowledge graph, and career roadmaps —
with the user's own GitHub repository as the source of truth for all learning content.

Full requirements: [`agent_docs/01_PRD.md`](../../agent_docs/01_PRD.md) and the 31 spec
documents in [`agent_docs/`](../../agent_docs).

## Core Principles (PRD §3)
- **User ownership first** — knowledge lives in the user's GitHub repo, never locked in the app.
- **AI as contributor, not controller** — AI proposes; user approves (Draft → Approval → Commit).
- **Repository-as-memory** — the repo is the source of truth.
- **Beginner → professional** — progression embedded into content.
- **Free-first** — open-source / free-tier preferred; paid never mandatory.

## Tech Stack (specs 02 & 18)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS (ShadCN UI, TanStack to follow).
- **AI backend:** built-in **Cloudflare Pages Function** (`functions/api/chat.ts`) — a
  multi-provider, OpenAI-compatible gateway with automatic fallback. Configured with the
  user's own free provider keys (Gemini/Groq/OpenRouter/OpenAI) as Cloudflare Pages secrets.
  A custom OpenAI-compatible endpoint can be set in Settings as an optional override.
- **Auth (planned):** Firebase Google Sign-In; GitHub OAuth for repo access.
- **Backend (planned):** Cloudflare Workers + D1 + KV + R2.
- **Mobile (planned):** Capacitor → Android APK via GitHub Releases.
- **Hosting:** Cloudflare Pages (auto-deploy from GitHub `main`).

## Repository / Deployment
- GitHub: `https://github.com/knowhub-by-ab/knowhub`
- Live: `https://knowhub-ai.pages.dev` (Cloudflare Pages project `knowhub-ai`).
- Build: `npm run build` → output `apps/web/dist` → auto-deploys on push to `main`.

## Scope
- **MVP** (spec 22): Google auth, GitHub integration, Learning Tree, pages, notes, AI chat,
  search, assessments, progress, dashboard, Android APK. Est. 8–12 weeks.
- Single-user repos; free-tier only. MVP excludes collaboration, community, voice.

## Related Documents
- [ARCHITECTURE.md](./ARCHITECTURE.md) · [CURRENT_STATE.md](./CURRENT_STATE.md) · [HANDOFF.md](./HANDOFF.md)
