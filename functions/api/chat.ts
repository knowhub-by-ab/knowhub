/**
 * KnowHub AI backend — a Cloudflare Pages Function.
 *
 * Served at  POST /api/chat  on the same domain as the site (no CORS needed in
 * production). Acts as a multi-provider, OpenAI-compatible AI gateway with
 * automatic fallback — free, no-card, always-on — per KnowHub spec 02/18
 * ("AI orchestration in Cloudflare Workers").
 *
 * Configure providers via the Pages project's Variables & Secrets. Either:
 *   - AI_UPSTREAMS = JSON array of { name, baseUrl, apiKey, model }  (full control), or
 *   - simple per-provider secrets: GEMINI_API_KEY / GROQ_API_KEY /
 *     OPENROUTER_API_KEY / OPENAI_API_KEY  (each may be comma-separated for
 *     multiple keys → rotation/fallback).
 *
 * Optional: AI_GATE_KEY — if set, callers must send Authorization: Bearer <key>.
 */

interface Env {
  AI_UPSTREAMS?: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  AI_GATE_KEY?: string;
}

interface Upstream {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Sensible defaults for the simple per-provider secrets (June 2026 free tiers).
const PROVIDER_DEFAULTS: Record<
  string,
  { baseUrl: string; model: string }
> = {
  GEMINI_API_KEY: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
  },
  GROQ_API_KEY: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  OPENROUTER_API_KEY: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
  },
  OPENAI_API_KEY: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
};

function buildUpstreams(env: Env): Upstream[] {
  // 1. Full control via AI_UPSTREAMS JSON.
  if (env.AI_UPSTREAMS?.trim()) {
    try {
      const arr = JSON.parse(env.AI_UPSTREAMS) as Upstream[];
      if (Array.isArray(arr)) return arr.filter((u) => u?.baseUrl && u?.apiKey);
    } catch {
      // fall through to per-provider vars
    }
  }
  // 2. Simple per-provider secrets (comma-separated keys allowed).
  const out: Upstream[] = [];
  for (const [varName, def] of Object.entries(PROVIDER_DEFAULTS)) {
    const raw = (env as Record<string, string | undefined>)[varName];
    if (!raw?.trim()) continue;
    raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .forEach((apiKey, i) => {
        out.push({
          name: `${varName.replace("_API_KEY", "").toLowerCase()}${i ? `#${i + 1}` : ""}`,
          baseUrl: def.baseUrl,
          apiKey,
          model: def.model,
        });
      });
  }
  return out;
}

function cors(origin: string | null): Record<string, string> {
  // Same-origin in production; allow localhost dev origins too.
  const allow =
    origin &&
    /^(https:\/\/[a-z0-9-]+\.pages\.dev|http:\/\/localhost:\d+|http:\/\/127\.0\.0\.1:\d+)$/i.test(
      origin
    )
      ? origin
      : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export const onRequestOptions: PagesFunction = ({ request }) =>
  new Response(null, { status: 204, headers: cors(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ch = cors(request.headers.get("Origin"));

  // Optional gate.
  if (env.AI_GATE_KEY?.trim()) {
    const auth = request.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (token !== env.AI_GATE_KEY.trim()) {
      return json({ error: "Unauthorized." }, 401, ch);
    }
  }

  let payload: { messages?: ChatMessage[]; model?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400, ch);
  }
  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages[] is required." }, 400, ch);
  }

  const upstreams = buildUpstreams(env);
  if (upstreams.length === 0) {
    return json(
      {
        error:
          "No AI provider configured. Add a provider key (e.g. GEMINI_API_KEY) in the Cloudflare Pages project settings.",
      },
      503,
      ch
    );
  }

  const errors: string[] = [];
  for (const up of upstreams) {
    try {
      const res = await fetch(`${up.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${up.apiKey}`,
        },
        body: JSON.stringify({
          model: payload.model && payload.model !== "auto" ? payload.model : up.model,
          messages,
          stream: false,
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        errors.push(`${up.name}: ${res.status} ${t.slice(0, 120)}`);
        // Retry next upstream on rate limit / server / auth errors.
        if ([401, 403, 429, 500, 502, 503, 504].includes(res.status)) continue;
        // Other 4xx (e.g. bad request) won't be fixed by another provider.
        return json({ error: `Upstream error: ${errors.join(" | ")}` }, 502, ch);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        errors.push(`${up.name}: empty response`);
        continue;
      }
      return json({ content, provider: up.name, model: up.model }, 200, ch);
    } catch (err) {
      errors.push(`${up.name}: ${err instanceof Error ? err.message : "network error"}`);
      continue;
    }
  }

  return json(
    { error: `All providers failed. ${errors.join(" | ")}` },
    502,
    ch
  );
};
