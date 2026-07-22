import { useState } from "react";
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
  Pencil,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Folder,
} from "lucide-react";
import { resources as resourceStore, resourceCollections as colStore, useAppData } from "@/lib/store";
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

  // Add form state
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ResourceType>("doc");
  const [addToCollection, setAddToCollection] = useState<string>("");

  // Collection creation
  const [newColName, setNewColName] = useState("");
  const [showNewCol, setShowNewCol] = useState(false);

  // Active collection (sidebar selection)
  const [activeColId, setActiveColId] = useState<string | null>(null); // null = "All"

  // Rename state
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renamingColDraft, setRenamingColDraft] = useState("");
  const [renamingResId, setRenamingResId] = useState<string | null>(null);
  const [renamingResDraft, setRenamingResDraft] = useState("");

  const sortedCols = [...data.resourceCollections].sort((a, b) => a.order - b.order);

  function add() {
    if (!title.trim() || !url.trim()) return;
    resourceStore.add({ title, url, type, collectionId: addToCollection || undefined });
    setTitle("");
    setUrl("");
  }

  // Resources visible in selected view
  const visibleResources = (
    activeColId === null
      ? data.resources
      : activeColId === "__uncollected__"
      ? data.resources.filter((r) => !r.collectionId)
      : data.resources.filter((r) => r.collectionId === activeColId)
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Library className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Resources</h1>
          <p className="text-sm text-slate-400">Save docs, articles, videos, courses and books — free first.</p>
        </div>
      </div>

      <div className="mt-6 flex gap-5">
        {/* Sidebar — collections */}
        <aside className="w-52 shrink-0 space-y-1">
          <button
            onClick={() => setActiveColId(null)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${activeColId === null ? "bg-brand-600/20 text-brand-300" : "text-slate-400 hover:bg-white/5"}`}
          >
            <Library className="h-4 w-4 shrink-0" /> All resources
          </button>
          <button
            onClick={() => setActiveColId("__uncollected__")}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${activeColId === "__uncollected__" ? "bg-brand-600/20 text-brand-300" : "text-slate-400 hover:bg-white/5"}`}
          >
            <FileText className="h-4 w-4 shrink-0" /> Uncollected
          </button>

          <div className="border-t border-white/5 pt-2 mt-1">
            {sortedCols.map((col, idx) => (
              <div key={col.id} className="group relative">
                <button
                  onClick={() => setActiveColId(col.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition pr-16 ${activeColId === col.id ? "bg-brand-600/20 text-brand-300" : "text-slate-400 hover:bg-white/5"}`}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  {renamingColId === col.id ? (
                    <input
                      autoFocus
                      value={renamingColDraft}
                      onChange={(e) => setRenamingColDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && renamingColDraft.trim()) { colStore.rename(col.id, renamingColDraft.trim()); setRenamingColId(null); }
                        if (e.key === "Escape") setRenamingColId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none border-b border-brand-500"
                    />
                  ) : (
                    <span className="min-w-0 truncate">{col.name}</span>
                  )}
                </button>
                {/* Controls */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                  {renamingColId === col.id ? (
                    <>
                      <button onClick={() => { colStore.rename(col.id, renamingColDraft.trim() || col.name); setRenamingColId(null); }} className="text-brand-400"><Check className="h-3 w-3" /></button>
                      <button onClick={() => setRenamingColId(null)} className="text-slate-500"><X className="h-3 w-3" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setRenamingColId(col.id); setRenamingColDraft(col.name); }} className="text-slate-600 hover:text-slate-300"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => colStore.move(col.id, "up")} disabled={idx === 0} className="text-slate-600 hover:text-slate-300 disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                      <button onClick={() => colStore.move(col.id, "down")} disabled={idx === sortedCols.length - 1} className="text-slate-600 hover:text-slate-300 disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
                      <button onClick={() => colStore.remove(col.id)} className="text-slate-600 hover:text-rose-400"><Trash2 className="h-3 w-3" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* New collection */}
          {showNewCol ? (
            <div className="flex items-center gap-1.5 mt-2">
              <input
                autoFocus
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newColName.trim()) { colStore.create(newColName.trim()); setNewColName(""); setShowNewCol(false); }
                  if (e.key === "Escape") { setShowNewCol(false); setNewColName(""); }
                }}
                placeholder="Collection name…"
                className="flex-1 rounded border border-white/15 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-brand-500"
              />
              <button onClick={() => { if (newColName.trim()) { colStore.create(newColName.trim()); setNewColName(""); } setShowNewCol(false); }}
                className="text-brand-400"><Check className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setShowNewCol(true)}
              className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-brand-300 hover:bg-white/5 transition">
              <FolderPlus className="h-3.5 w-3.5" /> New collection
            </button>
          )}
        </aside>

        {/* Main area */}
        <div className="flex-1 min-w-0">
          {/* Add form */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
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
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={type} onChange={(e) => setType(e.target.value as ResourceType)}
                className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {sortedCols.length > 0 && (
                <select value={addToCollection} onChange={(e) => setAddToCollection(e.target.value)}
                  className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500">
                  <option value="">No collection</option>
                  {sortedCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <button onClick={add}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">
                <Plus className="h-4 w-4" /> Add resource
              </button>
            </div>
          </div>

          {/* Resource list */}
          <div className="mt-4 space-y-2">
            {visibleResources.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                {activeColId ? "No resources in this collection." : "No resources yet. Add your first one above."}
              </p>
            ) : (
              visibleResources.map((r, idx) => {
                const Icon = iconFor(r.type);
                return (
                  <div key={r.id} className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    {/* Sort */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={() => resourceStore.move(r.id, "up")} disabled={idx === 0}
                        className="text-slate-700 hover:text-slate-400 disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                      <button onClick={() => resourceStore.move(r.id, "down")} disabled={idx === visibleResources.length - 1}
                        className="text-slate-700 hover:text-slate-400 disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
                    </div>
                    <Icon className="h-4 w-4 shrink-0 text-brand-300" />
                    <div className="min-w-0 flex-1">
                      {renamingResId === r.id ? (
                        <div className="flex items-center gap-1.5">
                          <input autoFocus value={renamingResDraft} onChange={(e) => setRenamingResDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && renamingResDraft.trim()) { resourceStore.rename(r.id, renamingResDraft.trim()); setRenamingResId(null); }
                              if (e.key === "Escape") setRenamingResId(null);
                            }}
                            className="flex-1 rounded border border-white/20 bg-slate-800 px-2 py-0.5 text-sm text-white outline-none focus:border-brand-500"
                          />
                          <button onClick={() => { if (renamingResDraft.trim()) resourceStore.rename(r.id, renamingResDraft.trim()); setRenamingResId(null); }}
                            className="text-brand-400"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setRenamingResId(null)} className="text-slate-500"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <a href={r.url} target="_blank" rel="noreferrer" className="truncate text-sm text-slate-100 hover:text-brand-300">
                            {r.title}
                            <span className="ml-2 text-xs text-slate-500">
                              {(() => { try { return new URL(r.url).hostname; } catch { return r.url; } })()}
                            </span>
                          </a>
                          <button onClick={() => { setRenamingResId(r.id); setRenamingResDraft(r.title); }}
                            className="shrink-0 text-slate-700 hover:text-slate-300 opacity-0 group-hover:opacity-100">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <a href={r.url} target="_blank" rel="noreferrer"
                      className="rounded p-1 text-slate-400 hover:text-white" title="Open">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button onClick={() => resourceStore.remove(r.id)}
                      className="rounded p-1 text-slate-400 opacity-0 transition hover:text-rose-400 group-hover:opacity-100" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
