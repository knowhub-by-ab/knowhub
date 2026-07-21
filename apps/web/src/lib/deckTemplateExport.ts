// src/lib/deckTemplateExport.ts — Template-based PPTX export (Marp-style)
//
// Approach:
//  1. Enumerate ALL slideLayout XMLs from the template zip directly (no rels parsing).
//  2. Detect placeholder types (ctrTitle, title, body, pic, subTitle) + idx values.
//  3. For each deck slide, pick the best matching layout.
//  4. Build a MINIMAL slide XML with only content; PowerPoint inherits ALL visual
//     design (background, colours, decorative shapes) from the layout + master chain.
//  5. Wire each slide's .rels to reference the CORRECT layout path.
//  6. Keep every non-slide file from the template intact (theme, slideMaster,
//     slideLayouts, media, fonts, [Content_Types].xml, _rels, etc.).

import type { PresentationDeck, Slide } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert base64 string to Uint8Array. */
function b64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** XML-escape a string for safe embedding in XML attribute/text content. */
function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Load an image URL via <img> + <canvas> as a dataUrl fallback.
 * Useful when fetch() is blocked by CORS but the server allows cross-origin
 * img loads (Pollinations AI sets CORS headers on img loads).
 */
function urlToDataUrlViaCanvas(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth  || img.width  || 800;
        canvas.height = img.naturalHeight || img.height || 450;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    // Append cache-buster so the browser requests fresh with crossOrigin header
    img.src = url.includes("?") ? `${url}&_cb=${Date.now()}` : `${url}?_cb=${Date.now()}`;
    setTimeout(() => resolve(null), 20_000);
  });
}

// ── Layout catalogue ──────────────────────────────────────────────────────────

interface LayoutPlaceholder {
  type: string;   // "title" | "ctrTitle" | "body" | "pic" | "subTitle"
  idx:  number;   // 0 when no idx attribute is present
}

interface LayoutInfo {
  /** Path relative to ppt/, e.g. "slideLayouts/slideLayout2.xml" */
  path: string;
  placeholders: LayoutPlaceholder[];
  hasCtrTitle: boolean;
  hasTitle:    boolean;
  hasBody:     boolean;
  hasPic:      boolean;
  hasSubTitle: boolean;
}

function parseLayoutXml(xml: string, path: string): LayoutInfo {
  const placeholders: LayoutPlaceholder[] = [];
  const phRe = /<p:ph\b([^>]*?)(?:\/>|>)/g;
  let m: RegExpExecArray | null;
  while ((m = phRe.exec(xml)) !== null) {
    const attrs = m[1];
    const typeM = attrs.match(/\btype=["']([^"']+)["']/);
    const idxM  = attrs.match(/\bidx=["'](\d+)["']/);
    if (typeM) {
      placeholders.push({ type: typeM[1], idx: idxM ? parseInt(idxM[1]) : 0 });
    }
  }
  return {
    path,
    placeholders,
    hasCtrTitle: placeholders.some(p => p.type === "ctrTitle"),
    hasTitle:    placeholders.some(p => p.type === "title"),
    hasBody:     placeholders.some(p => p.type === "body"),
    hasPic:      placeholders.some(p => p.type === "pic"),
    hasSubTitle: placeholders.some(p => p.type === "subTitle"),
  };
}

/** Enumerate ALL slideLayout XMLs directly from the template zip. */
async function buildLayoutCatalogue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateZip: any
): Promise<LayoutInfo[]> {
  const files = templateZip.files as Record<string, { dir: boolean; async(type: "text"): Promise<string>; async(type: "uint8array"): Promise<Uint8Array> }>;
  const layoutNames = Object.keys(files)
    .filter(n => /^ppt[/\\]slideLayouts[/\\]slideLayout\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0");
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0");
      return na - nb;
    });

  const catalogue: LayoutInfo[] = [];
  for (const zipPath of layoutNames) {
    const file = files[zipPath];
    if (!file || file.dir) continue;
    const xml = await file.async("text");
    // Normalize separator and strip the "ppt/" prefix to get a ppt/-relative path
    const relPath = zipPath.replace(/\\/g, "/").replace(/^ppt\//, "");
    catalogue.push(parseLayoutXml(xml, relPath));
  }

  // Fallback: if zip has no slideLayouts (shouldn't happen), add a minimal entry
  if (catalogue.length === 0) {
    catalogue.push({
      path: "slideLayouts/slideLayout1.xml",
      placeholders: [
        { type: "ctrTitle", idx: 0 }, { type: "body", idx: 1 }, { type: "subTitle", idx: 3 },
      ],
      hasCtrTitle: true, hasTitle: true, hasBody: true, hasPic: false, hasSubTitle: true,
    });
  }
  return catalogue;
}

/** Return the idx string attribute for a placeholder type in a layout (e.g. ' idx="2"'). */
function phIdx(layout: LayoutInfo, type: string): string {
  const ph = layout.placeholders.find(p => p.type === type);
  return ph?.idx ? ` idx="${ph.idx}"` : "";
}

// ── Layout selection ──────────────────────────────────────────────────────────

function pickLayout(slide: Slide, slideIdx: number, catalogue: LayoutInfo[]): LayoutInfo {
  const wantsImage = !!(slide.image?.url || slide.image?.dataUrl || slide.imagePrompt);

  if (slide.type === "title" || slideIdx === 0) {
    // Cover / title slide: prefer layout with ctrTitle
    return catalogue.find(l => l.hasCtrTitle)
      ?? catalogue.find(l => l.hasTitle)
      ?? catalogue[0];
  }

  if (slide.type === "section" || slide.type === "closing") {
    // Section divider: prefer title-only (no body, no pic)
    return catalogue.find(l => l.hasTitle && !l.hasBody && !l.hasPic)
      ?? catalogue.find(l => l.hasTitle && !l.hasCtrTitle)
      ?? catalogue[0];
  }

  if (wantsImage) {
    // Content with image: prefer a layout that has pic + title + body
    return catalogue.find(l => l.hasPic && l.hasTitle && l.hasBody)
      ?? catalogue.find(l => l.hasTitle && l.hasBody)
      ?? catalogue[0];
  }

  // Content without image: prefer title + body without a pic placeholder
  return catalogue.find(l => l.hasTitle && l.hasBody && !l.hasPic)
    ?? catalogue.find(l => l.hasTitle && l.hasBody)
    ?? catalogue[0];
}

// ── Minimal slide XML builder ─────────────────────────────────────────────────

function buildMinimalSlideXml(
  slide: Slide,
  layout: LayoutInfo,
  imageRId: string | null
): string {
  const shapes: string[] = [];
  let id = 2;

  // Title / ctrTitle — use the exact type from the layout
  if (layout.hasCtrTitle || layout.hasTitle) {
    const phType = layout.hasCtrTitle ? "ctrTitle" : "title";
    shapes.push(`<p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${id++}" name="Title"/>
        <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
        <p:nvPr><p:ph type="${phType}"${phIdx(layout, phType)}/></p:nvPr>
      </p:nvSpPr>
      <p:spPr/>
      <p:txBody>
        <a:bodyPr/><a:lstStyle/>
        <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escXml(slide.title)}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>`);
  }

  // Body (bullets) — use the EXACT idx from the layout (critical: layout1 uses idx=2, layout2 idx=1, etc.)
  if (layout.hasBody) {
    const bulletContent = slide.bullets.length > 0
      ? slide.bullets.map(b =>
          `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escXml(b)}</a:t></a:r></a:p>`
        ).join("")
      : `<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>`;
    shapes.push(`<p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${id++}" name="Body"/>
        <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
        <p:nvPr><p:ph type="body"${phIdx(layout, "body")}/></p:nvPr>
      </p:nvSpPr>
      <p:spPr/>
      <p:txBody>
        <a:bodyPr/><a:lstStyle/>
        ${bulletContent}
      </p:txBody>
    </p:sp>`);
  }

  // Subtitle (cover / section slides only)
  if (layout.hasSubTitle && (slide.type === "title" || slide.type === "section") && slide.bullets.length > 0) {
    shapes.push(`<p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${id++}" name="Subtitle"/>
        <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
        <p:nvPr><p:ph type="subTitle"${phIdx(layout, "subTitle")}/></p:nvPr>
      </p:nvSpPr>
      <p:spPr/>
      <p:txBody>
        <a:bodyPr/><a:lstStyle/>
        <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escXml(slide.bullets[0])}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>`);
  }

  // Image — fill a pic placeholder (inherits shape/position from layout) or freeform
  if (imageRId) {
    if (layout.hasPic) {
      shapes.push(`<p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${id++}" name="AI Picture"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr><p:ph type="pic"${phIdx(layout, "pic")}/></p:nvPr>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="${imageRId}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr/>
      </p:pic>`);
    } else {
      // No pic placeholder in this layout — place image on the right half
      shapes.push(`<p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${id++}" name="AI Picture"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="${imageRId}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="5029200" y="457200"/><a:ext cx="3886200" cy="4114800"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      ${shapes.join("\n      ")}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface TemplateExportOptions {
  onProgress?: (pct: number, msg: string) => void;
}

export async function exportPptxFromTemplate(
  deck: PresentationDeck,
  templateB64: string,
  options: TemplateExportOptions = {}
): Promise<Blob> {
  const { onProgress } = options;
  const JSZip = (await import("jszip")).default;

  onProgress?.(5, "Opening template…");
  const templateZip = await JSZip.loadAsync(b64ToUint8Array(templateB64));

  onProgress?.(10, "Cataloguing layouts…");
  const catalogue = await buildLayoutCatalogue(templateZip);

  // Clone the entire template into the output zip, dropping only the individual
  // slide XMLs and their rels files (we will re-create them below).
  onProgress?.(18, "Cloning template structure…");
  const outZip = new JSZip();
  for (const [name, file] of Object.entries(templateZip.files) as [string, { dir: boolean; async(t: "uint8array"): Promise<Uint8Array> }][]) {
    if (file.dir) continue;
    const isSlideXml  = /^ppt[/\\]slides[/\\]slide\d+\.xml$/i.test(name);
    const isSlideRels = /^ppt[/\\]slides[/\\]_rels[/\\]slide\d+\.xml\.rels$/i.test(name);
    if (!isSlideXml && !isSlideRels) {
      outZip.file(name.replace(/\\/g, "/"), await file.async("uint8array"));
    }
  }

  // Generate one slide per deck slide
  const deckSlides = [...deck.slides].sort((a, b) => a.order - b.order);
  let mediaCounter = 100;

  for (let i = 0; i < deckSlides.length; i++) {
    const slide = deckSlides[i];
    onProgress?.(20 + (i / deckSlides.length) * 62, `Slide ${i + 1}/${deckSlides.length}: ${slide.title.slice(0, 30)}`);

    const layout = pickLayout(slide, i, catalogue);

    // ── Embed image ───────────────────────────────────────────────────────────
    let imageRId: string | null = null;
    let imageExt = "jpg";
    let imageUrl = slide.image?.dataUrl ?? slide.image?.url ?? null;

    // Auto-fetch from Pollinations if the slide has a prompt but no image yet
    if (!imageUrl && slide.imagePrompt) {
      try {
        const { fetchPollinationsImage } = await import("./deckImages");
        const r = await fetchPollinationsImage(slide.imagePrompt, 1280, 720, deck.frontmatter.imageStyle ?? "illustration");
        imageUrl = r.url;
      } catch { /* skip */ }
    }

    if (imageUrl) {
      mediaCounter++;
      imageExt = imageUrl.startsWith("data:image/png")  ? "png"
               : imageUrl.startsWith("data:image/webp") ? "webp"
               : "jpg";

      let imageBytes: Uint8Array | null = null;

      if (imageUrl.startsWith("data:")) {
        // Already a dataUrl — decode directly
        const b64part = imageUrl.split(",")[1];
        if (b64part) {
          const bin = atob(b64part);
          imageBytes = new Uint8Array(bin.length);
          for (let j = 0; j < bin.length; j++) imageBytes[j] = bin.charCodeAt(j);
        }
      } else {
        // Remote URL: try direct fetch first, then canvas fallback
        try {
          const resp = await fetch(imageUrl);
          if (resp.ok) imageBytes = new Uint8Array(await resp.arrayBuffer());
        } catch { /* try canvas */ }

        if (!imageBytes) {
          const dataUrl = await urlToDataUrlViaCanvas(imageUrl);
          if (dataUrl) {
            imageExt = "jpg";
            const b64part = dataUrl.split(",")[1];
            const bin = atob(b64part);
            imageBytes = new Uint8Array(bin.length);
            for (let j = 0; j < bin.length; j++) imageBytes[j] = bin.charCodeAt(j);
          }
        }
      }

      if (imageBytes) {
        outZip.file(`ppt/media/aiimg${mediaCounter}.${imageExt}`, imageBytes);
        imageRId = `rId${mediaCounter}`;
      }
    }

    // ── Slide XML ─────────────────────────────────────────────────────────────
    outZip.file(`ppt/slides/slide${i + 1}.xml`, buildMinimalSlideXml(slide, layout, imageRId));

    // ── Slide rels ────────────────────────────────────────────────────────────
    // layout.path is relative to ppt/, e.g. "slideLayouts/slideLayout17.xml"
    // Target in rels is relative to the slide file (ppt/slides/) so go up one level
    const layoutRelTarget = `../${layout.path}`;
    const relsEntries: string[] = [
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${layoutRelTarget}"/>`,
    ];
    if (imageRId) {
      relsEntries.push(
        `<Relationship Id="${imageRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/aiimg${mediaCounter}.${imageExt}"/>`
      );
    }
    outZip.file(
      `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n` +
      relsEntries.join("\n") + `\n</Relationships>`
    );
  }

  // ── Update presentation.xml (slide id list) ───────────────────────────────
  onProgress?.(84, "Updating presentation index…");
  const presFile = outZip.file("ppt/presentation.xml");
  if (presFile) {
    let presXml = await presFile.async("text");
    const sldIdLst = deckSlides.map((_, i) =>
      `<p:sldId id="${256 + i}" r:id="rId${200 + i}"/>`
    ).join("");
    presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIdLst}</p:sldIdLst>`);
    outZip.file("ppt/presentation.xml", presXml);
  }

  // ── Update ppt/_rels/presentation.xml.rels ────────────────────────────────
  const presRelsFile = outZip.file("ppt/_rels/presentation.xml.rels");
  if (presRelsFile) {
    let presRels = await presRelsFile.async("text");
    presRels = presRels.replace(/<Relationship[^>]+Type="[^"]*\/slide"[^>]*\/>/g, "");
    const newSlideRels = deckSlides.map((_, i) =>
      `<Relationship Id="rId${200 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
    ).join("\n");
    presRels = presRels.replace("</Relationships>", `${newSlideRels}\n</Relationships>`);
    outZip.file("ppt/_rels/presentation.xml.rels", presRels);
  }

  // ── Update [Content_Types].xml ────────────────────────────────────────────
  const ctFile = outZip.file("[Content_Types].xml");
  if (ctFile) {
    let ctXml = await ctFile.async("text");

    // Fix: POTX templates have "template.main+xml" — exported .pptx must use "presentation.main+xml"
    ctXml = ctXml.replace(
      /presentationml\.template\.main\+xml/g,
      "presentationml.presentation.main+xml"
    );

    // Ensure image file extensions have registered Default content types
    // (templates often lack these, causing PowerPoint to reject embedded images)
    const imageDefaults: Array<[string, string]> = [
      ["jpeg", "image/jpeg"],
      ["jpg",  "image/jpeg"],
      ["png",  "image/png"],
      ["gif",  "image/gif"],
      ["webp", "image/webp"],
      ["svg",  "image/svg+xml"],
    ];
    for (const [ext, mime] of imageDefaults) {
      if (!ctXml.includes(`Extension="${ext}"`)) {
        ctXml = ctXml.replace(
          "</Types>",
          `<Default Extension="${ext}" ContentType="${mime}"/></Types>`
        );
      }
    }

    // Remove old slide overrides (template slides we dropped), then add ours
    ctXml = ctXml.replace(/<Override[^>]*\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, "");
    const slideOverrides = deckSlides.map((_, i) =>
      `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    ).join("\n");
    ctXml = ctXml.replace("</Types>", `${slideOverrides}\n</Types>`);
    outZip.file("[Content_Types].xml", ctXml);
  }

  onProgress?.(95, "Packaging…");
  const blob = await outZip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  onProgress?.(100, "Done");
  return blob;
}
