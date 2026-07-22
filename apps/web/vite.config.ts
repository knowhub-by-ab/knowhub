import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
// Keep public/version.json in sync with package.json at build time
writeFileSync(new URL("./public/version.json", import.meta.url), JSON.stringify({ version: pkg.version }));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
