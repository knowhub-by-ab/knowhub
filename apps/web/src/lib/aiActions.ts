import { chatJSON, chatCompletion } from "./ai";
import { tree, quizzes } from "./store";
import type { ChatMessage, ProviderKey, Question } from "./types";

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
        "short paragraphs, lists, examples and a 'Key takeaways' section. Output ONLY " +
        "Markdown — no code fences around the whole document, no preamble.",
    },
    {
      role: "user",
      content:
        `Topic / page title: "${title}".\n` +
        (current?.trim() ? `\nCurrent content:\n"""\n${current}\n"""\n` : "") +
        `\nInstruction: ${instruction.trim() || "Write a complete, accurate learning page for this topic."}`,
    },
  ];
  const { content } = await chatCompletion(keys, messages);
  return stripFences(content);
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
  topic: string
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
  const data = await chatJSON<GenNode[] | { topics?: GenNode[] }>(keys, messages);
  const roots = Array.isArray(data) ? data : data.topics ?? [];
  if (!roots.length) throw new Error("The AI returned no topics. Try again.");

  const rootId = tree.add(topic, null).id;
  let count = 1;
  const insert = (nodes: GenNode[], parentId: string, depth: number) => {
    if (depth > 4) return;
    for (const n of nodes) {
      if (!n?.title) continue;
      const id = tree.add(String(n.title).slice(0, 120), parentId).id;
      count++;
      if (Array.isArray(n.children) && n.children.length) insert(n.children, id, depth + 1);
    }
  };
  insert(roots, rootId, 1);
  return count;
}

interface GenQuestion {
  prompt: string;
  options: string[];
  correct: number[];
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
        `"correct": [0-based index/indices of correct option(s)]}]}. Usually one correct ` +
        `option per question; occasionally two. Options must be plausible.`,
    },
  ];
  const data = await chatJSON<{ title?: string; questions?: GenQuestion[] }>(keys, messages);
  const questions: Question[] = (data.questions ?? [])
    .filter((q) => q && q.prompt && Array.isArray(q.options) && q.options.length >= 2)
    .map((q) => ({
      id: quizzes.newQuestionId(),
      prompt: String(q.prompt),
      options: q.options.map((o) => String(o)),
      correct: (Array.isArray(q.correct) ? q.correct : [])
        .filter((i) => Number.isInteger(i) && i >= 0 && i < q.options.length),
    }))
    .filter((q) => q.correct.length >= 1);

  if (!questions.length) throw new Error("The AI returned no usable questions. Try again.");
  return quizzes.add(data.title?.trim() || `${topic} quiz`, questions).id;
}
