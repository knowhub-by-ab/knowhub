import { useState } from "react";
import { CloudUpload, Download, Loader2, AlertTriangle, X } from "lucide-react";

export interface LargeFileSaveResult {
  action: "github" | "download" | "cancel";
}

interface Props {
  filename: string;
  sizeMb: number;
  uploading?: boolean;
  uploadProgress?: number; // 0–100
  onChoose: (result: LargeFileSaveResult) => void;
}

export default function LargeFileSaveModal({ filename, sizeMb, uploading, uploadProgress, onChoose }: Props) {
  const [chosen, setChosen] = useState<"github" | "download" | null>(null);

  function choose(action: "github" | "download") {
    setChosen(action);
    onChoose({ action });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !uploading && onChoose({ action: "cancel" })}>
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-5">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-white font-semibold mb-1">Large file detected</h2>
            <p className="text-zinc-400 text-sm">
              <span className="text-zinc-200 font-medium">{filename}</span> is{" "}
              <span className="text-amber-300">{sizeMb.toFixed(1)} MB</span> — too large to commit to your GitHub repo directly.
            </p>
          </div>
          {!uploading && (
            <button onClick={() => onChoose({ action: "cancel" })} className="ml-auto text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
          )}
        </div>

        {uploading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Loader2 size={14} className="animate-spin text-indigo-400" />
              Uploading to GitHub Release…
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${uploadProgress ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">{(uploadProgress ?? 0).toFixed(0)}% complete</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => choose("github")}
              disabled={!!chosen}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-zinc-700 hover:border-indigo-500 bg-zinc-800 hover:bg-zinc-800/80 transition-all disabled:opacity-50"
            >
              <CloudUpload size={22} className="text-indigo-400" />
              <span className="text-sm font-medium text-zinc-200">Save to GitHub Release</span>
              <span className="text-xs text-zinc-500 text-center">Stored as a release asset — accessible any time</span>
            </button>
            <button
              onClick={() => choose("download")}
              disabled={!!chosen}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-zinc-700 hover:border-emerald-500 bg-zinc-800 hover:bg-zinc-800/80 transition-all disabled:opacity-50"
            >
              <Download size={22} className="text-emerald-400" />
              <span className="text-sm font-medium text-zinc-200">Download to Device</span>
              <span className="text-xs text-zinc-500 text-center">Save locally — not stored on GitHub</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
