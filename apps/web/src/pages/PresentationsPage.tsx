import { useState, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Presentation, FolderOpen, Trash2, Play,
  Download, Search, Upload, LayoutTemplate, Pencil, Check, X,
} from "lucide-react";

const MdGuidePage = lazy(() => import("@/pages/MdGuidePage"));
const MdEditorTab = lazy(() => import("@/components/deck/MdEditorTab"));
import { useDeckStore, decks as deckOps, collections as colOps } from "@/lib/deckStore";
import type { PresentationDeck, Collection, CollectionType } from "@/lib/deckStore";
import type { PptTemplate } from "@/lib/types";
import { useAppData } from "@/lib/store";
import { useTemplates, templates as tplOps } from "@/lib/templateStore";
import { exportPptx, THEMES } from "@/lib/deckExport";
import NewDeckModal from "@/components/deck/NewDeckModal";

type Tab = "decks" | "collections" | "guide" | "md-editor" | "templates";
type SortKey = "newest" | "oldest" | "title";

export default function PresentationsPage() {
  const navigate = useNavigate();
  const { decks, collections } = useDeckStore();
  const { nodes, pages } = useAppData();
  const tplList = useTemplates();
  const tplFileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("decks");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [showNew, setShowNew] = useState(false);
  const [, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<CollectionType>("folder");

  // Sort + filter decks
  const filteredDecks = decks
    .filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "newest") return b.createdAt - a.createdAt;
      if (sort === "oldest") return a.createdAt - b.createdAt;
      return a.title.localeCompare(b.title);
    });

  function handleOpenDeck(id: string) {
    navigate(`/app/presentations/${id}`);
  }

  async function handleDeleteDeck(id: string) {
    if (!confirm("Delete this presentation? This cannot be undone.")) return;
    deckOps.remove(id);
    setDeletingId(null);
  }

  async function handleExportPptx(deck: PresentationDeck, e: React.MouseEvent) {
    e.stopPropagation();
    await exportPptx(deck);
  }

  async function handleImportPptx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const { importPptxFile } = await import("@/lib/deckImport");
      const imported = await importPptxFile(file);
      const deck = deckOps.create(imported.title, undefined, undefined);
      if (Object.keys(imported.frontmatter).length > 0) {
        deckOps.updateFrontmatter(deck.id, imported.frontmatter);
      }
      deckOps.setSlides(deck.id, imported.slides);
      navigate(`/app/presentations/${deck.id}`);
    } catch (err) {
      alert(`Failed to import PPTX: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleImportTemplate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1] ?? "";
      const name = file.name.replace(/\.(pptx|potx|ppt)$/i, "");
      tplOps.add(name, b64);
    };
    reader.readAsDataURL(file);
  }

  function handleCreateCollection() {
    if (!newColName.trim()) return;
    colOps.create(newColName, newColType);
    setNewColName("");
    setShowNewCollection(false);
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Presentation size={22} className="text-indigo-400" />
          <h1 className="text-xl font-semibold">Presentations</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            <Upload size={14} /> Import PPTX
          </button>
          <input ref={fileRef} type="file" accept=".pptx,.potx,.ppt" className="hidden" onChange={handleImportPptx} />
          <input ref={tplFileRef} type="file" accept=".pptx,.potx,.ppt" className="hidden" onChange={handleImportTemplate} />
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={14} /> New Presentation
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3">
        <button
          onClick={() => setTab("decks")}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${tab === "decks" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          Presentations ({decks.length})
        </button>
        <button
          onClick={() => setTab("collections")}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${tab === "collections" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          Collections ({collections.length})
        </button>
        <button
          onClick={() => setTab("guide")}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${tab === "guide" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          MD Guide
        </button>
        <button
          onClick={() => setTab("md-editor")}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${tab === "md-editor" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          MD Editor
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${tab === "templates" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          Templates ({tplList.length})
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        {tab === "decks" && (
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
        )}
        {tab === "collections" && (
          <button
            onClick={() => setShowNewCollection(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            <Plus size={13} /> New Collection
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {tab === "guide" && (
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Loading guide…</div>}>
              <MdGuidePage />
            </Suspense>
          </div>
        )}

        {tab === "md-editor" && (
          <div className="h-full">
            <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Loading editor…</div>}>
              <MdEditorTab />
            </Suspense>
          </div>
        )}

        {tab === "templates" && (
          <TemplateLibrary
            templates={tplList}
            onImport={() => tplFileRef.current?.click()}
          />
        )}

        {tab === "decks" && (
          filteredDecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <Presentation size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No presentations yet.</p>
              <button onClick={() => setShowNew(true)} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">
                Create your first presentation →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
              {filteredDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onOpen={() => handleOpenDeck(deck.id)}
                  onPresent={() => navigate(`/app/presentations/${deck.id}/present`)}
                  onExport={(e) => handleExportPptx(deck, e)}
                  onDelete={() => handleDeleteDeck(deck.id)}
                />
              ))}
            </div>
          )
        )}

        {tab === "collections" && (
          collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <FolderOpen size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No collections yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {collections.map((col) => (
                <CollectionCard key={col.id} collection={col} decks={decks} onOpen={() => {}} />
              ))}
            </div>
          )
        )}
      </div>

      {/* New Deck Modal */}
      {showNew && (
        <NewDeckModal
          nodes={nodes}
          pages={pages}
          onClose={() => setShowNew(false)}
          onCreate={(id) => navigate(`/app/presentations/${id}`)}
        />
      )}

      {/* New Collection Modal */}
      {showNewCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowNewCollection(false)}>
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-sm border border-zinc-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-white font-semibold mb-4">New Collection</h2>
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Collection name"
              autoFocus
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 mb-3"
            />
            <div className="flex gap-2 mb-4">
              {(["folder", "playlist", "album"] as CollectionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewColType(t)}
                  className={`flex-1 py-1.5 text-xs rounded capitalize border transition-colors ${
                    newColType === t ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewCollection(false)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded">Cancel</button>
              <button onClick={handleCreateCollection} className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deck Card
// ---------------------------------------------------------------------------
interface DeckCardProps {
  deck: PresentationDeck;
  onOpen: () => void;
  onPresent: () => void;
  onExport: (e: React.MouseEvent) => void;
  onDelete: () => void;
}

function DeckCard({ deck, onOpen, onPresent, onExport, onDelete }: DeckCardProps) {
  const theme = THEMES[deck.frontmatter.theme] ?? THEMES["aurora-dark"];

  return (
    <div
      className="group rounded-xl border border-zinc-800 hover:border-zinc-600 overflow-hidden cursor-pointer bg-zinc-900 transition-all hover:shadow-xl"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div style={{ backgroundColor: theme.bg, aspectRatio: "16/9", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: theme.accent }} />
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.titleColor, marginBottom: 6 }}>
            {deck.title}
          </div>
          <div style={{ width: 30, height: 2, backgroundColor: theme.accent, marginBottom: 8, borderRadius: 1 }} />
          {[70, 55, 40].map((w, i) => (
            <div key={i} style={{ height: 3, backgroundColor: theme.bodyColor, opacity: 0.5, borderRadius: 1, marginBottom: 4, width: `${w}%` }} />
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: theme.bodyColor, opacity: 0.7 }}>
          {deck.slides.length} slides
        </div>
      </div>

      {/* Card footer */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{deck.title}</p>
          <p className="text-xs text-zinc-500">{new Date(deck.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onPresent(); }} className="p-1.5 text-zinc-400 hover:text-emerald-400 transition-colors" title="Present">
            <Play size={13} />
          </button>
          <button onClick={onExport} className="p-1.5 text-zinc-400 hover:text-indigo-400 transition-colors" title="Download PPTX">
            <Download size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collection Card
// ---------------------------------------------------------------------------
interface CollectionCardProps {
  collection: Collection;
  decks: PresentationDeck[];
  onOpen: () => void;
}

function CollectionCard({ collection, decks, onOpen }: CollectionCardProps) {
  const typeIcon = collection.type === "playlist" ? "🎬" : collection.type === "album" ? "📚" : "📁";
  const deckItems = collection.items.filter((i) => i.type === "deck").slice(0, 4);
  void (deckItems[0] ? decks.find((d) => d.id === deckItems[0].refId) : null); // reserved for future thumbnail

  return (
    <div className="rounded-xl border border-zinc-800 hover:border-zinc-600 overflow-hidden cursor-pointer bg-zinc-900 transition-all" onClick={onOpen}>
      <div className="p-4 flex items-center gap-3">
        <span className="text-2xl">{typeIcon}</span>
        <div className="min-w-0">
          <p className="font-medium text-zinc-200 truncate">{collection.name}</p>
          <p className="text-xs text-zinc-500 capitalize">{collection.type} · {collection.items.length} items</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Library
// ---------------------------------------------------------------------------

function TemplateLibrary({ templates, onImport }: { templates: PptTemplate[]; onImport: () => void }) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-400">Upload PPTX/POTX files as reusable templates for new decks.</p>
        <button onClick={onImport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white transition-colors">
          <Upload size={14} /> Upload template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-600 border border-dashed border-zinc-700 rounded-xl">
          <LayoutTemplate size={36} className="mb-3 opacity-40" />
          <p className="text-sm">No templates yet.</p>
          <button onClick={onImport} className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm">Upload your first template →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="group rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-900 overflow-hidden transition-all">
              <div className="h-24 flex items-center justify-center"
                style={{ backgroundColor: tpl.backgroundColor ?? "#1e1e2e" }}>
                <LayoutTemplate size={32} style={{ color: tpl.accentColor ?? "#6366f1", opacity: 0.7 }} />
              </div>
              <div className="p-3 flex items-center gap-2">
                {renamingId === tpl.id ? (
                  <>
                    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && draft.trim()) { tplOps.rename(tpl.id, draft.trim()); setRenamingId(null); }
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200 outline-none focus:border-indigo-500" />
                    <button onClick={() => { if (draft.trim()) tplOps.rename(tpl.id, draft.trim()); setRenamingId(null); }}
                      className="text-indigo-400"><Check size={13} /></button>
                    <button onClick={() => setRenamingId(null)} className="text-zinc-500"><X size={13} /></button>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm font-medium text-zinc-200 truncate">{tpl.name}</p>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button onClick={() => { setRenamingId(tpl.id); setDraft(tpl.name); }}
                        className="p-1 text-zinc-500 hover:text-zinc-200"><Pencil size={12} /></button>
                      <button onClick={() => tplOps.remove(tpl.id)}
                        className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
