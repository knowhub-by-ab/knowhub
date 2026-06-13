import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MiniSearch from "minisearch";
import { Search as SearchIcon, Network, FileText, StickyNote } from "lucide-react";
import { tree, useAppData } from "@/lib/store";

interface Doc {
  id: string;
  title: string;
  body: string;
  type: "node" | "page" | "note";
  to: string;
}

const TYPE_META = {
  node: { label: "Topic", icon: Network, to: "/app/learning-tree" },
  page: { label: "Page", icon: FileText, to: "/app/learning-pages" },
  note: { label: "Note", icon: StickyNote, to: "/app/notes" },
} as const;

export default function SearchPage() {
  const data = useAppData();
  const [query, setQuery] = useState("");

  const docs = useMemo<Doc[]>(() => {
    const out: Doc[] = [];
    for (const n of data.nodes) {
      out.push({ id: `node:${n.id}`, title: n.title, body: "", type: "node", to: TYPE_META.node.to });
      const page = data.pages[n.id];
      if (page?.trim()) {
        out.push({
          id: `page:${n.id}`,
          title: n.title,
          body: page,
          type: "page",
          to: TYPE_META.page.to,
        });
      }
    }
    for (const n of data.notesList) {
      if (n.title.trim() || n.body.trim()) {
        out.push({
          id: `note:${n.id}`,
          title: n.title || "Untitled note",
          body: n.body,
          type: "note",
          to: TYPE_META.note.to,
        });
      }
    }
    return out;
  }, [data]);

  const index = useMemo(() => {
    const ms = new MiniSearch<Doc>({
      fields: ["title", "body"],
      storeFields: ["title", "body", "type", "to"],
      searchOptions: { boost: { title: 2 }, prefix: true, fuzzy: 0.2 },
    });
    ms.addAll(docs);
    return ms;
  }, [docs]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return index.search(query).slice(0, 50);
  }, [query, index]);

  function snippet(body: string): string {
    const flat = body.replace(/\s+/g, " ").trim();
    return flat.length > 160 ? flat.slice(0, 160) + "…" : flat;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <SearchIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Search</h1>
          <p className="text-sm text-slate-400">
            Search across your topics, pages and notes.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your knowledge base…"
          className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none focus:border-brand-500"
        />
      </div>

      <div className="mt-5 space-y-2">
        {query.trim() && results.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No matches for "{query}".
          </p>
        )}
        {results.map((r) => {
          const meta = TYPE_META[r.type as Doc["type"]];
          const Icon = meta.icon;
          return (
            <Link
              key={r.id}
              to={r.to}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-brand-500/40 hover:bg-white/[0.05]"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{r.title}</span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    {meta.label}
                  </span>
                </div>
                {r.body && (
                  <p className="mt-1 truncate text-sm text-slate-400">{snippet(r.body)}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {!query.trim() && (
        <p className="mt-6 text-center text-xs text-slate-500">
          {docs.length} item{docs.length === 1 ? "" : "s"} indexed ·{" "}
          {tree.childrenOf(data.nodes, null).length} top-level topics.
        </p>
      )}
    </div>
  );
}
