import { useSyncExternalStore, useState } from "react";
import { Mic, Play, Square, Clock, ChevronRight } from "lucide-react";
import { useAppData } from "@/lib/store";
import { speak, stopTTS, subscribeToTTS, getTTSState, markdownToSpeakable } from "@/lib/tts";
import type { TreeNode } from "@/lib/types";

function estimateMins(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 150));
}

function dfsOrder(nodes: TreeNode[], parentId: string | null = null, depth = 0): Array<TreeNode & { depth: number }> {
  return nodes
    .filter((n) => n.parentId === parentId)
    .flatMap((n) => [{ ...n, depth }, ...dfsOrder(nodes, n.id, depth + 1)]);
}

export default function PodcastPage() {
  const data = useAppData();
  const ttsState = useSyncExternalStore(subscribeToTTS, getTTSState, getTTSState);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Pages in tree DFS order, only those with content
  const ordered = dfsOrder(data.nodes).filter((n) => data.pages[n.id]?.trim());

  function playEpisode(id: string, title: string) {
    const body = data.pages[id] ?? "";
    setPlayingId(id);
    speak(markdownToSpeakable(body), { title });
  }

  function stopEpisode() {
    stopTTS();
    setPlayingId(null);
  }

  const isPlaying = ttsState.active && ttsState.playing;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Mic className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Podcast</h1>
          <p className="text-sm text-slate-400">
            Listen to your learning pages read aloud — one episode at a time.
          </p>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <Mic className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">
            No pages with content yet. Generate some learning pages first, then come back here to listen.
          </p>
        </div>
      ) : (
        <>
          {/* Now playing banner */}
          {ttsState.active && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
              </span>
              <span className="flex-1 truncate text-sm font-medium text-brand-100">
                {ttsState.title || "Playing…"}
              </span>
              <button
                onClick={stopEpisode}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
              >
                <Square className="h-3 w-3" /> Stop
              </button>
            </div>
          )}

          {/* Episode list */}
          <ol className="mt-5 space-y-2">
            {ordered.map((node, idx) => {
              const body = data.pages[node.id] ?? "";
              const mins = estimateMins(body);
              const isThisPlaying = ttsState.active && playingId === node.id;
              const depth = node.depth ?? 0;

              return (
                <li key={node.id}>
                  <div
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      isThisPlaying
                        ? "border-brand-500/50 bg-brand-500/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                    style={{ paddingLeft: `${1 + depth * 0.75}rem` }}
                  >
                    {/* Episode number */}
                    <span className="w-6 shrink-0 text-center text-xs text-slate-600">
                      {idx + 1}
                    </span>

                    {/* Depth indicator */}
                    {depth > 0 && (
                      <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
                    )}

                    {/* Title + duration */}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${isThisPlaying ? "text-brand-200" : "text-white"}`}>
                        {node.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        ~{mins} min read
                      </p>
                    </div>

                    {/* Play / playing indicator */}
                    {isThisPlaying ? (
                      <span className="flex items-center gap-1 text-xs text-brand-400">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                        </span>
                        Playing
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (isPlaying) stopTTS();
                          playEpisode(node.id, node.title);
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-brand-300 transition hover:bg-brand-600/40 hover:text-white"
                        title={`Play: ${node.title}`}
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-6 text-center text-xs text-slate-600">
            {ordered.length} episode{ordered.length === 1 ? "" : "s"} · The TTS player bar at the bottom gives you full controls (speed, voice, rewind).
          </p>
        </>
      )}
    </div>
  );
}
