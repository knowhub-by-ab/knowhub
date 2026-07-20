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
  font?: string;
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

// Collect all <a:t> text from an XML fragment
function extractAtText(xml: string): string {
  const texts: string[] = [];
  for (const m of xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)) {
    const t = decodeXmlEntities(m[1]).trim();
    if (t) texts.push(t);
  }
  return texts.join("").trim();
}

// Extract text grouped by paragraph (for bullets)
function extractParagraphs(bodyXml: string): string[] {
  const result: string[] = [];
  for (const paraMatch of bodyXml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)) {
    const line = extractAtText(paraMatch[1]);
    if (line) result.push(line);
  }
  return result;
}

// Matches both <p:txBody> (slide XML) and <a:txBody> (notes/other XML).
// PPTX slides use the presentation namespace (p:) for text bodies; the inner
// paragraph and run elements (<a:p>, <a:r>, <a:t>) always use the drawing namespace.
const TX_BODY_RE = /<[pa]:txBody>([\s\S]*?)<\/[pa]:txBody>/g;

function nextTxBodyEnd(xml: string, fromIdx: number): number {
  const pEnd = xml.indexOf("</p:txBody>", fromIdx);
  const aEnd = xml.indexOf("</a:txBody>", fromIdx);
  if (pEnd === -1 && aEnd === -1) return -1;
  if (pEnd === -1) return aEnd;
  if (aEnd === -1) return pEnd;
  return Math.min(pEnd, aEnd);
}

// ── Title extraction — multi-strategy ──
function extractTitleFromXml(slideXml: string, layoutXml?: string): string {
  // Strategy 1: find type="title"|"ctrTitle" ph → get its txBody text
  // Works in both slide XML (p:txBody) and layout XML (p:txBody)
  const titleRe = /\btype=["'](?:title|ctrTitle)["']/i;
  function titleFromPhSource(xml: string): string {
    const m = titleRe.exec(xml);
    if (!m) return "";
    const after = xml.slice(m.index);
    const tbEnd = nextTxBodyEnd(after, 0);
    if (tbEnd === -1) return "";
    return extractAtText(after.slice(0, tbEnd));
  }

  const fromSlide = titleFromPhSource(slideXml);
  if (fromSlide) return fromSlide;
  if (layoutXml) {
    const fromLayout = titleFromPhSource(layoutXml);
    if (fromLayout) return fromLayout;
  }

  // Strategy 2: read <p:cSld name="..."> — PowerPoint sets this to the slide title
  const nameM = slideXml.match(/<p:cSld\b[^>]*\bname=["']([^"']+)["']/i);
  if (nameM) {
    const n = decodeXmlEntities(nameM[1]).trim();
    // Skip generic names like "Slide 1", "Slide1", "slide 1" — only use if meaningful
    if (n && !/^slide\s*\d+$/i.test(n)) return n;
  }

  // Strategy 3: first non-metadata txBody text in the slide
  // Also try layout as fallback
  const skipPh = /\btype=["'](?:dt|sldNum|ftr)["']/i;
  for (const src of layoutXml ? [slideXml, layoutXml] : [slideXml]) {
    for (const txm of src.matchAll(TX_BODY_RE)) {
      const before = src.slice(Math.max(0, txm.index! - 400), txm.index!);
      if (skipPh.test(before)) continue;
      const text = extractAtText(txm[1]);
      if (text) return text;
    }
  }

  return "";
}

// ── Bullet extraction: find all txBody elements, skip title + metadata ──
function extractBulletsFromXml(slideXml: string, titleText: string): string[] {
  const bullets: string[] = [];
  const skipPh = /\btype=["'](?:dt|sldNum|ftr|title|ctrTitle)["']/i;

  // Find the title txBody range so we can skip it
  let titleTbStart = -1;
  let titleTbEnd   = -1;
  const titlePhM = /\btype=["'](?:title|ctrTitle)["']/i.exec(slideXml);
  if (titlePhM) {
    const afterPh  = slideXml.slice(titlePhM.index);
    const tbEndOff = nextTxBodyEnd(afterPh, 0);
    if (tbEndOff !== -1) {
      // Find the opening tag (either namespace)
      const pStart = afterPh.lastIndexOf("<p:txBody>", tbEndOff);
      const aStart = afterPh.lastIndexOf("<a:txBody>", tbEndOff);
      const tbStartOff = Math.max(pStart, aStart);
      if (tbStartOff !== -1) {
        titleTbStart = titlePhM.index + tbStartOff;
        titleTbEnd   = titlePhM.index + tbEndOff + "</p:txBody>".length;
      }
    }
  }

  for (const txm of slideXml.matchAll(TX_BODY_RE)) {
    const start = txm.index!;
    const end   = start + txm[0].length;
    // Skip title txBody by position
    if (titleTbStart >= 0 && start >= titleTbStart && end <= titleTbEnd + 50) continue;
    // Skip metadata placeholders — inspect 400 chars before this txBody
    const before = slideXml.slice(Math.max(0, start - 400), start);
    if (skipPh.test(before)) continue;
    const lines = extractParagraphs(txm[1]).filter(l => l && l !== titleText);
    bullets.push(...lines);
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
    // Extract majorFont (heading font) from <a:fontScheme>
    const fontM = themeXml.match(/<a:majorFont>[\s\S]{0,200}?<a:latin\b[^>]*\btypeface=["']([^"']+)["']/i);
    const font = fontM ? fontM[1] : undefined;
    return {
      bg: lt1 || "#1a1a2e",
      titleColor: dk1 || "#ffffff",
      bodyColor: dk2 || "#cccccc",
      accent: accent1 || "#6366f1",
      font,
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

  // Parse slide relationship files to find notes + layout refs
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

    // Load slide layout XML for title fallback (titles sometimes only live in layout)
    let layoutXml: string | undefined;
    const rels0 = slideRels[slideNum] ?? {};
    for (const target of Object.values(rels0)) {
      if (/slideLayout/i.test(target)) {
        // Resolve relative path: "../slideLayouts/slideLayout1.xml" → "ppt/slideLayouts/slideLayout1.xml"
        const normalised = target.replace(/^\.\.\//, "");
        const candidates = [
          "ppt/slides/" + normalised,
          "ppt/" + normalised,
          "ppt/slideLayouts/" + normalised.replace(/^slideLayouts\//i, ""),
        ];
        // Try each candidate path, then fall back to case-insensitive search
        let lfPath: string | undefined;
        for (const p of candidates) {
          if (zip.file(p)) { lfPath = p; break; }
        }
        if (!lfPath) {
          const lower = candidates.map(p => p.toLowerCase());
          lfPath = Object.keys(zip.files).find(e => lower.includes(e.toLowerCase()));
        }
        if (lfPath) {
          const lf = zip.file(lfPath);
          if (lf) { layoutXml = await lf.async("text"); break; }
        }
      }
    }

    // Extract title using positional approach (no <p:sp> block parsing)
    // For image-only slides with no text, use the presentation title + slide number.
    const isImageOnlySlide = !slideXml.includes("<a:t>") && slideXml.includes("<p:pic>");
    let titleText = extractTitleFromXml(slideXml, layoutXml)
      || (isImageOnlySlide ? `${presentationTitle} — ${i + 1}` : `Slide ${i + 1}`);
    const bullets = extractBulletsFromXml(slideXml, titleText);

    // Debug: log to console so devtools shows what was found
    if (i < 3) {
      const firstPH   = slideXml.indexOf("<p:ph");
      const firstAT   = slideXml.indexOf("<a:t>");
      const firstPTxB = slideXml.indexOf("<p:txBody>");
      const cSldName  = slideXml.match(/<p:cSld\b[^>]*\bname=["']([^"']+)["']/i)?.[1] ?? "(none)";
      console.log(`[PPTX] slide${slideNum}: title="${titleText}" bullets=${bullets.length} xmlLen=${slideXml.length} layoutLen=${layoutXml?.length ?? 0} cSldName="${cSldName}"`);
      console.log(`[PPTX] slide${slideNum} firstPH@${firstPH} firstAT@${firstAT} firstPTxBody@${firstPTxB}`);
      if (firstPH >= 0) console.log(`[PPTX] slide${slideNum} ph:`, slideXml.slice(firstPH, firstPH + 200));
      if (firstAT >= 0) console.log(`[PPTX] slide${slideNum} at:`, slideXml.slice(Math.max(0, firstAT - 80), firstAT + 80));
      if (slideXml.length < 1500) console.log(`[PPTX] slide${slideNum} FULL-SLIDE:`, slideXml);
      if (layoutXml && layoutXml.length < 3000) console.log(`[PPTX] slide${slideNum} FULL-LAYOUT:`, layoutXml);
      else if (layoutXml) {
        const layoutAT = layoutXml.indexOf("<a:t>");
        console.log(`[PPTX] slide${slideNum} layout firstAT@${layoutAT}:`, layoutAT >= 0 ? layoutXml.slice(Math.max(0, layoutAT - 80), layoutAT + 150) : "NONE");
      }
    }

    // Detect type
    const hasCtrTitle = /\btype=["']ctrTitle["']/i.test(slideXml) || (layoutXml ? /\btype=["']ctrTitle["']/i.test(layoutXml) : false);
    let type: Slide["type"] = "content";
    if (i === 0 || hasCtrTitle) type = "title";
    else if (bullets.length === 0) type = "section";

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

    // Detect image-only slides: <p:pic> with an embedded blip but no text at all.
    // These are slides where the entire content is a full-slide inserted picture
    // (e.g. screenshots). Extract the image so it renders as the slide background.
    let embeddedImage: Slide["image"] | undefined;
    const isImageOnly = !slideXml.includes("<a:t>") && slideXml.includes("<p:pic>");
    if (isImageOnly) {
      const blipM = slideXml.match(/<a:blip\b[^>]*\br:embed="([^"]+)"/);
      if (blipM) {
        const rIdPic = blipM[1];
        const picTarget = rels[rIdPic];
        if (picTarget) {
          const normalised = picTarget.replace(/^\.\.\//, "");
          const mediaCandidates = [
            "ppt/slides/" + normalised,
            "ppt/" + normalised,
          ];
          let mediaPath: string | undefined;
          for (const p of mediaCandidates) {
            if (zip.file(p)) { mediaPath = p; break; }
          }
          if (!mediaPath) {
            const lc = mediaCandidates.map(p => p.toLowerCase());
            mediaPath = Object.keys(zip.files).find(e => lc.includes(e.toLowerCase()));
          }
          if (mediaPath) {
            const mf = zip.file(mediaPath);
            if (mf) {
              const b64 = await mf.async("base64");
              const ext = mediaPath.split(".").pop()?.toLowerCase() ?? "png";
              const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
                : ext === "gif" ? "image/gif"
                : ext === "webp" ? "image/webp"
                : "image/png";
              embeddedImage = {
                source: "local",
                dataUrl: `data:${mime};base64,${b64}`,
                layout: "full-background",
                objectFit: "contain",
                altText: titleText,
              };
            }
          }
        }
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
      ...(embeddedImage ? { image: embeddedImage } : {}),
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
