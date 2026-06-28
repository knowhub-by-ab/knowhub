import { chatJSON, chatCompletion } from "./ai";
import { tree, quizzes, questionBanks, flashcards, videos } from "./store";
import { fixMermaidBlocks } from "./mermaidFix";
import type { AppData, ChatMessage, ProviderKey, Question } from "./types";

/**
 * Build a context string for the AI Tutor: an outline of the learner's topic
 * tree (marking which topics already have a written page) plus the content of
 * any existing pages relevant to the question. Lets the tutor point to existing
 * pages or suggest where a new one fits.
 */
export function buildTutorContext(data: AppData, query: string): string {
  const flat = tree.flatten(data.nodes);
  const outline =
    flat
      .map(
        ({ node, depth }) =>
          `${"  ".repeat(depth)}- ${node.title}${data.pages[node.id]?.trim() ? "  [has page]" : ""}`
      )
      .join("\n")
      .slice(0, 4000) || "(empty — the learner has no topics yet)";

  const q = query.toLowerCase();
  const relevant = data.nodes.filter((n) => {
    if (!data.pages[n.id]?.trim()) return false;
    const t = n.title.toLowerCase();
    return q.includes(t) || t.split(/\s+/).some((w) => w.length > 3 && q.includes(w));
  });
  const pages = relevant
    .slice(0, 3)
    .map((n) => `### ${n.title}\n${(data.pages[n.id] || "").slice(0, 1500)}`)
    .join("\n\n");

  return (
    `Learner's topic tree ("[has page]" = a written page exists):\n${outline}\n\n` +
    (pages
      ? `Relevant existing page content:\n${pages}`
      : "No existing page closely matches this question.")
  );
}

function stripFences(s: string): string {
  const m = s.trim().match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
  return (m ? m[1] : s).trim();
}

/**
 * Generate or revise the Markdown content of a learning page. `instruction` is
 * the user's prompt (optional); `current` is the existing page content (for
 * improve/edit). Returns Markdown.
 */
export async function generatePageContent(
  keys: ProviderKey[],
  title: string,
  instruction: string,
  current?: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are KnowHub's content author. Produce a clear, well-structured Markdown " +
        "learning page that takes a reader from beginner to professional. Use headings, " +
        "short paragraphs, lists, examples and a 'Key takeaways' section. " +
        "To link to ANOTHER KnowHub page, use exactly this Markdown link format: " +
        "[Exact Topic Title](?topic=Exact%20Topic%20Title) — i.e. a query string with the " +
        "URL-encoded topic title. NEVER link to file paths like ./Page.md or .html. " +
        "For diagrams use a ```mermaid code block. Output ONLY Markdown — no code fences " +
        "around the whole document, no preamble.",
    },
    {
      role: "user",
      content:
        `Topic / page title: "${title}".\n` +
        (current?.trim() ? `\nCurrent content:\n"""\n${current}\n"""\n` : "") +
        `\nInstruction: ${instruction.trim() || "Write a complete, accurate learning page for this topic."}`,
    },
  ];
  const { content } = await chatCompletion(keys, messages, "pages");
  const md = stripFences(content);
  return fixMermaidBlocks(md, keys);
}

interface GenNode {
  title: string;
  children?: GenNode[];
}

/**
 * Ask the AI for a structured learning path on `topic` and insert it into the
 * tree under a new root node. Returns the number of nodes created.
 */
export async function generateLearningTree(
  keys: ProviderKey[],
  topic: string,
  parentId: string | null = null
): Promise<number> {
  const messages: ChatMessage[] = [
    { role: "system", content: "You output ONLY valid JSON. No prose, no code fences." },
    {
      role: "user",
      content:
        `Create a structured learning path for "${topic}", progressing from absolute ` +
        `beginner to industry professional. Return a JSON array of 4-8 top-level topics. ` +
        `Each item: {"title": string, "children": [ up to ~5 sub-topics, each also ` +
        `{"title", "children"?} ]}. Keep titles short. Max depth 3.`,
    },
  ];
  const data = await chatJSON<GenNode[] | { topics?: GenNode[] }>(keys, messages, "tree");
  const topics = Array.isArray(data) ? data : data.topics ?? [];
  if (!topics.length) throw new Error("The AI returned no topics. Try again.");

  let count = 0;
  // Attach under the chosen parent. If none, create one new root named `topic`
  // and nest the generated topics beneath it.
  let baseParent: string | null;
  if (parentId) {
    baseParent = parentId;
  } else {
    baseParent = tree.add(topic, null).id;
    count = 1;
  }

  const insert = (nodes: GenNode[], pid: string, depth: number) => {
    if (depth > 4) return;
    for (const n of nodes) {
      if (!n?.title) continue;
      const id = tree.add(String(n.title).slice(0, 120), pid).id;
      count++;
      if (Array.isArray(n.children) && n.children.length) insert(n.children, id, depth + 1);
    }
  };
  insert(topics, baseParent, 1);
  return count;
}

interface Addition {
  parentId?: string | null;
  title: string;
  children?: GenNode[];
}

/**
 * Agentic tree edit: given the user's prompt AND the existing tree (with ids),
 * the AI decides what topics to add and WHERE (under an existing node, or as a
 * new top-level topic). Applies the additions and returns how many were created.
 */
export async function generateTreeChanges(
  keys: ProviderKey[],
  prompt: string,
  nodes: AppData["nodes"]
): Promise<number> {
  const outline = nodes.length
    ? tree
        .flatten(nodes)
        .map(({ node, depth }) => `${"  ".repeat(depth)}- [${node.id}] ${node.title}`)
        .join("\n")
    : "(the tree is currently empty)";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You edit a learner's topic tree. Output ONLY JSON of this shape: " +
        '{"additions":[{"parentId": string|null, "title": string, "children"?: ' +
        '[{"title": string, "children"?: [...]}]}]}. ' +
        "`parentId` MUST be one of the [id] values shown in the tree (to nest under an " +
        "existing topic), or null to create a new top-level topic. Decide placement from " +
        "the request and the existing structure: nest related topics under the most " +
        "relevant existing node; only use null when nothing fits. Use `children` for new " +
        "sub-topics. Do NOT recreate topics that already exist. Keep titles short.",
    },
    {
      role: "user",
      content: `Existing tree (each line is "- [id] Title"):\n${outline}\n\nRequest: ${prompt}`,
    },
  ];

  const data = await chatJSON<{ additions?: Addition[] }>(keys, messages, "tree");
  const additions = data.additions ?? [];
  if (!additions.length) throw new Error("The AI didn't propose any changes. Try rephrasing.");

  const valid = new Set(nodes.map((n) => n.id));
  let count = 0;
  const addItem = (title: string, parentId: string | null, children?: GenNode[], depth = 1) => {
    const id = tree.add(String(title).slice(0, 120), parentId).id;
    count++;
    if (depth <= 5) for (const c of children ?? []) if (c?.title) addItem(c.title, id, c.children, depth + 1);
  };
  for (const a of additions) {
    if (!a?.title) continue;
    const pid = a.parentId && valid.has(a.parentId) ? a.parentId : null;
    addItem(a.title, pid, a.children);
  }
  return count;
}

interface GenQuestion {
  prompt: string;
  options: string[];
  correct: number[];
  explanation?: string;
}

function parseGenQuestions(raw: GenQuestion[]): Question[] {
  return raw
    .filter((q) => q && q.prompt && Array.isArray(q.options) && q.options.length >= 2)
    .map((q) => ({
      id: quizzes.newQuestionId(),
      prompt: String(q.prompt),
      options: q.options.map((o) => String(o)),
      correct: (Array.isArray(q.correct) ? q.correct : [])
        .filter((i) => Number.isInteger(i) && i >= 0 && i < q.options.length),
      explanation: q.explanation ? String(q.explanation) : undefined,
    }))
    .filter((q) => q.correct.length >= 1);
}

/** Ask the AI for an MCQ quiz on `topic` and store it. Returns the quiz id. */
export async function generateQuiz(
  keys: ProviderKey[],
  topic: string,
  n = 5
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: "You output ONLY valid JSON. No prose, no code fences." },
    {
      role: "user",
      content:
        `Create a ${n}-question multiple-choice quiz about "${topic}". Return JSON: ` +
        `{"title": string, "questions": [{"prompt": string, "options": [4 strings], ` +
        `"correct": [0-based index/indices of correct option(s)], "explanation": "one-line explanation of the correct answer"}]}. ` +
        `Usually one correct option per question; occasionally two. Options must be plausible.`,
    },
  ];
  const data = await chatJSON<{ title?: string; questions?: GenQuestion[] }>(keys, messages, "assessments");
  const questions = parseGenQuestions(data.questions ?? []);
  if (!questions.length) throw new Error("The AI returned no usable questions. Try again.");
  return quizzes.add(data.title?.trim() || `${topic} quiz`, questions).id;
}

/** Generate a quiz from page content (page-based assessment). */
export async function generateQuizFromPages(
  keys: ProviderKey[],
  pageTitles: string[],
  pageContents: string[],
  n = 5
): Promise<string> {
  const context = pageTitles
    .map((t, i) => `### ${t}\n${pageContents[i]?.slice(0, 1500) ?? ""}`)
    .join("\n\n");
  const messages: ChatMessage[] = [
    { role: "system", content: "You output ONLY valid JSON. No prose, no code fences." },
    {
      role: "user",
      content:
        `Based on the following learning page content, create a ${n}-question MCQ quiz. ` +
        `Return JSON: {"title": string, "questions": [{"prompt": string, "options": [4 strings], ` +
        `"correct": [0-based index/indices], "explanation": "one-line explanation"}]}.\n\n${context}`,
    },
  ];
  const data = await chatJSON<{ title?: string; questions?: GenQuestion[] }>(keys, messages, "assessments");
  const questions = parseGenQuestions(data.questions ?? []);
  if (!questions.length) throw new Error("The AI returned no usable questions. Try again.");
  const title = data.title?.trim() || `Quiz: ${pageTitles.slice(0, 2).join(", ")}`;
  return quizzes.add(title, questions).id;
}

/** Improve tree: propose missing/trending topics to add. Returns count of nodes created. */
export async function improveTree(
  keys: ProviderKey[],
  nodes: AppData["nodes"],
  topic: string
): Promise<number> {
  const outline = nodes.length
    ? tree
        .flatten(nodes)
        .map(({ node, depth }) => `${"  ".repeat(depth)}- [${node.id}] ${node.title}`)
        .join("\n")
    : "(empty tree)";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You edit a learner's topic tree. Output ONLY JSON of this shape: " +
        '{"additions":[{"parentId": string|null, "title": string, "children"?: [{"title": string}]}]}. ' +
        "Add ONLY topics that are currently missing but important for learning this subject. " +
        "Do NOT recreate existing topics. parentId must be an existing [id] or null.",
    },
    {
      role: "user",
      content: `Subject: "${topic}"\n\nExisting tree:\n${outline}\n\nPropose missing important topics to add.`,
    },
  ];

  interface Addition {
    parentId?: string | null;
    title: string;
    children?: { title: string }[];
  }
  const data = await chatJSON<{ additions?: Addition[] }>(keys, messages, "tree");
  const additions = data.additions ?? [];
  if (!additions.length) throw new Error("No improvements suggested.");

  const valid = new Set(nodes.map((n) => n.id));
  let count = 0;
  for (const a of additions) {
    if (!a?.title) continue;
    const pid = a.parentId && valid.has(a.parentId) ? a.parentId : null;
    const id = tree.add(String(a.title).slice(0, 120), pid).id;
    count++;
    for (const c of a.children ?? []) {
      if (c?.title) { tree.add(String(c.title).slice(0, 120), id); count++; }
    }
  }
  return count;
}

/** Generate flashcards from source text. Returns added flashcards. */
export async function generateFlashcardsFromText(
  keys: ProviderKey[],
  sourceText: string,
  pageId?: string,
  n = 10
): Promise<number> {
  const messages: ChatMessage[] = [
    { role: "system", content: "You output ONLY valid JSON. No prose, no code fences." },
    {
      role: "user",
      content:
        `Create ${n} flashcards from the following content. Each card: front = a question or term, ` +
        `back = the answer or definition. Return JSON: {"cards": [{"front": string, "back": string}]}.\n\n` +
        sourceText.slice(0, 4000),
    },
  ];
  const data = await chatJSON<{ cards?: { front: string; back: string }[] }>(keys, messages, "other");
  const cards = (data.cards ?? []).filter((c) => c?.front && c?.back);
  if (!cards.length) throw new Error("No flashcards generated.");
  flashcards.addDeck(cards.map((c) => ({ front: c.front, back: c.back, pageId })));
  return cards.length;
}

/** Generate a question bank from source text. Returns question bank id. */
export async function generateQuestionBank(
  keys: ProviderKey[],
  title: string,
  source: string,
  sourceText: string,
  n = 20,
  types = ["mcq"]
): Promise<string> {
  const typeInstructions = types.includes("subjective")
    ? 'Mix MCQ (with "options" and "correct" arrays) and subjective (with "type":"subjective", no options/correct) questions.'
    : 'All questions are MCQ with "options" (4 strings) and "correct" (0-based index array).';

  const messages: ChatMessage[] = [
    { role: "system", content: "You output ONLY valid JSON. No prose, no code fences." },
    {
      role: "user",
      content:
        `Generate ${n} exam questions from the following content. ${typeInstructions} ` +
        `Return JSON: {"questions": [{"prompt": string, "options"?: [string], "correct"?: [number], "explanation"?: string}]}.\n\n` +
        sourceText.slice(0, 6000),
    },
  ];
  const data = await chatJSON<{ questions?: GenQuestion[] }>(keys, messages, "assessments");
  const questions = parseGenQuestions(data.questions ?? []);
  if (!questions.length) throw new Error("No questions generated.");
  return questionBanks.add(title, source, questions).id;
}

/** Suggest YouTube videos for a topic or page content.
 * AI generates search queries → /api/youtube does the real YouTube search.
 * This avoids hallucinated video IDs. */
export async function suggestVideos(
  keys: ProviderKey[],
  opts: { topic?: string; pageText?: string; pageId?: string }
): Promise<void> {
  const { topic, pageText, pageId } = opts;
  const subject = topic ?? (pageText ? pageText.slice(0, 600) : "");
  if (!subject) return;

  // Step 1: AI suggests search queries (not video IDs — they hallucinate those)
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `I want to find 3 excellent YouTube tutorial videos (each under 20 minutes) about: "${subject.slice(0, 400)}".
Generate 3 specific YouTube search queries that would find the best videos for a learner.
Respond with a JSON array of strings only, e.g. ["query one", "query two", "query three"]. No commentary.`,
    },
  ];

  const raw = await chatJSON<string[]>(keys, messages, "other");
  const queries = Array.isArray(raw) ? raw.filter((q) => typeof q === "string").slice(0, 3) : [];
  if (!queries.length) {
    // fallback: use subject directly as a query
    queries.push(subject.slice(0, 100) + " tutorial");
  }

  // Step 2: For each query, search YouTube via /api/youtube (server-side)
  const allResults: {
    videoId: string; title: string; channel: string; durationSec: number; validated: boolean; thumbnail?: string;
  }[] = [];
  const seen = new Set<string>();

  await Promise.all(
    queries.map(async (query) => {
      try {
        const res = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, maxResults: 3 }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          results?: { videoId: string; title: string; channel: string; durationSec: number; validated: boolean; thumbnail?: string }[];
          noApiKey?: boolean;
        };
        if (data.noApiKey) throw new Error("YOUTUBE_API_KEY_MISSING");
        for (const r of data.results ?? []) {
          if (!seen.has(r.videoId)) {
            seen.add(r.videoId);
            allResults.push(r);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message === "YOUTUBE_API_KEY_MISSING") throw err;
      }
    })
  );

  if (!allResults.length) return;

  videos.addBatch(
    allResults.slice(0, 6).map((r) => ({
      videoId: r.videoId,
      title: r.title,
      channel: r.channel,
      durationSec: r.durationSec,
      validated: r.validated,
      pageId,
      topic,
      kept: false,
    }))
  );
}
