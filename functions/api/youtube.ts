// Cloudflare Pages Function — YouTube search + metadata.
//
// POST /api/youtube  body: { query: string; maxResults?: number }
//   → { results: VideoResult[], fallback?: boolean }
//   Searches YouTube Data API v3 for real videos matching the query.
//   Falls back to a "no API key" response if YOUTUBE_API_KEY is not set.
//
// POST /api/youtube  body: { videoIds: string[] }
//   → { results: VideoResult[] }
//   Validates/fetches metadata for known video IDs.

interface Env {
  YOUTUBE_API_KEY?: string;
}

export interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  durationSec: number;
  validated: boolean;
  thumbnail: string;
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

async function searchYouTube(query: string, maxResults: number, apiKey: string): Promise<VideoResult[]> {
  // Step 1: search.list to get video IDs
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoDuration", "short"); // < 4 min; we'll also check medium separately
  searchUrl.searchParams.set("maxResults", String(maxResults + 5)); // over-fetch to filter long ones
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    const body = (await searchRes.json().catch(() => ({}))) as { error?: { errors?: { reason?: string }[] } };
    const reason = body?.error?.errors?.[0]?.reason ?? "";
    if (searchRes.status === 403 && reason === "quotaExceeded") throw new Error("quotaExceeded");
    throw new Error(`YouTube search error ${searchRes.status}`);
  }
  const searchData = (await searchRes.json()) as {
    items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url?: string } } } }[];
  };

  const items = searchData.items ?? [];
  if (!items.length) return [];

  const ids = items.map((i) => i.id.videoId).join(",");
  const snippetMap: Record<string, { title: string; channel: string; thumbnail: string }> = {};
  items.forEach((i) => {
    snippetMap[i.id.videoId] = {
      title: i.snippet.title,
      channel: i.snippet.channelTitle,
      thumbnail: i.snippet.thumbnails?.medium?.url ?? `https://img.youtube.com/vi/${i.id.videoId}/mqdefault.jpg`,
    };
  });

  // Step 2: videos.list for duration (contentDetails)
  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "contentDetails");
  videosUrl.searchParams.set("id", ids);
  videosUrl.searchParams.set("key", apiKey);

  const videosRes = await fetch(videosUrl.toString());
  if (!videosRes.ok) throw new Error(`YouTube videos.list error ${videosRes.status}`);
  const videosData = (await videosRes.json()) as {
    items?: { id: string; contentDetails: { duration: string } }[];
  };

  const results: VideoResult[] = [];
  for (const v of videosData.items ?? []) {
    const durationSec = parseISO8601Duration(v.contentDetails.duration);
    if (durationSec > 1200) continue; // skip >20 min
    const s = snippetMap[v.id];
    if (!s) continue;
    results.push({ videoId: v.id, title: s.title, channel: s.channel, durationSec, validated: true, thumbnail: s.thumbnail });
    if (results.length >= maxResults) break;
  }

  return results;
}

async function fetchByIds(videoIds: string[], apiKey: string): Promise<VideoResult[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube videos.list error ${res.status}`);
  const data = (await res.json()) as {
    items?: { id: string; snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url?: string } } }; contentDetails: { duration: string } }[];
  };

  return (data.items ?? []).map((item) => ({
    videoId: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    durationSec: parseISO8601Duration(item.contentDetails.duration),
    validated: true,
    thumbnail: item.snippet.thumbnails?.medium?.url ?? `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
  }));
}

export const onRequestPost: (ctx: { request: Request; env: Env }) => Promise<Response> = async ({ request, env }) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  let body: { query?: string; maxResults?: number; videoIds?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: cors });
  }

  if (!env.YOUTUBE_API_KEY) {
    return new Response(
      JSON.stringify({ results: [], noApiKey: true, message: "YOUTUBE_API_KEY not configured in Cloudflare Pages environment variables." }),
      { headers: cors }
    );
  }

  try {
    if (body.query) {
      // Search mode
      const results = await searchYouTube(body.query, Math.min(body.maxResults ?? 5, 10), env.YOUTUBE_API_KEY);
      return new Response(JSON.stringify({ results }), { headers: cors });
    } else if (body.videoIds?.length) {
      // Validate mode
      const results = await fetchByIds(body.videoIds.slice(0, 10), env.YOUTUBE_API_KEY);
      return new Response(JSON.stringify({ results }), { headers: cors });
    }
    return new Response(JSON.stringify({ results: [] }), { headers: cors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return new Response(JSON.stringify({ error: msg }), { status: 502, headers: cors });
  }
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
