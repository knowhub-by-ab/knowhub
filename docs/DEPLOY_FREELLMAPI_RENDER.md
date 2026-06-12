# Host FreeLLMAPI free 24/7 on Render (no card) — with Litestream + R2

This runs the **real FreeLLMAPI** (its dashboard, catalog, analytics, routing)
online for free, no credit card. The trick: Render's free disk is wiped on
restarts, so **Litestream** continuously backs up FreeLLMAPI's database to a
free **Cloudflare R2** bucket and restores it on boot. **UptimeRobot** pings the
app so it never sleeps.

KnowHub uses this as the **primary** AI; if it's ever down, KnowHub automatically
falls back to its built-in `/api/chat` backend (your own provider keys). So you
get the full FreeLLMAPI experience *and* resilience.

Time: ~30–40 minutes. Have the [AI keys guide](./AI_BACKEND_SETUP.md) handy for the fallback.

> The deployment files are already in your repo:
> `infrastructure/freellmapi-render/` (Dockerfile, litestream.yml, entrypoint.sh)
> and `render.yaml`.

---

## Step 1 — Create a Cloudflare R2 bucket (storage for the database backup)
1. Go to **https://dash.cloudflare.com → R2**.
2. If prompted, **enable R2** (free tier; if it insists on a payment method and you
   have none, see "No-card storage alternative" at the bottom).
3. **Create bucket** → name it `knowhub-freellmapi` → **Create**.
4. Note your **Account ID** (right sidebar on the R2 overview). Your S3 endpoint is:
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
5. **Manage R2 API Tokens → Create API token**:
   - Permissions: **Object Read & Write**
   - (Optionally scope to the one bucket)
   - **Create**. Copy the **Access Key ID** and **Secret Access Key** (shown once).

---

## Step 2 — Create the Render account (no card)
1. Go to **https://render.com** → **Get Started** → sign up **with GitHub**.
2. Authorize Render to see your repositories (you can limit it to `knowhub`).

---

## Step 3 — Deploy with the Blueprint
1. In Render: **New + → Blueprint**.
2. Pick the **`knowhub-by-ab/knowhub`** repo. Render reads `render.yaml` and shows a
   service named **knowhub-freellmapi**.
3. Click **Apply**. Render will ask you to fill the secret env vars (because they're
   marked "sync:false"). Enter:

   | Variable | Value |
   | --- | --- |
   | `ENCRYPTION_KEY` | a 64-char hex string — generate one (see below) and **keep it forever** |
   | `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `R2_BUCKET` | `knowhub-freellmapi` |
   | `LITESTREAM_ACCESS_KEY_ID` | the R2 Access Key ID from Step 1 |
   | `LITESTREAM_SECRET_ACCESS_KEY` | the R2 Secret Access Key from Step 1 |

   **Generate ENCRYPTION_KEY** — on any machine with Node, or use an online hex
   generator for 32 bytes (64 hex chars). On your PC:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. **Apply / Create**. Render builds the Docker image and deploys (first build ~3–6 min).
5. When live, Render shows a URL like **`https://knowhub-freellmapi.onrender.com`**. Copy it.

---

## Step 4 — Set up FreeLLMAPI itself
1. Open your Render URL in the browser. FreeLLMAPI's dashboard loads.
2. Create the admin account (email + password).
3. **Keys** page → add one or more free provider keys (Gemini, Groq, etc.) and order
   the fallback chain.
4. Copy the **unified key** (`freellmapi-…`) from the Keys page header.

Because of Litestream, all of this now survives restarts.

---

## Step 5 — Keep it awake (UptimeRobot)
1. Go to **https://uptimerobot.com** → sign up free (no card).
2. **Add New Monitor**:
   - **Type:** HTTP(s)
   - **Friendly name:** KnowHub FreeLLMAPI
   - **URL:** `https://knowhub-freellmapi.onrender.com/api/ping`
   - **Interval:** every 5 minutes
3. **Create Monitor.** This pings the app so Render's free instance never sleeps.

---

## Step 6 — Point KnowHub at it (primary), keep your keys as fallback
1. **KnowHub → Settings:**
   - **Endpoint base URL:** `https://knowhub-freellmapi.onrender.com/v1`
   - **API key:** the `freellmapi-…` unified key
   - **Model:** `auto`
   - **Save.**
2. **Fallback (your own keys):** follow [AI_BACKEND_SETUP.md](./AI_BACKEND_SETUP.md) to
   add `GEMINI_API_KEY` / `GROQ_API_KEY` (and friends) as secrets in your **Cloudflare
   Pages** project. If FreeLLMAPI is ever down, KnowHub auto-uses these.
   - If you also set an `AI_GATE_KEY` on Pages, make it **equal to** your FreeLLMAPI
     unified key so the same Settings key works for both. (Or leave `AI_GATE_KEY` unset.)
3. Open **AI Tutor** and chat. You're now on real FreeLLMAPI, with automatic fallback. 🎉

---

## Maintenance
- **Updating FreeLLMAPI:** Render → your service → **Manual Deploy → Clear build cache &
  deploy** (re-pulls `:latest`). Your data restores from R2.
- **Costs:** Render free web service, Cloudflare R2 free tier, UptimeRobot free — all $0.
- **First request after idle** can be slow if UptimeRobot ever misses; just retry.

## Troubleshooting
- **Build fails pulling the image:** re-run the deploy; GHCR can be momentarily slow.
- **Data didn't persist after restart:** check the R2 env vars and that the bucket exists;
  view Render **Logs** for `litestream` lines (restore/replicate).
- **AI Tutor errors but fallback works:** FreeLLMAPI may be asleep/restarting — UptimeRobot
  should prevent this; confirm the monitor is active.
- **No-card storage alternative:** if R2 demands a payment method, Litestream also supports
  other S3-compatible stores. Tell me and I'll switch `litestream.yml` to a no-card option
  (e.g. Supabase Storage's S3 endpoint).
