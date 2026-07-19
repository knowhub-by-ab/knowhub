// src/lib/deckImport.ts
import type { Slide, DeckFrontmatter } from "./types";

export interface ImportedDeck {
  title: string;
  slides: Slide[];
  frontmatter: Partial<DeckFrontmatter>;
}

export interface ExtractedTheme {
  bg: string;
  titleColor: string;
  bodyColor: string;
  accent: string;
}

function uid(): string {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toLowerCase();
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Extract all text from a <p:sp> XML block, grouped by paragraph
function extractParagraphs(spXml: string): string[] {
  const result: string[] = [];
  for (const paraMatch of spXml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)) {
    const texts: string[] = [];
    for (const tMatch of paraMatch[1].matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)) {
      const t = decodeXmlEntities(tMatch[1]).trim();
      if (t) texts.push(t);
    }
    const line = texts.join("").trim();
    if (line) result.push(line);
  }
  return result;
}

// Find a <p:sp> that has a placeholder of the given type/idx
function findPlaceholder(slideXml: string, ...types: string[]): string | null {
  // Match each <p:sp>...</p:sp> block
  for (const spMatch of slideXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
    const spXml = spMatch[0];
    const phMatch = spXml.match(/<p:ph([^/]*?)\/?>/);
    if (!phMatch) continue;
    const phAttr = phMatch[1];
    for (const type of types) {
      if (type.startsWith("idx:")) {
        if (phAttr.includes(`idx="${type.slice(4)}"`)) return spXml;
      } else {
        if (phAttr.includes(`type="${type}"`)) return spXml;
      }
    }
  }
  return null;
}

// Extract all body/content placeholder text (non-title placeholders)
function extractBodyBullets(slideXml: string, titleText: string): string[] {
  const bullets: string[] = [];
  for (const spMatch of slideXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
    const spXml = spMatch[0];
    const phMatch = spXml.match(/<p:ph([^/]*?)\/?>/);
    if (!phMatch) continue;
    const phAttr = phMatch[1];
    // Skip title/ctrTitle placeholders
    if (phAttr.includes('type="title"') || phAttr.includes('type="ctrTitle"')) continue;
    // Include body, idx=1, idx=2, dt, ftr — everything with text
    const paras = extractParagraphs(spXml).filter(p => p !== titleText);
    bullets.push(...paras);
  }
  return bullets;
}

// Parse theme XML to extract colors
export function extractThemeColors(themeXml: string): ExtractedTheme | null {
  try {
    const getColor = (tag: string): string => {
      // Match <a:TAG><a:srgbClr val="RRGGBB"/></a:TAG>
      const re = new RegExp(`<a:${tag}>[\\s\\S]{0,100}?<a:srgbClr val="([0-9A-Fa-f]{6})"`, "i");
      const m = themeXml.match(re);
      return m ? `#${m[1].toUpperCase()}` : "";
    };
    // lt1 = light background, dk1 = dark text, dk2 = secondary text, accent1 = primary accent
    const lt1 = getColor("lt1");
    const dk1 = getColor("dk1");
    const dk2 = getColor("dk2");
    const accent1 = getColor("accent1");
    if (!lt1 && !dk1) return null;
    return {
      bg: lt1 || "#1a1a2e",
      titleColor: dk1 || "#ffffff",
      bodyColor: dk2 || "#cccccc",
      accent: accent1 || "#6366f1",
    };
  } catch {
    return null;
  }
}

// Map extracted theme colors to the closest built-in SlideTheme
function pickClosestTheme(theme: ExtractedTheme): DeckFrontmatter["theme"] {
  const bgHex = theme.bg.replace("#", "");
  const r = parseInt(bgHex.slice(0, 2) || "0", 16);
  const g = parseInt(bgHex.slice(2, 4) || "0", 16);
  const b = parseInt(bgHex.slice(4, 6) || "0", 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  // Dark background
  if (luminance < 100) {
    const acc = theme.accent.toLowerCase();
    if (acc.includes("6") || acc.includes("4") || acc.includes("5")) return "aurora-dark";
    if (acc.includes("0") || acc.includes("1") || acc.includes("2")) return "corporate-blue";
    return "slate-pro";
  }
  // Light background
  if (luminance > 200) {
    if (theme.accent.toLowerCase().startsWith("#4")) return "corporate-blue";
    return "minimal-white";
  }
  // Mid-tone
  return "edu-warm";
}

// Extract speaker notes from notes XML
function extractNotes(_slideXml: string, notesXml: string | null): string {
  if (!notesXml) return "";
  const paragraphs: string[] = [];
  for (const paraMatch of notesXml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)) {
    const texts: string[] = [];
    for (const tMatch of paraMatch[1].matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)) {
      const t = decodeXmlEntities(tMatch[1]).trim();
      if (t) texts.push(t);
    }
    const line = texts.join("").trim();
    if (line) paragraphs.push(line);
  }
  return paragraphs.join(" ").trim();
}

// Main import function
export async function importPptxFile(file: File): Promise<ImportedDeck> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  // Get sorted list of slide files
  const slideFileNames = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/i)?.[1] ?? "0");
      const nb = parseInt(b.match(/slide(\d+)/i)?.[1] ?? "0");
      return na - nb;
    });

  // Parse theme
  let themeColors: ExtractedTheme | null = null;
  for (const themePath of ["ppt/theme/theme1.xml", "ppt/theme/theme2.xml"]) {
    const themeFile = zip.file(themePath);
    if (themeFile) {
      const themeXml = await themeFile.async("text");
      themeColors = extractThemeColors(themeXml);
      if (themeColors) break;
    }
  }

  // Presentation title from core.xml or app.xml
  let presentationTitle = file.name.replace(/\.(pptx?|potx?|ppsx?)$/i, "").replace(/[-_]/g, " ");
  const coreFile = zip.file("docProps/core.xml");
  if (coreFile) {
    const coreXml = await coreFile.async("text");
    const m = coreXml.match(/<dc:title>([\s\S]*?)<\/dc:title>/);
    if (m && m[1].trim()) presentationTitle = decodeXmlEntities(m[1].trim());
  }

  // Parse slide relationship files to find notes
  const slideRels: Record<string, Record<string, string>> = {};
  for (const name of Object.keys(zip.files)) {
    const m = name.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/i);
    if (!m) continue;
    const relXml = await zip.file(name)!.async("text");
    const rels: Record<string, string> = {};
    for (const relMatch of relXml.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)) {
      rels[relMatch[1]] = relMatch[2];
    }
    slideRels[m[1]] = rels;
  }

  // Parse slides
  const slides: Slide[] = [];
  for (let i = 0; i < slideFileNames.length; i++) {
    const slideFile = zip.file(slideFileNames[i]);
    if (!slideFile) continue;
    const slideXml = await slideFile.async("text");
    const slideNum = slideFileNames[i].match(/slide(\d+)/i)?.[1] ?? String(i + 1);

    // Extract title
    let titleText = `Slide ${i + 1}`;
    const titleSp = findPlaceholder(slideXml, "title", "ctrTitle");
    if (titleSp) {
      const paras = extractParagraphs(titleSp);
      if (paras.length > 0) titleText = paras[0];
    }

    // Extract bullets/body
    const bullets = extractBodyBullets(slideXml, titleText);

    // Detect type
    let type: Slide["type"] = "content";
    if (i === 0 || slideXml.includes('type="ctrTitle"')) type = "title";
    else if (bullets.length === 0 && slideXml.includes('type="title"')) type = "section";

    // Try to load speaker notes
    let speakerNotes = "";
    const rels = slideRels[slideNum] ?? {};
    for (const [, target] of Object.entries(rels)) {
      if (target.includes("notesSlide")) {
        const notesPath = `ppt/slides/${target.replace("../", "")}`;
        const notesFile = zip.file(notesPath) ?? zip.file(`ppt/notesSlides/${target.replace("../notesSlides/", "")}`);
        if (notesFile) {
          const notesXml = await notesFile.async("text");
          speakerNotes = extractNotes(slideXml, notesXml);
        }
        break;
      }
    }

    slides.push({
      id: uid(),
      type,
      title: titleText,
      bullets: bullets.slice(0, 10),
      speakerNotes,
      narrationScript: "",
      imagePrompt: `${titleText}${bullets[0] ? ": " + bullets[0] : ""}`,
      order: i,
    });
  }

  // Build frontmatter from extracted theme
  const frontmatter: Partial<DeckFrontmatter> = {};
  if (themeColors) {
    frontmatter.theme = pickClosestTheme(themeColors);
    frontmatter.accentColor = themeColors.accent;
  }

  return { title: presentationTitle, slides, frontmatter };
}

// For template-only extraction (no slide content needed)
export async function extractTemplateTheme(file: File): Promise<ExtractedTheme | null> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  for (const themePath of ["ppt/theme/theme1.xml", "ppt/theme/theme2.xml"]) {
    const themeFile = zip.file(themePath);
    if (themeFile) {
      const themeXml = await themeFile.async("text");
      const colors = extractThemeColors(themeXml);
      if (colors) return colors;
    }
  }
  return null;
}
