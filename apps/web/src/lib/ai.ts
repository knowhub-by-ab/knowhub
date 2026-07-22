import type { ChatMessage, ProviderKey, AiRole } from "./types";
import { toUpstream } from "./providers";

// AI client. Sends the conversation plus the user's configured provider keys
// (from the dashboard, in fallback-priority order) to KnowHub's built-in backend
// at /api/chat. The backend tries each upstream in order, then any keys
// configured server-side (Cloudflare Pages secrets) as a deeper fallback.

export class AiError extends Error {}

// Puter.js global — loaded via CDN in index.html
declare const puter: {
  ai: {
    chat(
      messages: Array<{ role: string; content: string }>,
      opts?: { model?: string; stream?: boolean }
    ): Promise<
      | { message?: { content?: Array<{ text?: string }> } }
      | AsyncIterable<{ text?: string }>
    >;
  };
};

/** Sort keys so those tagged for `role` (or "any") come first. */
function sortByRole(keys: ProviderKey[], role: AiRole | undefined): ProviderKey[] {
  if (!role || role === "any") return keys;
  return [...keys].sort((a, b) => {
    const aMatch = !a.roles || a.roles.includes(role) || a.roles.includes("any") ? 0 : 1;
    const bMatch = !b.roles || b.roles.includes(role) || b.roles.includes("any") ? 0 : 1;
    return aMatch - bMatch;
  });
}

/** Try to call Puter.js chat directly in the browser. Returns null if Puter unavailable. */
async function puterChat(messages: ChatMessage[]): Promise<string | null> {
  try {
    if (typeof puter === "undefined" || !puter?.ai?.chat) return null;
    const result = await puter.ai.chat(
      messages.map((m) => ({ role: m.role, content: m.content }))
    );
    const r = result as { message?: { content?: Array<{ text?: string }> } };
    const text = r?.message?.content?.[0]?.text ?? "";
    return text || null;
  } catch {
    return null;
  }
}

/** Try to stream from Puter.js. Calls onDelta for each chunk. Returns full text or null. */
async function puterStream(
  messages: ChatMessage[],
  onDelta: (piece: string) => void
): Promise<string | null> {
  try {
    if (typeof puter === "undefined" || !puter?.ai?.chat) return null;
    const stream = await puter.ai.chat(
      messages.map((m) => ({ role: m.role, content: m.content })),
      { stream: true }
    );
    let full = "";
    for await (const chunk of stream as AsyncIterable<{ text?: string }>) {
      const piece = chunk?.text ?? "";
      if (piece) {
        full += piece;
        onDelta(piece);
      }
    }
    return full || null;
  } catch {
    return null;
  }
}

export async function chatCompletion(
  keys: ProviderKey[],
  messages: ChatMessage[],
  role?: AiRole
): Promise<{ content: string; provider?: string }> {
  const sorted = sortByRole(keys, role);

  // Try Puter keyless first if it's in the sorted list at the top
  const hasPuter = sorted.some((k) => k.provider === "puter");
  if (hasPuter) {
    const text = await puterChat(messages);
    if (text) return { content: text, provider: "puter" };
  }

  const upstreams = sorted
    .filter((k) => k.provider !== "puter" && k.apiKey.trim() && (k.provider !== "custom" || k.baseUrl?.trim()))
    .map(toUpstream);

  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, model: "auto", upstreams }),
    });
  } catch (err) {
    throw new AiError(
      `Could not reach KnowHub's AI backend. ${err instanceof Error ? err.message : ""}`
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    content?: string;
    provider?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new AiError(
      data.error ??
        `AI request failed (${res.status}). Add a provider key in Settings, or check your keys.`
    );
  }
  if (!data.content) throw new AiError("AI returned an empty response.");
  return { content: data.content, provider: data.provider };
}

/**
 * Streaming chat. Calls onDelta with each text chunk as it arrives and resolves
 * to the full reply. Falls back to a single chunk if the backend returns JSON
 * (e.g. a non-streaming provider like ApiFreeLLM).
 */
export async function chatStream(
  keys: ProviderKey[],
  messages: ChatMessage[],
  onDelta: (piece: string) => void,
  role?: AiRole
): Promise<string> {
  const sorted = sortByRole(keys, role);

  // Try Puter streaming if it's in the sorted list
  const hasPuter = sorted.some((k) => k.provider === "puter");
  if (hasPuter) {
    const text = await puterStream(messages, onDelta);
    if (text) return text;
  }

  const upstreams = sorted
    .filter((k) => k.provider !== "puter" && k.apiKey.trim() && (k.provider !== "custom" || k.baseUrl?.trim()))
    .map(toUpstream);

  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, model: "auto", upstreams, stream: true }),
    });
  } catch (err) {
    throw new AiError(
      `Could not reach KnowHub's AI backend. ${err instanceof Error ? err.message : ""}`
    );
  }

  const ct = res.headers.get("Content-Type") ?? "";

  // Non-streaming provider (or error) → JSON body.
  if (!ct.includes("text/event-stream")) {
    const data = (await res.json().catch(() => ({}))) as { content?: string; error?: string };
    if (!res.ok) throw new AiError(data.error ?? `AI request failed (${res.status}).`);
    const content = data.content ?? "";
    if (!content) throw new AiError("AI returned an empty response.");
    onDelta(content);
    return content;
  }

  // OpenAI-style SSE stream.
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const piece = j.choices?.[0]?.delta?.content ?? "";
        if (piece) {
          full += piece;
          onDelta(piece);
        }
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }
  if (!full) throw new AiError("AI returned an empty response.");
  return full;
}

/** Best-effort extraction of a JSON value from an LLM reply (handles code fences/prose). */
export function extractJson<T>(text: string): T {
  let t = text.trim();
  // Strip markdown code fences
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  // Find where the JSON starts
  const firstObj = t.indexOf("{");
  const firstArr = t.indexOf("[");
  let start = -1;
  let open = "{";
  let close = "}";
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    open = "[";
    close = "]";
  } else if (firstObj !== -1) {
    start = firstObj;
    open = "{";
    close = "}";
  }
  if (start === -1) throw new AiError("AI did not return JSON.");

  // Bracket-count to find the matching close — handles nested structures and
  // quoted strings (so braces inside "..." don't affect depth).
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new AiError("AI did not return JSON.");

  try {
    return JSON.parse(t.slice(start, end + 1)) as T;
  } catch {
    throw new AiError("Could not parse the AI's JSON response. Try again.");
  }
}

/** Ask the AI and parse its reply as JSON of type T. */
export async function chatJSON<T>(
  keys: ProviderKey[],
  messages: ChatMessage[],
  role?: AiRole
): Promise<T> {
  const { content } = await chatCompletion(keys, messages, role);
  return extractJson<T>(content);
}
