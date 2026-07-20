// src/lib/deckTemplateExport.ts
// Template-based PPTX export: takes a stored POTX file and fills its slide
// placeholders with deck content + AI-generated images.

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

function makeTextPara(text: string, bold = false, sizePt = 0): string {
  const rPr = bold ? `<a:rPr lang="en-US" b="1"${sizePt ? ` sz="${sizePt * 100}"` : ""}/>`
                   : `<a:rPr lang="en-US"${sizePt ? ` sz="${sizePt * 100}"` : ""}/>`;
  return `<a:p><a:r>${rPr}<a:t>${escXml(text)}</a:t></a:r></a:p>`;
}

function makeTitleTxBody(title: string): string {
  return `<p:txBody><a:bodyPr/><a:lstStyle/>${makeTextPara(title, true)}</p:txBody>`;
}

function makeBodyTxBody(bullets: string[]): string {
  const paras = bullets.length > 0
    ? bullets.map(b => `<a:p><a:pPr marL="342900" indent="-342900"><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US"/><a:t>${escXml(b)}</a:t></a:r></a:p>`).join("")
    : `<a:p><a:endParaRPr lang="en-US"/></a:p>`;
  return `<p:txBody><a:bodyPr/><a:lstStyle/>${paras}</p:txBody>`;
}

function injectTxBody(spXml: string, newTxBody: string): string {
  return spXml.replace(/<p:txBody>[\s\S]*?<\/p:txBody>/, newTxBody);
}

function makePicShape(rId: string, x: number, y: number, cx: number, cy: number): string {
  return `<p:pic>
    <p:nvPicPr>
      <p:cNvPr id="99" name="AI Image"/>
      <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
      <p:nvPr/>
    </p:nvPicPr>
    <p:blipFill>
      <a:blip r:embed="${rId}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </p:blipFill>
    <p:spPr>
      <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    </p:spPr>
  </p:pic>`;
}

interface SlideLayout {
  slideXml: string;
  hasPic: boolean;
  hasTitle: boolean;
  hasBody: boolean;
  hasCtrTitle: boolean;
  picBox?: { x: number; y: number; cx: number; cy: number };
}

function parseLayoutInfo(xml: string): SlideLayout {
  const hasPic = /type=["']pic["']/i.test(xml);
  const hasTitle = /type=["']title["']/i.test(xml);
  const hasCtrTitle = /type=["']ctrTitle["']/i.test(xml);
  const hasBody = /type=["']body["']/i.test(xml);

  let picBox: SlideLayout["picBox"];
  if (hasPic) {
    const picPhIdx = xml.indexOf('type="pic"');
    if (picPhIdx >= 0) {
      const region = xml.slice(Math.max(0, picPhIdx - 500), picPhIdx + 2000);
      const xfrmM = region.match(/<a:xfrm[^>]*>[\s\S]*?<a:off x="(\d+)" y="(\d+)"[\s\S]*?<a:ext cx="(\d+)" cy="(\d+)"/);
      if (xfrmM) {
        picBox = { x: +xfrmM[1], y: +xfrmM[2], cx: +xfrmM[3], cy: +xfrmM[4] };
      } else {
        picBox = { x: 4572000, y: 0, cx: 4572000, cy: 5143500 };
      }
    }
  }

  return { slideXml: xml, hasPic, hasTitle, hasBody, hasCtrTitle, picBox };
}

function pickTemplateSlide(
  slide: Slide,
  slideIdx: number,
  layouts: SlideLayout[]
): SlideLayout {
  if (slide.type === "title" || slideIdx === 0) {
    return layouts.find(l => l.hasCtrTitle) ?? layouts[0];
  }
  if (slide.type === "section") {
    return layouts.find(l => l.hasTitle && !l.hasBody && !l.hasPic)
      ?? layouts.find(l => l.hasTitle)
      ?? layouts[0];
  }
  if (slide.image?.url || slide.image?.dataUrl) {
    return layouts.find(l => l.hasPic && l.hasTitle && l.hasBody)
      ?? layouts.find(l => l.hasTitle && l.hasBody)
      ?? layouts[0];
  }
  return layouts.find(l => l.hasTitle && l.hasBody && !l.hasPic)
    ?? layouts.find(l => l.hasTitle && l.hasBody)
    ?? layouts[0];
}

async function fillSlide(
  layout: SlideLayout,
  slide: Slide,
  _imageUrl: string | null,
  imageRId: string | null
): Promise<string> {
  let xml = layout.slideXml;

  const titlePhRe = /\btype=["'](?:title|ctrTitle)["']/i;
  const titlePhM = titlePhRe.exec(xml);
  if (titlePhM) {
    const before = xml.slice(0, titlePhM.index);
    const spStart = before.lastIndexOf("<p:sp");
    const spEnd = xml.indexOf("</p:sp>", titlePhM.index) + "</p:sp>".length;
    if (spStart >= 0 && spEnd > spStart) {
      const spXml = xml.slice(spStart, spEnd);
      const newSp = injectTxBody(spXml, makeTitleTxBody(slide.title));
      xml = xml.slice(0, spStart) + newSp + xml.slice(spEnd);
    }
  }

  const bodyPhM = /\btype=["'](?:body|subTitle)["']/i.exec(xml);
  if (bodyPhM && slide.bullets.length > 0) {
    const before2 = xml.slice(0, bodyPhM.index);
    const spStart2 = before2.lastIndexOf("<p:sp");
    const spEnd2 = xml.indexOf("</p:sp>", bodyPhM.index) + "</p:sp>".length;
    if (spStart2 >= 0 && spEnd2 > spStart2) {
      const spXml2 = xml.slice(spStart2, spEnd2);
      const newSp2 = injectTxBody(spXml2, makeBodyTxBody(slide.bullets));
      xml = xml.slice(0, spStart2) + newSp2 + xml.slice(spEnd2);
    }
  }

  if (layout.hasPic && imageRId && layout.picBox) {
    const picPhM = /\btype=["']pic["']/i.exec(xml);
    if (picPhM) {
      const before3 = xml.slice(0, picPhM.index);
      const spStart3 = before3.lastIndexOf("<p:sp");
      const spEnd3 = xml.indexOf("</p:sp>", picPhM.index) + "</p:sp>".length;
      if (spStart3 >= 0 && spEnd3 > spStart3) {
        const { x, y, cx, cy } = layout.picBox;
        xml = xml.slice(0, spStart3) + makePicShape(imageRId, x, y, cx, cy) + xml.slice(spEnd3);
      }
    }
  }

  return xml;
}

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
  const zip = await JSZip.loadAsync(templateBytes);

  const templateSlideNames = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? "0");
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? "0");
      return na - nb;
    });

  onProgress?.(10, "Analysing template layouts…");
  const layouts: SlideLayout[] = [];
  for (const name of templateSlideNames) {
    const f = zip.file(name);
    if (f) {
      const xml = await f.async("text");
      layouts.push(parseLayoutInfo(xml));
    }
  }

  // Fallback: if no slides found in template, create a minimal default layout
  if (layouts.length === 0) {
    layouts.push({
      slideXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="1" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
      hasPic: false, hasTitle: true, hasBody: false, hasCtrTitle: true,
    });
  }

  const outZip = new JSZip();
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const isSlideXml = /^ppt\/slides\/slide\d+\.xml$/i.test(name);
    const isSlideRels = /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/i.test(name);
    if (!isSlideXml && !isSlideRels) {
      outZip.file(name, await file.async("uint8array"));
    }
  }

  const slides = [...deck.slides].sort((a, b) => a.order - b.order);
  let mediaCounter = 100;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const pct = 15 + (i / slides.length) * 70;
    onProgress?.(pct, `Slide ${i + 1}/${slides.length}: ${slide.title.slice(0, 30)}`);

    const layout = pickTemplateSlide(slide, i, layouts);

    let imageRId: string | null = null;
    let imageUrl = slide.image?.dataUrl ?? slide.image?.url ?? null;

    if (layout.hasPic && !imageUrl && slide.imagePrompt) {
      try {
        const { fetchPollinationsImage } = await import("./deckImages");
        const result = await fetchPollinationsImage(slide.imagePrompt, 1280, 720, deck.frontmatter.imageStyle ?? "illustration");
        imageUrl = result.url;
      } catch { /* skip */ }
    }

    if (layout.hasPic && imageUrl) {
      const imgData = imageUrl.startsWith("data:")
        ? imageUrl.split(",")[1]
        : null;
      const ext = imageUrl.startsWith("data:image/png") ? "png"
        : imageUrl.startsWith("data:image/webp") ? "webp"
        : "jpg";
      mediaCounter++;
      const mediaName = `ppt/media/aiimg${mediaCounter}.${ext}`;

      if (imgData) {
        const bin = atob(imgData);
        const arr = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
        outZip.file(mediaName, arr);
        imageRId = `rId${mediaCounter}`;
      } else {
        try {
          const resp = await fetch(imageUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            outZip.file(mediaName, new Uint8Array(buf));
            imageRId = `rId${mediaCounter}`;
          }
        } catch { /* skip image */ }
      }
    }

    const filledXml = await fillSlide(layout, slide, imageUrl, imageRId);
    const slideFileName = `ppt/slides/slide${i + 1}.xml`;
    outZip.file(slideFileName, filledXml);

    const relsEntries: string[] = [
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`,
    ];
    if (imageRId) {
      const ext2 = imageUrl?.startsWith("data:image/png") ? "png" : imageUrl?.startsWith("data:image/webp") ? "webp" : "jpg";
      const relTarget = `../media/aiimg${mediaCounter}.${ext2}`;
      relsEntries.push(
        `<Relationship Id="${imageRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${relTarget}"/>`
      );
    }
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${relsEntries.join("\n")}\n</Relationships>`;
    outZip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, relsXml);
  }

  const presFile = outZip.file("ppt/presentation.xml");
  if (presFile) {
    let presXml = await presFile.async("text");
    const sldIdLst = slides.map((_, i) =>
      `<p:sldId id="${256 + i}" r:id="rId${200 + i}"/>`
    ).join("");
    presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIdLst}</p:sldIdLst>`);
    outZip.file("ppt/presentation.xml", presXml);

    const presRelsFile = outZip.file("ppt/_rels/presentation.xml.rels");
    if (presRelsFile) {
      const slideRels = slides.map((_, i) =>
        `<Relationship Id="rId${200 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
      ).join("\n");
      let presRelsXml = await presRelsFile.async("text");
      presRelsXml = presRelsXml.replace(/<Relationship[^/]+"slide"[^/]+\/>/g, "");
      presRelsXml = presRelsXml.replace("</Relationships>", `${slideRels}\n</Relationships>`);
      outZip.file("ppt/_rels/presentation.xml.rels", presRelsXml);
    }
  }

  onProgress?.(90, "Packaging…");
  const blob = await outZip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  onProgress?.(100, "Done");
  return blob;
}
