# Turn on KnowHub's AI Tutor (free, no card, no localhost)

KnowHub now has its **own built-in AI backend** running on Cloudflare (the
`/api/chat` Pages Function). To make it answer, you just add **one or more free
provider keys** to your Cloudflare Pages project. No card, no server, nothing on
your PC. It supports **multiple keys and multiple providers** with automatic
fallback (if one is rate-limited, it tries the next).

Time: ~5 minutes.

---

## Step 1 — Get at least one free API key (no card)

Pick one (or do both for fallback):

### Option A — Google Gemini (recommended)
1. Go to **https://aistudio.google.com/apikey** and sign in with Google.
2. Click **Create API key** → **Create API key in new project**.
3. Copy the key (starts with `AIza…`).

### Option B — Groq (very fast)
1. Go to **https://console.groq.com/keys** and sign in.
2. **Create API Key** → name it `knowhub` → **Submit** → copy it (starts with `gsk_…`).

> Both have free tiers and need no credit card.

---

## Step 2 — Add the key(s) to your Cloudflare Pages project
1. Go to **https://dash.cloudflare.com** → **Workers & Pages → knowhub-ai**.
2. **Settings → Variables and secrets → Add**.
3. Add as a **Secret** (not Plaintext), using the exact name for your provider:

   | If you got a key from… | Variable name (exactly) | Value |
   | --- | --- | --- |
   | Google Gemini | `GEMINI_API_KEY` | your `AIza…` key |
   | Groq | `GROQ_API_KEY` | your `gsk_…` key |
   | OpenRouter | `OPENROUTER_API_KEY` | your key |
   | OpenAI | `OPENAI_API_KEY` | your key |

   - **Multiple keys for one provider?** Put them comma-separated in the same
     variable, e.g. `GEMINI_API_KEY = AIza_one,AIza_two`. The backend rotates/falls
     back across them.
   - You can add several providers at once; the backend tries them in order
     (Gemini → Groq → OpenRouter → OpenAI by default).
4. Click **Save**.

---

## Step 3 — Redeploy so the keys take effect
Secrets apply to the **next** deployment. Trigger one:
- Cloudflare → **knowhub-ai → Deployments → Create deployment** (or **Retry**/
  **Manage deployment → Retry deployment** on the latest), **or** simply make any
  push to GitHub.

Wait ~1–2 minutes for the deploy to finish.

---

## Step 4 — Use it
1. Open **https://knowhub-ai.pages.dev → AI Tutor**.
2. Leave **Settings** blank (blank = use the built-in backend).
3. Ask something like *"Teach me the basics of Docker."* It works from any device. 🎉

---

## Advanced options (optional)

### Full control over providers/models — `AI_UPSTREAMS`
Instead of the simple per-provider variables, set one secret named
`AI_UPSTREAMS` to a JSON array. Each entry is tried in order:
```json
[
  { "name": "gemini", "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai", "apiKey": "AIza...", "model": "gemini-2.5-flash" },
  { "name": "groq",   "baseUrl": "https://api.groq.com/openai/v1",                          "apiKey": "gsk_...", "model": "llama-3.3-70b-versatile" }
]
```
This is how you mix **multiple, multi-variate keys** across providers and pick
exact models.

### Protect your AI endpoint — `AI_GATE_KEY` (recommended later)
Because the site is public, anyone who finds `/api/chat` could use your quota.
Set a secret `AI_GATE_KEY` to any random string, then enter the **same** string in
KnowHub → **Settings → API key**. The backend will reject requests without it.
(Proper per-user protection arrives with Google Login.)

---

## Troubleshooting
- **"No AI provider configured":** the key variable name is wrong or you didn't
  redeploy. Re-check Step 2 names exactly, then redeploy (Step 3).
- **"All providers failed":** the key may be invalid or out of quota. Try a
  different provider, or add a second key.
- **Want to use your own FreeLLMAPI instead:** put its URL in Settings → it
  overrides the built-in backend.
