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

function LiveTab({ ctx, aiKeys }: { ctx: InterviewContext; aiKeys: ReturnType<typeof useAppData>["aiKeys"] }) {
  const srSupported = hasSpeechRecognition();

  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState(""); // accumulated since last AI call
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTextRef = useRef(""); // keep ref in sync for closure access
  const qaEndRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  // Sync ref with state
  useEffect(() => {
    finalTextRef.current = finalText;
  }, [finalText]);

  const triggerAI = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;
      setFinalText("");
      finalTextRef.current = "";
      setInterimText("");
      setLoading(true);
      setError(null);
      setCurrentAnswer("");

      const systemPrompt = buildSystemPrompt(ctx);
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: question.trim() },
      ];

      const ts = Date.now();
      let answer = "";

      try {
        answer = await chatStream(aiKeys, messages, (chunk) => {
          setCurrentAnswer((prev) => prev + chunk);
          answerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI request failed.";
        setError(msg);
        setLoading(false);
        return;
      }

      setQaHistory((prev) => [
        ...prev,
        { question: question.trim(), answer, timestamp: ts },
      ]);
      setCurrentAnswer("");
      setLoading(false);
      setTimeout(() => {
        qaEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    [aiKeys, ctx, loading]
  );

  const startSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      const q = finalTextRef.current;
      if (q.trim()) {
        triggerAI(q);
      }
    }, 1500);
  }, [triggerAI]);

  const startListening = useCallback(() => {
    if (!srSupported) return;
    const rec = createRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          newFinal += r[0].transcript + " ";
        } else {
          interim += r[0].transcript;
        }
      }
      if (newFinal) {
        setFinalText((prev) => {
          const updated = prev + newFinal;
          finalTextRef.current = updated;
          return updated;
        });
        startSilenceTimer();
      }
      setInterimText(interim);
    };

    rec.onerror = () => {
      setError("Microphone error. Check permissions.");
      setListening(false);
    };

    rec.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current === rec && listening) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setError(null);
    } catch {
      setError("Could not start microphone.");
    }
  }, [srSupported, listening, startSilenceTimer]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterimText("");
  }, []);

  const clearSession = useCallback(() => {
    stopListening();
    setQaHistory([]);
    setFinalText("");
    setCurrentAnswer("");
    setInterimText("");
    setError(null);
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      silenceTimerRef.current && clearTimeout(silenceTimerRef.current);
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
            Use Chrome or Edge for Live mode. Practice mode still works in all
            browsers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Status + controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            listening
              ? "bg-red-900/60 text-red-300 border border-red-700"
              : "bg-gray-700 text-gray-400 border border-gray-600"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              listening ? "bg-red-400 animate-pulse" : "bg-gray-500"
            }`}
          />
          {listening ? "Listening…" : "Idle"}
        </span>

        <button
          onClick={listening ? stopListening : startListening}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            listening
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          }`}
        >
          {listening ? (
            <>
              <Square className="w-4 h-4" /> Stop
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" /> Start Listening
            </>
          )}
        </button>

        <button
          onClick={clearSession}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Clear Session
        </button>

        {error && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </span>
        )}
      </div>

      {/* Split view */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: "420px" }}>
        {/* Transcript (40%) */}
        <div className="w-2/5 flex flex-col bg-gray-850 border border-gray-700 rounded-xl overflow-hidden" style={{ background: "#141820" }}>
          <div className="px-4 py-2.5 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Transcript
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {qaHistory.map((entry, i) => (
              <div key={i} className="space-y-1">
                <p className="text-gray-300 font-medium">Q: {entry.question}</p>
              </div>
            ))}
            {/* Current accumulation */}
            {finalText && (
              <p className="text-gray-300 font-medium">
                {finalText}
              </p>
            )}
            {interimText && (
              <p className="text-gray-500 italic">{interimText}</p>
            )}
            {!finalText && !interimText && qaHistory.length === 0 && (
              <p className="text-gray-600 text-xs">
                Start listening — questions will appear here.
              </p>
            )}
          </div>
        </div>

        {/* AI Response (60%) */}
        <div className="w-3/5 flex flex-col bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>AI Response</span>
            {loading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
            {qaHistory.map((entry, i) => (
              <div key={i} className="space-y-1 border-b border-gray-700/50 pb-4 last:border-0">
                <p className="text-xs text-gray-500 font-medium mb-1.5">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </p>
                <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {entry.answer}
                </p>
              </div>
            ))}
            {/* Streaming current answer */}
            {(loading || currentAnswer) && (
              <div className="space-y-1">
                <p className="text-xs text-blue-400 font-medium mb-1.5">
                  Answering…
                </p>
                <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {currentAnswer}
                  {loading && (
                    <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                  )}
                </p>
              </div>
            )}
            {!loading && !currentAnswer && qaHistory.length === 0 && (
              <p className="text-gray-600 text-xs">
                AI answers will appear here after each detected question.
              </p>
            )}
            <div ref={qaEndRef} />
            <div ref={answerRef} />
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
