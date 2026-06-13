import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import LoginScreen from "@/components/LoginScreen";
import { DASHBOARD, MODULES } from "@/lib/modules";
import { isAuthConfigured, signOutUser, useAuth } from "@/lib/auth";

const navItems = [DASHBOARD, ...MODULES];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { loading, user } = useAuth();

  // When auth is configured, gate the app behind Google sign-in.
  if (isAuthConfigured && loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-aurora">
        <Loader2 className="h-6 w-6 animate-spin text-brand-300" />
      </div>
    );
  }
  if (isAuthConfigured && !user) return <LoginScreen />;

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

          {user && (
            <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-8 w-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600/30 text-xs font-semibold text-brand-200">
                  {(user.displayName || user.email || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
                {user.displayName || user.email}
              </span>
              <button
                onClick={() => signOutUser()}
                title="Sign out"
                className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="min-h-screen min-w-0 flex-1 px-4 py-6 sm:px-8">
          <Suspense
            fallback={
              <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
