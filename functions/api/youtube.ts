// Cloudflare Pages Function — YouTube video validation + metadata.
// POST /api/youtube  body: { videoIds: string[] }
// Returns: { results: { videoId, title, channel, durationSec, validated }[] }
//
// Primary path: YouTube Data API v3 (requires YOUTUBE_API_KEY env var).
// Fallback (quota exceeded / no key): oEmbed existence check, durationSec = 0.

interface Env {
  YOUTUBE_API_KEY?: string;
}

interface YTOEmbedResponse {
  title?: string;
  author_name?: string;
}

interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  durationSec: number;
  validated: boolean;
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

async function validateViaDataAPI(videoIds: string[], apiKey: string): Promise<VideoResult[]> {
  const ids = videoIds.join(",");
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { errors?: { reason?: string }[] } };
    const reason = body?.error?.errors?.[0]?.reason ?? "";
    if (res.status === 403 && reason === "quotaExceeded") throw new Error("quotaExceeded");
    throw new Error(`YouTube API error ${res.status}`);
  }
  const data = (await res.json()) as {
    items?: {
      id: string;
      snippet: { title: string; channelTitle: string };
      contentDetails: { duration: string };
    }[];
  };
  return (data.items ?? []).map((item) => ({
    videoId: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    durationSec: parseISO8601Duration(item.contentDetails.duration),
    validated: true,
  }));
}

async function validateViaOEmbed(videoId: string): Promise<VideoResult | null> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as YTOEmbedResponse;
  return {
    videoId,
    title: data.title ?? videoId,
    channel: data.author_name ?? "Unknown",
    durationSec: 0,
    validated: false,
  };
}

export const onRequestPost: (ctx: { request: Request; env: Env }) => Promise<Response> = async ({ request, env }) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  let body: { videoIds?: string[] };
  try {
    body = (await request.json()) as { videoIds?: string[] };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const videoIds = (body.videoIds ?? []).slice(0, 10);
  if (!videoIds.length) {
    return new Response(JSON.stringify({ results: [] }), { headers: corsHeaders });
  }

  const results: VideoResult[] = [];

  if (env.YOUTUBE_API_KEY) {
    try {
      const apiResults = await validateViaDataAPI(videoIds, env.YOUTUBE_API_KEY);
      return new Response(JSON.stringify({ results: apiResults }), { headers: corsHeaders });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg !== "quotaExceeded") {
        return new Response(JSON.stringify({ error: msg }), { status: 502, headers: corsHeaders });
      }
      // Fall through to oEmbed
    }
  }

  // oEmbed fallback — no API key or quota exceeded
  await Promise.all(
    videoIds.map(async (id) => {
      const r = await validateViaOEmbed(id);
      if (r) results.push(r);
    })
  );

  return new Response(JSON.stringify({ results, fallback: true }), { headers: corsHeaders });
};

export const onRequestOptions: () => Response = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
