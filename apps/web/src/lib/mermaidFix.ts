// Validate mermaid code blocks in generated markdown and attempt AI-based fixes.

import type { ProviderKey } from "./types";
import { chatCompletion } from "./ai";

/** Extract all mermaid blocks from markdown with their positions. */
function extractMermaidBlocks(md: string): { code: string; full: string }[] {
  const blocks: { code: string; full: string }[] = [];
  const re = /```mermaid\s*([\s\S]*?)```/gi;
  let m;
  while ((m = re.exec(md)) !== null) {
    blocks.push({ code: m[1].trim(), full: m[0] });
  }
  return blocks;
}

/** Try to parse a mermaid snippet; returns null on success, error string on failure. */
async function validateMermaid(code: string): Promise<string | null> {
  try {
    const { default: mermaid } = await import("mermaid");
    await mermaid.parse(code);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/**
 * Validate every mermaid block in `markdown`. For each invalid block, ask AI
 * to fix it (up to 2 retries). Blocks still broken after retries are stripped.
 * Returns the (possibly fixed) markdown.
 */
export async function fixMermaidBlocks(
  markdown: string,
  keys: ProviderKey[]
): Promise<string> {
  const blocks = extractMermaidBlocks(markdown);
  if (!blocks.length) return markdown;

  let result = markdown;
  for (const block of blocks) {
    let code = block.code;
    let fixed = false;

    for (let attempt = 0; attempt < 2; attempt++) {
      const err = await validateMermaid(code);
      if (!err) { fixed = true; break; }

      // Ask AI to fix it
      try {
        const { content } = await chatCompletion(
          keys,
          [
            {
              role: "user",
              content:
                `Fix this mermaid diagram so it parses correctly. ` +
                `Error: ${err}\n\n\`\`\`mermaid\n${code}\n\`\`\`\n\nReturn ONLY the corrected mermaid code (no fences, no prose).`,
            },
          ],
          "pages"
        );
        code = content.replace(/^```mermaid\s*/i, "").replace(/```\s*$/, "").trim();
      } catch {
        break;
      }
    }

    const replacement = fixed
      ? `\`\`\`mermaid\n${code}\n\`\`\``
      : ""; // strip unfixable blocks

    result = result.replace(block.full, replacement);
  }

  return result;
}
