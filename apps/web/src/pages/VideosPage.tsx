import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Youtube,
  Sparkles,
  Loader2,
  Bookmark,
  Trash2,
  ExternalLink,
  AlertCircle,
  Play,
} from "lucide-react";
import { videos as store, useAppData } from "@/lib/store";
import { suggestVideos } from "@/lib/aiActions";

function formatDuration(sec: number) {
  if (!sec) return "?";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideosPage() {
  const data = useAppData();
  const [topic, setTopic] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playId, setPlayId] = useState<string | null>(null);

  const pagesWithContent = data.nodes.filter((n) => data.pages[n.id]?.trim());
  const keptVideos = data.videos.filter((v) => v.kept);
  const pendingVideos = data.videos.filter((v) => !v.kept);

  async function suggest() {
    if (loading) return;
    const pageText = selectedPageId ? data.pages[selectedPageId] : undefined;
    const topicText = topic.trim();
    if (!topicText && !selectedPageId) {
      setError("Enter a topic or select a page.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await suggestVideos(data.aiKeys, {
        topic: topicText || undefined,
        pageText,
        pageId: selectedPageId || undefined,
      });
      setTopic("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestion failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600/20 text-red-300">
          <Youtube className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Videos</h1>
          <p className="text-sm text-slate-400">AI suggests relevant YouTube videos (&lt;20 min). Review and keep what you like.</p>
        </div>
      </div>

      {/* Suggester */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && suggest()}
            placeholder="Topic (e.g. React hooks, SQL joins)…"
            className="flex-1 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          />
          <span className="self-center text-xs text-slate-500">or</span>
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          >
            <option value="">Select a learning page…</option>
            {pagesWithContent.map((n) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={suggest}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Suggesting…" : "Suggest videos"}
          </button>
          {pendingVideos.length > 0 && (
            <button
              onClick={() => store.clearUnsaved()}
              className="text-xs text-slate-500 hover:text-rose-300"
            >
              Clear pending
            </button>
          )}
        </div>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        {data.aiKeys.length === 0 && !error && (
          <p className="text-xs text-slate-500">
            Add a provider key in{" "}
            <Link to="/app/settings" className="text-brand-300 underline">Settings</Link>{" "}
            to use AI.
          </p>
        )}
      </div>

      {/* Pending suggestions */}
      {pendingVideos.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold text-white">Suggested — keep what you like</h2>
          <div className="mt-3 space-y-3">
            {pendingVideos.map((v) => (
              <VideoCard key={v.id} v={v} playId={playId} setPlayId={setPlayId} />
            ))}
          </div>
        </section>
      )}

      {/* Kept videos */}
      {keptVideos.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-white">Saved videos ({keptVideos.length})</h2>
          <div className="mt-3 space-y-3">
            {keptVideos.map((v) => (
              <VideoCard key={v.id} v={v} playId={playId} setPlayId={setPlayId} />
            ))}
          </div>
        </section>
      )}

      {data.videos.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-500">
          No videos yet. Enter a topic or select a page above.
        </p>
      )}
    </div>
  );
}

function VideoCard({
  v,
  playId,
  setPlayId,
}: {
  v: ReturnType<typeof useAppData>["videos"][number];
  playId: string | null;
  setPlayId: (id: string | null) => void;
}) {
  const isPlaying = playId === v.videoId;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Embed */}
      {isPlaying ? (
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${v.videoId}?autoplay=1`}
            title={v.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        <button
          onClick={() => setPlayId(v.videoId)}
          className="group relative flex w-full items-center justify-center overflow-hidden bg-slate-950"
          style={{ aspectRatio: "16/9" }}
        >
          <img
            src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
            alt={v.title}
            className="w-full object-cover opacity-60 group-hover:opacity-80 transition"
          />
          <div className="absolute grid h-14 w-14 place-items-center rounded-full bg-red-600/90 text-white shadow-lg group-hover:scale-105 transition">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </button>
      )}

      {/* Info + actions */}
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white line-clamp-2">{v.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{v.channel}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-slate-500">{formatDuration(v.durationSec)}</span>
            {!v.validated && (
              <span className="inline-flex items-center gap-0.5 text-xs text-amber-400">
                <AlertCircle className="h-3 w-3" /> approx.
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!v.kept && (
            <button
              onClick={() => store.keep(v.id)}
              title="Save this video"
              className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-brand-300"
            >
              <Bookmark className="h-4 w-4" />
            </button>
          )}
          <a
            href={`https://www.youtube.com/watch?v=${v.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open on YouTube"
            className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={() => store.discard(v.id)}
            title="Discard"
            className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
