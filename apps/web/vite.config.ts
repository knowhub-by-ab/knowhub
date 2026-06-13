import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy libraries into their own chunks so they're cached
        // separately and only fetched when a route that needs them loads.
        manualChunks(id) {
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase"))
            return "firebase";
          if (id.includes("node_modules/marked") || id.includes("node_modules/dompurify"))
            return "markdown";
          if (id.includes("node_modules/minisearch")) return "search";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
