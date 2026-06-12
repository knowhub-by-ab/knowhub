import type { AiSettings, ChatMessage } from "./types";

// AI client. By default KnowHub talks to its OWN built-in backend — the
// Cloudflare Pages Function at /api/chat (multi-provider, configured with keys
// in the Pages project). Advanced users can override this in Settings by
// entering an external OpenAI-compatible endpoint (e.g. a self-hosted FreeLLMAPI).

export class AiError extends Error {}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

/** Built-in backend: same-origin Pages Function. */
async function chatViaBuiltIn(
  settings: AiSettings,
  messages: ChatMessage[]
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Used as the optional AI_GATE_KEY if one is configured.
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
      },
      body: JSON.stringify({ messages, model: settings.model || "auto" }),
    });
  } catch (err) {
    throw new AiError(
      `Could not reach KnowHub's AI backend. ${err instanceof Error ? err.message : ""}`
    );
  }
  const data = (await res.json().catch(() => ({}))) as {
    content?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new AiError(
      data.error ??
        `AI request failed (${res.status}). The AI backend may not have a provider key configured yet.`
    );
  }
  if (!data.content) throw new AiError("AI returned an empty response.");
  return data.content;
}

/** External OpenAI-compatible endpoint (advanced override). */
async function chatViaExternal(
  settings: AiSettings,
  messages: ChatMessage[]
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(joinUrl(settings.baseUrl, "chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: settings.model || "auto",
        messages,
        stream: false,
      }),
    });
  } catch (err) {
    throw new AiError(
      `Could not reach the AI endpoint. Check the URL and that the server allows requests from this site (CORS). ${
        err instanceof Error ? err.message : ""
      }`
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AiError(`AI request failed (${res.status}). ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiError("AI returned an empty response.");
  return content;
}

export async function chatCompletion(
  settings: AiSettings,
  messages: ChatMessage[]
): Promise<string> {
  // No external endpoint configured → use the built-in backend directly.
  if (!settings.baseUrl.trim()) return chatViaBuiltIn(settings, messages);

  // External endpoint (e.g. self-hosted FreeLLMAPI) is the PRIMARY. If it fails
  // (down, rate-limited, CORS, quota), automatically fall back to the built-in
  // multi-key backend so the tutor keeps working.
  try {
    return await chatViaExternal(settings, messages);
  } catch (primaryErr) {
    try {
      return await chatViaBuiltIn(settings, messages);
    } catch (fallbackErr) {
      throw new AiError(
        `Primary AI (FreeLLMAPI) failed: ${
          primaryErr instanceof Error ? primaryErr.message : "unknown"
        } — and fallback also failed: ${
          fallbackErr instanceof Error ? fallbackErr.message : "unknown"
        }`
      );
    }
  }
}
