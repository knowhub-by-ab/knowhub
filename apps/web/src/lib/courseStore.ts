import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Course store — stored separately from main AppData to avoid bloating it.
// Follows the same useSyncExternalStore pattern as templateStore.ts.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "knowhub:courses:v1";

function uid() {
  return `crs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Domain interfaces
// ---------------------------------------------------------------------------

export interface YTCourseVideoMeta {
  youtubeId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  durationSec: number;
  description?: string;
  transcript?: string;        // fetched from transcript API, best-effort
  quizId?: string;            // id of Quiz in main AppData quizzes store
  watched: boolean;
  watchedAt?: number;
  positionMs?: number;        // last playback position for resume
}

export interface YTCourseModule {
  id: string;
  title: string;
  description?: string;
  videoIds: string[];         // ordered YouTube video IDs
  pageNodeId?: string;        // linked Learning Tree node id (auto-created)
  quizId?: string;            // id of Quiz in main AppData quizzes store
  order: number;
}

export interface YTCourse {
  id: string;
  name: string;
  description?: string;
  playlistUrl: string;
  playlistId: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  modules: YTCourseModule[];
  videos: Record<string, YTCourseVideoMeta>;  // keyed by youtubeId
  totalVideos: number;
  createdAt: number;
  updatedAt: number;
  lastCheckedAt?: number;
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function load(): YTCourse[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as YTCourse[]) : [];
  } catch {
    return [];
  }
}

let state: YTCourse[] = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage full */ }
}

function emit() {
  listeners.forEach((l) => l());
}

function setState(updater: (prev: YTCourse[]) => YTCourse[]) {
  state = updater(state);
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useCourses(): YTCourse[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ---------------------------------------------------------------------------
// Imperative operations
// ---------------------------------------------------------------------------

export const courseOps = {
  add(course: YTCourse): void {
    setState((prev) => [...prev, course]);
  },

  update(id: string, patch: Partial<YTCourse>): void {
    setState((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
      )
    );
  },

  remove(id: string): void {
    setState((prev) => prev.filter((c) => c.id !== id));
  },

  getAll(): YTCourse[] {
    return state;
  },

  getById(id: string): YTCourse | undefined {
    return state.find((c) => c.id === id);
  },

  markVideoWatched(courseId: string, youtubeId: string, positionMs?: number): void {
    setState((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const video = c.videos[youtubeId];
        if (!video) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          videos: {
            ...c.videos,
            [youtubeId]: {
              ...video,
              watched: true,
              watchedAt: Date.now(),
              ...(positionMs !== undefined ? { positionMs } : {}),
            },
          },
        };
      })
    );
  },

  setVideoQuiz(courseId: string, youtubeId: string, quizId: string): void {
    setState((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const video = c.videos[youtubeId];
        if (!video) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          videos: {
            ...c.videos,
            [youtubeId]: { ...video, quizId },
          },
        };
      })
    );
  },

  setModuleQuiz(courseId: string, moduleId: string, quizId: string): void {
    setState((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          modules: c.modules.map((m) =>
            m.id === moduleId ? { ...m, quizId } : m
          ),
        };
      })
    );
  },

  setModulePageNode(courseId: string, moduleId: string, nodeId: string): void {
    setState((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          modules: c.modules.map((m) =>
            m.id === moduleId ? { ...m, pageNodeId: nodeId } : m
          ),
        };
      })
    );
  },

  updateModules(courseId: string, modules: YTCourseModule[]): void {
    setState((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, modules, updatedAt: Date.now() } : c
      )
    );
  },

  updateVideos(courseId: string, videos: Record<string, YTCourseVideoMeta>): void {
    setState((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, videos, totalVideos: Object.keys(videos).length, updatedAt: Date.now() }
          : c
      )
    );
  },

  renameModule(courseId: string, moduleId: string, title: string): void {
    setState((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          modules: c.modules.map((m) =>
            m.id === moduleId ? { ...m, title: title.trim() || m.title } : m
          ),
        };
      })
    );
  },

  moveVideoToModule(
    courseId: string,
    youtubeId: string,
    fromModuleId: string,
    toModuleId: string,
    insertIndex?: number
  ): void {
    setState((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const modules = c.modules.map((m) => {
          if (m.id === fromModuleId) {
            return { ...m, videoIds: m.videoIds.filter((vid) => vid !== youtubeId) };
          }
          if (m.id === toModuleId) {
            const ids = m.videoIds.filter((vid) => vid !== youtubeId);
            const idx = insertIndex !== undefined ? Math.min(insertIndex, ids.length) : ids.length;
            ids.splice(idx, 0, youtubeId);
            return { ...m, videoIds: ids };
          }
          return m;
        });
        return { ...c, modules, updatedAt: Date.now() };
      })
    );
  },

  reorderModules(courseId: string, newOrder: string[]): void {
    setState((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const moduleMap = new Map(c.modules.map((m) => [m.id, m]));
        const reordered = newOrder
          .filter((id) => moduleMap.has(id))
          .map((id, idx) => ({ ...moduleMap.get(id)!, order: idx }));
        // Append any modules not listed in newOrder at the end
        const missing = c.modules
          .filter((m) => !newOrder.includes(m.id))
          .map((m, i) => ({ ...m, order: reordered.length + i }));
        return {
          ...c,
          modules: [...reordered, ...missing],
          updatedAt: Date.now(),
        };
      })
    );
  },
};

export { uid as courseUid };
