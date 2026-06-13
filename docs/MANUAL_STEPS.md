# KnowHub — Every Manual Step You'll Need (beginner edition)

This is your master checklist of the things **only you can do** (creating
accounts and apps), because they require logging into your own accounts. Each
section says **whether to do it now or wait** until the matching code is built.

Legend:
- 🟢 **Do now** — safe to set up today; nothing in the app depends on code I still owe you.
- 🟡 **Wait for code** — I'll tell you when the matching feature is built; then follow these.

Whenever you finish a section, tell me and I'll wire it into the app.

---

## A. AI Tutor — add a free provider key 🟢

The AI Tutor uses KnowHub's **built-in backend** (the `/api/chat` Cloudflare Pages
Function). You just add one or more free provider keys (e.g. Google Gemini, Groq —
no card) as secrets in your Cloudflare Pages project. Full walkthrough:
[AI_BACKEND_SETUP.md](./AI_BACKEND_SETUP.md).

In short: get a free key → add it as a secret named `GEMINI_API_KEY` (or `GROQ_API_KEY`)
in Cloudflare → Workers & Pages → knowhub-ai → Settings → Variables and secrets →
redeploy → open the AI Tutor (leave KnowHub Settings blank).

---

## B. Google Login (Firebase) 🟡 — needed for sign-in

Create the Firebase project now; I'll add the login code, then you paste the keys.

### B1. Create a Firebase project
1. Go to **https://console.firebase.google.com** and sign in with your Google account.
2. Click **Add project** → name it `knowhub` → Continue.
3. Google Analytics is optional; you can turn it **off** → **Create project** → wait → **Continue**.

### B2. Turn on Google Sign-In
1. Left menu → **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → click **Google** → toggle **Enable** → pick a support email → **Save**.

### B3. Register a Web App and copy the config
1. Click the **gear icon** (top-left) → **Project settings**.
2. Scroll to **Your apps** → click the **`</>`** (Web) icon.
3. App nickname: `knowhub-web` → **Register app**.
4. You'll see a `firebaseConfig` block. **Copy these values** (you'll give them to me or
   paste into Cloudflare in step B5):
   - `apiKey`, `authDomain`, `projectId`, `appId`.

### B4. Authorize your live domain
1. **Authentication → Settings → Authorized domains → Add domain**.
2. Add **`knowhub-ai.pages.dev`** (localhost is already allowed for development).

### B5. Add the keys to Cloudflare Pages (so the live site can use them)
1. Cloudflare dashboard → **Workers & Pages → knowhub-ai → Settings → Variables and secrets**.
2. Add these **Plaintext** variables (these are public client keys — safe in the frontend):
   | Name | Value |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | your apiKey |
   | `VITE_FIREBASE_AUTH_DOMAIN` | your authDomain |
   | `VITE_FIREBASE_PROJECT_ID` | your projectId |
   | `VITE_FIREBASE_APP_ID` | your appId |
3. **Save**. (A new deploy will pick them up.)

➡️ **Tell me when B1–B5 are done** and I'll ship the Google login screen.

---

## C. GitHub Sync (your repo = your knowledge) 🟡 — needs a small backend

This lets KnowHub save your trees/pages/notes into a GitHub repo you own. It needs
a tiny Cloudflare Worker (which I'll build) plus a GitHub OAuth App (which you create).

### C1. Create a GitHub OAuth App
1. Go to **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**.
2. Fill in:
   - **Application name:** `KnowHub`
   - **Homepage URL:** `https://knowhub-ai.pages.dev`
   - **Authorization callback URL:** `https://knowhub-ai.pages.dev/api/github/callback`
     *(we'll finalize this when the Worker is built — it may change slightly)*
3. **Register application.**
4. Copy the **Client ID**. Click **Generate a new client secret** and copy the **secret**
   (store it safely — you only see it once). **Do not share the secret publicly.**

### C2. (Later, with me) store the secret in Cloudflare
The Client Secret is **secret** — it must NOT go in the frontend or the repo. When the
Worker is ready, we'll save it as an encrypted Worker secret via the Cloudflare dashboard
(Settings → Variables and secrets → **add as Secret**, not Plaintext).

➡️ **Do C1 whenever you like**; keep the Client ID + secret handy. Don't paste the secret
into our chat — you'll enter it directly into Cloudflare.

---

## D. Android App (APK) 🟡 — automated, almost nothing for you

When we add Capacitor + a GitHub Actions workflow, the APK builds automatically and
appears under your repo's **Releases**. Your only manual step will be:
1. Go to **https://github.com/knowhub-by-ab/knowhub/releases**, open the latest release,
   and download the `.apk` file onto your Android phone to install it.
(You may need to allow "install from unknown sources" on the phone — standard for
apps outside the Play Store.)

---

## E. Custom domain (optional) 🟢
If you ever buy a domain (e.g. `knowhub.app`):
1. Cloudflare → **Workers & Pages → knowhub-ai → Custom domains → Set up a domain**.
2. Follow the prompts; Cloudflare handles HTTPS automatically.
Then add that domain to Firebase **Authorized domains** (B4) and the GitHub OAuth URLs (C1).

---

## Quick status of what needs you

| Feature | Your setup | When |
| --- | --- | --- |
| AI Tutor | Add a free provider key as a Cloudflare secret | 🟢 now (section A) |
| Google login | Firebase project + keys in Cloudflare | 🟡 do A/B now; I wire it |
| GitHub sync | GitHub OAuth App (+ secret in Cloudflare later) | 🟡 create app now |
| Android APK | Just download from Releases | 🟡 after I add the build |
| Custom domain | Optional | 🟢 anytime |

Everything else (Learning Tree, Pages, Search, Progress, Notes, Assessments,
Knowledge Graph) needs **no setup** — it just works in the browser.
