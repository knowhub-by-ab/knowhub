import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import { DASHBOARD, MODULES } from "@/lib/modules";

const navItems = [DASHBOARD, ...MODULES];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-aurora">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
        <Link to="/">
          <Logo />
        </Link>
        <button
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside
          className={`${
            open ? "block" : "hidden"
          } w-full shrink-0 border-r border-white/10 bg-slate-950/60 p-4 lg:block lg:w-64`}
        >
          <div className="mb-6 hidden px-2 lg:block">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/app"
                  ? location.pathname === "/app"
                  : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/app"}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-600/20 text-white ring-1 ring-brand-500/40"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-h-screen flex-1 px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
