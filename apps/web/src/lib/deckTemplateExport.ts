// src/lib/deckTemplateExport.ts
//
// Template-based PPTX export (Marp-style):
//   1. Parse slideLayout XMLs (NOT slide XMLs) to discover placeholder types
//   2. Build a layout catalogue: path → {hasCtrTitle, hasTitle, hasBody, hasPic, …}
//   3. For each deck slide, pick the best layout
//   4. Create a *minimal* slide XML with just content; PowerPoint inherits ALL
//      visual design (background, colours, shapes) from the layout + master
//   5. Wire the .rels to the CORRECT layout path (the previous version always
//      hardcoded slideLayout1.xml – the cover – for every slide)
//   6. Replace only the slide files in the output zip; keep every other template
//      structural file (theme, slideMaster, slideLayouts, media, fonts, etc.)

import type { PresentationDeck, Slide } from "./types";

function b64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Layout catalogue ────────────────────────────────────────────────────────

interface LayoutInfo {
  /** Relative path from ppt/ root, e.g. "slideLayouts/slideLayout2.xml" */
  path: string;
  hasCtrTitle: boolean;
  hasTitle: boolean;
  hasBody: boolean;
  hasPic: boolean;
  hasSubTitle: boolean;
}

function parseLayoutXml(xml: string, path: string): LayoutInfo {
  return {
    path,
    hasCtrTitle: /type=["']ctrTitle["']/.test(xml),
    hasTitle:    /type=["']title["']/.test(xml),
    hasBody:     /type=["']body["']/.test(xml),
    hasPic:      /type=["']pic["']/.test(xml),
    hasSubTitle: /type=["']subTitle["']/.test(xml),
  };
}

// Build the layout catalogue by:
//  a) reading each template slide's .rels to find its layoutPath
//  b) reading that layoutPath to detect placeholder types
async function buildLayoutCatalogue(
  zip: import("jszip"),
  slideNames: string[]
): Promise<LayoutInfo[]> {
  const seen = new Map<string, LayoutInfo>(); // path → info

  for (const slideName of slideNames) {
    // e.g. "ppt/slides/slide1.xml" → "ppt/slides/_rels/slide1.xml.rels"
    const relsName = slideName.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relsFile = zip.file(relsName);
    if (!relsFile) continue;

    const relsXml = await relsFile.async("text");
    // Target is relative to the slide file location, e.g. "../slideLayouts/slideLayout1.xml"
    const layoutMatch = relsXml.match(/Type="[^"]*\/slideLayout"[^>]*Target="([^"]+)"/);
    if (!layoutMatch) continue;

    // Resolve to zip path: slide is in ppt/slides/, so "../slideLayouts/…" → ppt/slideLayouts/…
    const target = layoutMatch[1]; // e.g. "../slideLayouts/slideLayout1.xml"
    const relPath = target.replace(/^\.\.\//, ""); // "slideLayouts/slideLayout1.xml"
    const zipPath = "ppt/" + relPath;              // "ppt/slideLayouts/slideLayout1.xml"

    if (seen.has(relPath)) continue;

    const layoutFile = zip.file(zipPath);
    if (!layoutFile) continue;

    const layoutXml = await layoutFile.async("text");
    seen.set(relPath, parseLayoutXml(layoutXml, relPath));
  }

  // Fallback: if nothing found, add a minimal content layout
  if (seen.size === 0) {
    seen.set("slideLayouts/slideLayout1.xml", {
      path: "slideLayouts/slideLayout1.xml",
      hasCtrTitle: true, hasTitle: true, hasBody: true, hasPic: false, hasSubTitle: true,
    });
  }

  return [...seen.values()];
}

// ── Layout selection ─────────────────────────────────────────────────────────

function pickLayout(slide: Slide, slideIdx: number, catalogue: LayoutInfo[]): LayoutInfo {
  const wantsImage = !!(slide.image?.url || slide.image?.dataUrl || slide.imagePrompt);

  // Cover / title slide
  if (slide.type === "title" || slideIdx === 0) {
    return (
      catalogue.find(l => l.hasCtrTitle) ??
      catalogue.find(l => l.hasTitle) ??
      catalogue[0]
    );
  }

  // Section divider
  if (slide.type === "section") {
    return (
      catalogue.find(l => l.hasTitle && !l.hasBody && !l.hasPic) ??
      catalogue.find(l => l.hasTitle && !l.hasPic) ??
      catalogue.find(l => l.hasTitle) ??
      catalogue[0]
    );
  }

  // Content with image
  if (wantsImage) {
    return (
      catalogue.find(l => l.hasPic && l.hasTitle && l.hasBody) ??
      catalogue.find(l => l.hasTitle && l.hasBody) ??
      catalogue[0]
    );
  }

  // Content without image
  return (
    catalogue.find(l => l.hasTitle && l.hasBody && !l.hasPic) ??
    catalogue.find(l => l.hasTitle && l.hasBody) ??
    catalogue[0]
  );
}

// ── Minimal slide XML builder ─────────────────────────────────────────────────
//
// Creates a slide with ONLY content placeholders.
// All visual design (background, decorative shapes, fonts, colours) is
// inherited from the slideLayout → slideMaster chain, exactly like Marp does.

function buildMinimalSlideXml(
  slide: Slide,
  layout: LayoutInfo,
  imageRId: string | null
): string {
  const shapes: string[] = [];
  let id = 2;

  // Title / ctrTitle
  if (layout.hasCtrTitle || layout.hasTitle) {
    const phAttr = layout.hasCtrTitle ? 'type="ctrTitle"' : 'type="title"';
    shapes.push(`<p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${id++}" name="Title"/>
        <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
        <p:nvPr><p:ph ${phAttr}/></p:nvPr>
      </p:nvSpPr>
      <p:spPr/>
      <p:txBody>
        <a:bodyPr/><a:lstStyle/>
        <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escXml(slide.title)}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>`);
  }

  // Body (bullet points)
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
        <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
      </p:nvSpPr>
      <p:spPr/>
      <p:txBody>
        <a:bodyPr/><a:lstStyle/>
        ${bulletContent}
      </p:txBody>
    </p:sp>`);
  }

  // Subtitle (cover slides)
  if (layout.hasSubTitle && (slide.type === "title" || slide.type === "section") && slide.bullets.length > 0) {
    shapes.push(`<p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${id++}" name="Subtitle"/>
        <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
        <p:nvPr><p:ph type="subTitle" idx="3"/></p:nvPr>
      </p:nvSpPr>
      <p:spPr/>
      <p:txBody>
        <a:bodyPr/><a:lstStyle/>
        <a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escXml(slide.bullets[0])}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>`);
  }

  // Image — use a pic placeholder if the layout has one, otherwise freeform on right half
  if (imageRId) {
    if (layout.hasPic) {
      // Placeholder pic: inherits position from layout
      shapes.push(`<p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${id++}" name="AI Picture"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr><p:ph type="pic" idx="1"/></p:nvPr>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="${imageRId}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr/>
      </p:pic>`);
    } else {
      // Freeform picture on the right half
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
  const templateBytes = b64ToUint8Array(templateB64);
  const templateZip = await JSZip.loadAsync(templateBytes);

  // Collect template slide names (used only for cataloguing layouts)
  const templateSlideNames = Object.keys(templateZip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0");
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0");
      return na - nb;
    });

  onProgress?.(10, "Cataloguing slide layouts…");
  const catalogue = await buildLayoutCatalogue(templateZip, templateSlideNames);

  // Build output zip: copy EVERYTHING from the template except the slide XMLs
  // and their rels. This preserves theme, slideMaster, slideLayouts, media,
  // fonts, [Content_Types].xml, _rels, etc.
  onProgress?.(20, "Cloning template structure…");
  const outZip = new JSZip();
  for (const [name, file] of Object.entries(templateZip.files)) {
    if (file.dir) continue;
    const isSlideXml  = /^ppt\/slides\/slide\d+\.xml$/i.test(name);
    const isSlideRels = /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(name);
    if (!isSlideXml && !isSlideRels) {
      outZip.file(name, await file.async("uint8array"));
    }
  }

  // Generate one slide per deck slide
  const deckSlides = [...deck.slides].sort((a, b) => a.order - b.order);
  let mediaCounter = 100;

  for (let i = 0; i < deckSlides.length; i++) {
    const slide = deckSlides[i];
    const pct = 25 + (i / deckSlides.length) * 60;
    onProgress?.(pct, `Slide ${i + 1}/${deckSlides.length}: ${slide.title.slice(0, 30)}`);

    const layout = pickLayout(slide, i, catalogue);

    // ── Image handling ────────────────────────────────────────────────────
    let imageRId: string | null = null;
    let imageExt = "jpg";

    let imageUrl = slide.image?.dataUrl ?? slide.image?.url ?? null;

    // Auto-fetch from Pollinations if layout has a pic placeholder but we have no image
    if (layout.hasPic && !imageUrl && slide.imagePrompt) {
      try {
        const { fetchPollinationsImage } = await import("./deckImages");
        const result = await fetchPollinationsImage(
          slide.imagePrompt, 1280, 720, deck.frontmatter.imageStyle ?? "illustration"
        );
        imageUrl = result.url;
      } catch { /* skip — slide will have no image */ }
    }

    if (imageUrl) {
      mediaCounter++;
      imageExt = imageUrl.startsWith("data:image/png")  ? "png"
               : imageUrl.startsWith("data:image/webp") ? "webp"
               : "jpg";
      const mediaName = `ppt/media/aiimg${mediaCounter}.${imageExt}`;

      if (imageUrl.startsWith("data:")) {
        const b64part = imageUrl.split(",")[1];
        const bin = atob(b64part);
        const arr = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
        outZip.file(mediaName, arr);
        imageRId = `rId${mediaCounter}`;
      } else {
        try {
          const resp = await fetch(imageUrl);
          if (resp.ok) {
            outZip.file(mediaName, new Uint8Array(await resp.arrayBuffer()));
            imageRId = `rId${mediaCounter}`;
          }
        } catch { /* skip image */ }
      }
    }

    // ── Slide XML ─────────────────────────────────────────────────────────
    const slideXml = buildMinimalSlideXml(slide, layout, imageRId);
    outZip.file(`ppt/slides/slide${i + 1}.xml`, slideXml);

    // ── Slide rels ────────────────────────────────────────────────────────
    // Target is relative from ppt/slides/ → go up one level to reach ppt/
    // layout.path is already relative to ppt/, e.g. "slideLayouts/slideLayout2.xml"
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
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${relsEntries.join("\n")}\n</Relationships>`
    );
  }

  // ── Update presentation.xml ───────────────────────────────────────────────
  onProgress?.(88, "Updating presentation index…");
  const presFile = outZip.file("ppt/presentation.xml");
  if (presFile) {
    let presXml = await presFile.async("text");

    const sldIdLst = deckSlides
      .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${200 + i}"/>`)
      .join("");
    presXml = presXml.replace(
      /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
      `<p:sldIdLst>${sldIdLst}</p:sldIdLst>`
    );
    outZip.file("ppt/presentation.xml", presXml);

    // Update presentation rels — remove old slide entries, add new ones
    const presRelsFile = outZip.file("ppt/_rels/presentation.xml.rels");
    if (presRelsFile) {
      let presRelsXml = await presRelsFile.async("text");
      // Remove existing slide relationships (Type ends with /slide)
      presRelsXml = presRelsXml.replace(
        /<Relationship[^>]+Type="[^"]*\/slide"[^>]*\/>/g, ""
      );
      const newSlideRels = deckSlides
        .map((_, i) =>
          `<Relationship Id="rId${200 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
        )
        .join("\n");
      presRelsXml = presRelsXml.replace("</Relationships>", `${newSlideRels}\n</Relationships>`);
      outZip.file("ppt/_rels/presentation.xml.rels", presRelsXml);
    }
  }

  // ── Update [Content_Types].xml ────────────────────────────────────────────
  const ctFile = outZip.file("[Content_Types].xml");
  if (ctFile) {
    let ctXml = await ctFile.async("text");
    // Remove old slide overrides
    ctXml = ctXml.replace(
      /<Override[^>]+\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, ""
    );
    const slideOverrides = deckSlides
      .map((_, i) =>
        `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
      )
      .join("\n");
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
