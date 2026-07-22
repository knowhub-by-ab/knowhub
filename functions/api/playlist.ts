// Cloudflare Pages Function — YouTube playlist fetcher.
//
// POST /api/playlist  body: { playlistId: string; pageToken?: string }
//   → {
//       videos: VideoItem[],
//       playlistTitle: string,
//       channelTitle: string,
//       thumbnailUrl: string,
//       totalCount: number
//     }
//
// Paginates through all pages of a YouTube playlist using the Data API v3,
// then enriches results with video durations from videos.list. Stops at 200
// videos to prevent runaway quota consumption.

interface Env {
  YOUTUBE_API_KEY?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_VIDEOS = 200;
const PAGE_SIZE = 50; // max allowed by YouTube API

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

export interface VideoItem {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec: number;
  publishedAt: string;
}

interface PlaylistSnippet {
  title: string;
  channelTitle: string;
  thumbnails?: {
    medium?: { url?: string };
    high?: { url?: string };
    default?: { url?: string };
  };
}

interface PlaylistItemResource {
  snippet: {
    title: string;
    description: string;
    channelTitle?: string;
    videoOwnerChannelTitle?: string;
    publishedAt: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
    };
    resourceId: { videoId: string };
  };
}

interface PlaylistItemsResponse {
  nextPageToken?: string;
  items?: PlaylistItemResource[];
}

interface VideosDurationResponse {
  items?: { id: string; contentDetails: { duration: string } }[];
}

interface PlaylistResponse {
  items?: { snippet: PlaylistSnippet }[];
}

async function fetchPlaylistMeta(
  playlistId: string,
  apiKey: string
): Promise<{ title: string; channelTitle: string; thumbnailUrl: string }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", playlistId);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`playlists.list error ${res.status}`);
  const data = (await res.json()) as PlaylistResponse;
  const snippet = data.items?.[0]?.snippet;
  if (!snippet) throw new Error("Playlist not found or not accessible.");

  const thumbnailUrl =
    snippet.thumbnails?.high?.url ??
    snippet.thumbnails?.medium?.url ??
    snippet.thumbnails?.default?.url ??
    "";

  return {
    title: snippet.title,
    channelTitle: snippet.channelTitle,
    thumbnailUrl,
  };
}

async function fetchAllPlaylistItems(
  playlistId: string,
  apiKey: string
): Promise<VideoItem[]> {
  const rawItems: PlaylistItemResource[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems"
    );
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { errors?: { reason?: string }[] };
      };
      const reason = body?.error?.errors?.[0]?.reason ?? "";
      if (res.status === 403 && reason === "quotaExceeded") {
        throw new Error("quotaExceeded");
      }
      throw new Error(`playlistItems.list error ${res.status}`);
    }

    const data = (await res.json()) as PlaylistItemsResponse;
    const items = data.items ?? [];
    rawItems.push(...items);
    pageToken = data.nextPageToken;
  } while (pageToken && rawItems.length < MAX_VIDEOS);

  // De-duplicate and filter deleted/private videos, then cap at MAX_VIDEOS.
  const seen = new Set<string>();
  const filtered: PlaylistItemResource[] = [];
  for (const item of rawItems) {
    const title = item.snippet.title;
    if (title === "Deleted video" || title === "Private video") continue;
    const vid = item.snippet.resourceId.videoId;
    if (!vid || seen.has(vid)) continue;
    seen.add(vid);
    filtered.push(item);
    if (filtered.length >= MAX_VIDEOS) break;
  }

  return filtered.map((item) => {
    const s = item.snippet;
    const thumbnailUrl =
      s.thumbnails?.medium?.url ??
      s.thumbnails?.high?.url ??
      `https://img.youtube.com/vi/${s.resourceId.videoId}/mqdefault.jpg`;

    return {
      videoId: s.resourceId.videoId,
      title: s.title,
      description: s.description.slice(0, 500),
      channelTitle:
        s.videoOwnerChannelTitle ?? s.channelTitle ?? "",
      thumbnailUrl,
      durationSec: 0, // filled in after videos.list call
      publishedAt: s.publishedAt,
    };
  });
}

async function enrichWithDurations(
  videos: VideoItem[],
  apiKey: string
): Promise<void> {
  // videos.list accepts up to 50 IDs per call.
  const CHUNK = 50;
  const durationMap = new Map<string, number>();

  for (let i = 0; i < videos.length; i += CHUNK) {
    const chunk = videos.slice(i, i + CHUNK);
    const ids = chunk.map((v) => v.videoId).join(",");

    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", ids);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`videos.list error ${res.status}`);
    const data = (await res.json()) as VideosDurationResponse;

    for (const item of data.items ?? []) {
      durationMap.set(item.id, parseISO8601Duration(item.contentDetails.duration));
    }
  }

  for (const video of videos) {
    video.durationSec = durationMap.get(video.videoId) ?? 0;
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.YOUTUBE_API_KEY) {
    return jsonResponse({ noApiKey: true });
  }

  let body: { playlistId?: string; pageToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const playlistId = body.playlistId?.trim();
  if (!playlistId) {
    return jsonResponse({ error: "playlistId is required." }, 400);
  }

  const apiKey = env.YOUTUBE_API_KEY;

  try {
    const [meta, videos] = await Promise.all([
      fetchPlaylistMeta(playlistId, apiKey),
      fetchAllPlaylistItems(playlistId, apiKey),
    ]);

    await enrichWithDurations(videos, apiKey);

    return jsonResponse({
      videos,
      playlistTitle: meta.title,
      channelTitle: meta.channelTitle,
      thumbnailUrl: meta.thumbnailUrl,
      totalCount: videos.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "quotaExceeded") {
      return jsonResponse({ error: "YouTube API quota exceeded." }, 429);
    }
    if (msg.includes("not found") || msg.includes("not accessible")) {
      return jsonResponse({ error: msg }, 404);
    }
    return jsonResponse({ error: msg }, 502);
  }
};

export const onRequestOptions: PagesFunction = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });
