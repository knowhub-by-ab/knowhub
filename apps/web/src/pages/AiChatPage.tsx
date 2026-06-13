import { useRef, useState } from "react";
import { MessagesSquare, Send, Loader2 } from "lucide-react";
import { useAppData } from "@/lib/store";
import { chatStream, AiError } from "@/lib/ai";
import type { ChatMessage } from "@/lib/types";

const SYSTEM_PROMPT: ChatMessage = {
  role: "system",
  content:
    "You are KnowHub's AI tutor. Explain clearly, progressing from beginner to professional. Be concise, use examples, and suggest next topics to learn.",
};

export default function AiChatPage() {
  const data = useAppData();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // The tutor works as long as at least one key is configured (here or server-side).
  const configured = true;
  const keyCount = data.aiKeys.length;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const next = [...messages, { role: "user", content: text } as ChatMessage];
    setMessages(next);
    setInput("");
    setLoading(true);
    let acc = "";
    setMessages([...next, { role: "assistant", content: "" }]);
    try {
      await chatStream(data.aiKeys, [SYSTEM_PROMPT, ...next], (piece) => {
        acc += piece;
        setMessages([...next, { role: "assistant", content: acc }]);
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Something went wrong.");
      setMessages(next);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <MessagesSquare className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Tutor</h1>
          <p className="text-sm text-slate-400">
            Ask anything.{" "}
            {keyCount > 0
              ? `Using ${keyCount} configured provider key${keyCount === 1 ? "" : "s"} (with fallback).`
              : "Add provider keys in Settings."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-slate-500">
            <p>
              Try: <span className="text-slate-300">"Teach me the basics of Docker."</span>
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-white/[0.06] text-slate-100 ring-1 ring-white/10"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={configured ? "Ask your tutor…" : "Configure Settings first…"}
          disabled={!configured || loading}
          className="max-h-40 flex-1 resize-none rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none focus:border-brand-500 disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={!configured || loading || !input.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
