import { useEffect, useRef, useState } from "react";
import { StickyNote, Plus, Trash2, Check } from "lucide-react";
import { notes as notesApi, useAppData } from "@/lib/store";

export default function NotesPage() {
  const data = useAppData();
  const list = data.notesList;
  const [selectedId, setSelectedId] = useState<string | null>(list[0]?.id ?? null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = list.find((n) => n.id === selectedId) ?? null;

  // Keep a valid selection as the list changes.
  useEffect(() => {
    if ((!selectedId || !list.some((n) => n.id === selectedId)) && list.length) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  // Local draft for the selected note (debounced autosave).
  const [title, setTitle] = useState(selected?.title ?? "");
  const [body, setBody] = useState(selected?.body ?? "");
  useEffect(() => {
    setTitle(selected?.title ?? "");
    setBody(selected?.body ?? "");
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    if (title === selected.title && body === selected.body) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      notesApi.update(selected.id, { title: title.trim() || "Untitled note", body });
      setSavedAt(Date.now());
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [title, body, selected]);

  function addNote() {
    const n = notesApi.add("Untitled note");
    setSelectedId(n.id);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <StickyNote className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Notes</h1>
          <p className="text-sm text-slate-400">Multiple notebooks — each saved by its title.</p>
        </div>
        <button
          onClick={addNote}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          <Plus className="h-4 w-4" /> New note
        </button>
      </div>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-400">
          No notes yet. Create your first note.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr]">
          {/* Note list */}
          <aside className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {list.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => setSelectedId(n.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      n.id === selectedId
                        ? "bg-brand-600/20 text-white ring-1 ring-brand-500/40"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">{n.title || "Untitled note"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Editor */}
          {selected && (
            <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 border-b border-white/10 p-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  className="flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
                />
                {savedAt && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete "${selected.title}"?`)) notesApi.remove(selected.id);
                  }}
                  className="rounded p-1.5 text-slate-400 hover:text-rose-400"
                  title="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write in Markdown…"
                className="min-h-[50vh] w-full resize-none rounded-b-2xl bg-transparent p-5 font-mono text-sm leading-relaxed text-slate-100 outline-none"
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
