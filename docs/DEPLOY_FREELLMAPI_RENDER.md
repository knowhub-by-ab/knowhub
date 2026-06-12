# Host FreeLLMAPI free 24/7 on Render (no card) — with Litestream + Filebase

> **Heads-up / recommendation.** This is the "I really want full FreeLLMAPI"
> path. It works with **no credit card**, but it's several moving parts. If you
> just want the AI Tutor working reliably with no card and no fuss, use KnowHub's
> **built-in backend** instead — see [AI_BACKEND_SETUP.md](./AI_BACKEND_SETUP.md)
> (add a free Gemini key, done). KnowHub already falls back to it automatically.

This runs the **real FreeLLMAPI** (its dashboard, catalog, analytics, routing)
online for free, no credit card. The trick: Render's free disk is wiped on
restarts, so **Litestream** continuously backs up FreeLLMAPI's database to a
free **Filebase** bucket (5 GB, S3-compatible, no card, never pauses) and
restores it on boot. **UptimeRobot** pings the app so it never sleeps.

> **Why Filebase?** Cloudflare R2 now needs a card; Supabase free projects pause
> after a week idle. Filebase gives 5 GB of standard S3 storage with no card and
> no pausing — ideal for SQLite/Litestream backups. The config uses generic `S3_*`
> vars, so you can point at R2/B2/Storj/Tigris later by just changing them.

KnowHub uses this as the **primary** AI; if it's ever down, KnowHub automatically
falls back to its built-in `/api/chat` backend (your own provider keys). So you
get the full FreeLLMAPI experience *and* resilience.

Time: ~30–40 minutes. Have the [AI keys guide](./AI_BACKEND_SETUP.md) handy for the fallback.

> The deployment files are already in your repo:
> `infrastructure/freellmapi-render/` (Dockerfile, litestream.yml, entrypoint.sh)
> and `render.yaml`.

---

## Step 1 — Create a Filebase bucket (no card)
1. Go to **https://filebase.com** → **Sign up** (free, no credit card).
2. Verify your email and log in to the Filebase console.
3. **Buckets → Create Bucket**:
   - **Name:** `knowhub-freellmapi` (bucket names are global — if taken, add a suffix)
   - **Storage network:** choose **Storj** (good for frequent small writes; avoid IPFS
     here since Litestream overwrites/deletes objects often).
   - **Create**.
4. Left sidebar → **Access Keys**. Filebase shows your **Key** (Access Key ID) and
   **Secret** (Secret Access Key) — copy both.
5. Your S3 settings are fixed for Filebase:
   - **Endpoint:** `https://s3.filebase.io`
   - **Region:** `auto`

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
   | `S3_ENDPOINT` | `https://s3.filebase.io` |
   | `S3_BUCKET` | `knowhub-freellmapi` (your bucket name from Step 1.3) |
   | `S3_REGION` | `auto` |
   | `LITESTREAM_ACCESS_KEY_ID` | the Filebase **Key** from Step 1.4 |
   | `LITESTREAM_SECRET_ACCESS_KEY` | the Filebase **Secret** from Step 1.4 |

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
- **Costs:** Render free web service, Filebase free 5 GB, UptimeRobot free — all $0, no card.
- **First request after idle** can be slow if UptimeRobot ever misses; just retry.
- **Filebase never pauses** and 5 GB is far more than this DB needs, so backups just keep
  working with no upkeep.

## Troubleshooting
- **Build fails pulling the image:** re-run the deploy; GHCR can be momentarily slow.
- **Data didn't persist after restart:** check the `S3_*` env vars and that the bucket
  exists; view Render **Logs** for `litestream` lines (restore/replicate). For Filebase the
  endpoint is exactly `https://s3.filebase.io` and region `auto`.
- **Litestream auth errors:** make sure you used the Filebase **Access Key** + **Secret**
  (from Access Keys), not your account login.
- **Slow/erroring writes on Filebase:** if you picked the **IPFS** network, recreate the
  bucket on **Storj** (IPFS is content-addressed and ill-suited to Litestream's frequent
  overwrites/deletes).
- **AI Tutor errors but fallback works:** FreeLLMAPI may be asleep/restarting — UptimeRobot
  should prevent this; confirm the monitor is active.
- **Other no-card stores:** the generic `S3_*` vars also work with Tigris, Storj (direct),
  Backblaze B2, self-hosted MinIO, etc. Tell me your pick and I'll note the exact values.
