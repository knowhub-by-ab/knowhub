import { useState, useRef, useEffect, useCallback } from "react";
import { useAppData } from "@/lib/store";
import { chatStream } from "@/lib/ai";
import type { ChatMessage } from "@/lib/types";
import {
  Mic,
  MicOff,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Settings,
  Square,
  MessageSquare,
  Briefcase,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "context" | "live" | "practice";

interface QAEntry {
  question: string;
  answer: string;
  timestamp: number;
}

interface PracticeEntry extends QAEntry {
  liked: boolean | null;
}

interface InterviewContext {
  jd: string;
  resume: string;
  custom: string;
  roleType: string;
}

const ROLE_TYPES = [
  "Software Engineer",
  "Data Scientist",
  "Product Manager",
  "Business Analyst",
  "Designer",
  "DevOps/Infrastructure",
  "Other",
];

const SESSION_KEY = "knowhub:interview-context";

function loadContext(): InterviewContext {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { jd: "", resume: "", custom: "", roleType: "Software Engineer" };
}

function saveContext(ctx: InterviewContext) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
}

// ─── Speech Recognition types ─────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

function hasSpeechRecognition(): boolean {
  return !!(
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

function createRecognition(): SpeechRecognitionInstance {
  const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  return new SRClass();
}

// ─── System Prompt Builder ────────────────────────────────────────────────

function buildSystemPrompt(ctx: InterviewContext): string {
  const { jd, resume, custom, roleType } = ctx;
  return [
    "You are an expert interview coach and technical advisor helping a candidate during a job interview.",
    jd ? `Job Description:\n${jd}` : "",
    resume ? `Candidate Resume:\n${resume}` : "",
    custom ? `Additional Context:\n${custom}` : "",
    roleType !== "Other" ? `Role Type: ${roleType}` : "",
    "",
    "When the candidate hears a question (relayed via voice), provide a concise, confident answer they can reference. For technical/domain questions, draw from your own knowledge base—not just the candidate's documents. Keep answers under 150 words. Start with the key point, then supporting detail.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Sub-components ───────────────────────────────────────────────────────

function ContextTab({
  ctx,
  onChange,
}: {
  ctx: InterviewContext;
  onChange: (ctx: InterviewContext) => void;
}) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveContext(ctx);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 flex gap-3 text-sm text-blue-200">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
        <span>
          Set context for better AI responses. All fields are optional — you can
          jump straight to <strong>Live</strong> or <strong>Practice</strong>{" "}
          mode.
        </span>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <Briefcase className="inline w-4 h-4 mr-1.5 text-gray-400" />
            Job Description
          </label>
          <textarea
            rows={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
            placeholder="Paste the job description here…"
            value={ctx.jd}
            onChange={(e) => onChange({ ...ctx, jd: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <MessageSquare className="inline w-4 h-4 mr-1.5 text-gray-400" />
            Your Resume / CV
          </label>
          <textarea
            rows={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
            placeholder="Paste your resume or key skills here…"
            value={ctx.resume}
            onChange={(e) => onChange({ ...ctx, resume: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Custom Context
          </label>
          <textarea
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
            placeholder="Any additional context: company name, interview type, topics to focus on…"
            value={ctx.custom}
            onChange={(e) => onChange({ ...ctx, custom: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Role Type
          </label>
          <select
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={ctx.roleType}
            onChange={(e) => onChange({ ...ctx, roleType: e.target.value })}
          >
            {ROLE_TYPES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {saved ? (
          <>
            <CheckCircle2 className="w-4 h-4" /> Saved!
          </>
        ) : (
          <>
            <Settings className="w-4 h-4" /> Save Context
          </>
        )}
      </button>

      <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 flex gap-3 text-sm text-amber-200">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
        <span>
          💡 <strong>For live interviews:</strong> Open your video call on
          another device with speaker on. This tab's microphone picks up both
          voices.
        </span>
      </div>
    </div>
  );
}

// ─── Live Mode ────────────────────────────────────────────────────────────

// Detect natural sentence/question boundary in a final transcript segment.
// Fires early trigger so user gets answer even mid-monologue.
function hasBoundary(text: string): boolean {
  const t = text.trim();
  // Ends in question mark OR ends in period/exclamation after ≥5 words
  if (/\?$/.test(t)) return true;
  if (/[.!]$/.test(t) && t.split(/\s+/).length >= 5) return true;
  return false;
}

// Detect question-opening phrases that suggest the interviewer is mid-question
function hasQuestionPhrase(text: string): boolean {
  return /\b(can you|could you|would you|tell me|describe|explain|what is|what are|how do|how would|why do|walk me through|give me an example)\b/i.test(text);
}

interface StreamingAnswer {
  id: number;
  question: string;
  answer: string;          // streams in
  done: boolean;
  timestamp: number;
}

function LiveTab({ ctx, aiKeys }: { ctx: InterviewContext; aiKeys: ReturnType<typeof useAppData>["aiKeys"] }) {
  const srSupported = hasSpeechRecognition();

  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [pendingText, setPendingText] = useState("");    // accumulated final, not yet sent
  const [answers, setAnswers] = useState<StreamingAnswer[]>([]);
  const [queueLen, setQueueLen] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs that closures can read without stale captures
  const listeningRef = useRef(false);                   // FIX: closures read this, not state
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const pendingRef = useRef("");                         // mirrors pendingText state
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boundaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const answerIdRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const answerEndRef = useRef<HTMLDivElement>(null);

  // ── Queue processor ─────────────────────────────────────────────────────
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const question = queueRef.current.shift()!;
      setQueueLen(queueRef.current.length);
      const id = ++answerIdRef.current;
      const ts = Date.now();

      // Add streaming placeholder
      setAnswers((prev) => [...prev, { id, question, answer: "", done: false, timestamp: ts }]);

      const systemPrompt = buildSystemPrompt(ctx);
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: question.trim() },
      ];

      try {
        await chatStream(aiKeys, messages, (chunk) => {
          setAnswers((prev) =>
            prev.map((a) => (a.id === id ? { ...a, answer: a.answer + chunk } : a))
          );
          answerEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI error";
        setAnswers((prev) =>
          prev.map((a) => (a.id === id ? { ...a, answer: `[Error: ${msg}]`, done: true } : a))
        );
        setError(msg);
      }

      setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, done: true } : a)));
      setTimeout(() => answerEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }

    processingRef.current = false;
    setQueueLen(0);
  }, [aiKeys, ctx]);

  // ── Enqueue a question for AI ───────────────────────────────────────────
  const enqueue = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) return;
    // Clear pending
    pendingRef.current = "";
    setPendingText("");
    setInterimText("");
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);

    queueRef.current.push(q);
    setQueueLen(queueRef.current.length);
    processQueue();
  }, [processQueue]);

  // ── Silence timer — fires 1.5 s after last speech ──────────────────────
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      const q = pendingRef.current;
      if (q.trim()) enqueue(q);
    }, 1500);
  }, [enqueue]);

  // ── Boundary timer — fires 350 ms after detecting a sentence end ────────
  const scheduleBoundaryTrigger = useCallback(() => {
    if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
    boundaryTimerRef.current = setTimeout(() => {
      const q = pendingRef.current;
      if (q.trim()) enqueue(q);
    }, 350);
  }, [enqueue]);

  // ── Manual trigger (Answer Now button + Space key) ──────────────────────
  const triggerNow = useCallback(() => {
    const q = pendingRef.current;
    if (q.trim()) enqueue(q);
  }, [enqueue]);

  // Space key shortcut (only when not in a text input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!listeningRef.current) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        triggerNow();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [triggerNow]);

  // ── Start / stop recognition ────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!srSupported) return;
    listeningRef.current = true;
    setListening(true);
    setError(null);

    function createAndStart() {
      const rec = createRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) {
            const seg = r[0].transcript;
            pendingRef.current += seg + " ";
            setPendingText(pendingRef.current);
            transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

            // Trigger 1: sentence boundary in this segment
            if (hasBoundary(seg) || hasQuestionPhrase(pendingRef.current)) {
              scheduleBoundaryTrigger();
            }

            // Trigger 2: word-count overflow — send after ~45 words accumulate
            const wordCount = pendingRef.current.trim().split(/\s+/).length;
            if (wordCount >= 45) {
              enqueue(pendingRef.current);
              return;
            }

            // Trigger 3: silence (reset timer on every final segment)
            resetSilenceTimer();
          } else {
            interim += r[0].transcript;
          }
        }
        setInterimText(interim);
        if (interim) resetSilenceTimer();
      };

      rec.onerror = (e) => {
        // 'no-speech' is harmless — browser times out after silence; restart
        const evErr = (e as unknown as { error?: string }).error;
        if (evErr === "no-speech" || evErr === "aborted") {
          // will auto-restart via onend
          return;
        }
        setError("Microphone error — check permissions.");
        listeningRef.current = false;
        setListening(false);
      };

      // KEY FIX: read listeningRef (mutable), not `listening` state (stale closure)
      rec.onend = () => {
        if (listeningRef.current) {
          try { createAndStart(); } catch { /* ignore */ }
        }
      };

      recognitionRef.current = rec;
      try { rec.start(); } catch { /* already started or permissions denied */ }
    }

    createAndStart();
  }, [srSupported, enqueue, resetSilenceTimer, scheduleBoundaryTrigger]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setInterimText("");
  }, []);

  const clearSession = useCallback(() => {
    stopListening();
    setAnswers([]);
    setPendingText("");
    setInterimText("");
    pendingRef.current = "";
    queueRef.current = [];
    setQueueLen(0);
    setError(null);
    processingRef.current = false;
  }, [stopListening]);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      silenceTimerRef.current && clearTimeout(silenceTimerRef.current);
      boundaryTimerRef.current && clearTimeout(boundaryTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  if (!srSupported) {
    return (
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-5 flex gap-3 text-amber-200">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <p className="font-semibold">Speech recognition not supported</p>
          <p className="text-sm mt-1">
            Use Chrome or Edge for Live mode. Practice mode still works in all browsers.
          </p>
        </div>
      </div>
    );
  }

  const hasAnswering = answers.some((a) => !a.done);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Controls bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
          listening ? "bg-red-900/60 text-red-300 border-red-700" : "bg-gray-700 text-gray-400 border-gray-600"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${listening ? "bg-red-400 animate-pulse" : "bg-gray-500"}`} />
          {listening ? "Listening…" : "Idle"}
        </span>

        <button
          onClick={listening ? stopListening : startListening}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            listening ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {listening ? <><Square className="w-4 h-4" /> Stop</> : <><Mic className="w-4 h-4" /> Start Listening</>}
        </button>

        {/* Answer Now — manual trigger */}
        {listening && pendingText.trim() && (
          <button
            onClick={triggerNow}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Force AI response now (Space)"
          >
            <Loader2 className="w-4 h-4" /> Answer Now
            <kbd className="ml-1 text-[10px] bg-green-900/60 px-1.5 py-0.5 rounded">Space</kbd>
          </button>
        )}

        {queueLen > 0 && (
          <span className="text-xs text-yellow-400 bg-yellow-900/40 border border-yellow-700/50 px-2 py-1 rounded-full">
            {queueLen} queued
          </span>
        )}

        <button
          onClick={clearSession}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Clear
        </button>

        {error && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </span>
        )}
      </div>

      {/* Trigger hint */}
      {listening && (
        <p className="text-[11px] text-gray-500">
          AI auto-responds on: silence (1.5 s) · question mark detected · 45+ words · or press <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">Space</kbd>
        </p>
      )}

      {/* Split view */}
      <div className="flex gap-4" style={{ minHeight: "460px" }}>
        {/* Left — Transcript (40%) */}
        <div className="w-2/5 flex flex-col border border-gray-700 rounded-xl overflow-hidden" style={{ background: "#141820" }}>
          <div className="px-4 py-2.5 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Transcript
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm" style={{ maxHeight: "420px" }}>
            {/* Processed questions from history */}
            {answers.map((a) => (
              <div key={a.id} className="pb-2 border-b border-gray-700/40 last:border-0">
                <span className="text-[10px] text-gray-600">{new Date(a.timestamp).toLocaleTimeString()}</span>
                <p className="text-gray-300 mt-0.5">{a.question}</p>
              </div>
            ))}
            {/* Currently accumulating */}
            {pendingText && (
              <p className="text-yellow-200/90 font-medium">{pendingText}</p>
            )}
            {interimText && (
              <p className="text-gray-500 italic">{interimText}</p>
            )}
            {!pendingText && !interimText && answers.length === 0 && (
              <p className="text-gray-600 text-xs">Start listening — transcript appears here in real time.</p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Right — AI Answers (60%) */}
        <div className="w-3/5 flex flex-col bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>AI Response</span>
            {hasAnswering && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm" style={{ maxHeight: "420px" }}>
            {answers.length === 0 && (
              <p className="text-gray-600 text-xs">AI answers appear here as questions are detected.</p>
            )}
            {answers.map((a) => (
              <div key={a.id} className="pb-4 border-b border-gray-700/40 last:border-0">
                <p className="text-[10px] text-gray-500 mb-1">{new Date(a.timestamp).toLocaleTimeString()}</p>
                <p className="text-[11px] text-gray-400 italic mb-2 line-clamp-2">↳ {a.question}</p>
                <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {a.answer}
                  {!a.done && (
                    <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                  )}
                </p>
              </div>
            ))}
            <div ref={answerEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Practice Mode ────────────────────────────────────────────────────────

function PracticeTab({ ctx, aiKeys }: { ctx: InterviewContext; aiKeys: ReturnType<typeof useAppData>["aiKeys"] }) {
  const srSupported = hasSpeechRecognition();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [history, setHistory] = useState<PracticeEntry[]>([]);
  const [recording, setRecording] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const answerCardRef = useRef<HTMLDivElement>(null);

  const startRecording = () => {
    if (!srSupported) return;
    const rec = createRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + " ";
      }
      setQuestion((prev) => prev + text);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const getAnswer = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setAnswer("");
    setLiked(null);

    const systemPrompt = buildSystemPrompt(ctx);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question.trim() },
    ];

    try {
      const result = await chatStream(aiKeys, messages, (chunk) => {
        setAnswer((prev) => prev + chunk);
        answerCardRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
      setAnswer(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = (val: boolean) => {
    setLiked(val);
  };

  const nextQuestion = () => {
    if (question.trim() && answer) {
      setHistory((prev) => [
        { question: question.trim(), answer, timestamp: Date.now(), liked },
        ...prev,
      ]);
    }
    setQuestion("");
    setAnswer("");
    setLiked(null);
    setError(null);
  };

  return (
    <div className="space-y-5">
      {/* Question input */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Your Question</h3>
          {srSupported && (
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                recording
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              {recording ? (
                <>
                  <MicOff className="w-3.5 h-3.5" /> Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" /> Record Question
                </>
              )}
            </button>
          )}
        </div>
        <textarea
          rows={4}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
          placeholder="Type or dictate an interview question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) getAnswer();
          }}
        />
        <div className="flex gap-3">
          <button
            onClick={getAnswer}
            disabled={loading || !question.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </>
            ) : (
              "Get Answer"
            )}
          </button>
          {answer && (
            <button
              onClick={nextQuestion}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Next Question
            </button>
          )}
        </div>
        {error && (
          <p className="text-red-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
      </div>

      {/* Answer card */}
      {(answer || loading) && (
        <div
          ref={answerCardRef}
          className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">
              Suggested Answer
            </h3>
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            )}
          </div>
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
            {answer}
            {loading && (
              <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
            )}
          </p>
          {!loading && answer && (
            <div className="flex items-center gap-3 pt-1 border-t border-gray-700">
              <span className="text-xs text-gray-500">Was this helpful?</span>
              <button
                onClick={() => handleRate(true)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                  liked === true
                    ? "bg-green-800/60 text-green-300 border-green-700"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-400 border-gray-600"
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {liked === true && <span>Helpful</span>}
              </button>
              <button
                onClick={() => handleRate(false)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                  liked === false
                    ? "bg-red-900/60 text-red-300 border-red-700"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-400 border-gray-600"
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                {liked === false && <span>Not helpful</span>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Session History
          </h3>
          {history.map((entry, i) => (
            <div
              key={i}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-300 flex-1">
                  Q: {entry.question}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  {entry.liked === true && (
                    <span className="text-green-400">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {entry.liked === false && (
                    <span className="text-red-400">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="text-xs text-gray-600 ml-1">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                {entry.answer}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function InterviewHelperPage() {
  const data = useAppData();
  const [activeTab, setActiveTab] = useState<Tab>("context");
  const [ctx, setCtx] = useState<InterviewContext>(loadContext);

  // Persist to sessionStorage on change
  useEffect(() => {
    saveContext(ctx);
  }, [ctx]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "context",
      label: "Context Setup",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: "live",
      label: "Live",
      icon: <Mic className="w-4 h-4" />,
    },
    {
      id: "practice",
      label: "Practice",
      icon: <MessageSquare className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Interview Helper</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              AI-powered interview preparation and live assistance
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1 mb-6 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          {activeTab === "context" && (
            <ContextTab ctx={ctx} onChange={setCtx} />
          )}
          {activeTab === "live" && (
            <LiveTab ctx={ctx} aiKeys={data.aiKeys} />
          )}
          {activeTab === "practice" && (
            <PracticeTab ctx={ctx} aiKeys={data.aiKeys} />
          )}
        </div>
      </div>
    </div>
  );
}
