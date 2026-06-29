import { useState } from "react";
import {
  Archive,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  Download,
  Loader2,
  FileText,
} from "lucide-react";
import { useAppData, tree } from "@/lib/store";
import { renderMarkdown } from "@/lib/markdown";
import type { TreeNode } from "@/lib/types";

type Format = "md" | "doc" | "html" | "pdf";

const FORMAT_LABELS: Record<Format, string> = {
  md: "Markdown (.md)",
  doc: "Word (.doc)",
  html: "HTML (.html)",
  pdf: "Print-ready HTML (.html) — open & print as PDF",
};

function safeName(s: string) {
  return s.trim().replace(/[^\w.-]+/g, "-").slice(0, 60) || "page";
}

function buildDocHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>${title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;margin:2cm}h1,h2,h3,h4{color:#1a1a1a}pre,code{font-family:Consolas,monospace;background:#f4f4f4;padding:2px 4px}pre{padding:8px;display:block}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px}</style>
</head><body><h1>${title}</h1>${bodyHtml}</body></html>`;
}

interface PickerNodeProps {
  node: TreeNode;
  nodes: TreeNode[];
  depth: number;
  checked: Set<string>;
  onToggle: (id: string) => void;
  hasContent: (id: string) => boolean;
}

function PickerNode({ node, nodes, depth, checked, onToggle, hasContent }: PickerNodeProps) {
  const children = tree.childrenOf(nodes, node.id);
  const [expanded, setExpanded] = useState(true);
  const has = hasContent(node.id);

  return (
    <li>
      <div
        className="flex items-center gap-1 rounded-lg py-0.5 pr-2 hover:bg-white/5"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 hover:text-white ${children.length ? "" : "invisible"}`}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => has && onToggle(node.id)}
          className={`shrink-0 ${has ? "text-slate-300 hover:text-white" : "cursor-default text-slate-600"}`}
          title={has ? (checked.has(node.id) ? "Deselect" : "Select") : "No content"}
        >
          {checked.has(node.id) ? (
            <CheckSquare className="h-3.5 w-3.5 text-brand-400" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </button>
        <span className={`flex min-w-0 flex-1 items-center gap-1.5 py-1 text-sm ${has ? "text-slate-200" : "text-slate-500"}`}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${has ? "bg-emerald-400" : "bg-slate-600"}`} />
          <span className="truncate">{node.title}</span>
        </span>
      </div>
      {expanded && children.length > 0 && (
        <ul>
          {children.map((c) => (
            <PickerNode
              key={c.id}
              node={c}
              nodes={nodes}
              depth={depth + 1}
              checked={checked}
              onToggle={onToggle}
              hasContent={hasContent}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function BulkDownloadPage() {
  const data = useAppData();
  const roots = tree.childrenOf(data.nodes, null);
  const flat = tree.flatten(data.nodes);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<Format>("md");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasContent = (id: string) => Boolean(data.pages[id]?.trim());
  const nodesWithContent = flat.map((f) => f.node).filter((n) => hasContent(n.id));

  function toggleNode(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setChecked(new Set(nodesWithContent.map((n) => n.id)));
  }

  function clearAll() {
    setChecked(new Set());
  }

  async function downloadZip() {
    if (checked.size === 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const { node, depth } of flat) {
        if (!checked.has(node.id) || !hasContent(node.id)) continue;
        const markdown = data.pages[node.id] ?? "";
        const name = safeName(node.title);
        const prefix = "  ".repeat(depth); // for folder hints in filename

        if (format === "md") {
          zip.file(`${prefix}${name}.md`, markdown);
        } else if (format === "html") {
          const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${node.title}</title></head><body><h1>${node.title}</h1>${renderMarkdown(markdown)}</body></html>`;
          zip.file(`${prefix}${name}.html`, html);
        } else if (format === "doc") {
          const doc = buildDocHtml(node.title, renderMarkdown(markdown));
          zip.file(`${prefix}${name}.doc`, "﻿" + doc);
        } else if (format === "pdf") {
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${node.title}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.6; margin: 2cm; color: #111; }
    h1,h2,h3,h4 { color: #1a1a1a; }
    pre,code { font-family: Consolas, monospace; background: #f4f4f4; padding: 2px 5px; }
    pre { padding: 10px; display: block; white-space: pre-wrap; }
    table { border-collapse: collapse; width: 100%; }
    td,th { border: 1px solid #ccc; padding: 6px 10px; }
    img { max-width: 100%; }
    blockquote { border-left: 3px solid #ccc; padding-left: 1em; color: #555; }
    @media print { body { margin: 1cm; } }
  </style>
</head>
<body>
<h1>${node.title}</h1>
${renderMarkdown(markdown)}
</body>
</html>`;
          zip.file(`${name}-print.html`, html);
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "knowhub-pages.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Archive className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Bulk Download</h1>
          <p className="text-sm text-slate-400">
            Select pages from your tree and download them all as a ZIP file.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Tree picker */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">
              {checked.size > 0 ? `${checked.size} selected` : "Select pages to include"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                All
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-slate-500 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
          {roots.length === 0 ? (
            <p className="text-sm text-slate-500">No topics yet. Build a Learning Tree first.</p>
          ) : (
            <ul className="space-y-0.5 overflow-x-auto">
              {roots.map((n) => (
                <PickerNode
                  key={n.id}
                  node={n}
                  nodes={data.nodes}
                  depth={0}
                  checked={checked}
                  onToggle={toggleNode}
                  hasContent={hasContent}
                />
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-600">
            Green dot = has content. Grey dot = empty (cannot be selected).
          </p>
        </div>

        {/* Download options */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">Format</p>
            <div className="space-y-2">
              {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
                <label key={f} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 hover:text-white">
                  <input
                    type="radio"
                    name="format"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                    className="accent-brand-500"
                  />
                  {FORMAT_LABELS[f]}
                </label>
              ))}
            </div>
            {format === "pdf" && (
              <p className="mt-2 text-xs text-slate-500">
                Open each .html file in a browser and use File → Print → Save as PDF.
              </p>
            )}
          </div>

          <button
            onClick={downloadZip}
            disabled={checked.size === 0 || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {loading ? "Zipping…" : `Download ${checked.size || ""} pages as ZIP`}
          </button>

          {error && <p className="text-xs text-rose-300">{error}</p>}

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-500">
            <p className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              Each file is named after its page title. The ZIP is generated entirely in your browser — no upload needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
