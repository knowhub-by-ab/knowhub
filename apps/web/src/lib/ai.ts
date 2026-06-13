import type { ChatMessage, ProviderKey } from "./types";
import { toUpstream } from "./providers";

// AI client. Sends the conversation plus the user's configured provider keys
// (from the dashboard, in fallback-priority order) to KnowHub's built-in backend
// at /api/chat. The backend tries each upstream in order, then any keys
// configured server-side (Cloudflare Pages secrets) as a deeper fallback.

export class AiError extends Error {}

export async function chatCompletion(
  keys: ProviderKey[],
  messages: ChatMessage[]
): Promise<{ content: string; provider?: string }> {
  const upstreams = keys
    .filter((k) => k.apiKey.trim() && (k.provider !== "custom" || k.baseUrl?.trim()))
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
  onDelta: (piece: string) => void
): Promise<string> {
  const upstreams = keys
    .filter((k) => k.apiKey.trim() && (k.provider !== "custom" || k.baseUrl?.trim()))
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
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const firstObj = t.indexOf("{");
  const firstArr = t.indexOf("[");
  let start = -1;
  let close = "}";
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    close = "]";
  } else if (firstObj !== -1) {
    start = firstObj;
    close = "}";
  }
  if (start === -1) throw new AiError("AI did not return JSON.");
  const end = t.lastIndexOf(close);
  try {
    return JSON.parse(t.slice(start, end + 1)) as T;
  } catch {
    throw new AiError("Could not parse the AI's JSON response. Try again.");
  }
}

/** Ask the AI and parse its reply as JSON of type T. */
export async function chatJSON<T>(
  keys: ProviderKey[],
  messages: ChatMessage[]
): Promise<T> {
  const { content } = await chatCompletion(keys, messages);
  return extractJson<T>(content);
}
