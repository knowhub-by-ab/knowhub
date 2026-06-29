// Platform-aware "Discuss this page" launcher.
// On web: opens ChatGPT with pre-filled prompt (or copies to clipboard for Gemini).
// On native (Capacitor): uses OS Share sheet.

export type DiscussTarget = "chatgpt" | "gemini";

function buildPrompt(title: string, markdown: string): string {
  const excerpt = markdown.slice(0, 12000).trim();
  return `I'm learning about "${title}". Here is the content:\n\n${excerpt}\n\nPlease help me understand this better. What are the key concepts, and do you have any tips or examples to make it clearer?`;
}

export async function discussPage(
  title: string,
  markdown: string,
  target: DiscussTarget = "chatgpt"
): Promise<void> {
  const prompt = buildPrompt(title, markdown);
  const encoded = encodeURIComponent(prompt);

  // Try Capacitor share on native (optional dependency, resolved at runtime only)
  try {
    // Use Function constructor to avoid static analysis by Rollup
    const cap = await (new Function('id', 'return import(id)'))("@capacitor/share") as {
      Share: { canShare(): Promise<{ value: boolean }>; share(o: { text: string }): Promise<void> }
    };
    const canShare = await cap.Share.canShare();
    if (canShare?.value) {
      await cap.Share.share({ text: prompt });
      return;
    }
  } catch {
    // not native or package not installed — fall through to web behavior
  }

  if (target === "chatgpt") {
    window.open(`https://chatgpt.com/?q=${encoded}`, "_blank", "noopener");
  } else {
    // Gemini doesn't support reliable URL pre-fill — copy prompt, then open
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // clipboard denied — still open Gemini
    }
    window.open("https://gemini.google.com/app", "_blank", "noopener");
  }
}
