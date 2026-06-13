import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import ModulePlaceholderPage from "@/pages/ModulePlaceholderPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { MODULES } from "@/lib/modules";
import { IMPLEMENTED_MODULES } from "@/pages/moduleRegistry";
import { initSync } from "@/lib/sync";

// Start cloud sync (no-op until the user signs in with a configured Firebase).
initSync();

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...MODULES.map((m) => {
        const Impl = IMPLEMENTED_MODULES[m.id];
        return {
          path: m.path.replace(/^\/app\//, ""),
          element: Impl ? <Impl /> : <ModulePlaceholderPage moduleId={m.id} />,
        };
      }),
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
