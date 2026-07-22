import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CascadingNodePicker from "@/components/CascadingNodePicker";
import {
  Youtube,
  Sparkles,
  Loader2,
  Bookmark,
  Trash2,
  ExternalLink,
  AlertCircle,
  Play,
  ListVideo,
  Plus,
  Pencil,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from "lucide-react";
import { videos as store, videoPlaylists as plStore, useAppData } from "@/lib/store";
import { suggestVideos } from "@/lib/aiActions";

function formatDuration(sec: number) {
  if (!sec) return "?";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideosPage() {
  const data = useAppData();
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playId, setPlayId] = useState<string | null>(null);

  // Playlist state
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null); // null = "All Videos"
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const pagesWithContent = data.nodes.filter((n) => data.pages[n.id]?.trim());
  const pageIds = useMemo(() => new Set(pagesWithContent.map((n) => n.id)), [pagesWithContent]);
  const keptVideos = data.videos.filter((v) => v.kept);
  const pendingVideos = data.videos.filter((v) => !v.kept);

  const activePlaylist = activePlaylistId ? data.videoPlaylists.find((p) => p.id === activePlaylistId) : null;

  // Videos visible in main area
  const visibleKept = useMemo(() => {
    if (!activePlaylist) return keptVideos;
    return activePlaylist.videoIds
      .map((vid) => data.videos.find((v) => v.id === vid))
      .filter((v): v is NonNullable<typeof v> => !!v && v.kept);
  }, [activePlaylist, keptVideos, data.videos]);

  useEffect(() => {
    const pid = searchParams.get("pageId");
    if (pid && data.nodes.some((n) => n.id === pid)) {
      setSelectedPageId(pid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const msg = err instanceof Error ? err.message : "Suggestion failed.";
      if (msg === "YOUTUBE_API_KEY_MISSING") {
        setError("YouTube Data API key not configured. Go to Cloudflare Pages → Settings → Environment variables and add YOUTUBE_API_KEY. See the Guide for instructions.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function createPlaylist() {
    if (!newPlaylistName.trim()) return;
    plStore.create(newPlaylistName.trim());
    setNewPlaylistName("");
    setCreatingPlaylist(false);
  }

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar — playlists */}
      <aside className="w-52 shrink-0 border-r border-white/8 flex flex-col gap-1 py-3 px-2 overflow-y-auto">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Playlists</p>

        {/* All Videos */}
        <button
          onClick={() => setActivePlaylistId(null)}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors w-full text-left ${
            activePlaylistId === null ? "bg-brand-600/20 text-brand-300" : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Youtube className="h-4 w-4 shrink-0" />
          All Videos
          <span className="ml-auto text-[11px] text-slate-600">{keptVideos.length}</span>
        </button>

        {/* Playlists */}
        {data.videoPlaylists.map((pl) => (
          <div key={pl.id} className="group relative">
            {renamingPlaylistId === pl.id ? (
              <div className="flex items-center gap-1 px-1">
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && renameDraft.trim()) { plStore.rename(pl.id, renameDraft.trim()); setRenamingPlaylistId(null); }
                    if (e.key === "Escape") setRenamingPlaylistId(null);
                  }}
                  className="flex-1 rounded border border-white/20 bg-slate-800 px-1.5 py-0.5 text-xs text-white outline-none focus:border-brand-500"
                />
                <button onClick={() => { if (renameDraft.trim()) plStore.rename(pl.id, renameDraft.trim()); setRenamingPlaylistId(null); }}
                  className="text-brand-400"><Check className="h-3 w-3" /></button>
                <button onClick={() => setRenamingPlaylistId(null)} className="text-slate-500"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <button
                onClick={() => setActivePlaylistId(pl.id)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors w-full text-left ${
                  activePlaylistId === pl.id ? "bg-brand-600/20 text-brand-300" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <ListVideo className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{pl.name}</span>
                <span className="text-[11px] text-slate-600">{pl.videoIds.length}</span>
              </button>
            )}
            {renamingPlaylistId !== pl.id && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                <button onClick={() => { setRenamingPlaylistId(pl.id); setRenameDraft(pl.name); }}
                  className="rounded p-0.5 text-slate-600 hover:text-slate-300"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => { if (activePlaylistId === pl.id) setActivePlaylistId(null); plStore.remove(pl.id); }}
                  className="rounded p-0.5 text-slate-600 hover:text-rose-400"><Trash2 className="h-3 w-3" /></button>
              </div>
            )}
          </div>
        ))}

        {/* New playlist */}
        {creatingPlaylist ? (
          <div className="flex items-center gap-1 px-1 mt-1">
            <input
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createPlaylist(); if (e.key === "Escape") setCreatingPlaylist(false); }}
              placeholder="Playlist name…"
              className="flex-1 rounded border border-white/20 bg-slate-800 px-1.5 py-0.5 text-xs text-white outline-none focus:border-brand-500"
            />
            <button onClick={createPlaylist} className="text-brand-400"><Check className="h-3 w-3" /></button>
            <button onClick={() => setCreatingPlaylist(false)} className="text-slate-500"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingPlaylist(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:text-white hover:bg-white/5 mt-1"
          >
            <Plus className="h-3.5 w-3.5" /> New playlist
          </button>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 overflow-y-auto px-6 py-0">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 pt-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600/20 text-red-300">
              <Youtube className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {activePlaylist ? activePlaylist.name : "Videos"}
              </h1>
              <p className="text-sm text-slate-400">AI suggests relevant YouTube videos (&lt;20 min).</p>
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
              <CascadingNodePicker
                nodes={data.nodes}
                value={selectedPageId}
                onChange={setSelectedPageId}
                placeholder="Select a learning page…"
                pagesOnly
                pageIds={pageIds}
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
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
              {activePlaylist && pendingVideos.length > 0 && (
                <button
                  onClick={() => pendingVideos.forEach((v) => { store.keep(v.id); plStore.addVideo(activePlaylist.id, v.id); })}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  Keep all → add to "{activePlaylist.name}"
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
                  <VideoCard
                    key={v.id}
                    v={v}
                    playId={playId}
                    setPlayId={setPlayId}

                    onAddToPlaylist={activePlaylist ? () => { store.keep(v.id); plStore.addVideo(activePlaylist.id, v.id); } : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Kept videos / playlist view */}
          {visibleKept.length > 0 && (
            <section className="mt-8">
              <h2 className="font-semibold text-white">
                {activePlaylist ? `${activePlaylist.name} (${visibleKept.length})` : `Saved videos (${keptVideos.length})`}
              </h2>

              {activePlaylist ? (
                /* Playlist ordered view with reorder controls */
                <div className="mt-3 space-y-3">
                  {visibleKept.map((v, idx) => (
                    <div key={v.id} className="flex items-start gap-2">
                      <div className="flex flex-col gap-0.5 pt-3 shrink-0">
                        <button onClick={() => plStore.moveVideo(activePlaylist.id, v.id, "up")} disabled={idx === 0}
                          className="rounded p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                        <button onClick={() => plStore.moveVideo(activePlaylist.id, v.id, "down")} disabled={idx === visibleKept.length - 1}
                          className="rounded p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
                      </div>
                      <div className="flex-1">
                        <VideoCard
                          v={v}
                          playId={playId}
                          setPlayId={setPlayId}
                          onRemoveFromPlaylist={() => plStore.removeVideo(activePlaylist.id, v.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Default grouped view */
                (() => {
                  const groups = new Map<string, { label: string; videos: typeof keptVideos }>();
                  for (const v of visibleKept) {
                    const key = v.pageId ? `page:${v.pageId}` : v.topic ? `topic:${v.topic}` : "general";
                    if (!groups.has(key)) {
                      const pageNode = v.pageId ? data.nodes.find((n) => n.id === v.pageId) : null;
                      const label = pageNode?.title ?? v.topic ?? "General";
                      groups.set(key, { label, videos: [] });
                    }
                    groups.get(key)!.videos.push(v);
                  }
                  return Array.from(groups.entries()).map(([key, group]) => (
                    <div key={key} className="mt-4">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400">
                        <span className="h-1 w-4 rounded bg-brand-500/50" />
                        {group.label}
                        <span className="text-xs text-slate-600">({group.videos.length})</span>
                      </h3>
                      <div className="space-y-3">
                        {group.videos.map((v) => (
                          <VideoCard
                            key={v.id}
                            v={v}
                            playId={playId}
                            setPlayId={setPlayId}
                            playlists={data.videoPlaylists}
                            onAddToPlaylist={(plId) => plStore.addVideo(plId, v.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
            </section>
          )}

          {data.videos.length === 0 && (
            <p className="mt-8 text-center text-sm text-slate-500">
              No videos yet. Enter a topic or select a page above.
            </p>
          )}
          {activePlaylist && visibleKept.length === 0 && keptVideos.length > 0 && (
            <p className="mt-8 text-center text-sm text-slate-500">
              No videos in this playlist yet.{" "}
              <button className="text-brand-300 underline" onClick={() => setActivePlaylistId(null)}>
                Browse all videos
              </button>{" "}
              to add some.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoCard({
  v,
  playId,
  setPlayId,
  playlists,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}: {
  v: ReturnType<typeof useAppData>["videos"][number];
  playId: string | null;
  setPlayId: (id: string | null) => void;
  playlists?: ReturnType<typeof useAppData>["videoPlaylists"];
  onAddToPlaylist?: ((plId: string) => void) | (() => void);
  onRemoveFromPlaylist?: () => void;
}) {
  const isPlaying = playId === v.videoId;
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
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
        <div className="flex shrink-0 items-center gap-1.5 flex-wrap justify-end">
          {!v.kept && !onAddToPlaylist && (
            <button onClick={() => store.keep(v.id)} title="Save"
              className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-brand-300">
              <Bookmark className="h-4 w-4" />
            </button>
          )}
          {onAddToPlaylist && !v.kept && (
            <button onClick={() => (onAddToPlaylist as () => void)()} title="Keep & add to playlist"
              className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-brand-300 hover:bg-brand-600/10">
              + Keep
            </button>
          )}
          {/* Add to playlist dropdown (in All Videos view) */}
          {v.kept && playlists && playlists.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowPlaylistMenu((v) => !v)} title="Add to playlist"
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-brand-300">
                <ListVideo className="h-4 w-4" />
              </button>
              {showPlaylistMenu && (
                <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-lg border border-white/15 bg-slate-900 shadow-xl">
                  {playlists.map((pl) => {
                    const inPlaylist = pl.videoIds.includes(v.id);
                    return (
                      <button
                        key={pl.id}
                        onClick={() => { onAddToPlaylist?.(pl.id); setShowPlaylistMenu(false); }}
                        disabled={inPlaylist}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${inPlaylist ? "text-brand-400" : "text-slate-300 hover:bg-white/5"}`}
                      >
                        {inPlaylist ? <Check className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {pl.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {onRemoveFromPlaylist && (
            <button onClick={onRemoveFromPlaylist} title="Remove from playlist"
              className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-rose-400">
              <X className="h-4 w-4" />
            </button>
          )}
          <a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" title="Open on YouTube"
            className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white">
            <ExternalLink className="h-4 w-4" />
          </a>
          <button onClick={() => store.discard(v.id)} title="Discard"
            className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-rose-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
