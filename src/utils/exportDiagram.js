/**
 * Export utilities — PNG, SVG, and JSON export from the SchemaViewer SVG.
 * No external dependencies (uses native DOM APIs).
 *
 * Key challenge: foreignObject HTML content loses its CSS when serialized.
 * We solve this by walking the original DOM, collecting computed styles,
 * and inlining them on the clone before serialization.
 */

const STYLE_PROPS = [
  "color", "background-color", "background", "border", "border-top", "border-bottom",
  "border-left", "border-right", "border-radius", "font-family", "font-size",
  "font-weight", "font-style", "padding", "padding-top", "padding-bottom",
  "padding-left", "padding-right", "margin", "display", "flex-direction",
  "align-items", "justify-content", "gap", "overflow", "white-space",
  "text-overflow", "box-shadow", "opacity", "letter-spacing", "text-transform",
  "line-height", "flex", "flex-shrink", "width", "height", "min-width", "max-width",
  "user-select", "cursor", "text-align", "direction",
];

/**
 * Export the SVG element as a PNG file.
 * Uses an offscreen iframe to render the SVG with foreignObject support.
 */
export function exportPNG(svgEl, filename = "schema.png", scale = 2) {
  const svgData = serializeSVG(svgEl);
  const vb = svgEl.viewBox.baseVal;
  const w = vb.width * scale;
  const h = vb.height * scale;

  // Create a blob URL for the SVG
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    try {
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      // Tainted canvas fallback — open SVG directly
      console.warn("PNG export blocked (foreignObject security). Falling back to SVG.");
      exportSVG(svgEl, filename.replace(".png", ".svg"));
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    // Fallback to SVG on error
    exportSVG(svgEl, filename.replace(".png", ".svg"));
  };
  img.src = url;
}

/**
 * Export the SVG element as an SVG file.
 */
export function exportSVG(svgEl, filename = "schema.svg") {
  const svgData = serializeSVG(svgEl);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
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

/**
 * Serialize SVG to string with fully inlined styles on foreignObject content.
 *
 * Strategy: walk the ORIGINAL SVG's foreignObjects to get computed styles
 * (they must be in-DOM for getComputedStyle to work), then apply those
 * styles to the corresponding elements in the CLONE.
 */
function serializeSVG(svgEl) {
  // Step 1: Collect computed styles from original DOM elements
  const origFOs = svgEl.querySelectorAll("foreignObject");
  const styleMap = []; // [{elements: [{style: CSSStyleDeclaration}]}]

  for (const fo of origFOs) {
    const elStyles = [];
    const allEls = fo.querySelectorAll("*");
    for (const el of allEls) {
      if (el.nodeType !== 1) continue;
      const computed = getComputedStyle(el);
      const styles = {};
      for (const prop of STYLE_PROPS) {
        const val = computed.getPropertyValue(prop);
        if (val && val !== "" && val !== "normal" && val !== "none" && val !== "auto") {
          styles[prop] = val;
        }
      }
      // Always capture these even if "none"
      styles["background-color"] = computed.getPropertyValue("background-color");
      styles["color"] = computed.getPropertyValue("color");
      styles["border"] = computed.getPropertyValue("border");
      elStyles.push(styles);
    }
    styleMap.push(elStyles);
  }

  // Step 2: Clone the SVG
  const clone = svgEl.cloneNode(true);

  // Step 3: Apply collected styles to clone's foreignObject elements
  const cloneFOs = clone.querySelectorAll("foreignObject");
  for (let fi = 0; fi < cloneFOs.length && fi < styleMap.length; fi++) {
    const allEls = cloneFOs[fi].querySelectorAll("*");
    const elStyles = styleMap[fi];
    for (let ei = 0; ei < allEls.length && ei < elStyles.length; ei++) {
      const el = allEls[ei];
      const styles = elStyles[ei];
      for (const [prop, val] of Object.entries(styles)) {
        el.style.setProperty(prop, val);
      }
    }
  }

  // Step 4: Set SVG attributes for standalone rendering
  const vb = svgEl.viewBox.baseVal;
  clone.setAttribute("width", vb.width);
  clone.setAttribute("height", vb.height);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xhtml", "http://www.w3.org/1999/xhtml");

  // Step 5: Add a background rect (SVG has no background-color)
  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bgRect.setAttribute("x", vb.x);
  bgRect.setAttribute("y", vb.y);
  bgRect.setAttribute("width", vb.width);
  bgRect.setAttribute("height", vb.height);
  bgRect.setAttribute("fill", "#0d1117");
  clone.insertBefore(bgRect, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}
