/**
 * Standalone entry point — renders SchemaViewer into any DOM element.
 * No framework required. Works via <script> tag like Cytoscape.js.
 *
 * Usage:
 *   <script src="schema-viewer.umd.js"></script>
 *   <div id="my-schema" style="height:500px"></div>
 *   <script>
 *     SchemaViewer.render('#my-schema', {
 *       schema: { tables: [...], relationships: [...], subjectAreas: [...] },
 *       theme: 'dark',
 *       editable: true,
 *       onChange: (updated) => console.log('Schema changed:', updated),
 *     });
 *   </script>
 *
 * API:
 *   SchemaViewer.render(selector|element, options) → { unmount(), update(newOptions) }
 *   SchemaViewer.importSQL(ddl, dialect) → schema JSON
 *   SchemaViewer.exportJSON(schema) → triggers download
 */
import React, { useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { SchemaViewer as SchemaViewerComponent } from "./components/SchemaViewer";
import { importSQL } from "./utils/importSQL";
import { exportJSON } from "./utils/exportDiagram";

function StandaloneWrapper({ initialOptions }) {
  const [schema, setSchema] = useState(initialOptions.schema || { tables: [], relationships: [], subjectAreas: [] });

  const handleChange = useCallback((updated) => {
    setSchema(updated);
    if (initialOptions.onChange) initialOptions.onChange(updated);
  }, [initialOptions]);

  return (
    <SchemaViewerComponent
      schema={schema}
      theme={initialOptions.theme || "dark"}
      width={initialOptions.width || "100%"}
      height={initialOptions.height || "100%"}
      editable={initialOptions.editable ?? false}
      showComments={initialOptions.showComments ?? true}
      showCardinality={initialOptions.showCardinality ?? true}
      showRelationshipLabels={initialOptions.showRelationshipLabels ?? true}
      onChange={initialOptions.editable ? handleChange : undefined}
    />
  );
}

/**
 * Render a schema viewer into a DOM element.
 * @param {string|HTMLElement} target - CSS selector or DOM element
 * @param {object} options - { schema, theme, editable, onChange, width, height, ... }
 * @returns {{ unmount: Function, update: Function }}
 */
function render(target, options = {}) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) throw new Error(`SchemaViewer: target "${target}" not found`);

  const root = createRoot(el);
  root.render(<StandaloneWrapper initialOptions={options} />);

  return {
    unmount: () => root.unmount(),
    update: (newOptions) => {
      root.render(<StandaloneWrapper initialOptions={{ ...options, ...newOptions }} />);
    },
  };
}

// Public API
window.SchemaViewer = {
  render,
  importSQL,
  exportJSON,
};

export { render, importSQL, exportJSON };
