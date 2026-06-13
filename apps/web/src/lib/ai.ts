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
