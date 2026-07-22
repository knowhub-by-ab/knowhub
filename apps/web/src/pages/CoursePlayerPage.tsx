import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useCourses,
  courseOps,
  type YTCourse,
  type YTCourseModule,
  type YTCourseVideoMeta,
  courseUid,
} from "@/lib/courseStore";
import { useAppData } from "@/lib/store";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Circle,
  Pencil,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoveVertical,
  Plus,
  Trash2,
  BookOpen,
  ClipboardCheck,
  FileText,
  X,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function moduleWatchedCount(mod: YTCourseModule, videos: YTCourse["videos"]): number {
  return mod.videoIds.filter((id) => videos[id]?.watched).length;
}

// ---------------------------------------------------------------------------
// Inline editable title
// ---------------------------------------------------------------------------

interface InlineTitleProps {
  value: string;
  onSave: (v: string) => void;
}

function InlineTitle({ value, onSave }: InlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-0.5 outline-none border border-indigo-500"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className="flex-1 text-sm font-medium text-gray-100 truncate cursor-pointer"
      title={value}
    >
      {value}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          setEditing(true);
        }}
        className="ml-1.5 text-gray-400 hover:text-indigo-400 inline-flex"
      >
        <Pencil size={12} />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Video row in sidebar
// ---------------------------------------------------------------------------

interface VideoRowProps {
  video: YTCourseVideoMeta;
  isActive: boolean;
  editMode: boolean;
  moduleId: string;
  allModules: YTCourseModule[];
  indexInModule: number;
  totalInModule: number;
  courseId: string;
  onSelect: () => void;
}

function VideoRow({
  video,
  isActive,
  editMode,
  moduleId,
  allModules,
  indexInModule,
  totalInModule,
  courseId,
  onSelect,
}: VideoRowProps) {
  const [showMove, setShowMove] = useState(false);

  function moveUp() {
    const mod = allModules.find((m) => m.id === moduleId)!;
    if (indexInModule === 0) return;
    const newIds = [...mod.videoIds];
    [newIds[indexInModule - 1], newIds[indexInModule]] = [
      newIds[indexInModule],
      newIds[indexInModule - 1],
    ];
    const updated = allModules.map((m) =>
      m.id === moduleId ? { ...m, videoIds: newIds } : m
    );
    courseOps.updateModules(courseId, updated);
  }

  function moveDown() {
    const mod = allModules.find((m) => m.id === moduleId)!;
    if (indexInModule >= totalInModule - 1) return;
    const newIds = [...mod.videoIds];
    [newIds[indexInModule], newIds[indexInModule + 1]] = [
      newIds[indexInModule + 1],
      newIds[indexInModule],
    ];
    const updated = allModules.map((m) =>
      m.id === moduleId ? { ...m, videoIds: newIds } : m
    );
    courseOps.updateModules(courseId, updated);
  }

  function moveToModule(targetModuleId: string) {
    courseOps.moveVideoToModule(courseId, video.youtubeId, moduleId, targetModuleId);
    setShowMove(false);
  }

  return (
    <div
      className={`flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer group transition-colors ${
        isActive ? "bg-indigo-700/40" : "hover:bg-gray-700/50"
      }`}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <img
        src={video.thumbnailUrl}
        alt=""
        className="w-14 h-9 object-cover rounded flex-shrink-0 mt-0.5"
        loading="lazy"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs text-gray-200 leading-tight line-clamp-2"
          title={video.title}
        >
          {video.title}
        </p>
        {video.durationSec > 0 && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {formatDuration(video.durationSec)}
          </p>
        )}
      </div>

      {/* Watch indicator */}
      <div className="flex-shrink-0 mt-1">
        {video.watched ? (
          <CheckCircle2 size={14} className="text-green-400" />
        ) : (
          <Circle size={14} className="text-gray-500" />
        )}
      </div>

      {/* Edit controls */}
      {editMode && (
        <div
          className="flex-shrink-0 flex flex-col gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="text-gray-400 hover:text-white disabled:opacity-30"
            onClick={moveUp}
            disabled={indexInModule === 0}
            title="Move up"
          >
            <ChevronUp size={13} />
          </button>
          <button
            className="text-gray-400 hover:text-white disabled:opacity-30"
            onClick={moveDown}
            disabled={indexInModule >= totalInModule - 1}
            title="Move down"
          >
            <ChevronDown size={13} />
          </button>
          <div className="relative">
            <button
              className="text-gray-400 hover:text-indigo-400"
              onClick={() => setShowMove((s) => !s)}
              title="Move to module"
            >
              <MoveVertical size={13} />
            </button>
            {showMove && (
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 min-w-[140px]">
                {allModules
                  .filter((m) => m.id !== moduleId)
                  .map((m) => (
                    <button
                      key={m.id}
                      className="w-full text-left text-xs text-gray-200 px-3 py-1.5 hover:bg-gray-700"
                      onClick={() => moveToModule(m.id)}
                    >
                      {m.title}
                    </button>
                  ))}
                {allModules.filter((m) => m.id !== moduleId).length === 0 && (
                  <p className="text-xs text-gray-500 px-3 py-1.5">No other modules</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module section in sidebar
// ---------------------------------------------------------------------------

interface ModuleSectionProps {
  mod: YTCourseModule;
  course: YTCourse;
  editMode: boolean;
  expanded: boolean;
  activeVideoId: string | null;
  onToggle: () => void;
  onSelectVideo: (id: string) => void;
  onDeleteModule: (moduleId: string) => void;
}

function ModuleSection({
  mod,
  course,
  editMode,
  expanded,
  activeVideoId,
  onToggle,
  onSelectVideo,
  onDeleteModule,
}: ModuleSectionProps) {
  const watched = moduleWatchedCount(mod, course.videos);
  const total = mod.videoIds.length;

  return (
    <div className="mb-1">
      {/* Module header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-700/40 rounded cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {editMode ? (
          <InlineTitle
            value={mod.title}
            onSave={(t) => courseOps.renameModule(course.id, mod.id, t)}
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-gray-100 truncate" title={mod.title}>
            {mod.title}
          </span>
        )}

        <span className="text-[10px] text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">
          {watched}/{total}
        </span>

        {editMode && (
          <button
            className="flex-shrink-0 text-gray-500 hover:text-red-400 ml-1"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteModule(mod.id);
            }}
            title="Delete module"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Video list */}
      {expanded && (
        <div className="ml-3 mt-0.5 space-y-0.5">
          {mod.videoIds.map((vid, idx) => {
            const video = course.videos[vid];
            if (!video) return null;
            return (
              <VideoRow
                key={vid}
                video={video}
                isActive={activeVideoId === vid}
                editMode={editMode}
                moduleId={mod.id}
                allModules={course.modules}
                indexInModule={idx}
                totalInModule={mod.videoIds.length}
                courseId={course.id}
                onSelect={() => onSelectVideo(vid)}
              />
            );
          })}
          {mod.videoIds.length === 0 && (
            <p className="text-xs text-gray-500 px-2 py-1 italic">No videos</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

function NotesTab({ mod, pages }: { mod: YTCourseModule; pages: Record<string, string> }) {
  const content = mod.pageNodeId ? pages[mod.pageNodeId] : undefined;
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
        <BookOpen size={28} className="opacity-40" />
        <p className="text-sm">No notes available for this module.</p>
      </div>
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed p-1">
      {content}
    </pre>
  );
}

function ModuleQuizTab({ mod }: { mod: YTCourseModule }) {
  if (!mod.quizId) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
        <ClipboardCheck size={28} className="opacity-40" />
        <p className="text-sm">Quiz not generated yet.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3">
      <ClipboardCheck size={32} className="text-indigo-400" />
      <p className="text-sm text-gray-300">Ready to test your module knowledge?</p>
      <Link
        to={`/app/assessments?quizId=${mod.quizId}`}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <ClipboardCheck size={16} />
        Open Module Quiz
      </Link>
    </div>
  );
}

function VideoQuizTab({ video }: { video: YTCourseVideoMeta | undefined }) {
  if (!video?.quizId) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
        <ClipboardCheck size={28} className="opacity-40" />
        <p className="text-sm">Quiz not generated yet.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3">
      <ClipboardCheck size={32} className="text-indigo-400" />
      <p className="text-sm text-gray-300">Ready to test your video knowledge?</p>
      <Link
        to={`/app/assessments?quizId=${video.quizId}`}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <ClipboardCheck size={16} />
        Open Video Quiz
      </Link>
    </div>
  );
}

function TranscriptTab({ video }: { video: YTCourseVideoMeta | undefined }) {
  if (!video?.transcript) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
        <FileText size={28} className="opacity-40" />
        <p className="text-sm">Transcript not available for this video.</p>
      </div>
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed p-1">
      {video.transcript}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type TabId = "notes" | "module-quiz" | "video-quiz" | "transcript";

export default function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const courses = useCourses();
  const appData = useAppData();

  const course = courses.find((c) => c.id === courseId);

  // ---- State ----------------------------------------------------------------
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("notes");
  const [editMode, setEditMode] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Add-module dialog state
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const addModuleInputRef = useRef<HTMLInputElement>(null);

  // Watch timer
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Initialise first video on mount / course change ---------------------
  useEffect(() => {
    if (!course) return;
    // Expand all modules initially
    setExpandedModules(new Set(course.modules.map((m) => m.id)));

    // Pick first video
    for (const mod of course.modules) {
      if (mod.videoIds.length > 0) {
        const firstVid = mod.videoIds[0];
        setActiveVideoId(firstVid);
        setActiveModuleId(mod.id);
        return;
      }
    }
  }, [courseId]); // intentionally only on courseId change

  // ---- Derived ---------------------------------------------------------------
  const activeModule = course?.modules.find((m) => m.id === activeModuleId) ?? null;
  const activeVideo = activeVideoId && course ? course.videos[activeVideoId] : undefined;

  const totalVideos = course ? Object.keys(course.videos).length : 0;
  const watchedVideos = course
    ? Object.values(course.videos).filter((v) => v.watched).length
    : 0;

  // ---- Watch timer ----------------------------------------------------------
  useEffect(() => {
    if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    if (!activeVideoId || !courseId) return;

    watchTimerRef.current = setTimeout(() => {
      courseOps.markVideoWatched(courseId, activeVideoId);
    }, 30_000);

    return () => {
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    };
  }, [activeVideoId, courseId]);

  // ---- Handlers -------------------------------------------------------------
  const handleSelectVideo = useCallback(
    (youtubeId: string) => {
      if (!course) return;
      setActiveVideoId(youtubeId);
      // Find which module owns this video
      const ownerMod = course.modules.find((m) => m.videoIds.includes(youtubeId));
      if (ownerMod) setActiveModuleId(ownerMod.id);
    },
    [course]
  );

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  function handleDeleteModule(moduleId: string) {
    if (!course) return;
    const idx = course.modules.findIndex((m) => m.id === moduleId);
    if (idx === -1) return;
    const confirmed = window.confirm(
      `Delete module "${course.modules[idx].title}"? Its videos will be moved to another module.`
    );
    if (!confirmed) return;

    const videoIds = course.modules[idx].videoIds;
    // Find target module: next or previous
    const otherModules = course.modules.filter((m) => m.id !== moduleId);
    if (otherModules.length === 0) {
      // Can't delete last module
      window.alert("Cannot delete the last module.");
      return;
    }
    // Move videos to adjacent module
    const targetMod = otherModules[Math.min(idx, otherModules.length - 1)];
    const updatedModules = course.modules
      .map((m) => {
        if (m.id === moduleId) return null;
        if (m.id === targetMod.id) {
          return { ...m, videoIds: [...m.videoIds, ...videoIds] };
        }
        return m;
      })
      .filter(Boolean) as typeof course.modules;

    courseOps.updateModules(course.id, updatedModules.map((m, i) => ({ ...m, order: i })));

    // If the deleted module was active, switch to target
    if (activeModuleId === moduleId) {
      setActiveModuleId(targetMod.id);
    }
  }

  function handleAddModule() {
    if (!course || !newModuleTitle.trim()) return;
    const newMod: YTCourseModule = {
      id: courseUid(),
      title: newModuleTitle.trim(),
      videoIds: [],
      order: course.modules.length,
    };
    courseOps.updateModules(course.id, [...course.modules, newMod]);
    setExpandedModules((prev) => new Set([...prev, newMod.id]));
    setNewModuleTitle("");
    setShowAddModule(false);
  }

  // ---- Focus add-module input -----------------------------------------------
  useEffect(() => {
    if (showAddModule) setTimeout(() => addModuleInputRef.current?.focus(), 50);
  }, [showAddModule]);

  // ---- Not found ------------------------------------------------------------
  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-900 text-gray-300 gap-4">
        <BookOpen size={48} className="opacity-30" />
        <p className="text-lg font-medium">Course not found.</p>
        <Link
          to="/app/courses"
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm"
        >
          <ArrowLeft size={16} />
          Back to courses
        </Link>
      </div>
    );
  }

  // ---- Render ---------------------------------------------------------------
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "notes", label: "Notes", icon: <BookOpen size={14} /> },
    { id: "module-quiz", label: "Module Quiz", icon: <ClipboardCheck size={14} /> },
    { id: "video-quiz", label: "Video Quiz", icon: <ClipboardCheck size={14} /> },
    { id: "transcript", label: "Transcript", icon: <FileText size={14} /> },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-900 text-white overflow-hidden">
      {/* ================================================================
          SIDEBAR
      ================================================================ */}
      <aside className="w-72 flex-shrink-0 overflow-y-auto border-r border-gray-700 bg-gray-900 flex flex-col">
        {/* Course title + back */}
        <div className="px-3 pt-3 pb-2 border-b border-gray-700 flex-shrink-0">
          <Link
            to="/app/courses"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs mb-2 transition-colors"
          >
            <ArrowLeft size={14} />
            All courses
          </Link>
          <h1 className="text-sm font-semibold text-white leading-snug line-clamp-2">
            {course.name}
          </h1>

          {/* Progress */}
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>{watchedVideos} of {totalVideos} complete</span>
              <span>{totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${totalVideos > 0 ? (watchedVideos / totalVideos) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Edit toggle */}
          <button
            className={`mt-2 w-full text-xs px-2 py-1 rounded flex items-center justify-center gap-1.5 transition-colors ${
              editMode
                ? "bg-green-700 hover:bg-green-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200"
            }`}
            onClick={() => setEditMode((e) => !e)}
          >
            {editMode ? (
              <>
                <Check size={12} />
                Done Editing
              </>
            ) : (
              <>
                <Pencil size={12} />
                Edit Course
              </>
            )}
          </button>
        </div>

        {/* Module list */}
        <div className="flex-1 overflow-y-auto px-1 py-2">
          {course.modules
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((mod) => (
              <ModuleSection
                key={mod.id}
                mod={mod}
                course={course}
                editMode={editMode}
                expanded={expandedModules.has(mod.id)}
                activeVideoId={activeVideoId}
                onToggle={() => toggleModule(mod.id)}
                onSelectVideo={handleSelectVideo}
                onDeleteModule={handleDeleteModule}
              />
            ))}

          {/* Add module */}
          {editMode && (
            <div className="mt-2 px-1">
              {showAddModule ? (
                <div className="flex gap-1">
                  <input
                    ref={addModuleInputRef}
                    className="flex-1 text-xs bg-gray-700 border border-indigo-500 rounded px-2 py-1 text-white outline-none"
                    placeholder="Module title…"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddModule();
                      if (e.key === "Escape") {
                        setShowAddModule(false);
                        setNewModuleTitle("");
                      }
                    }}
                  />
                  <button
                    className="text-green-400 hover:text-green-300"
                    onClick={handleAddModule}
                    title="Add"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="text-gray-400 hover:text-gray-200"
                    onClick={() => {
                      setShowAddModule(false);
                      setNewModuleTitle("");
                    }}
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  className="w-full flex items-center gap-1.5 text-xs text-gray-400 hover:text-white py-1.5 px-2 rounded hover:bg-gray-700/50 transition-colors"
                  onClick={() => setShowAddModule(true)}
                >
                  <Plus size={13} />
                  Add module
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ================================================================
          MAIN CONTENT
      ================================================================ */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {activeVideoId ? (
          <>
            {/* YouTube player */}
            <div className="w-full">
              <iframe
                key={activeVideoId}
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                title={activeVideo?.title ?? "Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video rounded-lg bg-black"
              />
            </div>

            {/* Video title */}
            {activeVideo && (
              <div>
                <h2 className="text-base font-semibold text-white leading-snug">
                  {activeVideo.title}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{activeVideo.channel}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex flex-col flex-1 min-h-0 bg-gray-800 rounded-xl overflow-hidden">
              {/* Tab headers */}
              <div className="flex border-b border-gray-700 flex-shrink-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-400 bg-gray-800"
                        : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "notes" && (
                  <NotesTab
                    mod={activeModule ?? course.modules[0]}
                    pages={appData.pages}
                  />
                )}
                {activeTab === "module-quiz" && (
                  <ModuleQuizTab mod={activeModule ?? course.modules[0]} />
                )}
                {activeTab === "video-quiz" && <VideoQuizTab video={activeVideo} />}
                {activeTab === "transcript" && <TranscriptTab video={activeVideo} />}
              </div>
            </div>
          </>
        ) : (
          /* No video selected */
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
            <Play size={48} className="opacity-20" />
            <p className="text-sm">Select a video from the sidebar to start learning.</p>
          </div>
        )}
      </main>
    </div>
  );
}
