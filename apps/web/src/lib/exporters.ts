// Page export utilities: Markdown, DOC (Word-compatible HTML), PDF (print dialog), Audio (Puter TTS).

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function safeName(title: string): string {
  return title.trim().replace(/[^\w.-]+/g, "-").slice(0, 60) || "page";
}

export function exportMarkdown(title: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown; charset=utf-8" });
  downloadBlob(blob, `${safeName(title)}.md`);
}

export function exportDoc(title: string, renderedHtml: string): void {
  const doc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin: 2cm; }
    h1,h2,h3,h4 { color: #1a1a1a; }
    pre,code { font-family: Consolas, monospace; background: #f4f4f4; padding: 2px 4px; }
    pre { padding: 8px; display: block; }
    table { border-collapse: collapse; }
    td,th { border: 1px solid #ccc; padding: 6px 10px; }
  </style>
</head>
<body>
<h1>${title}</h1>
${renderedHtml}
</body>
</html>`;
  const blob = new Blob(["﻿", doc], {
    type: "application/msword; charset=utf-8",
  });
  downloadBlob(blob, `${safeName(title)}.doc`);
}

/** Opens a new blank window containing only the page content and triggers print-to-PDF. */
export function exportPdf(title: string, renderedHtml: string): void {
  const win = window.open("", "_blank");
  if (!win) {
    // Fallback: print the whole page if popup blocked.
    const prev = document.title;
    document.title = title;
    window.print();
    document.title = prev;
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.6; margin: 2cm; color: #111; }
    h1,h2,h3,h4,h5,h6 { color: #1a1a1a; margin-top: 1.2em; }
    p { margin: 0.6em 0; }
    pre,code { font-family: Consolas, monospace; background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
    pre { padding: 10px; display: block; white-space: pre-wrap; overflow-wrap: break-word; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    td,th { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; }
    img { max-width: 100%; height: auto; }
    blockquote { border-left: 3px solid #ccc; margin: 0; padding: 0 1em; color: #555; }
    a { color: #4f46e5; }
    ul,ol { padding-left: 1.5em; }
    mark { background: #fef08a; padding: 0 2px; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
<h1>${title}</h1>
${renderedHtml}
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

export async function exportAudio(title: string, speakableText: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (window as any).puter;
  if (!p?.ai?.txt2speech) {
    alert(
      "Puter is not loaded. Please refresh the page.\n\nPuter provides free AI text-to-speech — no account needed for basic use, or sign in at puter.com for higher limits."
    );
    return;
  }
  try {
    // Sign in if not already authenticated (for higher quota)
    if (p.auth?.isSignedIn && !p.auth.isSignedIn()) {
      await p.auth.signIn();
    }
    const audio = await p.ai.txt2speech(speakableText);
    const src: string = audio?.src ?? "";
    if (!src) throw new Error("No audio returned from Puter.");
    const resp = await fetch(src);
    const blob = await resp.blob();
    downloadBlob(blob, `${safeName(title)}.mp3`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("sign") || msg.includes("auth") || msg.includes("login")) {
      alert("Please sign in to Puter first. Go to Settings → Puter and click Connect.");
    } else {
      alert(`Audio download failed: ${msg}\n\nTip: Make sure you are connected to Puter in Settings.`);
    }
  }
}
