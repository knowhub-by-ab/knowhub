import { chatJSON, chatCompletion } from "@/lib/ai";
import { tree, quizzes, setPage } from "@/lib/store";
import { courseOps, courseUid, type YTCourseModule, type YTCourseVideoMeta } from "./courseStore";
import type { ProviderKey, Question } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProgressFn = (step: string, percent: number) => void;

interface AiModule {
  title: string;
  description: string;
  videoIds: string[];
}

interface AiModulesResponse {
  modules: AiModule[];
}

interface AiQuestion {
  prompt: string;
  options: [string, string, string, string];
  correct: number[];
  explanation: string;
}

interface AiQuestionsResponse {
  questions: AiQuestion[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripFences(s: string): string {
  const m = s.trim().match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
  return (m ? m[1] : s).trim();
}

function videoSummary(v: YTCourseVideoMeta): string {
  const parts: string[] = [`Title: ${v.title}`];
  if (v.description) parts.push(`Description: ${v.description.slice(0, 400)}`);
  if (v.transcript) parts.push(`Transcript excerpt: ${v.transcript.slice(0, 600)}`);
  return parts.join("\n");
}

function aiQuestionsToQuizQuestions(raw: AiQuestion[]): Question[] {
  return raw.map((q) => ({
    id: courseUid(),
    prompt: q.prompt,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation ?? "",
  }));
}

// ---------------------------------------------------------------------------
// Main pipeline: build course from playlist
// ---------------------------------------------------------------------------

/**
 * Run the full AI pipeline for a course whose `videos` are already populated.
 * Clusters videos into modules, generates learning pages, and creates quizzes.
 */
export async function buildCourseFromPlaylist(
  keys: ProviderKey[],
  courseId: string,
  onProgress?: ProgressFn
): Promise<void> {
  const course = courseOps.getById(courseId);
  if (!course) throw new Error(`Course ${courseId} not found`);

  const allVideos = Object.values(course.videos);
  if (allVideos.length === 0) throw new Error("Course has no videos to process");

  // -------------------------------------------------------------------------
  // 1. Cluster videos into modules
  // -------------------------------------------------------------------------
  onProgress?.("Grouping videos into modules…", 10);

  const videoListText = allVideos
    .map((v) => `- ID: ${v.youtubeId} | Title: ${v.title}${v.description ? ` | Description: ${v.description.slice(0, 200)}` : ""}`)
    .join("\n");

  const clusterMessages = [
    {
      role: "system" as const,
      content:
        "You are a curriculum designer. Given a list of YouTube videos from a playlist, group them into logical learning modules. Return valid JSON only — no markdown fences, no extra commentary.",
    },
    {
      role: "user" as const,
      content: `Playlist: "${course.name}"\n\nVideos:\n${videoListText}\n\nGroup these videos into 3–7 cohesive learning modules. Every video must appear in exactly one module. Use the actual YouTube video IDs (from the "ID:" field) in the videoIds arrays.\n\nReturn JSON:\n{"modules":[{"title":"string","description":"string","videoIds":["youtubeId1","youtubeId2"]}]}`,
    },
  ];

  const clusterResult = await chatJSON<AiModulesResponse>(keys, clusterMessages);

  // Build module objects and persist them
  const rawModules = clusterResult.modules ?? [];
  const newModules: YTCourseModule[] = rawModules.map((m, idx) => ({
    id: courseUid(),
    title: m.title,
    description: m.description,
    videoIds: m.videoIds.filter((id) => course.videos[id] !== undefined),
    order: idx,
  }));

  // Ensure no video is left unassigned — append stragglers to last module
  const assignedIds = new Set(newModules.flatMap((m) => m.videoIds));
  const unassigned = allVideos.map((v) => v.youtubeId).filter((id) => !assignedIds.has(id));
  if (unassigned.length > 0 && newModules.length > 0) {
    newModules[newModules.length - 1].videoIds.push(...unassigned);
  }

  courseOps.updateModules(courseId, newModules);

  // -------------------------------------------------------------------------
  // 2. Generate module learning pages
  // -------------------------------------------------------------------------
  onProgress?.("Generating module learning pages…", 30);

  for (const mod of newModules) {
    const moduleVideos = mod.videoIds
      .map((id) => course.videos[id])
      .filter(Boolean);

    const videoNotesText = moduleVideos
      .map((v) => `### ${v.title}\n${v.description ? v.description.slice(0, 300) : ""}\n${v.transcript ? `Transcript: ${v.transcript.slice(0, 500)}` : ""}`)
      .join("\n\n");

    const pageMessages = [
      {
        role: "system" as const,
        content:
          "You are an expert educator. Write a comprehensive markdown learning page for a course module. Use clear headings, bullet points, and concise explanations. Output only markdown.",
      },
      {
        role: "user" as const,
        content: `Write a learning page for the module: "${mod.title}"\n\nModule description: ${mod.description ?? ""}\n\nVideos in this module:\n${videoNotesText}\n\nThe page must include:\n# ${mod.title}\n## Overview\n## Key Concepts (bullet list)\n## Video-by-Video Notes (one subsection per video with title as heading, 3–5 bullet notes based on description and transcript)\n## Key Takeaways (5–7 bullets)\n## Further Reading (suggestions)`,
      },
    ];

    const { content: pageMarkdown } = await chatCompletion(keys, pageMessages);
    const cleanedMarkdown = stripFences(pageMarkdown);

    // Create a tree node for this module and save the page
    const node = tree.add(mod.title, null);
    setPage(node.id, cleanedMarkdown);
    courseOps.setModulePageNode(courseId, mod.id, node.id);
  }

  // -------------------------------------------------------------------------
  // 3. Generate module quizzes
  // -------------------------------------------------------------------------
  onProgress?.("Generating module quizzes…", 60);

  for (const mod of newModules) {
    const moduleVideos = mod.videoIds
      .map((id) => course.videos[id])
      .filter(Boolean);

    const contextText = moduleVideos.map(videoSummary).join("\n\n");

    const quizMessages = [
      {
        role: "system" as const,
        content:
          "You are an expert quiz writer. Generate multiple-choice quiz questions based on educational content. Return valid JSON only — no markdown fences.",
      },
      {
        role: "user" as const,
        content: `Generate 8–10 multiple-choice questions for the module: "${mod.title}"\n\nContent:\n${contextText}\n\nEach question must have exactly 4 options. correct is an array of 0-based indices of correct answers (usually one, occasionally two).\n\nReturn JSON:\n{"questions":[{"prompt":"string","options":["A","B","C","D"],"correct":[0],"explanation":"string"}]}`,
      },
    ];

    const quizResult = await chatJSON<AiQuestionsResponse>(keys, quizMessages);
    const questions = aiQuestionsToQuizQuestions(quizResult.questions ?? []);
    const quiz = quizzes.add(`${mod.title} — Module Quiz`, questions);
    courseOps.setModuleQuiz(courseId, mod.id, quiz.id);
  }

  // -------------------------------------------------------------------------
  // 4. Generate per-video quizzes
  // -------------------------------------------------------------------------
  onProgress?.("Generating video quizzes…", 80);

  for (const video of allVideos) {
    const contextText = videoSummary(video);

    const quizMessages = [
      {
        role: "system" as const,
        content:
          "You are an expert quiz writer. Generate multiple-choice quiz questions based on a single video. Return valid JSON only — no markdown fences.",
      },
      {
        role: "user" as const,
        content: `Generate 3–5 multiple-choice questions for the video: "${video.title}"\n\nContent:\n${contextText}\n\nEach question must have exactly 4 options. correct is an array of 0-based indices of correct answers.\n\nReturn JSON:\n{"questions":[{"prompt":"string","options":["A","B","C","D"],"correct":[0],"explanation":"string"}]}`,
      },
    ];

    const quizResult = await chatJSON<AiQuestionsResponse>(keys, quizMessages);
    const questions = aiQuestionsToQuizQuestions(quizResult.questions ?? []);
    const quiz = quizzes.add(`${video.title} — Video Quiz`, questions);
    courseOps.setVideoQuiz(courseId, video.youtubeId, quiz.id);
  }

  onProgress?.("Done!", 100);
}

// ---------------------------------------------------------------------------
// Check for new videos added to the playlist since last sync
// ---------------------------------------------------------------------------

/**
 * Polls the playlist API for new videos, appends them to the last module (or
 * creates an "Unsorted" module), and generates quizzes for each new video.
 */
export async function checkForNewVideos(
  keys: ProviderKey[],
  courseId: string
): Promise<{ newCount: number }> {
  const course = courseOps.getById(courseId);
  if (!course) throw new Error(`Course ${courseId} not found`);

  const afterParam = course.lastCheckedAt ? `&after=${course.lastCheckedAt}` : "";
  const url = `/api/playlist?playlistId=${encodeURIComponent(course.playlistId)}${afterParam}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Playlist API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    videos?: Array<{
      youtubeId: string;
      title: string;
      channel: string;
      thumbnailUrl: string;
      durationSec: number;
      description?: string;
    }>;
  };

  const newVideoItems = (data.videos ?? []).filter(
    (v) => !course.videos[v.youtubeId]
  );

  if (newVideoItems.length === 0) {
    courseOps.update(courseId, { lastCheckedAt: Date.now() });
    return { newCount: 0 };
  }

  // Build new video meta objects
  const updatedVideos: Record<string, YTCourseVideoMeta> = { ...course.videos };
  for (const v of newVideoItems) {
    // Attempt to fetch transcript best-effort
    let transcript: string | undefined;
    try {
      const tRes = await fetch(`/api/transcript?videoId=${encodeURIComponent(v.youtubeId)}`);
      if (tRes.ok) {
        const tData = (await tRes.json()) as { transcript?: string };
        transcript = tData.transcript;
      }
    } catch { /* transcript is optional */ }

    updatedVideos[v.youtubeId] = {
      youtubeId: v.youtubeId,
      title: v.title,
      channel: v.channel,
      thumbnailUrl: v.thumbnailUrl,
      durationSec: v.durationSec,
      description: v.description,
      transcript,
      watched: false,
    };
  }

  // Append new video IDs to last module or create an "Unsorted" module
  const currentModules = [...course.modules].sort((a, b) => a.order - b.order);
  let updatedModules: YTCourseModule[];

  if (currentModules.length === 0) {
    const unsortedModule: YTCourseModule = {
      id: courseUid(),
      title: "Unsorted",
      videoIds: newVideoItems.map((v) => v.youtubeId),
      order: 0,
    };
    updatedModules = [unsortedModule];
  } else {
    const lastModule = currentModules[currentModules.length - 1];
    updatedModules = currentModules.map((m) =>
      m.id === lastModule.id
        ? { ...m, videoIds: [...m.videoIds, ...newVideoItems.map((v) => v.youtubeId)] }
        : m
    );
  }

  courseOps.updateVideos(courseId, updatedVideos);
  courseOps.updateModules(courseId, updatedModules);
  courseOps.update(courseId, {
    totalVideos: Object.keys(updatedVideos).length,
    lastCheckedAt: Date.now(),
  });

  // Generate quizzes for new videos
  const freshCourse = courseOps.getById(courseId)!;
  for (const v of newVideoItems) {
    const video = freshCourse.videos[v.youtubeId];
    if (!video) continue;

    const contextText = videoSummary(video);

    const quizMessages = [
      {
        role: "system" as const,
        content:
          "You are an expert quiz writer. Generate multiple-choice quiz questions based on a single video. Return valid JSON only — no markdown fences.",
      },
      {
        role: "user" as const,
        content: `Generate 3–5 multiple-choice questions for the video: "${video.title}"\n\nContent:\n${contextText}\n\nEach question must have exactly 4 options. correct is an array of 0-based indices of correct answers.\n\nReturn JSON:\n{"questions":[{"prompt":"string","options":["A","B","C","D"],"correct":[0],"explanation":"string"}]}`,
      },
    ];

    try {
      const quizResult = await chatJSON<AiQuestionsResponse>(keys, quizMessages);
      const questions = aiQuestionsToQuizQuestions(quizResult.questions ?? []);
      const quiz = quizzes.add(`${video.title} — Video Quiz`, questions);
      courseOps.setVideoQuiz(courseId, video.youtubeId, quiz.id);
    } catch { /* non-fatal — quiz generation for a new video failed */ }
  }

  return { newCount: newVideoItems.length };
}

// ---------------------------------------------------------------------------
// Utility: extract YouTube playlist ID from various URL formats
// ---------------------------------------------------------------------------

/**
 * Extracts a YouTube playlist ID from:
 * - https://www.youtube.com/playlist?list=PLxxxx
 * - https://www.youtube.com/watch?v=xxxx&list=PLxxxx
 * - https://youtube.com/playlist?list=PLxxxx
 * - A raw playlist ID (e.g. PLxxxx)
 *
 * Returns null if no valid playlist ID can be found.
 */
export function extractPlaylistId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  // Raw playlist ID — typically starts with PL, UU, FL, RD, etc.
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }

  // URL-based extraction
  try {
    const parsed = new URL(trimmed);
    const listParam = parsed.searchParams.get("list");
    if (listParam) return listParam;
  } catch {
    // Not a valid URL — try regex fallback
    const match = trimmed.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (match) return match[1];
  }

  return null;
}
