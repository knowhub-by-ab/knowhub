import { useState } from "react";
import { UploadCloud, Loader2, Check, AlertTriangle } from "lucide-react";
import { syncGithubNow } from "@/lib/githubSync";

type State = "idle" | "busy" | "done" | "error";

export default function SyncButton() {
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState<string>("");

  async function go() {
    setState("busy");
    setMsg("");
    try {
      const where = await syncGithubNow();
      setState("done");
      setMsg(`Synced to ${where}`);
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Sync failed");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const label =
    state === "busy" ? "Syncing…" : state === "done" ? "Synced" : state === "error" ? "Failed" : "Sync";

  return (
    <button
      onClick={go}
      disabled={state === "busy"}
      title={msg || "Sync your knowledge to GitHub"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
        state === "error"
          ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
          : state === "done"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-white/15 text-slate-200 hover:bg-white/5"
      }`}
    >
      {state === "busy" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "done" ? (
        <Check className="h-3.5 w-3.5" />
      ) : state === "error" ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <UploadCloud className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
