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
  const [restarting, setRestarting] = useState(false);       // true during onend→onresult gap
  const [interimDisplay, setInterimDisplay] = useState("");
  const [pendingDisplay, setPendingDisplay] = useState("");
  const [answers, setAnswers] = useState<StreamingAnswer[]>([]);
  const [queueLen, setQueueLen] = useState(0);
  const [lastHeard, setLastHeard] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // ── Mutable refs ─────────────────────────────────────────────────────────
  const listeningRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalBufRef = useRef("");
  const interimBufRef = useRef("");
  // Deduplication: track last text sent to AI so Chrome's post-restart replay
  // of the same final results doesn't produce duplicate transcript entries.
  const lastEnqueuedRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boundaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const answerIdRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const answerEndRef = useRef<HTMLDivElement>(null);
  const lastHeardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [secsSinceHeard, setSecsSinceHeard] = useState<number | null>(null);

  // Seconds-since-heard ticker — pauses during restart so red doesn't flash
  useEffect(() => {
    if (!listening) { setSecsSinceHeard(null); return; }
    lastHeardTimerRef.current = setInterval(() => {
      if (restarting) return;   // don't increment during known restart gap
      setSecsSinceHeard(lastHeard ? Math.floor((Date.now() - lastHeard) / 1000) : null);
    }, 1000);
    return () => { lastHeardTimerRef.current && clearInterval(lastHeardTimerRef.current); };
  }, [listening, lastHeard, restarting]);

  // ── Queue processor ─────────────────────────────────────────────────────
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const question = queueRef.current.shift()!;
      setQueueLen(queueRef.current.length);
      const id = ++answerIdRef.current;
      const ts = Date.now();

      setAnswers((prev) => [...prev, { id, question, answer: "", done: false, timestamp: ts }]);

      const messages: ChatMessage[] = [
        { role: "system", content: buildSystemPrompt(ctx) },
        { role: "user", content: question.trim() },
      ];

      try {
        await chatStream(aiKeys, messages, (chunk) => {
          setAnswers((prev) => prev.map((a) => a.id === id ? { ...a, answer: a.answer + chunk } : a));
          answerEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI error";
        setAnswers((prev) => prev.map((a) => a.id === id ? { ...a, answer: `[Error: ${msg}]`, done: true } : a));
        setError(msg);
      }

      setAnswers((prev) => prev.map((a) => a.id === id ? { ...a, done: true } : a));
      setTimeout(() => answerEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }

    processingRef.current = false;
    setQueueLen(0);
  }, [aiKeys, ctx]);

  // ── Enqueue — deduplicated, uses both final + interim buffers ────────────
  const enqueue = useCallback((includeInterim = true) => {
    const final = finalBufRef.current;
    const interim = includeInterim ? interimBufRef.current : "";
    const combined = (final + " " + interim).trim();
    if (!combined) return;

    // Deduplication: Chrome re-sends the same final results after each ~60s
    // restart. Strip any prefix that was already sent to avoid duplicate entries.
    let deduped = combined;
    if (lastEnqueuedRef.current) {
      const prev = lastEnqueuedRef.current.trim();
      // If combined STARTS WITH the previously sent text, take only the new tail
      if (deduped.toLowerCase().startsWith(prev.toLowerCase())) {
        deduped = deduped.slice(prev.length).trim();
      }
      // If combined IS the previously sent text (or very close), skip entirely
      if (!deduped || deduped.split(/\s+/).length < 3) return;
    }

    finalBufRef.current = "";
    interimBufRef.current = "";
    lastEnqueuedRef.current = combined;   // remember full combined for next dedup
    setPendingDisplay("");
    setInterimDisplay("");
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);

    queueRef.current.push(deduped);
    setQueueLen(queueRef.current.length);
    processQueue();
  }, [processQueue]);

  // ── Silence timer — 2 s after last ANY speech (interim or final) ────────
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => enqueue(true), 2000);
  }, [enqueue]);

  // ── Boundary timer — 400 ms after a sentence-ending final segment ───────
  const scheduleBoundaryTrigger = useCallback(() => {
    if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
    boundaryTimerRef.current = setTimeout(() => enqueue(true), 400);
  }, [enqueue]);

  // ── Manual trigger ──────────────────────────────────────────────────────
  const triggerNow = useCallback(() => enqueue(true), [enqueue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!listeningRef.current) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); triggerNow(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [triggerNow]);

  // ── Start / stop recognition ────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!srSupported) return;
    listeningRef.current = true;
    finalBufRef.current = "";
    interimBufRef.current = "";
    setListening(true);
    setError(null);
    setLastHeard(null);

    // Periodic safety flush every 8 s: if Chrome has been silent (no onresult)
    // but we have interim text, commit it. Handles the case where Chrome stops
    // firing events mid-session without calling onend.
    periodicTimerRef.current = setInterval(() => {
      const hasContent = finalBufRef.current.trim() || interimBufRef.current.trim();
      if (hasContent) {
        // Only flush if we haven't heard anything new in 4+ seconds
        const age = lastHeard ? Date.now() - lastHeard : Infinity;
        if (age > 4000) enqueue(true);
      }
    }, 8000);

    function createAndStart() {
      if (!listeningRef.current) return;
      const rec = createRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: SpeechRecognitionEvent) => {
        setLastHeard(Date.now());
        setRestarting(false);   // we have audio — restart gap is over
        setAudioLevel(Math.floor(Math.random() * 3) + 1);
        setTimeout(() => setAudioLevel(0), 400);

        let newInterim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) {
            const seg = r[0].transcript;
            finalBufRef.current += seg + " ";
            // When a final segment arrives, the previous interim is consumed.
            // Don't double-count it — clear interimBuf.
            interimBufRef.current = "";

            // Trigger: sentence boundary
            if (hasBoundary(seg) || hasQuestionPhrase(finalBufRef.current)) {
              scheduleBoundaryTrigger();
            }
            // Trigger: word overflow (final words only — more reliable)
            const wc = finalBufRef.current.trim().split(/\s+/).length;
            if (wc >= 40) { enqueue(true); return; }
          } else {
            newInterim += r[0].transcript;
          }
        }

        // Always store latest interim — this is speech Chrome heard but hasn't
        // committed. We'll include it in the next trigger.
        interimBufRef.current = newInterim;
        setPendingDisplay(finalBufRef.current);
        setInterimDisplay(newInterim);
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

        // Trigger: word overflow counting interim too
        const totalWords = (finalBufRef.current + " " + newInterim).trim().split(/\s+/).length;
        if (totalWords >= 50) { enqueue(true); return; }

        resetSilenceTimer();
      };

      rec.onerror = (e) => {
        const evErr = (e as unknown as { error?: string }).error;
        if (evErr === "no-speech" || evErr === "aborted") return; // harmless, onend restarts
        setError("Mic error — check permissions and try again.");
        listeningRef.current = false;
        setListening(false);
      };

      // onend fires every ~60s as Chrome ends its session (normal behaviour).
      // We mark restarting=true so the health indicator shows "Restarting…"
      // instead of "Last heard Xs ago" — the mic is fine, Chrome is just cycling.
      rec.onend = () => {
        if (!listeningRef.current) return;
        // Move interim into final so it's not lost across the restart gap.
        // Chrome will NOT re-send interim text in the next session (only finals
        // get replayed), so we must preserve it manually.
        if (interimBufRef.current.trim()) {
          finalBufRef.current += interimBufRef.current + " ";
          interimBufRef.current = "";
          setPendingDisplay(finalBufRef.current);
          setInterimDisplay("");
        }
        setRestarting(true);
        // Small delay avoids "already started" errors in some browsers
        setTimeout(() => createAndStart(), 150);
      };

      recognitionRef.current = rec;
      try { rec.start(); } catch { /* ignore — onend will retry */ }
    }

    createAndStart();
  }, [srSupported, enqueue, resetSilenceTimer, scheduleBoundaryTrigger]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setRestarting(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
    if (periodicTimerRef.current) clearInterval(periodicTimerRef.current);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setInterimDisplay("");
    setAudioLevel(0);
  }, []);

  const clearSession = useCallback(() => {
    stopListening();
    setAnswers([]);
    setPendingDisplay("");
    setInterimDisplay("");
    finalBufRef.current = "";
    interimBufRef.current = "";
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
      periodicTimerRef.current && clearInterval(periodicTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  if (!srSupported) {
    return (
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-5 flex gap-3 text-amber-200">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <p className="font-semibold">Speech recognition not supported</p>
          <p className="text-sm mt-1">Use Chrome or Edge for Live mode. Practice mode still works in all browsers.</p>
        </div>
      </div>
    );
  }

  const hasAnswering = answers.some((a) => !a.done);
  const hasPending = pendingDisplay.trim() || interimDisplay.trim();

  // Health indicator colour + label
  const healthColor = !listening ? "text-gray-500"
    : restarting ? "text-yellow-400"
    : secsSinceHeard === null || secsSinceHeard < 3 ? "text-green-400"
    : secsSinceHeard < 8 ? "text-yellow-400"
    : "text-red-400";
  const healthLabel = !listening ? "Idle"
    : restarting ? "Restarting…"       // Chrome's normal 60s session cycle
    : secsSinceHeard === null ? "Listening…"
    : secsSinceHeard < 3 ? "Hearing audio"
    : `Last heard ${secsSinceHeard}s ago`;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Health badge */}
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-current/30 ${healthColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${listening && (secsSinceHeard === null || secsSinceHeard < 3) ? "animate-pulse" : ""}`} />
          {healthLabel}
          {/* Audio level bars */}
          {listening && (
            <span className="flex items-end gap-[2px] ml-1 h-3">
              {[1,2,3].map((b) => (
                <span key={b} className={`w-[3px] rounded-sm transition-all duration-150 ${audioLevel >= b ? "bg-current h-3" : "bg-current/20 h-1"}`} />
              ))}
            </span>
          )}
        </span>

        <button
          onClick={listening ? stopListening : startListening}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            listening ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {listening ? <><Square className="w-4 h-4" /> Stop</> : <><Mic className="w-4 h-4" /> Start Listening</>}
        </button>

        {listening && hasPending && (
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

        <button onClick={clearSession} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <RotateCcw className="w-4 h-4" /> Clear
        </button>

        {error && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {error}</span>}
      </div>

      {listening && (
        <div className="text-[11px] text-gray-500 flex items-center gap-2">
          <span>Auto-answers on: <strong className="text-gray-400">2s silence</strong> · <strong className="text-gray-400">? detected</strong> · <strong className="text-gray-400">50 words</strong></span>
          <span>·</span>
          <span>Manual: <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">Space</kbd> or "Answer Now"</span>
          <span>·</span>
          <span className="text-amber-400/80">Interim text (gray) is captured too — not just final words</span>
        </div>
      )}

      {/* Split view */}
      <div className="flex gap-4" style={{ minHeight: "460px" }}>
        {/* Left — Transcript */}
        <div className="w-2/5 flex flex-col border border-gray-700 rounded-xl overflow-hidden" style={{ background: "#141820" }}>
          <div className="px-4 py-2.5 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>Transcript</span>
            {listening && audioLevel > 0 && <span className="text-green-400 text-[10px] animate-pulse">● receiving</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm" style={{ maxHeight: "420px" }}>
            {answers.map((a) => (
              <div key={a.id} className="pb-2 border-b border-gray-700/40 last:border-0">
                <span className="text-[10px] text-gray-600">{new Date(a.timestamp).toLocaleTimeString()}</span>
                <p className="text-gray-400 mt-0.5">{a.question}</p>
              </div>
            ))}
            {/* Final (confirmed) text — yellow */}
            {pendingDisplay && <p className="text-yellow-200/90 font-medium">{pendingDisplay}</p>}
            {/* Interim text — gray italic. Chrome hears this but hasn't committed it yet.
                We now capture it on trigger so nothing is lost. */}
            {interimDisplay && <p className="text-gray-500 italic">{interimDisplay}</p>}
            {!pendingDisplay && !interimDisplay && answers.length === 0 && (
              <p className="text-gray-600 text-xs">Start listening — transcript appears here. Yellow = confirmed, gray = in progress.</p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Right — AI Answers */}
        <div className="w-3/5 flex flex-col bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>AI Response</span>
            {hasAnswering && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm" style={{ maxHeight: "420px" }}>
            {answers.length === 0 && <p className="text-gray-600 text-xs">AI answers appear here as questions are detected.</p>}
            {answers.map((a) => (
              <div key={a.id} className="pb-4 border-b border-gray-700/40 last:border-0">
                <p className="text-[10px] text-gray-500 mb-1">{new Date(a.timestamp).toLocaleTimeString()}</p>
                <p className="text-[11px] text-gray-400 italic mb-2 line-clamp-2">↳ {a.question}</p>
                <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {a.answer}
                  {!a.done && <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />}
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
