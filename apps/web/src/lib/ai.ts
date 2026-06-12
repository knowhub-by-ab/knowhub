import type { AiSettings, ChatMessage } from "./types";

// Minimal OpenAI-compatible chat client. Talks directly to a FreeLLMAPI
// instance (or any OpenAI-compatible endpoint) configured in Settings.
// Non-streaming for simplicity in Phase 2.

export class AiError extends Error {}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

export async function chatCompletion(
  settings: AiSettings,
  messages: ChatMessage[]
): Promise<string> {
  if (!settings.baseUrl.trim()) {
    throw new AiError(
      "No AI endpoint configured. Add your FreeLLMAPI URL in Settings."
    );
  }

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
