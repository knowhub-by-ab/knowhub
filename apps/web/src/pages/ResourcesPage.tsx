import { useMemo, useState } from "react";
import {
  Library,
  Plus,
  Trash2,
  ExternalLink,
  BookOpen,
  FileText,
  Video,
  GraduationCap,
  Globe,
} from "lucide-react";
import { resources, useAppData } from "@/lib/store";
import type { ResourceType } from "@/lib/types";

const TYPES: { value: ResourceType; label: string; icon: typeof BookOpen }[] = [
  { value: "doc", label: "Docs", icon: FileText },
  { value: "article", label: "Article", icon: Globe },
  { value: "video", label: "Video", icon: Video },
  { value: "course", label: "Course", icon: GraduationCap },
  { value: "book", label: "Book", icon: BookOpen },
  { value: "other", label: "Other", icon: Globe },
];

function iconFor(t: ResourceType) {
  return (TYPES.find((x) => x.value === t) ?? TYPES[0]).icon;
}

export default function ResourcesPage() {
  const data = useAppData();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ResourceType>("doc");
  const [filter, setFilter] = useState<ResourceType | "all">("all");

  const list = useMemo(
    () =>
      filter === "all"
        ? data.resources
        : data.resources.filter((r) => r.type === filter),
    [data.resources, filter]
  );

  function add() {
    if (!title.trim() || !url.trim()) return;
    resources.add({ title, url, type });
    setTitle("");
    setUrl("");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Library className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Resources</h1>
          <p className="text-sm text-slate-400">
            Save docs, articles, videos, courses and books — free first.
          </p>
        </div>
      </div>

      {/* Add form */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="https://…"
            className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={add}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
        >
          <Plus className="h-4 w-4" /> Add resource
        </button>
      </div>

      {/* Filter */}
      {data.resources.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {(["all", ...TYPES.map((t) => t.value)] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                filter === f
                  ? "bg-brand-600/20 text-white ring-brand-500/40"
                  : "text-slate-300 ring-white/10 hover:bg-white/5"
              }`}
            >
              {f === "all" ? "All" : TYPES.find((t) => t.value === f)?.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="mt-4 space-y-2">
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No resources yet. Add your first one above.
          </p>
        ) : (
          list.map((r) => {
            const Icon = iconFor(r.type);
            return (
              <div
                key={r.id}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <Icon className="h-4 w-4 shrink-0 text-brand-300" />
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-slate-100 hover:text-brand-300"
                >
                  {r.title}
                  <span className="ml-2 text-xs text-slate-500">
                    {(() => {
                      try {
                        return new URL(r.url).hostname;
                      } catch {
                        return r.url;
                      }
                    })()}
                  </span>
                </a>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1 text-slate-400 hover:text-white"
                  title="Open"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => resources.remove(r.id)}
                  className="rounded p-1 text-slate-400 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
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
