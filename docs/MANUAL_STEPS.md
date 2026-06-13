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

**No Cloudflare needed.** Add your AI keys right inside the app:
1. Open KnowHub → **Settings → AI provider keys**.
2. Pick a provider (e.g. **ApiFreeLLM** or **Google Gemini**), paste the key, **Add**.
   Add several and order them — KnowHub tries them top-to-bottom with automatic fallback.
3. Open **AI Tutor** and chat. Done.

Your keys are saved to your account (when signed in) and sync across devices.

> Optional/advanced: you can *also* set keys as Cloudflare Pages secrets
> (`GEMINI_API_KEY`, etc.) to act as a shared server-side fallback — but it isn't
> required. See [AI_BACKEND_SETUP.md](./AI_BACKEND_SETUP.md).

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

## B2. Cloud sync across devices (Firestore) 🟢 — needs Google Login (B) done first

This makes your keys + all data follow your account to any device and the Android app.

1. **https://console.firebase.google.com** → open your **knowhub** project.
2. Left sidebar → **Build → Firestore Database** → **Create database**.
3. Choose **Start in production mode** → **Next** → pick a **location** (closest to you) → **Enable**.
4. Open the **Rules** tab, replace everything with this, then **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
   (This lets each signed-in user read/write only their own data.)
5. That's it — no new env vars. Sign in on one device, add a key/topic; sign in on another
   device and it's there. (Give it a few seconds to sync.)

---

## C. GitHub Sync (your repo = your knowledge) 🟢 — built; needs an OAuth app

This lets KnowHub save your tree/pages/notes into a **private GitHub repo you own**
(`knowhub.json` + `notes.md` + a `knowledge/` page per topic), and import them back.
It's built; you just create a GitHub OAuth app and add its 2 keys to Cloudflare.

### C1. Create a GitHub OAuth App (~2 min)
1. Go to **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**.
2. Fill in **exactly**:
   - **Application name:** `KnowHub`
   - **Homepage URL:** `https://knowhub-ai.pages.dev`
   - **Authorization callback URL:** `https://knowhub-ai.pages.dev/api/github/callback`
3. **Register application.**
4. Copy the **Client ID**. Click **Generate a new client secret** and copy the **secret**
   (shown once). Don't paste the secret into chat.

### C2. Add the two keys to Cloudflare Pages (~1 min)
1. **dash.cloudflare.com → Workers & Pages → knowhub-ai → Settings → Variables and secrets → Add.**
2. Add as **Secret**:
   | Name (exact) | Value |
   | --- | --- |
   | `GITHUB_OAUTH_CLIENT_ID` | your Client ID |
   | `GITHUB_OAUTH_CLIENT_SECRET` | your client secret |
3. **Save**, then **Deployments → Create deployment** (so the secrets take effect).

### C3. Use it
Open KnowHub → **Repository** → **Connect GitHub** → authorize → set a repo name
(default `knowhub`) → **Sync to GitHub**. Use **Import from GitHub** on another device to
pull it back. (Sign in first so the connection syncs with your account.)

---

## D. Android App (APK) 🟢 — built (GitHub Actions + Capacitor)

The APK is a thin wrapper around the live site, built by
`.github/workflows/android.yml`. To produce one:

**Build it (pick one):**
- **Manual:** GitHub → **Actions** tab → **Android APK** → **Run workflow** → after ~5–8 min
  download **knowhub.apk** from the run's **Artifacts**.
- **Release:** create a version tag and the APK is attached to a GitHub Release automatically:
  ```bash
  git tag v0.1.0 && git push origin v0.1.0
  ```
  Then it appears at **https://github.com/knowhub-by-ab/knowhub/releases/latest** (which the
  landing page's "Download Android App" button links to).

**Install on your phone:** download the `.apk`, open it, and allow "install from unknown
sources" if prompted (standard for apps outside the Play Store).

> Notes: the debug APK is unsigned — that's normal and fine for sideloading (Android just
> asks you to confirm). Google sign-in inside the app now uses a full-page redirect (not a
> popup), which works in the Android WebView. If Google ever blocks in-WebView sign-in on
> your device, just use KnowHub signed-out on mobile (local data) or sign in on the web —
> your keys/data still sync via your account.

---

## F. Android: native Google sign-in + signed APK 🟡 — needs secrets you create

The plain APK works, but **Google sign-in inside the app** needs native config, and a
**signed** APK needs a keystore. Both are driven by GitHub repo secrets — set them once and
re-run the workflow. (All commands below use your PC; `keytool` ships with Java/Android Studio.)

### F1. Register an Android app in Firebase
1. Firebase Console → your **knowhub** project → **Project settings** → **Your apps** →
   **Add app** → **Android**.
2. **Android package name:** `dev.knowhub.app` (must match exactly).
3. Register → **Download `google-services.json`**.

### F2. Create a signing keystore (once — keep it forever)
```bash
keytool -genkey -v -keystore knowhub-release.jks -alias knowhub \
  -keyalg RSA -keysize 2048 -validity 10000
```
Pick a password and remember it. (Answer the name/org prompts however you like.)

### F3. Get the keystore's SHA-1 / SHA-256
```bash
keytool -list -v -keystore knowhub-release.jks -alias knowhub
```
Copy the **SHA1** and **SHA-256** lines.

### F4. Add the fingerprints to Firebase
Firebase → Project settings → Your apps → the Android app → **Add fingerprint** → paste
**SHA-1**, add again for **SHA-256** → **Save**. Then **re-download `google-services.json`**
(now it contains the OAuth client) — use this newer file in F6.

### F5. Base64-encode the two files (Windows PowerShell)
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json")) | Set-Clipboard   # then paste into the secret
[Convert]::ToBase64String([IO.File]::ReadAllBytes("knowhub-release.jks"))   | Set-Clipboard
```

### F6. Add GitHub repo secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
| Secret name | Value |
| --- | --- |
| `GOOGLE_SERVICES_JSON` | base64 of `google-services.json` |
| `ANDROID_KEYSTORE_BASE64` | base64 of `knowhub-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `knowhub` |
| `ANDROID_KEY_PASSWORD` | the key password (same as store password unless you set a different one) |

### F7. Re-run the workflow
GitHub → **Actions → Android APK → Run workflow**. It now builds a **signed** APK with
**native Google sign-in** and the **KnowHub icon**. Install it and sign in — the account
picker is native (no browser bounce).

> The keystore must stay the **same** for every future release. If you ever lose it, create a
> new one and re-add its SHA-1/256 to Firebase. This is new ground for the build — if a step
> errors, paste the Actions log and I'll adjust.

---

## E. Custom domain (optional) 🟢
If you ever buy a domain (e.g. `knowhub.app`):
1. Cloudflare → **Workers & Pages → knowhub-ai → Custom domains → Set up a domain**.
2. Follow the prompts; Cloudflare handles HTTPS automatically.
Then add that domain to Firebase **Authorized domains** (B4) and the GitHub OAuth URLs (C1).

---

## Quick status of what needs you

| Feature | Your setup | Status |
| --- | --- | --- |
| AI Tutor | Add provider keys (dashboard Settings, or Cloudflare secrets) | 🟢 A |
| Google login | Firebase project + 4 keys in Cloudflare | 🟢 B (done) |
| Cross-device sync | Enable Firestore + rules | 🟢 B2 (done) |
| GitHub sync | GitHub OAuth app + 2 keys in Cloudflare | 🟢 C |
| Android APK | Run the Actions workflow / push a tag, then download | 🟢 D |
| Custom domain | Optional | 🟢 E |

Everything else (Learning Tree, Knowledge Graph, Pages, Search, Progress, Notes,
Assessments, Resources) needs **no setup** — it just works in the browser.
