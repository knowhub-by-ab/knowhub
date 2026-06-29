import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessagesSquare,
  Send,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftOpen,
  PanelLeftClose,
  Folder,
  FolderOpen,
  FolderPlus,
} from "lucide-react";
import { useAppData, chatSessions as sessionsStore, chatFolders as foldersStore } from "@/lib/store";
import { chatStream, AiError } from "@/lib/ai";
import { buildTutorContext } from "@/lib/aiActions";
import { renderMarkdown } from "@/lib/markdown";
import type { ChatMessage } from "@/lib/types";

const SYSTEM_PROMPT: ChatMessage = {
  role: "system",
  content:
    "You are KnowHub's AI tutor. You are given the learner's own topic tree and the " +
    "content of their relevant learning pages as context. " +
    "If a relevant page already exists, answer from it and point the learner to it by " +
    "name (e.g. 'see your page: X'). If the topic is NOT in their tree, briefly say " +
    "where it would fit in their hierarchy and suggest they create it — they can tap " +
    "Generate on the Learning Pages tab, or add it in the Learning Tree. " +
    "Explain clearly from beginner to professional, be concise, and use examples.",
};

export default function AiChatPage() {
  const data = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(
    data.chatSessions[0]?.id ?? null
  );
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const keyCount = data.aiKeys.length;
  const activeSession = data.chatSessions.find((s) => s.id === activeId) ?? null;
  const messages: ChatMessage[] = activeSession?.messages ?? [];
  const folders = data.chatFolders ?? [];

  // Keep activeId pointing at a valid session
  useEffect(() => {
    if (!activeId && data.chatSessions.length > 0) {
      setActiveId(data.chatSessions[0].id);
    }
    if (activeId && !data.chatSessions.some((s) => s.id === activeId)) {
      setActiveId(data.chatSessions[0]?.id ?? null);
    }
  }, [data.chatSessions, activeId]);

  // Handle ?newChat=1&pageId=XYZ navigation from Learning Pages
  useEffect(() => {
    const doNewChat = searchParams.get("newChat") === "1";
    const pageId = searchParams.get("pageId");
    if (!doNewChat) return;
    // Clear the query params so refresh doesn't re-trigger
    setSearchParams({}, { replace: true });

    const pageContent = pageId ? (data.pages[pageId] ?? "") : "";
    const pageNode = pageId ? data.nodes.find((n) => n.id === pageId) : null;
    const pageTitle = pageNode?.title ?? "this page";

    // Create a new session
    const s = sessionsStore.create(`Discuss: ${pageTitle}`);
    setActiveId(s.id);
    setError(null);

    if (pageContent.trim()) {
      // Pre-fill the input box so the user can edit or just hit Send
      const openingMsg = `I want to discuss the learning page: **${pageTitle}**\n\nHere's the content:\n\n${pageContent.slice(0, 3000)}${pageContent.length > 3000 ? "\n\n*(content truncated for brevity)*" : ""}`;
      setInput(openingMsg);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  function newSession() {
    const s = sessionsStore.create();
    setActiveId(s.id);
    setError(null);
  }

  function toggleFolder(folderId: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function confirmNewFolder() {
    if (newFolderName.trim()) {
      foldersStore.create(newFolderName);
    }
    setNewFolderName("");
    setNewFolderMode(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);

    // Create session if none active
    let sid = activeId;
    if (!sid) {
      const s = sessionsStore.create(text);
      sid = s.id;
      setActiveId(sid);
    }

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    sessionsStore.setMessages(sid, next);
    // Auto-title from first message
    if (messages.length === 0) {
      sessionsStore.rename(sid, text.slice(0, 40));
    }
    setInput("");
    setLoading(true);

    let acc = "";
    const withReply: ChatMessage[] = [...next, { role: "assistant", content: "" }];
    sessionsStore.setMessages(sid, withReply);

    const context: ChatMessage = {
      role: "system",
      content: buildTutorContext(data, text),
    };
    try {
      await chatStream(
        data.aiKeys,
        [SYSTEM_PROMPT, context, ...next],
        (piece) => {
          acc += piece;
          sessionsStore.setMessages(sid!, [
            ...next,
            { role: "assistant", content: acc },
          ]);
          endRef.current?.scrollIntoView({ behavior: "smooth" });
        },
        "other"
      );
    } catch (err) {
      setError(err instanceof AiError ? err.message : "Something went wrong.");
      sessionsStore.setMessages(sid, next);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  function renderSessionItem(s: (typeof data.chatSessions)[number]) {
    return (
      <div
        key={s.id}
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs ${
          s.id === activeId
            ? "bg-brand-600/20 text-white ring-1 ring-brand-500/30"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        {renamingId === s.id ? (
          <>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sessionsStore.rename(s.id, renameValue);
                  setRenamingId(null);
                }
                if (e.key === "Escape") setRenamingId(null);
              }}
              className="min-w-0 flex-1 rounded bg-slate-800 px-1 py-0.5 text-xs text-white outline-none"
            />
            <button onClick={() => { sessionsStore.rename(s.id, renameValue); setRenamingId(null); }}><Check className="h-3 w-3" /></button>
            <button onClick={() => setRenamingId(null)}><X className="h-3 w-3" /></button>
          </>
        ) : (
          <>
            <button
              className="min-w-0 flex-1 truncate text-left"
              onClick={() => { setActiveId(s.id); setError(null); setMovingSessionId(null); }}
            >
              {s.title}
            </button>
            {/* Move to folder picker */}
            {movingSessionId === s.id ? (
              <div className="flex flex-col gap-0.5 rounded bg-slate-800 p-1 text-xs">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    className="rounded px-1.5 py-0.5 text-left hover:bg-slate-700 text-slate-300"
                    onClick={() => { sessionsStore.setFolder(s.id, f.id); setMovingSessionId(null); }}
                  >
                    {f.name}
                  </button>
                ))}
                {s.folderId && (
                  <button
                    className="rounded px-1.5 py-0.5 text-left hover:bg-slate-700 text-rose-300"
                    onClick={() => { sessionsStore.setFolder(s.id, undefined); setMovingSessionId(null); }}
                  >
                    Remove from folder
                  </button>
                )}
                <button
                  className="rounded px-1.5 py-0.5 text-left hover:bg-slate-700 text-slate-500"
                  onClick={() => setMovingSessionId(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {folders.length > 0 && (
                  <button
                    className="hidden shrink-0 rounded p-0.5 hover:text-brand-300 group-hover:block"
                    onClick={() => setMovingSessionId(s.id)}
                    title="Move to folder"
                  >
                    <Folder className="h-3 w-3" />
                  </button>
                )}
                <button
                  className="hidden shrink-0 rounded p-0.5 hover:text-brand-300 group-hover:block"
                  onClick={() => { setRenamingId(s.id); setRenameValue(s.title); }}
                  title="Rename"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  className="hidden shrink-0 rounded p-0.5 hover:text-rose-400 group-hover:block"
                  onClick={() => sessionsStore.remove(s.id)}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  const ungroupedSessions = data.chatSessions.filter((s) => !s.folderId);

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-5xl gap-4">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Session rail — fixed drawer on mobile, inline on desktop */}
      <aside className={`
        fixed top-0 left-0 z-[70] h-full w-72 p-4
        lg:static lg:z-auto lg:h-auto lg:w-52 lg:p-2
        flex shrink-0 flex-col gap-1 rounded-none lg:rounded-2xl
        border-r lg:border border-white/10 bg-slate-950 lg:bg-white/[0.02]
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
      `}>
        <div className="flex gap-1">
          <button
            onClick={newSession}
            className="flex flex-1 items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
          <button
            onClick={() => { setNewFolderMode((v) => !v); setNewFolderName(""); }}
            className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-slate-400 hover:text-white"
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        {newFolderMode && (
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmNewFolder();
                if (e.key === "Escape") { setNewFolderMode(false); setNewFolderName(""); }
              }}
              placeholder="Folder name…"
              className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600"
            />
            <button onClick={confirmNewFolder} className="text-brand-400 hover:text-brand-300"><Check className="h-3 w-3" /></button>
            <button onClick={() => { setNewFolderMode(false); setNewFolderName(""); }} className="text-slate-500 hover:text-slate-300"><X className="h-3 w-3" /></button>
          </div>
        )}

        <div className="mt-1 flex-1 space-y-0.5 overflow-y-auto">
          {data.chatSessions.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-slate-600">No chats yet</p>
          )}

          {/* Folders */}
          {folders.map((folder) => {
            const folderSessions = data.chatSessions.filter((s) => s.folderId === folder.id);
            const isCollapsed = collapsedFolders.has(folder.id);
            return (
              <div key={folder.id}>
                <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">
                  <button
                    className="flex flex-1 items-center gap-1.5 text-left"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {isCollapsed
                      ? <Folder className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      : <FolderOpen className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                    }
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto text-slate-600">{folderSessions.length}</span>
                  </button>
                  <button
                    className="shrink-0 rounded p-0.5 text-slate-600 hover:text-rose-400"
                    onClick={() => foldersStore.remove(folder.id)}
                    title="Delete folder"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {!isCollapsed && (
                  <div className="ml-3 space-y-0.5 border-l border-white/10 pl-2">
                    {folderSessions.length === 0 && (
                      <p className="px-2 py-1 text-xs text-slate-700">Empty</p>
                    )}
                    {folderSessions.map(renderSessionItem)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ungrouped sessions */}
          {ungroupedSessions.map(renderSessionItem)}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sessions"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
            <MessagesSquare className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Tutor</h1>
            <p className="text-sm text-slate-400">
              Ask anything.{" "}
              {keyCount > 0
                ? `Using ${keyCount} key${keyCount === 1 ? "" : "s"} (with fallback).`
                : "Add provider keys in Settings."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-sm text-slate-500">
              <p>
                Try:{" "}
                <span className="text-slate-300">"Teach me the basics of Docker."</span>
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-brand-600 text-white"
                      : "bg-white/[0.06] text-slate-100 ring-1 ring-white/10"
                  }`}
                >
                  {m.role === "user" ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : (
                    <div
                      className="md-prose"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                  )}
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
            placeholder="Ask your tutor…"
            disabled={loading}
            className="max-h-40 flex-1 resize-none rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none focus:border-brand-500 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
