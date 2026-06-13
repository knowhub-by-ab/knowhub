import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Play,
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import { quizzes, useAppData } from "@/lib/store";
import { generateQuiz } from "@/lib/aiActions";
import type { Question, Quiz } from "@/lib/types";

type View = { mode: "list" } | { mode: "create" } | { mode: "take"; quizId: string };

// --- Draft types for the create form ---
interface DraftQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number[];
}

function emptyQuestion(): DraftQuestion {
  return { id: quizzes.newQuestionId(), prompt: "", options: ["", ""], correct: [] };
}

// ===========================================================================
// Create view
// ===========================================================================
function CreateQuiz({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [qs, setQs] = useState<DraftQuestion[]>([emptyQuestion()]);

  function update(i: number, patch: Partial<DraftQuestion>) {
    setQs((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function toggleCorrect(qi: number, oi: number) {
    setQs((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q;
        const correct = q.correct.includes(oi)
          ? q.correct.filter((c) => c !== oi)
          : [...q.correct, oi];
        return { ...q, correct };
      })
    );
  }

  const valid =
    title.trim() &&
    qs.length > 0 &&
    qs.every(
      (q) =>
        q.prompt.trim() &&
        q.options.filter((o) => o.trim()).length >= 2 &&
        q.correct.length >= 1
    );

  function save() {
    if (!valid) return;
    const questions: Question[] = qs.map((q) => {
      // Keep only non-empty options and remap correct indices.
      const kept: { text: string; wasCorrect: boolean }[] = q.options
        .map((text, i) => ({ text: text.trim(), wasCorrect: q.correct.includes(i) }))
        .filter((o) => o.text);
      return {
        id: q.id,
        prompt: q.prompt.trim(),
        options: kept.map((o) => o.text),
        correct: kept.map((o, i) => (o.wasCorrect ? i : -1)).filter((i) => i >= 0),
      };
    });
    quizzes.add(title, questions);
    onDone();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={onDone}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="mt-4 text-2xl font-bold text-white">New quiz</h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quiz title (e.g. Docker basics)"
        className="mt-4 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
      />

      <div className="mt-4 space-y-4">
        {qs.map((q, qi) => (
          <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Q{qi + 1}</span>
              {qs.length > 1 && (
                <button
                  onClick={() => setQs((prev) => prev.filter((_, i) => i !== qi))}
                  className="ml-auto text-slate-400 hover:text-rose-400"
                  title="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              value={q.prompt}
              onChange={(e) => update(qi, { prompt: e.target.value })}
              placeholder="Question prompt"
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            />
            <p className="mt-3 text-xs text-slate-500">
              Tick the box for every correct answer (tick 2+ for multiple-choice).
            </p>
            <div className="mt-2 space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCorrect(qi, oi)}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                      q.correct.includes(oi)
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-white/20 text-transparent"
                    }`}
                    title="Mark correct"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <input
                    value={opt}
                    onChange={(e) =>
                      update(qi, {
                        options: q.options.map((o, i) => (i === oi ? e.target.value : o)),
                      })
                    }
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-1.5 text-sm text-white outline-none focus:border-brand-500"
                  />
                  {q.options.length > 2 && (
                    <button
                      onClick={() =>
                        update(qi, {
                          options: q.options.filter((_, i) => i !== oi),
                          correct: q.correct.filter((c) => c !== oi).map((c) => (c > oi ? c - 1 : c)),
                        })
                      }
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => update(qi, { options: [...q.options, ""] })}
              className="mt-2 text-xs text-brand-300 hover:underline"
            >
              + Add option
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setQs((prev) => [...prev, emptyQuestion()])}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          <Plus className="h-4 w-4" /> Add question
        </button>
        <button
          onClick={save}
          disabled={!valid}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
        >
          Save quiz
        </button>
      </div>
      {!valid && (
        <p className="mt-2 text-xs text-slate-500">
          Each question needs a prompt, at least 2 filled options, and at least one
          correct answer ticked.
        </p>
      )}
    </div>
  );
}

// ===========================================================================
// Take view
// ===========================================================================
function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

function TakeQuiz({ quiz, onDone }: { quiz: Quiz; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [submitted, setSubmitted] = useState(false);

  function choose(qid: string, oi: number, multiple: boolean) {
    setAnswers((prev) => {
      const cur = prev[qid] ?? [];
      if (multiple) {
        return { ...prev, [qid]: cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi] };
      }
      return { ...prev, [qid]: [oi] };
    });
  }

  const score = quiz.questions.filter((q) => sameSet(answers[q.id] ?? [], q.correct)).length;

  function submit() {
    setSubmitted(true);
    quizzes.recordAttempt(quiz.id, score, quiz.questions.length);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={onDone}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="mt-4 text-2xl font-bold text-white">{quiz.title}</h1>

      {submitted && (
        <div className="mt-4 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-5 text-center">
          <div className="text-3xl font-bold text-white">
            {score} / {quiz.questions.length}
          </div>
          <p className="mt-1 text-sm text-brand-100">
            {Math.round((score / quiz.questions.length) * 100)}% — review the answers below.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        {quiz.questions.map((q, qi) => {
          const multiple = q.correct.length > 1;
          const chosen = answers[q.id] ?? [];
          const correct = submitted && sameSet(chosen, q.correct);
          return (
            <div
              key={q.id}
              className={`rounded-2xl border p-4 ${
                submitted
                  ? correct
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-rose-500/40 bg-rose-500/5"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-100">
                  {qi + 1}. {q.prompt}
                </p>
                {submitted &&
                  (correct ? (
                    <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <X className="h-5 w-5 shrink-0 text-rose-400" />
                  ))}
              </div>
              {multiple && !submitted && (
                <p className="mt-1 text-xs text-slate-500">Select all that apply.</p>
              )}
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const picked = chosen.includes(oi);
                  const isCorrect = q.correct.includes(oi);
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => choose(q.id, oi, multiple)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        submitted
                          ? isCorrect
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                            : picked
                            ? "border-rose-500/50 bg-rose-500/10 text-rose-100"
                            : "border-white/10 text-slate-300"
                          : picked
                          ? "border-brand-500/60 bg-brand-600/15 text-white"
                          : "border-white/10 text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center ${
                          multiple ? "rounded" : "rounded-full"
                        } border ${picked ? "border-current" : "border-white/30"}`}
                      >
                        {picked && <span className="h-2 w-2 rounded-full bg-current" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={submit}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
        >
          Submit answers
        </button>
      ) : (
        <button
          onClick={onDone}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/5"
        >
          Done
        </button>
      )}
    </div>
  );
}

// ===========================================================================
// List view + router
// ===========================================================================
export default function AssessmentsPage() {
  const data = useAppData();
  const [view, setView] = useState<View>({ mode: "list" });
  const [genTopic, setGenTopic] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function generate() {
    const topic = genTopic.trim();
    if (!topic || genLoading) return;
    setGenError(null);
    setGenLoading(true);
    try {
      await generateQuiz(data.aiKeys, topic, 5);
      setGenTopic("");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  if (view.mode === "create") return <CreateQuiz onDone={() => setView({ mode: "list" })} />;
  if (view.mode === "take") {
    const quiz = data.quizzes.find((q) => q.id === view.quizId);
    if (quiz) return <TakeQuiz quiz={quiz} onDone={() => setView({ mode: "list" })} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <ClipboardCheck className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Assessments</h1>
          <p className="text-sm text-slate-400">Create MCQ quizzes and test yourself.</p>
        </div>
        <button
          onClick={() => setView({ mode: "create" })}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          <Plus className="h-4 w-4" /> New quiz
        </button>
      </div>

      {/* Generate with AI */}
      <div className="mt-5 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={genTopic}
            placeholder="Generate a 5-question quiz with AI, e.g. 'TCP/IP basics'…"
            onChange={(e) => setGenTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            disabled={genLoading}
            className="flex-1 rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500 disabled:opacity-50"
          />
          <button
            onClick={generate}
            disabled={genLoading || !genTopic.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
          >
            {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {genLoading ? "Generating…" : "Generate"}
          </button>
        </div>
        {genError && <p className="mt-2 text-xs text-rose-300">{genError}</p>}
        {data.aiKeys.length === 0 && !genError && (
          <p className="mt-2 text-xs text-slate-500">
            Tip: add a provider key in{" "}
            <Link to="/app/settings" className="text-brand-300 underline">
              Settings
            </Link>{" "}
            to use AI generation.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {data.quizzes.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No quizzes yet. Create your first quiz to test your knowledge.
          </p>
        ) : (
          data.quizzes.map((q) => {
            const best = q.attempts.length
              ? Math.max(...q.attempts.map((a) => Math.round((a.score / a.total) * 100)))
              : null;
            return (
              <div
                key={q.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">{q.title}</div>
                  <div className="text-xs text-slate-500">
                    {q.questions.length} question{q.questions.length === 1 ? "" : "s"}
                    {q.attempts.length > 0 && ` · best ${best}% · ${q.attempts.length} attempt(s)`}
                  </div>
                </div>
                <button
                  onClick={() => setView({ mode: "take", quizId: q.id })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
                >
                  <Play className="h-3.5 w-3.5" /> Take
                </button>
                <button
                  onClick={() => quizzes.remove(q.id)}
                  className="rounded p-1.5 text-slate-400 hover:text-rose-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
