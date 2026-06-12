import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Check, Eye, Pencil, Network } from "lucide-react";
import { setPage, tree, useAppData } from "@/lib/store";
import { renderMarkdown } from "@/lib/markdown";

type Tab = "edit" | "preview";

export default function LearningPagesPage() {
  const data = useAppData();
  const flat = useMemo(() => tree.flatten(data.nodes), [data.nodes]);

  const [selectedId, setSelectedId] = useState<string | null>(flat[0]?.node.id ?? null);
  const [tab, setTab] = useState<Tab>("edit");
  const [draft, setDraft] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a valid selection as the tree changes.
  useEffect(() => {
    if (!selectedId && flat.length) setSelectedId(flat[0].node.id);
    if (selectedId && !flat.some((f) => f.node.id === selectedId)) {
      setSelectedId(flat[0]?.node.id ?? null);
    }
  }, [flat, selectedId]);

  // Load the selected page into the editor.
  useEffect(() => {
    setDraft(selectedId ? data.pages[selectedId] ?? "" : "");
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Debounced autosave.
  useEffect(() => {
    if (!selectedId) return;
    if (draft === (data.pages[selectedId] ?? "")) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPage(selectedId, draft);
      setSavedAt(Date.now());
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, selectedId, data.pages]);

  const selectedTitle = flat.find((f) => f.node.id === selectedId)?.node.title;
  const previewHtml = useMemo(() => renderMarkdown(draft), [draft]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <FileText className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Learning Pages</h1>
          <p className="text-sm text-slate-400">
            Write a Markdown knowledge page for any topic in your tree.
          </p>
        </div>
      </div>

      {flat.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <Network className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-3 text-sm text-slate-400">
            You need a topic first. Create one in the{" "}
            <Link to="/app/learning-tree" className="text-brand-300 underline">
              Learning Tree
            </Link>
            , then write its page here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Node picker */}
          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <ul className="max-h-[60vh] overflow-y-auto">
              {flat.map(({ node, depth }) => {
                const hasPage = Boolean(data.pages[node.id]?.trim());
                return (
                  <li key={node.id}>
                    <button
                      onClick={() => setSelectedId(node.id)}
                      style={{ paddingLeft: `${depth * 14 + 12}px` }}
                      className={`flex w-full items-center gap-2 truncate rounded-lg py-1.5 pr-2 text-left text-sm transition ${
                        node.id === selectedId
                          ? "bg-brand-600/20 text-white ring-1 ring-brand-500/40"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          hasPage ? "bg-emerald-400" : "bg-slate-600"
                        }`}
                      />
                      <span className="truncate">{node.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Editor / preview */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <div className="truncate text-sm font-medium text-slate-200">
                {selectedTitle}
              </div>
              <div className="flex items-center gap-2">
                {savedAt && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <div className="flex rounded-lg border border-white/10 p-0.5">
                  <button
                    onClick={() => setTab("edit")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${
                      tab === "edit" ? "bg-brand-600 text-white" : "text-slate-300"
                    }`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setTab("preview")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${
                      tab === "preview" ? "bg-brand-600 text-white" : "text-slate-300"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                </div>
              </div>
            </div>

            {tab === "edit" ? (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`# ${selectedTitle}\n\nStart writing this topic in Markdown…`}
                className="min-h-[55vh] w-full resize-none bg-transparent p-5 font-mono text-sm leading-relaxed text-slate-100 outline-none"
              />
            ) : (
              <div className="min-h-[55vh] p-5">
                {draft.trim() ? (
                  <div
                    className="md-prose"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <p className="text-sm text-slate-500">Nothing to preview yet.</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Pages are saved automatically in your browser. Green dot = page has content.
      </p>
    </div>
  );
}
