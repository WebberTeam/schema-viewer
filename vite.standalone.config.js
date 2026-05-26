import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Build config for the standalone UMD bundle.
 * Produces a single JS file that can be included via <script> tag.
 * React is bundled in (no peer dependency for standalone use).
 *
 * Build: npm run build:standalone
 * Output: dist-standalone/schema-viewer.umd.js
 */
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  build: {
    outDir: "dist-standalone",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/standalone.jsx"),
      name: "SchemaViewer",
      formats: ["iife"],
      fileName: () => "schema-viewer.js",
    },
    rollupOptions: {
      output: {
        // Bundle everything — no externals for standalone use
        inlineDynamicImports: true,
      },
    },
  },
});
