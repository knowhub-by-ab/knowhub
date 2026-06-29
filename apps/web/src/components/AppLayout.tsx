import { Suspense, lazy, useEffect, useRef, useState } from "react";
const TTSPlayer = lazy(() => import("@/components/TTSPlayer"));
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Loader2, X } from "lucide-react";
import Logo from "@/components/Logo";
import LoginScreen from "@/components/LoginScreen";
import SyncButton from "@/components/SyncButton";
import { DASHBOARD, MODULES } from "@/lib/modules";
import { isAuthConfigured, signOutUser, useAuth } from "@/lib/auth";
import { useAppData } from "@/lib/store";
import { syncGithubNow } from "@/lib/githubSync";

const APP_VERSION = "1.0.3";
const GUIDE_SHOWN_KEY = "knowhub:guide-prompt-version";

const navItems = [DASHBOARD, ...MODULES];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [guideBanner, setGuideBanner] = useState(false);
  const location = useLocation();
  const { loading, user } = useAuth();
  const data = useAppData();
  const githubConnected = Boolean(data.github?.token && data.github?.login);
  const syncRef = useRef<() => void>(() => {});

  // Keep syncRef current so event listeners always call the latest
  useEffect(() => {
    syncRef.current = () => {
      if (githubConnected) syncGithubNow().catch(() => {});
    };
  }, [githubConnected]);

  // Auto-sync every 5 minutes
  useEffect(() => {
    const id = setInterval(() => syncRef.current(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Sync on tab/window close
  useEffect(() => {
    const handler = () => syncRef.current();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const [showPuterBanner, setShowPuterBanner] = useState(false);

  useEffect(() => {
    if (!user) return;
    const alreadyShown = sessionStorage.getItem("knowhub:puter-prompt-shown");
    if (alreadyShown) return;
    if (!data.puterApiToken) {
      setShowPuterBanner(true);
    }
  }, [user, data.puterApiToken]);

  function dismissPuterBanner() {
    sessionStorage.setItem("knowhub:puter-prompt-shown", "1");
    setShowPuterBanner(false);
  }

  // Show Guide prompt for first-time users or after an app update
  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(GUIDE_SHOWN_KEY);
    if (seen !== APP_VERSION) {
      setGuideBanner(true);
    }
  }, [user]);

  function dismissGuide() {
    localStorage.setItem(GUIDE_SHOWN_KEY, APP_VERSION);
    setGuideBanner(false);
  }

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
        <button
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-1 text-slate-300 hover:bg-white/5"
        >
          <Logo />
        </button>
        <div className="flex items-center gap-2">
          {githubConnected && <SyncButton />}
        </div>
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
                onClick={() => { syncRef.current(); signOutUser(); }}
                title="Sign out"
                className="rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex min-h-screen min-w-0 flex-1 flex-col px-4 py-6 sm:px-8">
          {/* Desktop sync button */}
          {githubConnected && (
            <div className="mb-3 hidden justify-end lg:flex">
              <SyncButton />
            </div>
          )}
          {/* Puter connection banner */}
          {showPuterBanner && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm">
              <span className="flex-1 text-violet-200">
                <b>Add your Puter API token</b> (free) in Settings to enable MP3 audio download for your learning pages.
              </span>
              <a
                href="/app/settings"
                onClick={dismissPuterBanner}
                className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Go to Settings
              </a>
              <button onClick={dismissPuterBanner} className="shrink-0 text-violet-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* Guide prompt banner */}
          {guideBanner && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-100">
              <span className="flex-1">
                👋 Welcome to KnowHub! Check out the{" "}
                <Link
                  to="/app/guide"
                  className="font-semibold underline hover:text-white"
                  onClick={dismissGuide}
                >
                  KnowHub Guide
                </Link>{" "}
                to get started quickly.
              </span>
              <button
                onClick={dismissGuide}
                className="shrink-0 rounded p-0.5 text-brand-200 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex-1">
            <Suspense
              fallback={
                <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
          <footer className="mt-8 border-t border-white/5 pt-4 text-center text-xs text-slate-600">
            Made with ❤️ by Aishee B. &amp; Claude
          </footer>
        </main>
      </div>
      {/* Global TTS player — floats above all content when TTS is active */}
      <Suspense fallback={null}>
        <TTSPlayer />
      </Suspense>
    </div>
  );
}
