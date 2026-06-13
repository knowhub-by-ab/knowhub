# KnowHub

**An AI-powered, GitHub-native Personal Learning Operating System.**
Go from complete beginner to industry professional in any domain — with an AI tutor, a
living knowledge graph, and a GitHub repository you fully own.

> Status: **Phase 1 — deployable foundation.** The web app shell, navigation and all MVP
> module screens are live and auto-deploying. Features (Google auth, GitHub sync, AI
> tutor, assessments) are being implemented module by module per the specs in
> [`agent_docs/`](./agent_docs).

---

## What's here

```
knowhub/
├── apps/
│   └── web/            # React + Vite + TypeScript + Tailwind front-end (Cloudflare Pages)
├── agent_docs/         # Full product & engineering specifications (01–31) + AI workflow
├── knowhub/.agent/     # Operational memory (persistent context for AI/human contributors)
├── package.json        # npm workspaces root
└── README.md
```

The full intended monorepo layout (apps/web, apps/mobile, packages/*, workers/*,
infrastructure/*) is defined in
[`agent_docs/26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md`](./agent_docs/26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md)
and is built out incrementally.

## Tech stack (per specs 02 & 18)

- **Frontend:** React, TypeScript, Vite, Tailwind CSS (ShadCN UI to follow)
- **Backend (planned):** Cloudflare Workers + D1 + KV + R2
- **Auth (planned):** Firebase Google Sign-In
- **Storage of truth:** the user's own GitHub repository
- **AI backend:** built-in Cloudflare Pages Function (`functions/api/chat.ts`) — a
  multi-provider, OpenAI-compatible gateway with automatic fallback, configured with your
  own free provider keys (Gemini/Groq/OpenRouter/OpenAI) as Cloudflare secrets. A custom
  OpenAI-compatible endpoint can be set in Settings as an optional override.
- **Mobile (planned):** Capacitor → Android APK via GitHub Releases
- **Hosting:** Cloudflare Pages (frontend) — auto-deploys on every push to `main`

## Develop locally

Prerequisites: Node.js 20+.

```bash
npm install
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # production build → apps/web/dist
npm run preview    # preview the production build
```

## Deployment (Cloudflare Pages)

Auto-deploys from this GitHub repo. Cloudflare Pages settings:

| Setting | Value |
| --- | --- |
| Framework preset | None / Vite |
| Build command | `npm run build` |
| Build output directory | `apps/web/dist` |
| Root directory | *(leave blank — repo root)* |
| Environment variable | `NODE_VERSION = 20` |

A `apps/web/public/_redirects` file (`/* /index.html 200`) makes client-side routing work.

## License

[MIT](./LICENSE)
