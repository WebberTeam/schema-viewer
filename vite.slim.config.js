import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Slim standalone build — viewer + editor only.
 * No SQL import, no PDF/PNG export, no jspdf, no node-sql-parser.
 * Suitable for inlining into documentation HTML files.
 *
 * Build: npm run build:slim
 * Output: dist-standalone/schema-viewer.slim.js
 */
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  build: {
    outDir: "dist-standalone",
    emptyOutDir: false, // keep full bundle alongside
    lib: {
      entry: resolve(__dirname, "src/standalone-slim.jsx"),
      name: "SchemaViewer",
      formats: ["iife"],
      fileName: () => "schema-viewer.slim.js",
    },
    rollupOptions: {
      external: ["html-to-image", "jspdf", "node-sql-parser"],
      output: {
        inlineDynamicImports: true,
        globals: {
          "html-to-image": "{}",
          "jspdf": "{}",
          "node-sql-parser": "{}",
        },
      },
    },
  },
});
