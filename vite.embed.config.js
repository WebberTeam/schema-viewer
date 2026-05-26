import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { cpSync } from "fs";

/**
 * Build config for the embeddable viewer.
 * Produces a self-contained dist-embed/ with index.html that can be
 * served statically, deployed to GitHub Pages, or loaded in an iframe.
 *
 * Build:  npm run build:embed
 * Deploy: npm run deploy  (builds + pushes to gh-pages branch)
 * CDN:    https://webberteam.github.io/schema-viewer/
 */
export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-schemas",
      closeBundle() {
        // Copy sample schemas into dist for CDN availability
        try {
          cpSync(
            resolve(__dirname, "examples/embed/sample-schema.json"),
            resolve(__dirname, "dist-embed/sample-schema.json"),
          );
        } catch {}
      },
    },
  ],
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
