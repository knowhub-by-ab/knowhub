import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import LandingPage from "@/pages/LandingPage";
import { MODULES } from "@/lib/modules";
import { IMPLEMENTED_MODULES } from "@/pages/moduleRegistry";

// Lazy-load the authenticated app shell and pages so the landing page (first
// paint) stays small and Firebase only loads when entering /app.
const AppLayout = lazy(() => import("@/components/AppLayout"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ModulePlaceholderPage = lazy(() => import("@/pages/ModulePlaceholderPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const DeckEditorPage = lazy(() => import("@/pages/DeckEditorPage"));
const PresenterViewPage = lazy(() => import("@/pages/PresenterViewPage"));

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-aurora">
      <div className="text-sm text-slate-500">Loading…</div>
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    path: "/app",
    element: (
      <S>
        <AppLayout />
      </S>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      ...MODULES.map((m) => {
        const Impl = IMPLEMENTED_MODULES[m.id];
        return {
          path: m.path.replace(/^\/app\//, ""),
          element: Impl ? <Impl /> : <ModulePlaceholderPage moduleId={m.id} />,
        };
      }),
      { path: "presentations/:deckId", element: <S><DeckEditorPage /></S> },
      { path: "presentations/:deckId/present", element: <S><PresenterViewPage /></S> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// Defer Firebase-dependent side-effects off the critical path so the landing
// page paints fast. Both are no-ops until Firebase is configured + signed in.
void import("@/lib/auth").then((m) => m.completeRedirectSignIn());
void import("@/lib/sync").then((m) => m.initSync());
