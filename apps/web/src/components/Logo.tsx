import { BookOpenCheck } from "lucide-react";

export default function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-900/40">
        <BookOpenCheck className="h-5 w-5 text-white" />
      </span>
      {withWordmark && (
        <span className="text-lg font-semibold tracking-tight text-white">
          Know<span className="text-brand-400">Hub</span>
        </span>
      )}
    </span>
  );
}
