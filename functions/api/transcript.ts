// Cloudflare Pages Function — YouTube transcript fetcher.
//
// GET /api/transcript?videoId={videoId}
//   → { transcript: string | null, reason?: string }
//
// Fetches transcripts directly from YouTube's undocumented caption endpoint
// without requiring an API key. Parses the XML caption track format and
// returns clean plain text.

interface Env {
  YOUTUBE_API_KEY?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string };
}

function extractCaptionTracks(html: string): CaptionTrack[] {
  // The caption tracks JSON lives inside ytInitialPlayerResponse as a serialised
  // JS object. We extract just the captionTracks array from it.
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx === -1) return [];

  // Walk forward to find the opening '[' of the array.
  let start = idx + marker.length;
  while (start < html.length && html[start] !== "[") start++;
  if (start >= html.length) return [];

  // Find the matching ']' accounting for nested brackets.
  let depth = 0;
  let end = start;
  for (; end < html.length; end++) {
    if (html[end] === "[") depth++;
    else if (html[end] === "]") {
      depth--;
      if (depth === 0) { end++; break; }
    }
  }

  try {
    return JSON.parse(html.slice(start, end)) as CaptionTrack[];
  } catch {
    return [];
  }
}

function chooseBestTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (!tracks.length) return null;

  // Priority 1: manual English track (no "kind" field, or kind !== "asr")
  const manualEn = tracks.find(
    (t) =>
      (t.languageCode === "en" || t.languageCode?.startsWith("en-")) &&
      t.kind !== "asr"
  );
  if (manualEn) return manualEn;

  // Priority 2: auto-generated English track
  const asrEn = tracks.find(
    (t) =>
      t.kind === "asr" &&
      (t.languageCode === "en" || t.languageCode?.startsWith("en-"))
  );
  if (asrEn) return asrEn;

  // Priority 3: any auto-generated track
  const anyAsr = tracks.find((t) => t.kind === "asr");
  if (anyAsr) return anyAsr;

  // Fallback: first available track
  return tracks[0];
}

function parseXmlTranscript(xml: string): string {
  // Each caption segment: <text start="..." dur="...">content</text>
  const segments: string[] = [];
  const tagRe = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(xml)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    const decoded = decodeHtmlEntities(raw);
    // Strip any remaining HTML tags (e.g. <font color="...">)
    const clean = decoded.replace(/<[^>]*>/g, "").trim();
    if (clean) segments.push(clean);
  }

  // Join segments, collapsing duplicate whitespace and separating with spaces.
  return segments.join(" ").replace(/\s{2,}/g, " ").trim();
}

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId")?.trim();

  if (!videoId) {
    return jsonResponse({ error: "videoId query parameter is required." }, 400);
  }

  // Basic sanity check on the videoId format (11 chars, alphanumeric + -_).
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return jsonResponse({ error: "Invalid videoId format." }, 400);
  }

  let pageHtml: string;
  try {
    const ytRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!ytRes.ok) {
      return jsonResponse({ transcript: null, reason: "youtube_fetch_failed" });
    }
    pageHtml = await ytRes.text();
  } catch {
    return jsonResponse({ transcript: null, reason: "youtube_fetch_failed" });
  }

  const tracks = extractCaptionTracks(pageHtml);
  if (!tracks.length) {
    return jsonResponse({ transcript: null, reason: "no_captions" });
  }

  const track = chooseBestTrack(tracks);
  if (!track?.baseUrl) {
    return jsonResponse({ transcript: null, reason: "no_captions" });
  }

  // Fetch the caption XML. The baseUrl may already include fmt or other params;
  // we normalise it so we always get the XML format (not json3).
  let captionUrl: URL;
  try {
    captionUrl = new URL(track.baseUrl);
  } catch {
    return jsonResponse({ transcript: null, reason: "invalid_caption_url" });
  }

  // Remove fmt if present so we always get the default XML response.
  captionUrl.searchParams.delete("fmt");

  let captionXml: string;
  try {
    const capRes = await fetch(captionUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!capRes.ok) {
      return jsonResponse({ transcript: null, reason: "caption_fetch_failed" });
    }
    captionXml = await capRes.text();
  } catch {
    return jsonResponse({ transcript: null, reason: "caption_fetch_failed" });
  }

  const transcript = parseXmlTranscript(captionXml);
  if (!transcript) {
    return jsonResponse({ transcript: null, reason: "empty_transcript" });
  }

  return jsonResponse({ transcript });
};

export const onRequestOptions: PagesFunction = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });
