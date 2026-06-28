// Page export utilities: Markdown, DOC (Word-compatible HTML), PDF (print dialog).

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
  // Word-compatible HTML blob (.doc).
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

export function exportPdf(title: string): void {
  // Use the browser's built-in print-to-PDF capability.
  const prev = document.title;
  document.title = title;
  window.print();
  document.title = prev;
}
