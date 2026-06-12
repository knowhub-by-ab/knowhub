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

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...MODULES.map((m) => ({
        path: m.path.replace(/^\/app\//, ""),
        element: <ModulePlaceholderPage moduleId={m.id} />,
      })),
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
