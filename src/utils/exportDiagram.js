/**
 * Export utilities — PNG, PDF, and JSON export.
 * SVG export deferred to roadmap (foreignObject style inlining unreliable).
 *
 * PNG uses html-to-image (renders the actual DOM, not serialized SVG).
 * PDF uses jspdf with the PNG raster.
 */
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * Export the viewer container as a PNG file.
 * html-to-image captures the live DOM including foreignObject content.
 *
 * @param {HTMLElement} containerEl - The SchemaViewer outer div (not the SVG)
 * @param {string} filename
 * @param {number} pixelRatio
 */
export async function exportPNG(containerEl, filename = "schema.png", pixelRatio = 2) {
  if (!containerEl) return;
  try {
    const dataUrl = await toPng(containerEl, {
      pixelRatio,
      backgroundColor: "#0d1117",
      filter: (node) => {
        // Exclude control buttons from export
        if (node.dataset?.exportIgnore) return false;
        return true;
      },
    });
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("PNG export failed:", err);
  }
}

/**
 * Export the viewer container as a PDF file.
 * Renders PNG first, then places it on a PDF page sized to fit.
 *
 * @param {HTMLElement} containerEl
 * @param {string} filename
 */
export async function exportPDF(containerEl, filename = "schema.pdf") {
  if (!containerEl) return;
  try {
    const dataUrl = await toPng(containerEl, {
      pixelRatio: 2,
      backgroundColor: "#0d1117",
      filter: (node) => {
        if (node.dataset?.exportIgnore) return false;
        return true;
      },
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => { img.onload = resolve; });

    const pxToMm = 0.264583;
    const w = img.width * pxToMm;
    const h = img.height * pxToMm;
    const orientation = w > h ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "mm", format: [w, h] });
    pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
    pdf.save(filename);
  } catch (err) {
    console.error("PDF export failed:", err);
  }
}

/**
 * Export schema data as JSON file.
 */
export function exportJSON(schema, filename = "schema.json") {
  const json = JSON.stringify(schema, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
