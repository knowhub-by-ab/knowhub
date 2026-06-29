import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Upload,
  FileText,
  Download,
} from "lucide-react";
import { questionBanks, useAppData } from "@/lib/store";
import { generateQuestionBank } from "@/lib/aiActions";
import { exportMarkdown } from "@/lib/exporters";

type Source = "text" | "page";

export default function QuestionBankPage() {
  const data = useAppData();
  const [source, setSource] = useState<Source>("text");
  const [pastedText, setPastedText] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(20);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pagesWithContent = data.nodes.filter((n) => data.pages[n.id]?.trim());

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setPastedText(text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  async function generate() {
    let sourceText = "";
    let sourceName = "";

    if (source === "text") {
      sourceText = pastedText.trim();
      sourceName = "pasted text";
    } else {
      const node = data.nodes.find((n) => n.id === selectedPageId);
      sourceText = data.pages[selectedPageId] ?? "";
      sourceName = node?.title ?? "page";
    }

    if (!sourceText) {
      setGenError("Please provide some source text.");
      return;
    }
    if (!title.trim()) {
      setGenError("Please enter a title for this bank.");
      return;
    }

    setGenError(null);
    setGenLoading(true);
    try {
      await generateQuestionBank(data.aiKeys, title.trim(), sourceName, sourceText, count);
      setTitle("");
      setPastedText("");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  function exportBankMd(id: string) {
    const bank = data.questionBanks.find((b) => b.id === id);
    if (!bank) return;
    const md = `# ${bank.title}\n\nSource: ${bank.source}\n\n${bank.questions
      .map(
        (q, i) =>
          `## Q${i + 1}. ${q.prompt}\n\n${q.options.map((o, oi) => `${oi + 1}. ${o}${q.correct.includes(oi) ? " ✓" : ""}`).join("\n")}${q.explanation ? `\n\n*${q.explanation}*` : ""}`
      )
      .join("\n\n---\n\n")}`;
    exportMarkdown(bank.title, md);
  }

  function exportBankDoc(id: string, mode: "solved" | "solved-explained" | "unsolved") {
    const bank = data.questionBanks.find((b) => b.id === id);
    if (!bank) return;

    const questionsHtml = bank.questions.map((q, i) => {
      const optionsHtml = q.options.map((opt, oi) => {
        const isCorrect = q.correct.includes(oi);
        const showAnswer = mode !== "unsolved";
        const mark = showAnswer && isCorrect ? " ✓" : "";
        const style = showAnswer && isCorrect ? ' style="color:#16a34a;font-weight:bold"' : '';
        return `<li${style}>${opt}${mark}</li>`;
      }).join("\n");

      const explanationHtml = (mode === "solved-explained" && q.explanation)
        ? `<p style="color:#4f46e5;font-style:italic;margin-top:4px">💡 ${q.explanation}</p>`
        : "";

      return `<div style="margin-bottom:16px">
<p><strong>Q${i + 1}. ${q.prompt}</strong></p>
<ol type="A">${optionsHtml}</ol>
${explanationHtml}
</div>`;
    }).join("\n<hr style='border:none;border-top:1px solid #eee;margin:8px 0'>\n");

    const answerKeyHtml = mode === "unsolved"
      ? `<h2>Answer Key</h2>
<table style="border-collapse:collapse;width:100%">
<thead><tr><th style="border:1px solid #ccc;padding:4px 8px">Q#</th><th style="border:1px solid #ccc;padding:4px 8px">Answer(s)</th>${bank.questions[0]?.explanation !== undefined ? '<th style="border:1px solid #ccc;padding:4px 8px">Explanation</th>' : ""}</tr></thead>
<tbody>${bank.questions.map((q, i) => {
        const letters = q.correct.map((c) => String.fromCharCode(65 + c)).join(", ");
        const expCell = q.explanation ? `<td style="border:1px solid #ccc;padding:4px 8px">${q.explanation}</td>` : "";
        return `<tr><td style="border:1px solid #ccc;padding:4px 8px">${i + 1}</td><td style="border:1px solid #ccc;padding:4px 8px">${letters}</td>${expCell}</tr>`;
      }).join("")}</tbody></table>`
      : "";

    const modeLabel = mode === "solved" ? "Solved" : mode === "solved-explained" ? "Solved with Explanations" : "Unsolved";
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>${bank.title}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;margin:2cm}h1,h2{color:#1a1a1a}ol{padding-left:1.5em}</style>
</head><body>
<h1>${bank.title}</h1>
<p style="color:#666;font-size:10pt">Source: ${bank.source} · ${bank.questions.length} questions · ${modeLabel}</p>
<hr>
${questionsHtml}
${answerKeyHtml}
</body></html>`;

    const safeName = (s: string) => s.trim().replace(/[^\w.-]+/g, "-").slice(0, 60) || "bank";
    const blob = new Blob(["﻿", html], { type: "application/msword; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName(bank.title)}-${mode}.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <BookOpen className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Question Bank</h1>
          <p className="text-sm text-slate-400">Generate question banks from your pages or any text.</p>
        </div>
      </div>

      {/* Generator */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bank title (e.g. Python OOP Questions)"
          className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        />

        {/* Source tabs */}
        <div className="flex gap-2">
          {(["text", "page"] as Source[]).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                source === s
                  ? "bg-brand-600/30 text-white ring-1 ring-brand-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {s === "text" ? <FileText className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
              {s === "text" ? "Paste / Upload text" : "From a Learning Page"}
            </button>
          ))}
        </div>

        {source === "text" && (
          <div className="space-y-2">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your notes, textbook chapter, or any text here…"
              rows={6}
              className="w-full resize-none rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
              >
                <Upload className="h-3.5 w-3.5" /> Upload file (.txt, .md)
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md,.text" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        )}

        {source === "page" && (
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
          >
            <option value="">Select a page…</option>
            {pagesWithContent.map((n) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Questions:
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-slate-900/60 px-2 py-1 text-sm text-white outline-none focus:border-brand-500"
            >
              {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button
            onClick={generate}
            disabled={genLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
          >
            {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {genLoading ? "Generating…" : "Generate bank"}
          </button>
        </div>
        {genError && <p className="text-xs text-rose-300">{genError}</p>}
        {data.aiKeys.length === 0 && (
          <p className="text-xs text-slate-500">
            Add a provider key in{" "}
            <Link to="/app/settings" className="text-brand-300 underline">Settings</Link>{" "}
            to use AI.
          </p>
        )}
      </div>

      {/* Saved banks */}
      <h2 className="mt-8 font-semibold text-white">Saved banks ({data.questionBanks.length})</h2>
      <div className="mt-3 space-y-3">
        {data.questionBanks.length === 0 && (
          <p className="text-sm text-slate-500">No banks generated yet.</p>
        )}
        {data.questionBanks.map((bank) => {
          const expanded = expandedId === bank.id;
          return (
            <div key={bank.id} className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpandedId(expanded ? null : bank.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <span className="truncate font-medium text-white">{bank.title}</span>
                  <span className="text-xs text-slate-500">{bank.questions.length} questions</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setDownloadOpen(downloadOpen === bank.id ? null : bank.id)}
                    title="Download options"
                    className="rounded p-1.5 text-slate-400 hover:text-brand-300"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {downloadOpen === bank.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-white/10 bg-slate-900 py-1 shadow-xl">
                      {[
                        { label: "Markdown (.md)", action: () => exportBankMd(bank.id) },
                        { label: "Word — Solved (answers shown)", action: () => exportBankDoc(bank.id, "solved") },
                        { label: "Word — Solved + Explanations", action: () => exportBankDoc(bank.id, "solved-explained") },
                        { label: "Word — Unsolved (answer key at end)", action: () => exportBankDoc(bank.id, "unsolved") },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => { opt.action(); setDownloadOpen(null); }}
                          className="block w-full px-4 py-1.5 text-left text-xs text-slate-200 hover:bg-white/5"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => questionBanks.remove(bank.id)}
                  className="rounded p-1.5 text-slate-400 hover:text-rose-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {expanded && (
                <div className="border-t border-white/10 px-4 py-3 space-y-3">
                  {bank.questions.map((q, i) => (
                    <div key={q.id} className="text-sm">
                      <p className="font-medium text-slate-100">{i + 1}. {q.prompt}</p>
                      <div className="mt-1 space-y-0.5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`text-xs ${q.correct.includes(oi) ? "text-emerald-300" : "text-slate-500"}`}>
                            {q.correct.includes(oi) ? "✓" : "·"} {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-1 text-xs text-brand-300">{q.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
