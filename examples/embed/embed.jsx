/**
 * Embed mode — loads schema from URL parameter or postMessage.
 *
 * Usage:
 *   <iframe src="embed.html?schema=path/to/schema.json" width="800" height="600" />
 *   <iframe src="embed.html?theme=light&editable=false" id="sv" />
 *   document.getElementById('sv').contentWindow.postMessage({ type: 'loadSchema', schema: {...} }, '*')
 *
 * URL parameters:
 *   ?schema=<url>        Load schema JSON from URL (relative or absolute)
 *   ?theme=dark|light    Theme (default: dark)
 *   ?editable=true|false Enable editor mode (default: false)
 *   ?title=<string>      Override title display
 */
import { createRoot } from "react-dom/client";
import { SchemaViewer } from "../../src/components";
import { useState, useEffect } from "react";

function EmbedApp() {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get("theme") || "dark";
  const editable = params.get("editable") === "true";
  const title = params.get("title") || "";

  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load schema from URL parameter
  useEffect(() => {
    const schemaUrl = params.get("schema");
    if (schemaUrl) {
      fetch(schemaUrl)
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => { setSchema(data); setLoading(false); })
        .catch((err) => { setError(`Failed to load schema: ${err.message}`); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for postMessage to load schema dynamically
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "loadSchema" && e.data.schema) {
        setSchema(e.data.schema);
        setError(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Notify parent when schema changes (editor mode)
  const handleChange = (updated) => {
    setSchema(updated);
    window.parent?.postMessage({ type: "schemaChanged", schema: updated }, "*");
  };

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#8b949e" }}>Loading schema...</div>;
  }

  if (error) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#f85149" }}>{error}</div>;
  }

  if (!schema) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#8b949e", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 14 }}>No schema loaded</div>
        <div style={{ fontSize: 11 }}>Use <code>?schema=url.json</code> or send via <code>postMessage</code></div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {title && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #30363d", background: "#161b22", fontSize: 13, fontWeight: 600, color: "#f0f6fc" }}>
          {title}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <SchemaViewer
          schema={schema}
          theme={theme}
          width="100%"
          height="100%"
          editable={editable}
          onChange={editable ? handleChange : undefined}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<EmbedApp />);
