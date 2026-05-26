/**
 * Export utilities — PNG, SVG, and JSON export from the SchemaViewer SVG.
 * No external dependencies (uses native DOM APIs).
 */

/**
 * Export the SVG element as a PNG file.
 * @param {SVGSVGElement} svgEl - The SVG element to export
 * @param {string} filename - Output filename
 * @param {number} scale - Pixel ratio (default 2 for retina)
 */
export function exportPNG(svgEl, filename = "schema.png", scale = 2) {
  const svgData = serializeSVG(svgEl);
  const canvas = document.createElement("canvas");
  const vb = svgEl.viewBox.baseVal;
  canvas.width = vb.width * scale;
  canvas.height = vb.height * scale;
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = getComputedStyle(svgEl).getPropertyValue("--bg") || "#0d1117";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
}

/**
 * Export the SVG element as an SVG file.
 * @param {SVGSVGElement} svgEl - The SVG element to export
 * @param {string} filename - Output filename
 */
export function exportSVG(svgEl, filename = "schema.svg") {
  const svgData = serializeSVG(svgEl);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export schema data as JSON file.
 * @param {object} schema - The schema object
 * @param {string} filename - Output filename
 */
export function exportJSON(schema, filename = "schema.json") {
  const json = JSON.stringify(schema, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Serialize SVG element to string, inlining foreignObject styles.
 */
function serializeSVG(svgEl) {
  const clone = svgEl.cloneNode(true);

  // Inline computed styles on foreignObject children for export fidelity
  const foreignObjects = clone.querySelectorAll("foreignObject");
  for (const fo of foreignObjects) {
    const divs = fo.querySelectorAll("div");
    for (const div of divs) {
      const computed = getComputedStyle(div);
      // Copy key visual properties
      for (const prop of ["color", "background", "background-color", "border", "font-family",
        "font-size", "font-weight", "padding", "border-radius", "box-shadow"]) {
        div.style.setProperty(prop, computed.getPropertyValue(prop));
      }
    }
  }

  // Set explicit dimensions
  const vb = svgEl.viewBox.baseVal;
  clone.setAttribute("width", vb.width);
  clone.setAttribute("height", vb.height);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xhtml", "http://www.w3.org/1999/xhtml");

  return new XMLSerializer().serializeToString(clone);
}
