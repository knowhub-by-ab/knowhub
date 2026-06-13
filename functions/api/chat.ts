/**
 * KnowHub AI backend — a Cloudflare Pages Function.
 *
 * Served at  POST /api/chat  on the same domain as the site (no CORS needed in
 * production). Acts as a multi-provider AI gateway with automatic fallback —
 * free, no-card, always-on — per KnowHub spec 02/18 ("AI orchestration in
 * Cloudflare Workers").
 *
 * Configure providers via the Pages project's Variables & Secrets. Either:
 *   - AI_UPSTREAMS = JSON array of { name, baseUrl, apiKey, model, kind? }, or
 *   - simple per-provider secrets (each may be comma-separated for multiple keys):
 *       GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY
 *         → OpenAI-compatible providers
 *       APIFREELLM_API_KEY
 *         → apifreellm.com (custom format, ~1 req/20s) — used last as a fallback
 *
 * Optional: AI_GATE_KEY — if set, callers must send Authorization: Bearer <key>.
 */

interface Env {
  AI_UPSTREAMS?: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  APIFREELLM_API_KEY?: string;
  AI_GATE_KEY?: string;
}

type UpstreamKind = "openai" | "apifreellm";

interface Upstream {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  kind: UpstreamKind;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Per-provider defaults for the simple secrets. Order here = fallback order:
// Gemini (best/fastest, rotate 9 keys) → Groq → OpenRouter → OpenAI →
// ApiFreeLLM (slow, last resort).
const PROVIDER_DEFAULTS: Record<
  string,
  { baseUrl: string; model: string; kind: UpstreamKind }
> = {
  GEMINI_API_KEY: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
    kind: "openai",
  },
  GROQ_API_KEY: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    kind: "openai",
  },
  OPENROUTER_API_KEY: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    kind: "openai",
  },
  OPENAI_API_KEY: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    kind: "openai",
  },
  APIFREELLM_API_KEY: {
    baseUrl: "https://apifreellm.com/api/v1/chat",
    model: "apifreellm",
    kind: "apifreellm",
  },
};

function buildUpstreams(env: Env): Upstream[] {
  if (env.AI_UPSTREAMS?.trim()) {
    try {
      const arr = JSON.parse(env.AI_UPSTREAMS) as Partial<Upstream>[];
      if (Array.isArray(arr)) {
        return arr
          .filter((u) => u?.baseUrl && u?.apiKey)
          .map((u, i) => ({
            name: u.name ?? `upstream${i + 1}`,
            baseUrl: u.baseUrl!,
            apiKey: u.apiKey!,
            model: u.model ?? "auto",
            kind: (u.kind as UpstreamKind) ?? "openai",
          }));
      }
    } catch {
      /* fall through to per-provider vars */
    }
  }

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
          kind: def.kind,
        });
      });
  }
  return out;
}

function cors(origin: string | null): Record<string, string> {
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

const RETRYABLE = [401, 403, 408, 409, 429, 500, 502, 503, 504];

/** Flatten an OpenAI-style conversation into a single prompt for non-chat APIs. */
function flatten(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const label = m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System";
      return `${label}: ${m.content}`;
    })
    .join("\n\n");
}

async function callOpenAI(
  up: Upstream,
  messages: ChatMessage[],
  model: string
): Promise<{ content?: string; status: number; error?: string }> {
  const res = await fetch(`${up.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${up.apiKey}`,
    },
    body: JSON.stringify({ model: model !== "auto" ? model : up.model, messages, stream: false }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { status: res.status, error: t.slice(0, 120) };
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { status: 200, content: data.choices?.[0]?.message?.content };
}

async function callApiFreeLlm(
  up: Upstream,
  messages: ChatMessage[]
): Promise<{ content?: string; status: number; error?: string }> {
  const res = await fetch(up.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${up.apiKey}`,
    },
    body: JSON.stringify({ message: flatten(messages), model: up.model }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { status: res.status, error: t.slice(0, 120) };
  }
  const data = (await res.json()) as { success?: boolean; response?: string; error?: string };
  if (data.success === false) return { status: 502, error: data.error ?? "provider error" };
  return { status: 200, content: data.response };
}

export const onRequestOptions: PagesFunction = ({ request }) =>
  new Response(null, { status: 204, headers: cors(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ch = cors(request.headers.get("Origin"));

  if (env.AI_GATE_KEY?.trim()) {
    const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (token !== env.AI_GATE_KEY.trim()) return json({ error: "Unauthorized." }, 401, ch);
  }

  let payload: {
    messages?: ChatMessage[];
    model?: string;
    upstreams?: Partial<Upstream>[];
    stream?: boolean;
  };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400, ch);
  }
  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages[] is required." }, 400, ch);
  }

  // Keys sent from the dashboard come first (fallback priority), then any keys
  // configured server-side (Cloudflare Pages secrets) as a deeper fallback.
  const requestUpstreams: Upstream[] = Array.isArray(payload.upstreams)
    ? payload.upstreams
        .filter((u) => u?.baseUrl && u?.apiKey)
        .map((u, i) => ({
          name: u.name ?? `key${i + 1}`,
          baseUrl: u.baseUrl!,
          apiKey: u.apiKey!,
          model: u.model ?? "auto",
          kind: (u.kind as UpstreamKind) ?? "openai",
        }))
    : [];
  const upstreams = [...requestUpstreams, ...buildUpstreams(env)];
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

  const model = payload.model && payload.model !== "auto" ? payload.model : "auto";
  const errors: string[] = [];

  // Streaming: pass the upstream's SSE straight through to the client. We fall
  // back across providers on an initial non-OK status (not mid-stream).
  if (payload.stream) {
    for (const up of upstreams) {
      try {
        if (up.kind === "apifreellm") {
          // Not streamable — return the whole answer as JSON; client handles it.
          const r = await callApiFreeLlm(up, messages);
          if (r.status === 200 && r.content)
            return json({ content: r.content, provider: up.name, model: up.model }, 200, ch);
          errors.push(`${up.name}: ${r.status}${r.error ? " " + r.error : ""}`);
          continue;
        }
        const res = await fetch(`${up.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${up.apiKey}` },
          body: JSON.stringify({ model: model !== "auto" ? model : up.model, messages, stream: true }),
        });
        if (!res.ok || !res.body) {
          const t = await res.text().catch(() => "");
          errors.push(`${up.name}: ${res.status} ${t.slice(0, 100)}`);
          continue;
        }
        return new Response(res.body, {
          status: 200,
          headers: {
            ...ch,
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
          },
        });
      } catch (err) {
        errors.push(`${up.name}: ${err instanceof Error ? err.message : "network error"}`);
        continue;
      }
    }
    return json({ error: `All providers failed. ${errors.join(" | ")}` }, 502, ch);
  }

  for (const up of upstreams) {
    try {
      const r =
        up.kind === "apifreellm"
          ? await callApiFreeLlm(up, messages)
          : await callOpenAI(up, messages, model);

      if (r.status === 200 && r.content) {
        return json({ content: r.content, provider: up.name, model: up.model }, 200, ch);
      }
      errors.push(`${up.name}: ${r.status}${r.error ? " " + r.error : r.content ? " empty" : ""}`);
      if (r.status === 200) continue; // empty response → try next
      if (RETRYABLE.includes(r.status)) continue;
      // Non-retryable 4xx won't be fixed by another provider of the same kind.
      continue;
    } catch (err) {
      errors.push(`${up.name}: ${err instanceof Error ? err.message : "network error"}`);
      continue;
    }
  }

  return json({ error: `All providers failed. ${errors.join(" | ")}` }, 502, ch);
};
