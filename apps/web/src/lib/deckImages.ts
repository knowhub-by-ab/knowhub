// ---------------------------------------------------------------------------
// Image sourcing for slide decks.
// All sources are free, no API key required (Pollinations, SVGRepo, OpenClipart).
// ---------------------------------------------------------------------------

export interface ImageResult {
  url: string;
  title?: string;
  credit?: string;
  isVector?: boolean;
}

// ---------------------------------------------------------------------------
// Pollinations AI — free, unlimited, no API key
// ---------------------------------------------------------------------------

export function pollinationsUrl(
  prompt: string,
  width = 800,
  height = 450,
  style: "photorealistic" | "illustration" | "minimal" | "flat-icon" | "none" = "illustration",
  ratio?: "16:9" | "4:3" | "1:1" | "3:2" | "2:3" | "9:16"
): string {
  const styleHint: Record<string, string> = {
    photorealistic: "photorealistic, high quality, professional photograph",
    illustration: "digital illustration, clean, professional",
    minimal: "minimal, flat, simple, clean white background",
    "flat-icon": "flat icon style, vector, simple shapes",
    none: "",
  };
  // Override dimensions from ratio if provided
  if (ratio) {
    const RATIO_DIMS: Record<string, [number, number]> = {
      "16:9": [1280, 720],
      "4:3":  [800,  600],
      "1:1":  [512,  512],
      "3:2":  [768,  512],
      "2:3":  [512,  768],
      "9:16": [450,  800],
    };
    [width, height] = RATIO_DIMS[ratio] ?? [width, height];
  }
  const hint = styleHint[style] ?? "";
  const fullPrompt = hint ? `${prompt}, ${hint}` : prompt;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&nologo=true`;
}

export async function fetchPollinationsImage(
  prompt: string,
  width = 800,
  height = 450,
  style: "photorealistic" | "illustration" | "minimal" | "flat-icon" | "none" = "illustration",
  ratio?: "16:9" | "4:3" | "1:1" | "3:2" | "2:3" | "9:16"
): Promise<ImageResult> {
  const url = pollinationsUrl(prompt, width, height, style, ratio);
  // Pollinations returns the image directly at the URL — no need to await a JSON response.
  // We return the URL immediately; the browser fetches it lazily when rendered.
  return { url, credit: "Pollinations AI (free)" };
}

// ---------------------------------------------------------------------------
// SVGRepo — free SVG search, CC0 / licensed vectors
// ---------------------------------------------------------------------------

interface SvgRepoItem {
  id: string;
  title: string;
  url: string; // SVG file URL
}

export async function searchSvgRepo(query: string, limit = 6): Promise<ImageResult[]> {
  try {
    // SVGRepo's public search endpoint (undocumented but stable)
    const res = await fetch(
      `https://www.svgrepo.com/api/search/?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { svgs?: SvgRepoItem[] };
    return (data.svgs ?? []).map((item) => ({
      url: item.url,
      title: item.title,
      credit: "SVGRepo (free)",
      isVector: true,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// OpenClipart — free public domain clipart
// ---------------------------------------------------------------------------

interface OpenClipartItem {
  title: string;
  svg: { url: string };
  attribution: { title: string };
}

export async function searchOpenClipart(query: string, limit = 6): Promise<ImageResult[]> {
  try {
    const res = await fetch(
      `https://openclipart.org/search/json/?query=${encodeURIComponent(query)}&amount=${limit}`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { payload?: OpenClipartItem[] };
    return (data.payload ?? []).map((item) => ({
      url: item.svg.url,
      title: item.title,
      credit: "OpenClipart (public domain)",
      isVector: true,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Local file → base64 data URI
// ---------------------------------------------------------------------------

export function localFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Check whether a local file is too large to embed as base64 in localStorage (warn at 5 MB). */
export const LOCAL_IMAGE_WARN_BYTES = 5 * 1024 * 1024;

export function isImageFileTooLarge(file: File): boolean {
  return file.size > LOCAL_IMAGE_WARN_BYTES;
}

// ---------------------------------------------------------------------------
// Image layout CSS helpers (used by SlidePreview to position images)
// ---------------------------------------------------------------------------

export type ImageLayout =
  | "full-background"
  | "right-half"
  | "left-half"
  | "top-banner"
  | "inline-below-title"
  | "bottom-strip"
  | "none";

export interface LayoutStyle {
  containerClass: string;
  imageClass: string;
  contentClass: string;
}

export const LAYOUT_STYLES: Record<ImageLayout, LayoutStyle> = {
  "full-background": {
    containerClass: "relative",
    imageClass: "absolute inset-0 w-full h-full object-cover opacity-25",
    contentClass: "relative z-10",
  },
  "right-half": {
    containerClass: "flex gap-4",
    imageClass: "w-2/5 object-cover rounded",
    contentClass: "w-3/5",
  },
  "left-half": {
    containerClass: "flex flex-row-reverse gap-4",
    imageClass: "w-2/5 object-cover rounded",
    contentClass: "w-3/5",
  },
  "top-banner": {
    containerClass: "flex flex-col gap-3",
    imageClass: "w-full h-24 object-cover rounded",
    contentClass: "",
  },
  "inline-below-title": {
    containerClass: "flex flex-col gap-2",
    imageClass: "w-full h-32 object-cover rounded my-2",
    contentClass: "",
  },
  "bottom-strip": {
    containerClass: "flex flex-col gap-3",
    imageClass: "w-full h-20 object-cover rounded mt-auto",
    contentClass: "",
  },
  none: {
    containerClass: "",
    imageClass: "",
    contentClass: "",
  },
};

// ---------------------------------------------------------------------------
// Paid image providers: fal.ai FLUX + Runware
// ---------------------------------------------------------------------------

import type { ProviderKey } from "@/lib/types";

/** Find a fal.ai key from the user's configured AI keys. */
function findFalKey(keys: ProviderKey[]): string | null {
  for (const k of keys) {
    if (k.apiKey && (k.apiKey.startsWith("fal-") || (k.baseUrl ?? "").includes("fal.run"))) {
      return k.apiKey;
    }
  }
  return null;
}

/** Find a Runware key from configured AI keys. */
function findRunwareKey(keys: ProviderKey[]): string | null {
  for (const k of keys) {
    if ((k.baseUrl ?? "").includes("runware.ai")) return k.apiKey;
    if (k.provider === ("runware" as string)) return k.apiKey;
  }
  return null;
}

/** Generate image via fal.ai FLUX (high quality, requires fal-* API key). */
export async function fetchFalImage(
  prompt: string,
  style: "photorealistic" | "illustration" | "minimal" | "flat-icon" | "none",
  ratio?: "16:9" | "4:3" | "1:1" | "3:2" | "2:3" | "9:16",
  falKey?: string
): Promise<ImageResult | null> {
  if (!falKey) return null;
  const styleHint: Record<string, string> = {
    photorealistic: "photorealistic, ultra-realistic, professional photograph, high detail",
    illustration: "digital illustration, vibrant colors, professional, detailed artwork",
    minimal: "minimalist, clean design, simple shapes, white background, flat design",
    "flat-icon": "flat icon, vector art, simple geometric shapes, bold colors",
    none: "",
  };
  const sizeName: Record<string, string> = {
    "16:9": "landscape_16_9",
    "4:3":  "landscape_4_3",
    "1:1":  "square",
    "3:2":  "landscape_4_3",
    "2:3":  "portrait_4_3",
    "9:16": "portrait_16_9",
  };
  const hint = styleHint[style] ?? "";
  const fullPrompt = hint ? `${prompt}, ${hint}, vibrant colors, high quality` : `${prompt}, vibrant colors, high quality`;
  const image_size = sizeName[ratio ?? "16:9"] ?? "landscape_16_9";
  try {
    const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt, image_size, num_images: 1, enable_safety_checker: false }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { images?: { url: string }[] };
    const url = data.images?.[0]?.url;
    if (!url) return null;
    return { url, credit: "fal.ai FLUX" };
  } catch {
    return null;
  }
}

/** Generate image via Runware API. */
export async function fetchRunwareImage(
  prompt: string,
  style: "photorealistic" | "illustration" | "minimal" | "flat-icon" | "none",
  ratio?: "16:9" | "4:3" | "1:1" | "3:2" | "2:3" | "9:16",
  runwareKey?: string
): Promise<ImageResult | null> {
  if (!runwareKey) return null;
  const RATIO_DIMS: Record<string, [number, number]> = {
    "16:9": [1280, 720], "4:3": [800, 600], "1:1": [512, 512],
    "3:2": [768, 512], "2:3": [512, 768], "9:16": [576, 1024],
  };
  const [width, height] = RATIO_DIMS[ratio ?? "16:9"] ?? [1280, 720];
  const styleHint: Record<string, string> = {
    photorealistic: "photorealistic, high quality, detailed",
    illustration: "digital illustration, vibrant, colorful, professional",
    minimal: "minimalist, clean, simple",
    "flat-icon": "flat design, vector style",
    none: "",
  };
  const hint = styleHint[style] ?? "";
  const positivePrompt = hint ? `${prompt}, ${hint}, vibrant colors` : `${prompt}, vibrant colors`;
  try {
    const res = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: { "Authorization": `Bearer ${runwareKey}`, "Content-Type": "application/json" },
      body: JSON.stringify([{
        taskType: "imageInference",
        taskUUID: crypto.randomUUID(),
        positivePrompt,
        width,
        height,
        model: "runware:100@1",
        numberResults: 1,
        outputFormat: "WEBP",
      }]),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { imageURL?: string }[] };
    const url = data.data?.[0]?.imageURL;
    if (!url) return null;
    return { url, credit: "Runware AI" };
  } catch {
    return null;
  }
}

/**
 * Fetch the best available image for a slide.
 * Priority: fal.ai → Runware → Pollinations (free fallback).
 * Pass aiKeys from the user's store to enable paid providers.
 */
export async function fetchBestImage(
  prompt: string,
  style: "photorealistic" | "illustration" | "minimal" | "flat-icon" | "none" = "illustration",
  ratio?: "16:9" | "4:3" | "1:1" | "3:2" | "2:3" | "9:16",
  aiKeys: ProviderKey[] = []
): Promise<ImageResult> {
  const falKey = findFalKey(aiKeys);
  if (falKey) {
    const result = await fetchFalImage(prompt, style, ratio, falKey);
    if (result) return result;
  }
  const runwareKey = findRunwareKey(aiKeys);
  if (runwareKey) {
    const result = await fetchRunwareImage(prompt, style, ratio, runwareKey);
    if (result) return result;
  }
  return fetchPollinationsImage(prompt, 1280, 720, style, ratio);
}
