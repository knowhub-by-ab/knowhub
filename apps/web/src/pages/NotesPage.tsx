import { useEffect, useRef, useState } from "react";
import { StickyNote, Check } from "lucide-react";
import { setNotes, useAppData } from "@/lib/store";

export default function NotesPage() {
  const data = useAppData();
  const [value, setValue] = useState(data.notes);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave.
  useEffect(() => {
    if (value === data.notes) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setNotes(value);
      setSavedAt(Date.now());
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, data.notes]);

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <StickyNote className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Notes</h1>
          <p className="text-sm text-slate-400">
            Your single global notebook — ideas, journal, questions, scratchpad.
          </p>
        </div>
        {savedAt && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="# My learning journal&#10;&#10;Write anything in Markdown…"
        spellCheck
        className="mt-6 min-h-[55vh] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-5 font-mono text-sm leading-relaxed text-slate-100 outline-none focus:border-brand-500"
      />
      <p className="mt-2 text-xs text-slate-500">
        {words} word{words === 1 ? "" : "s"} · Markdown · saved automatically in your
        browser.
      </p>
    </div>
  );
}
