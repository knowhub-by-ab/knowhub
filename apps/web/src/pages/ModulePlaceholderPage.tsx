import { Link } from "react-router-dom";
import { ArrowLeft, Hammer } from "lucide-react";
import { getModule } from "@/lib/modules";

/**
 * Generic screen rendered for every MVP module that is scaffolded but whose
 * feature work is scheduled for a later phase. Keeps navigation real and the
 * deploy meaningful while implementation lands incrementally.
 */
export default function ModulePlaceholderPage({ moduleId }: { moduleId: string }) {
  const mod = getModule(moduleId);

  if (!mod) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-slate-400">Unknown module.</p>
        <Link to="/app" className="text-brand-300 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const Icon = mod.icon;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600/20 text-brand-300">
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">{mod.label}</h1>
          <p className="text-sm text-slate-400">{mod.summary}</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/5 text-brand-300">
          <Hammer className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-white">
          This module is on the build roadmap
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          The screen and routing are in place. Implementation is scheduled per the MVP
          roadmap (spec&nbsp;22). Spec reference:{" "}
          <span className="font-medium text-slate-300">{mod.prdRef}</span>.
        </p>
      </div>
    </div>
  );
}
