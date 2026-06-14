// Renders ```mermaid code blocks inside a container into diagrams. Mermaid is
// loaded lazily (it's large) only when a page actually contains a diagram.

let initialized = false;

export async function renderMermaidIn(container: HTMLElement): Promise<void> {
  const blocks = Array.from(
    container.querySelectorAll<HTMLElement>("code.language-mermaid")
  );
  if (blocks.length === 0) return;

  const mermaid = (await import("mermaid")).default;
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "strict",
      fontFamily: "inherit",
    });
    initialized = true;
  }

  // Replace each <pre><code class="language-mermaid"> with a .mermaid div.
  const targets: HTMLElement[] = [];
  for (const code of blocks) {
    const source = code.textContent ?? "";
    const host = (code.closest("pre") as HTMLElement) ?? code;
    const div = document.createElement("div");
    div.className = "mermaid flex justify-center overflow-x-auto";
    div.textContent = source;
    host.replaceWith(div);
    targets.push(div);
  }

  try {
    await mermaid.run({ nodes: targets });
  } catch {
    // On a syntax error, mermaid leaves the source text in place — acceptable.
  }
}
