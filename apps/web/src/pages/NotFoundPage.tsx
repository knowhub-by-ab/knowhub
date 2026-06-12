import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import Logo from "@/components/Logo";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-aurora px-6 text-center">
      <div>
        <Logo />
        <h1 className="mt-8 text-6xl font-bold text-white">404</h1>
        <p className="mt-3 text-slate-400">
          This page doesn't exist (yet). It might be on the roadmap.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          <Home className="h-4 w-4" /> Back home
        </Link>
      </div>
    </div>
  );
}
