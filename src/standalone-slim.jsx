/**
 * Slim standalone — viewer + editor only, no SQL import, no PDF/PNG export.
 * ~400KB raw, ~130KB gzipped. For embedding in documentation pages.
 */
import React, { useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { SchemaViewer as SchemaViewerComponent } from "./components/SchemaViewer";

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

function render(target, options = {}) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) throw new Error(`SchemaViewer: target "${target}" not found`);
  const root = createRoot(el);
  root.render(<StandaloneWrapper initialOptions={options} />);
  return {
    unmount: () => root.unmount(),
    update: (newOptions) => root.render(<StandaloneWrapper initialOptions={{ ...options, ...newOptions }} />),
  };
}

window.SchemaViewer = { render };
export { render };
