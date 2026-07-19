import { useState } from "react";
import { AlertTriangle, RefreshCw, Download, FileCheck, X } from "lucide-react";

export type DuplicateAction = "rename" | "replace" | "download-only";

export interface DuplicateAssetResult {
  action: DuplicateAction;
  newName?: string;
}

interface Props {
  existingName: string;
  onChoose: (result: DuplicateAssetResult) => void;
}

export default function DuplicateAssetModal({ existingName, onChoose }: Props) {
  const [newName, setNewName] = useState(() => {
    const dot = existingName.lastIndexOf(".");
    const base = dot > -1 ? existingName.slice(0, dot) : existingName;
    const ext = dot > -1 ? existingName.slice(dot) : "";
    return `${base}_${Date.now()}${ext}`;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => onChoose({ action: "download-only" })}>
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-5">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-white font-semibold mb-1">File already exists</h2>
            <p className="text-zinc-400 text-sm break-all">
              <span className="text-zinc-200 font-medium">{existingName}</span> already exists in your GitHub release assets.
            </p>
          </div>
          <button onClick={() => onChoose({ action: "download-only" })} className="ml-auto text-zinc-500 hover:text-zinc-300 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {/* Rename */}
          <div className="p-3 rounded-lg border border-zinc-700 bg-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <RefreshCw size={13} className="text-indigo-400" /> Rename & upload new
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => onChoose({ action: "rename", newName })}
              disabled={!newName.trim() || newName === existingName}
              className="w-full py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded transition-colors"
            >
              Upload as "{newName}"
            </button>
          </div>

          {/* Replace */}
          <button
            onClick={() => onChoose({ action: "replace" })}
            className="w-full flex items-center gap-2 p-3 rounded-lg border border-zinc-700 hover:border-amber-500 bg-zinc-800 text-sm text-zinc-300 hover:text-amber-300 transition-all"
          >
            <FileCheck size={14} className="text-amber-400" />
            Replace previous (overwrite)
          </button>

          {/* Download only */}
          <button
            onClick={() => onChoose({ action: "download-only" })}
            className="w-full flex items-center gap-2 p-3 rounded-lg border border-zinc-700 hover:border-emerald-500 bg-zinc-800 text-sm text-zinc-300 hover:text-emerald-300 transition-all"
          >
            <Download size={14} className="text-emerald-400" />
            Download only (don't upload)
          </button>
        </div>
      </div>
    </div>
  );
}
