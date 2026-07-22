import { useSyncExternalStore, useState, useEffect, useRef } from "react";
import { Mic, Play, Square, Clock, ChevronRight, ChevronDown, SkipBack, SkipForward, Download, Loader2 } from "lucide-react";
import { useAppData, getState } from "@/lib/store";
import { speak, stopTTS, subscribeToTTS, getTTSState, markdownToSpeakable, isTTSSupported, puterTTSBlob } from "@/lib/tts";
import type { TreeNode } from "@/lib/types";
import { setPodcastEpisodes, setPodcastCurrentIdx, clearPodcast } from "@/lib/podcastStore";
import type { PodcastEpisode } from "@/lib/podcastStore";

// localStorage helpers
const POS_KEY = "knowhub:podcast:pos";
function loadPositions(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(POS_KEY) ?? "{}"); } catch { return {}; }
}
function savePosition(id: string, pos: number) {
  const p = loadPositions();
  p[id] = pos;
  localStorage.setItem(POS_KEY, JSON.stringify(p));
}

function estimateMins(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 150));
}

function dfsOrder(nodes: TreeNode[], parentId: string | null = null, depth = 0): Array<TreeNode & { depth: number }> {
  return nodes
    .filter((n) => n.parentId === parentId)
    .flatMap((n) => [{ ...n, depth }, ...dfsOrder(nodes, n.id, depth + 1)]);
}

function progressDot(pos: number | undefined) {
  if (pos === undefined) return "bg-slate-600"; // not started
  if (pos >= 0.9) return "bg-green-500";        // done
  return "bg-amber-400";                         // in progress
}

export default function PodcastPage() {
  const data = useAppData();
  const ttsState = useSyncExternalStore(subscribeToTTS, getTTSState, getTTSState);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [positions, setPositions] = useState<Record<string, number>>(loadPositions);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DFS-ordered episodes (nodes with content)
  const allOrdered = dfsOrder(data.nodes).filter((n) => data.pages[n.id]?.trim());
  // Root nodes (depth 0)
  const roots = dfsOrder(data.nodes).filter((n) => n.depth === 0);

  // Poll TTS progress every 2s
  useEffect(() => {
    if (playingId && ttsState.active) {
      pollRef.current = setInterval(() => {
        const state = getTTSState();
        if (state.active && playingId) {
          const pos = state.progress ?? 0;
          savePosition(playingId, pos);
          setPositions(loadPositions());
        }
      }, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [playingId, ttsState.active]);

  // Download / recording state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function downloadEpisode(nodeId: string, title: string, text: string) {
    if (downloadingId) return;
    setDownloadingId(nodeId);
    setDownloadError(null);

    // Try puter TTS first — gives a clean audio blob without screen sharing
    const puterToken = getState().puterApiToken ?? "";
    if (puterToken) {
      try {
        const blob = await puterTTSBlob(text, puterToken);
        triggerDownload(blob, `${title.replace(/[^\w\s-]/g, "")}.mp3`);
        setDownloadingId(null);
        return;
      } catch {
        // Fall through to tab audio capture
      }
    }

    // Tab audio capture via getDisplayMedia
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setDownloadError("Audio capture not supported in this browser. Add a Puter API token in Settings for direct download.");
      setDownloadingId(null);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: true,
      } as DisplayMediaStreamOptions);

      const chunks: Blob[] = [];
      chunksRef.current = chunks;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const ext = recorder.mimeType.includes("ogg") ? "ogg" : "webm";
        triggerDownload(blob, `${title.replace(/[^\w\s-]/g, "")}.${ext}`);
        setDownloadingId(null);
      };

      recorder.start();

      // Start TTS — recorder captures the tab audio
      speak(text, { title });
      setPlayingId(nodeId);

      // Stop recorder when TTS finishes
      const unsub = subscribeToTTS(() => {
        const s = getTTSState();
        if (!s.active && recorder.state === "recording") {
          recorder.stop();
          unsub();
        }
      });
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Capture failed. Grant tab audio permission when prompted.");
      setDownloadingId(null);
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function buildEpList(): PodcastEpisode[] {
    return allOrdered.map((n) => ({
      id: n.id,
      title: n.title,
      text: markdownToSpeakable(data.pages[n.id] ?? ""),
    }));
  }

  function playEpisode(id: string, title: string) {
    if (!isTTSSupported()) {
      alert("Text-to-speech is not available on this device.");
      return;
    }
    const body = data.pages[id] ?? "";
    const text = markdownToSpeakable(body);
    setPlayingId(id);

    // Register episode list for TTSPlayer navigation
    const epList = buildEpList();
    const idx = epList.findIndex((e) => e.id === id);
    setPodcastEpisodes(epList, idx);

    speak(text, { title });
  }

  function stopEpisode() {
    stopTTS();
    setPlayingId(null);
    clearPodcast();
  }

  function toggleRoot(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Flat episode index for Prev/Next
  const playingIdx = playingId ? allOrdered.findIndex((n) => n.id === playingId) : -1;

  function playAdjacentEpisode(delta: number) {
    const next = allOrdered[playingIdx + delta];
    if (next) {
      setPodcastCurrentIdx(playingIdx + delta);
      playEpisode(next.id, next.title);
    }
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
          <p className="text-sm text-slate-400">Listen to your learning pages read aloud — one episode at a time.</p>
        </div>
      </div>

      {allOrdered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <Mic className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">No pages with content yet. Generate some learning pages first.</p>
        </div>
      ) : (
        <>
          {/* Now-playing banner */}
          {ttsState.active && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
              </span>
              <span className="flex-1 truncate text-sm font-medium text-brand-100">
                {ttsState.title || "Playing…"}
              </span>
              {playingIdx >= 0 && (
                <span className="shrink-0 text-xs text-slate-400">Ep {playingIdx + 1}/{allOrdered.length}</span>
              )}
              <button
                onClick={() => playAdjacentEpisode(-1)}
                disabled={playingIdx <= 0}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-300 hover:bg-brand-500/20 disabled:opacity-30"
                title="Previous"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={() => playAdjacentEpisode(1)}
                disabled={playingIdx < 0 || playingIdx >= allOrdered.length - 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-300 hover:bg-brand-500/20 disabled:opacity-30"
                title="Next"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                onClick={stopEpisode}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
              >
                <Square className="h-3 w-3" /> Stop
              </button>
            </div>
          )}

          {/* Tree list */}
          <div className="mt-5 space-y-2">
            {roots.map((root) => {
              const isExpanded = expanded.has(root.id);
              const descendants = allOrdered.filter((n) => {
                // all nodes under this root (same root ancestor)
                return n.id !== root.id && (() => {
                  let cur: typeof n | undefined = n;
                  while (cur && cur.parentId) {
                    if (cur.parentId === root.id) return true;
                    cur = allOrdered.find((x) => x.id === cur!.parentId);
                  }
                  return false;
                })();
              });
              const childCount = descendants.length + (data.pages[root.id]?.trim() ? 1 : 0);
              const rootHasContent = !!data.pages[root.id]?.trim();
              // Episodes visible under this root when expanded
              const visibleEpisodes: Array<TreeNode & { depth: number }> = [];
              if (rootHasContent) visibleEpisodes.push(root);
              visibleEpisodes.push(...descendants);

              return (
                <div key={root.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                  {/* Root header */}
                  <button
                    onClick={() => toggleRoot(root.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="flex-1 font-semibold text-white truncate">{root.title}</span>
                    <span className="text-xs text-slate-500">{childCount} episode{childCount !== 1 ? "s" : ""}</span>
                  </button>

                  {/* Expanded episodes */}
                  {isExpanded && visibleEpisodes.map((node) => {
                    const body = data.pages[node.id] ?? "";
                    const mins = estimateMins(body);
                    const isThisPlaying = ttsState.active && playingId === node.id;
                    const savedPos = positions[node.id];
                    const hasProgress = savedPos !== undefined && savedPos > 0;
                    const globalIdx = allOrdered.findIndex((x) => x.id === node.id);
                    const depth = node.depth ?? 0;

                    return (
                      <div
                        key={node.id}
                        className={`flex items-center gap-3 border-t border-white/5 px-4 py-2.5 transition ${
                          isThisPlaying ? "bg-brand-500/10" : "hover:bg-white/[0.03]"
                        }`}
                        style={{ paddingLeft: `${1 + depth * 0.75}rem` }}
                      >
                        {/* Progress dot */}
                        <span className={`h-2 w-2 shrink-0 rounded-full ${progressDot(savedPos)}`} />

                        {/* Title + duration */}
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${isThisPlaying ? "text-brand-200" : "text-white"}`}>
                            <span className="text-slate-500 mr-1.5 text-xs">Ep {globalIdx + 1}</span>
                            {node.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />~{mins} min
                          </p>
                        </div>

                        {/* Play / Resume / Playing */}
                        <div className="shrink-0 flex items-center gap-1.5">
                        {isThisPlaying ? (
                          <span className="flex items-center gap-1 text-xs text-brand-400 shrink-0">
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
                              const body = data.pages[node.id] ?? "";
                              const fullText = markdownToSpeakable(body);
                              const savedPos = positions[node.id] ?? 0;
                              const startChar = savedPos > 0.05 ? Math.floor(savedPos * fullText.length) : 0;
                              const textToSpeak = startChar > 0 ? fullText.slice(startChar) : fullText;
                              setPlayingId(node.id);
                              const epList = buildEpList();
                              const idx = epList.findIndex((e) => e.id === node.id);
                              setPodcastEpisodes(epList, idx);
                              speak(textToSpeak, { title: node.title });
                            }}
                            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-300 hover:bg-brand-500/20 transition"
                            title={hasProgress ? `Resume: ${node.title}` : `Play: ${node.title}`}
                          >
                            <Play className="h-3 w-3" />
                            {hasProgress ? "Resume" : "Play"}
                          </button>
                        )}
                        {/* Download audio */}
                        <button
                          onClick={() => {
                            const body = data.pages[node.id] ?? "";
                            const text = markdownToSpeakable(body);
                            void downloadEpisode(node.id, node.title, text);
                          }}
                          disabled={!!downloadingId}
                          title="Download audio"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition"
                        >
                          {downloadingId === node.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {downloadError && (
            <p className="mt-3 text-center text-xs text-rose-400">{downloadError}</p>
          )}
          <p className="mt-6 text-center text-xs text-slate-600">
            {allOrdered.length} episode{allOrdered.length === 1 ? "" : "s"} · Click a root to expand its episodes.
          </p>
        </>
      )}
    </div>
  );
}
