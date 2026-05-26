import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Build config for the embeddable viewer.
 * Produces a self-contained dist-embed/ with index.html that can be
 * served statically or loaded in an iframe.
 *
 * Build: npx vite build --config vite.embed.config.js
 */
export default defineConfig({
  plugins: [react()],
  root: "examples/embed",
  base: "./", // relative paths — works from any subdirectory or CDN
  build: {
    outDir: "../../dist-embed",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
