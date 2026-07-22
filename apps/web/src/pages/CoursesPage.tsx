import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Youtube,
  BookOpen,
  MoreVertical,
  Trash2,
  RefreshCw,
  Pencil,
  Play,
  ChevronRight,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useCourses, courseOps, type YTCourse, type YTCourseVideoMeta } from "@/lib/courseStore";
import { extractPlaylistId, buildCourseFromPlaylist } from "@/lib/aiCourseActions";
import { useAppData } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaylistPreview {
  playlistId: string;
  title: string;
  thumbnailUrl: string;
  videoCount: number;
  channelTitle: string;
  videos: RawVideo[];
}

interface RawVideo {
  videoId: string;       // matches playlist.ts VideoItem.videoId
  title: string;
  channelTitle: string;  // matches playlist.ts VideoItem.channelTitle
  thumbnailUrl: string;
  durationSec: number;
  description?: string;
}

interface ProgressState {
  step: string;
  percent: number;
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return `crs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ percent, className = "" }: { percent: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-slate-700 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-blue-500 transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

function CourseCard({
  course,
  onOpen,
  onRename,
  onDelete,
  onCheckNew,
}: {
  course: YTCourse;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCheckNew: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const videos = Object.values(course.videos);
  const watchedCount = videos.filter((v) => v.watched).length;
  const totalCount = videos.length;
  const progressPct = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;
  const totalSec = videos.reduce((s, v) => s + (v.durationSec ?? 0), 0);

  function handleMenuClick(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen((o) => !o);
  }

  function handleAction(action: () => void, e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    action();
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmDelete(true);
  }

  function handleConfirmDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
    onDelete();
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  return (
    <div
      className="relative flex flex-col rounded-xl border border-slate-700 bg-slate-800 overflow-hidden cursor-pointer hover:border-slate-500 transition-colors"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      {course.thumbnailUrl ? (
        <img
          src={course.thumbnailUrl}
          alt={course.name}
          className="w-full aspect-video object-cover"
        />
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-blue-900 to-slate-800 flex items-center justify-center">
          <Youtube className="w-12 h-12 text-blue-400 opacity-50" />
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-white leading-snug line-clamp-2 flex-1">
            {course.name}
          </h3>
          {/* Three-dot menu */}
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleMenuClick}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              aria-label="Course options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-20 w-48 rounded-lg border border-slate-600 bg-slate-800 shadow-xl py-1">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                  onClick={(e) => handleAction(onRename, e)}
                >
                  <Pencil className="w-4 h-4" /> Rename
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                  onClick={(e) => handleAction(onCheckNew, e)}
                >
                  <RefreshCw className="w-4 h-4" /> Check for new videos
                </button>
                <div className="my-1 border-t border-slate-700" />
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {course.modules.length} module{course.modules.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Play className="w-3.5 h-3.5" />
            {totalCount} video{totalCount !== 1 ? "s" : ""}
          </span>
          {totalSec > 0 && (
            <span>{formatDuration(totalSec)}</span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-auto pt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{watchedCount} of {totalCount} watched</span>
            <span>{progressPct}%</span>
          </div>
          <ProgressBar percent={progressPct} />
        </div>

        {/* Open button */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-1.5 transition-colors"
        >
          Open <ChevronRight className="w-4 h-4" />
        </button>

        {/* Delete confirmation inline */}
        {confirmDelete && (
          <div
            className="mt-2 rounded-lg border border-red-700 bg-red-950 p-3 text-xs text-red-300"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 font-medium">Are you sure? This will delete the course and all quizzes.</p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                className="rounded bg-red-600 hover:bg-red-500 px-2.5 py-1 text-white font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="rounded bg-slate-700 hover:bg-slate-600 px-2.5 py-1 text-slate-200 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Modal
// ---------------------------------------------------------------------------

function ImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (courseId: string) => void;
}) {
  const data = useAppData();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PlaylistPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    setUrlError(null);
    setFetchError(null);
    setPreview(null);

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      setUrlError("Could not find a YouTube playlist ID in that URL. Please paste a valid playlist link.");
      return;
    }

    setFetching(true);
    try {
      const res = await fetch("/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Failed to fetch playlist: ${text}`);
      }

      const json = await res.json() as {
        playlistTitle?: string;   // matches playlist.ts response field
        thumbnailUrl?: string;
        channelTitle?: string;
        videos?: RawVideo[];
        totalCount?: number;
        noApiKey?: boolean;
        error?: string;
      };

      if (json.noApiKey) {
        throw new Error("YOUTUBE_API_KEY is not configured in Cloudflare environment variables.");
      }
      if (json.error) throw new Error(json.error);

      setPreview({
        playlistId,
        title: json.playlistTitle ?? "Untitled Playlist",
        thumbnailUrl: json.thumbnailUrl ?? "",
        videoCount: json.totalCount ?? json.videos?.length ?? 0,
        channelTitle: json.channelTitle ?? "",
        videos: json.videos ?? [],
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  }, [url]);

  const handleGenerate = useCallback(async () => {
    if (!preview) return;
    setGenError(null);
    setGenerating(true);
    setProgress({ step: "Creating course…", percent: 0 });

    const courseId = uid();
    const now = Date.now();

    // Build initial videos record — keys are YouTube video IDs
    const videos: Record<string, YTCourseVideoMeta> = {};
    for (const v of preview.videos) {
      if (!v.videoId) continue; // skip malformed entries
      videos[v.videoId] = {
        youtubeId: v.videoId,
        title: v.title,
        channel: v.channelTitle,
        thumbnailUrl: v.thumbnailUrl,
        durationSec: v.durationSec,
        description: v.description,
        watched: false,
      };
    }

    const newCourse: YTCourse = {
      id: courseId,
      name: preview.title,
      playlistUrl: url,
      playlistId: preview.playlistId,
      channelTitle: preview.channelTitle,
      thumbnailUrl: preview.thumbnailUrl,
      modules: [],
      videos: {},
      totalVideos: 0,
      createdAt: now,
      updatedAt: now,
    };

    courseOps.add(newCourse);
    courseOps.updateVideos(courseId, videos);

    try {
      await buildCourseFromPlaylist(
        data.aiKeys,
        courseId,
        (step, percent) => setProgress({ step, percent })
      );
      onImported(courseId);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
      setGenerating(false);
      setProgress(null);
    }
  }, [preview, url, data.aiKeys, onImported]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !generating) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-400" />
            Import from YouTube
          </h2>
          {!generating && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* URL input */}
        {!generating && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">YouTube Playlist URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(null); setPreview(null); setFetchError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !fetching) handleFetch(); }}
                placeholder="https://youtube.com/playlist?list=PL..."
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleFetch}
                disabled={fetching || !url.trim()}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 transition-colors flex items-center gap-1.5"
              >
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {fetching ? "Fetching…" : "Fetch"}
              </button>
            </div>
            {urlError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {urlError}
              </p>
            )}
            {fetchError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {fetchError}
              </p>
            )}
          </div>
        )}

        {/* Preview */}
        {preview && !generating && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex gap-4">
            {preview.thumbnailUrl ? (
              <img
                src={preview.thumbnailUrl}
                alt={preview.title}
                className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-16 bg-gradient-to-br from-blue-900 to-slate-700 rounded-lg flex-shrink-0 flex items-center justify-center">
                <Youtube className="w-7 h-7 text-blue-400 opacity-60" />
              </div>
            )}
            <div className="flex flex-col gap-1 min-w-0">
              <p className="font-semibold text-white text-sm leading-snug line-clamp-2">{preview.title}</p>
              {preview.channelTitle && (
                <p className="text-xs text-slate-400">{preview.channelTitle}</p>
              )}
              <p className="text-xs text-slate-400">{preview.videoCount} video{preview.videoCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}

        {/* Generate button */}
        {preview && !generating && (
          <>
            {genError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {genError}
              </p>
            )}
            <button
              onClick={handleGenerate}
              disabled={data.aiKeys.length === 0}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Generate Course (AI)
              {data.aiKeys.length === 0 && (
                <span className="text-xs opacity-70">(no AI keys configured)</span>
              )}
            </button>
          </>
        )}

        {/* Generating progress */}
        {generating && progress && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400 flex-shrink-0" />
              <p className="text-sm text-white font-medium">{progress.step}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <ProgressBar percent={progress.percent} className="h-2" />
              <p className="text-right text-xs text-slate-400">{progress.percent}%</p>
            </div>
            <p className="text-xs text-slate-500 text-center">This may take a minute — AI is generating modules, pages, and quizzes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rename Modal
// ---------------------------------------------------------------------------

function RenameModal({
  course,
  onClose,
  onSave,
}: {
  course: YTCourse;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(course.name);

  function handleSave() {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Rename Course</h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium px-4 py-2 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()} className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast banner
// ---------------------------------------------------------------------------

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-green-700 bg-green-950 px-5 py-3 shadow-xl text-green-300 text-sm font-medium max-w-sm">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-green-400 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CoursesPage() {
  const navigate = useNavigate();
  const courses = useCourses();

  const [showImport, setShowImport] = useState(false);
  const [renamingCourse, setRenamingCourse] = useState<YTCourse | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleOpen(courseId: string) {
    navigate(`/app/courses/${courseId}`);
  }

  function handleRename(courseId: string, name: string) {
    courseOps.update(courseId, { name });
    setRenamingCourse(null);
  }

  function handleDelete(courseId: string) {
    courseOps.remove(courseId);
  }

  async function handleCheckNew(course: YTCourse) {
    if (checkingId) return;
    setCheckingId(course.id);
    try {
      const res = await fetch("/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: course.playlistId }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const json = await res.json() as { videos?: RawVideo[] };
      const returnedVideos = json.videos ?? [];
      const existingIds = new Set(Object.keys(course.videos));
      const newVideos = returnedVideos.filter((v) => v.videoId && !existingIds.has(v.videoId));

      if (newVideos.length === 0) {
        showToast("No new videos found.");
      } else {
        const updatedVideos = { ...course.videos };
        for (const v of newVideos) {
          updatedVideos[v.videoId] = {
            youtubeId: v.videoId,
            title: v.title,
            channel: v.channelTitle,
            thumbnailUrl: v.thumbnailUrl,
            durationSec: v.durationSec,
            description: v.description,
            watched: false,
          };
        }
        courseOps.updateVideos(course.id, updatedVideos);
        courseOps.update(course.id, { lastCheckedAt: Date.now() });
        showToast(`${newVideos.length} new video${newVideos.length !== 1 ? "s" : ""} added!`);
      }
    } catch (err) {
      showToast(`Error checking for new videos: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Courses</h1>
          <p className="text-sm text-slate-400 mt-0.5">Import YouTube playlists and turn them into structured courses.</p>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Import from YouTube
        </button>
      </div>

      {/* Course grid */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <Youtube className="w-9 h-9 text-slate-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-300">No courses yet</p>
            <p className="text-sm text-slate-500 mt-1">Import a YouTube playlist to get started.</p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Import Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="relative">
              {checkingId === course.id && (
                <div className="absolute inset-0 z-10 rounded-xl bg-slate-900/70 flex items-center justify-center gap-2 text-slate-300 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking…
                </div>
              )}
              <CourseCard
                course={course}
                onOpen={() => handleOpen(course.id)}
                onRename={() => setRenamingCourse(course)}
                onDelete={() => handleDelete(course.id)}
                onCheckNew={() => handleCheckNew(course)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(courseId) => {
            setShowImport(false);
            navigate(`/app/courses/${courseId}`);
          }}
        />
      )}

      {/* Rename modal */}
      {renamingCourse && (
        <RenameModal
          course={renamingCourse}
          onClose={() => setRenamingCourse(null)}
          onSave={(name) => handleRename(renamingCourse.id, name)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
