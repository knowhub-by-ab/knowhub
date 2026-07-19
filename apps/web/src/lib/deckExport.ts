import type { PresentationDeck, SlideTheme } from "./deckStore";
import type { Flashcard } from "./types";

// ---------------------------------------------------------------------------
// All export logic for Presentations. No AI calls — pure data transformations.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Theme definitions (shared with SlidePreview.tsx)
// ---------------------------------------------------------------------------

export interface ThemeSpec {
  bg: string;
  titleColor: string;
  bodyColor: string;
  accent: string;
  font: string;
  isDark: boolean;
}

export const THEMES: Record<SlideTheme, ThemeSpec> = {
  "aurora-dark":    { bg: "#0f172a", titleColor: "#f8fafc", bodyColor: "#cbd5e1", accent: "#6366f1", font: "Inter", isDark: true },
  "corporate-blue": { bg: "#1e3a5f", titleColor: "#ffffff", bodyColor: "#bfdbfe", accent: "#3b82f6", font: "Arial", isDark: true },
  "edu-warm":       { bg: "#fef3c7", titleColor: "#78350f", bodyColor: "#451a03", accent: "#f59e0b", font: "Georgia", isDark: false },
  "minimal-white":  { bg: "#ffffff", titleColor: "#111827", bodyColor: "#374151", accent: "#6366f1", font: "Inter", isDark: false },
  "tech-green":     { bg: "#052e16", titleColor: "#dcfce7", bodyColor: "#bbf7d0", accent: "#22c55e", font: "Courier New", isDark: true },
  "sunset-orange":  { bg: "#431407", titleColor: "#fed7aa", bodyColor: "#fdba74", accent: "#f97316", font: "Inter", isDark: true },
  "ocean-teal":     { bg: "#042f2e", titleColor: "#ccfbf1", bodyColor: "#99f6e4", accent: "#14b8a6", font: "Inter", isDark: true },
  "slate-pro":      { bg: "#1e293b", titleColor: "#f1f5f9", bodyColor: "#94a3b8", accent: "#64748b", font: "Inter", isDark: true },
};

// ---------------------------------------------------------------------------
// PPTX export via PptxGenJS (lazy-loaded to keep initial bundle small)
// ---------------------------------------------------------------------------


export async function exportPptx(deck: PresentationDeck): Promise<void> {
  // Lazy-load PptxGenJS — ~600 KB, only loaded when user clicks "Download PPTX"
  const PptxGenJS = (await import("pptxgenjs")).default;
  const prs = new PptxGenJS();
  const theme = THEMES[deck.frontmatter.theme] ?? THEMES["aurora-dark"];
  const accentHex = (deck.frontmatter.accentColor ?? theme.accent).replace("#", "");
  const bgHex = theme.bg.replace("#", "");
  const titleHex = (deck.frontmatter.titleColor ?? theme.titleColor).replace("#", "");
  const bodyHex = (deck.frontmatter.bodyColor ?? theme.bodyColor).replace("#", "");
  const fontFace = deck.frontmatter.font ?? theme.font;

  prs.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"
  prs.author = "KnowHub";
  prs.title = deck.title;

  for (const slide of [...deck.slides].sort((a, b) => a.order - b.order)) {
    const pSlide = prs.addSlide();

    // Background
    pSlide.background = { color: bgHex };

    // Accent bar (left edge strip)
    pSlide.addShape(prs.ShapeType.rect, {
      x: 0, y: 0, w: 0.08, h: "100%",
      fill: { color: accentHex },
      line: { color: accentHex },
    });

    const isTitle = slide.type === "title";
    const isSection = slide.type === "section";

    if (isTitle || isSection) {
      // Centred title layout
      pSlide.addText(slide.title, {
        x: 0.3, y: isTitle ? 2.5 : 2.8,
        w: "90%", h: 1.2,
        fontSize: isTitle ? 36 : 28,
        bold: true,
        color: titleHex,
        fontFace,
        align: "center",
      });
      if (slide.bullets.length > 0 && isTitle) {
        pSlide.addText(slide.bullets.join(" · "), {
          x: 0.3, y: 3.9, w: "90%", h: 0.6,
          fontSize: 16,
          color: bodyHex,
          fontFace,
          align: "center",
        });
      }
    } else {
      // Standard content layout
      const hasImage = !!slide.image?.url || !!slide.image?.dataUrl;
      const layout = slide.image?.layout ?? "none";
      const contentW = hasImage && layout === "right-half" ? "55%" : "90%";

      // Title
      pSlide.addText(slide.title, {
        x: 0.3, y: 0.2, w: contentW, h: 0.7,
        fontSize: 22,
        bold: true,
        color: titleHex,
        fontFace,
      });

      // Accent underline under title
      pSlide.addShape(prs.ShapeType.rect, {
        x: 0.3, y: 0.95, w: 1.5, h: 0.04,
        fill: { color: accentHex },
        line: { color: accentHex },
      });

      // Bullet text
      if (slide.bullets.length > 0) {
        const bulletObjs = slide.bullets.map((b) => ({
          text: b,
          options: { bullet: { indent: 15 }, fontSize: 16, color: bodyHex, fontFace, breakLine: true },
        }));
        const textY = layout === "top-banner" && hasImage ? 1.8 : 1.1;
        const textH = layout === "bottom-strip" && hasImage ? 3.5 : 5.0;
        pSlide.addText(bulletObjs, {
          x: 0.3, y: textY, w: contentW, h: textH,
          valign: "top",
        });
      }

      // Image
      if (hasImage) {
        const imgSrc = slide.image!.dataUrl ?? slide.image!.url!;
        const isDataUrl = imgSrc.startsWith("data:");
        try {
          switch (layout) {
            case "right-half":
              pSlide.addImage({ data: isDataUrl ? imgSrc : undefined, path: isDataUrl ? undefined : imgSrc, x: "58%", y: 0.8, w: "40%", h: 5.5 });
              break;
            case "top-banner":
              pSlide.addImage({ data: isDataUrl ? imgSrc : undefined, path: isDataUrl ? undefined : imgSrc, x: 0.3, y: 0.95, w: "90%", h: 1.5 });
              break;
            case "inline-below-title":
              pSlide.addImage({ data: isDataUrl ? imgSrc : undefined, path: isDataUrl ? undefined : imgSrc, x: 0.3, y: 1.0, w: "90%", h: 2.5 });
              break;
            case "bottom-strip":
              pSlide.addImage({ data: isDataUrl ? imgSrc : undefined, path: isDataUrl ? undefined : imgSrc, x: 0.3, y: 5.5, w: "90%", h: 1.5 });
              break;
            case "full-background":
              pSlide.addImage({ data: isDataUrl ? imgSrc : undefined, path: isDataUrl ? undefined : imgSrc, x: 0, y: 0, w: "100%", h: "100%", sizing: { type: "cover", h: 7.5, w: 13.33 } });
              break;
          }
        } catch {
          // Image failed to load (cross-origin in headless context) — skip gracefully
        }
      }
    }

    // Speaker notes
    if (slide.speakerNotes) {
      pSlide.addNotes(slide.speakerNotes);
    }
  }

  await prs.writeFile({ fileName: `${sanitizeFilename(deck.title)}.pptx` });
}

// ---------------------------------------------------------------------------
// Handout PDF export (browser Print API with smart page breaks)
// ---------------------------------------------------------------------------

export function exportHandoutPdf(deck: PresentationDeck): void {
  const theme = THEMES[deck.frontmatter.theme] ?? THEMES["minimal-white"];
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const slides = [...deck.slides].sort((a, b) => a.order - b.order);
  const slideHtml = slides
    .map((slide) => {
      const notesLen = (slide.speakerNotes ?? "").length;
      // Smart page break: if notes are long, give this slide its own page
      const pageBreak = notesLen > 300 ? "page-break-after: always;" : "";
      return `
        <div class="slide-block" style="${pageBreak}">
          <div class="slide-frame" style="background:${theme.bg};color:${theme.titleColor}">
            <div class="slide-title">${escHtml(slide.title)}</div>
            <ul class="slide-bullets">
              ${slide.bullets.map((b) => `<li>${escHtml(b)}</li>`).join("")}
            </ul>
          </div>
          ${slide.speakerNotes ? `<div class="notes"><strong>Notes:</strong> ${escHtml(slide.speakerNotes)}</div>` : ""}
        </div>`;
    })
    .join("");

  printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escHtml(deck.title)} — Handout</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: ${theme.font}, Arial, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 16pt; text-align: center; margin-bottom: 20px; }
  .slide-block { page-break-inside: avoid; margin-bottom: 24px; }
  .slide-frame { padding: 14px 18px; border-radius: 6px; min-height: 80px; }
  .slide-title { font-size: 14pt; font-weight: bold; margin-bottom: 8px; }
  .slide-bullets { margin: 0; padding-left: 20px; font-size: 10pt; }
  .slide-bullets li { margin-bottom: 4px; }
  .notes { font-size: 9pt; color: #444; margin-top: 6px; padding: 6px 10px; border-left: 3px solid #ccc; }
</style></head>
<body>
  <h1>${escHtml(deck.title)}</h1>
  ${slideHtml}
</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
}

// ---------------------------------------------------------------------------
// SRT / VTT subtitle export
// ---------------------------------------------------------------------------

export function exportSrt(deck: PresentationDeck, _secondsPerSlide = 15): string {
  const slides = [...deck.slides].sort((a, b) => a.order - b.order);
  let t = 0;
  return slides
    .filter((s) => s.narrationScript?.trim())
    .map((s, i) => {
      const dur = Math.max(3, Math.round(s.narrationScript.length / 15));
      const start = formatSrtTime(t);
      t += dur;
      const end = formatSrtTime(t);
      return `${i + 1}\n${start} --> ${end}\n${s.narrationScript.trim()}\n`;
    })
    .join("\n");
}

export function exportVtt(deck: PresentationDeck): string {
  return "WEBVTT\n\n" + exportSrt(deck).replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, "$1.$2");
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)},000`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ---------------------------------------------------------------------------
// Flashcard export — each slide → one flashcard
// ---------------------------------------------------------------------------

export function slidesToFlashcards(deck: PresentationDeck): Omit<Flashcard, "id" | "createdAt">[] {
  return deck.slides
    .filter((s) => s.type !== "title" && s.type !== "closing" && s.bullets.length > 0)
    .map((s) => ({
      front: s.title,
      back: s.bullets.join("\n"),
      pageId: deck.sourceNodeId,
    }));
}

// ---------------------------------------------------------------------------
// Narration transcript export
// ---------------------------------------------------------------------------

export function exportNarrationTxt(deck: PresentationDeck): string {
  const slides = [...deck.slides].sort((a, b) => a.order - b.order);
  return slides
    .filter((s) => s.narrationScript?.trim())
    .map((s, i) => `[Slide ${i + 1}: ${s.title}]\n${s.narrationScript.trim()}`)
    .join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadText(text: string, filename: string, mimeType = "text/plain"): void {
  downloadBlob(new Blob([text], { type: mimeType }), filename);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFilename(s: string): string {
  return s.replace(/[^\w\s.-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "presentation";
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
