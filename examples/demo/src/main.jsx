/**
 * Demo application for schema-viewer.
 * Renders a PostgreSQL schema with editor mode enabled + SQL import.
 */
import { createRoot } from "react-dom/client";
import { SchemaViewer } from "../../../src/components";
import { importSQL } from "../../../src/utils/importSQL";
import { demoSchema } from "./demo-schema";
import { useState } from "react";

const DEMO_SQL = `
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{}'
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

function App() {
  const [activeSchema, setActiveSchema] = useState(demoSchema);
  const [view, setView] = useState("rds");
  const [sqlInput, setSqlInput] = useState(DEMO_SQL);
  const [importError, setImportError] = useState(null);

  const handleImport = () => {
    try {
      const schema = importSQL(sqlInput, "postgres");
      setActiveSchema(schema);
      setImportError(null);
    } catch (err) {
      setImportError(err.message);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "10px 20px",
        borderBottom: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#161b22",
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f0f6fc" }}>Schema Viewer</h1>

        <div style={{ display: "flex", gap: 2, background: "#21262d", borderRadius: 6, padding: 2 }}>
          <button onClick={() => { setActiveSchema(demoSchema); setView("rds"); }} style={tabBtn(view === "rds")}>RDS Demo</button>
          <button onClick={() => setView("sql")} style={tabBtn(view === "sql")}>SQL Import</button>
        </div>

        <span style={{ fontSize: 11, color: "#8b949e", marginLeft: "auto" }}>
          {activeSchema.tables?.length || 0} tables | {activeSchema.relationships?.length || 0} rels | drag tables to reposition
        </span>
      </div>

      {view === "sql" && (
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #30363d", background: "#0d1117", display: "flex", gap: 12, flexShrink: 0 }}>
          <textarea
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            style={{ flex: 1, height: 100, background: "#161b22", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: 10, fontFamily: "inherit", fontSize: 11, resize: "vertical" }}
            placeholder="Paste CREATE TABLE SQL here..."
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={handleImport} style={{ padding: "8px 16px", background: "#238636", border: "1px solid #2ea043", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Import
            </button>
            {importError && <div style={{ color: "#f85149", fontSize: 11, maxWidth: 200 }}>{importError}</div>}
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <SchemaViewer
          schema={activeSchema}
          theme="dark"
          width="100%"
          height="100%"
          editable={true}
          onChange={setActiveSchema}
        />
      </div>
    </div>
  );
}

function tabBtn(active) {
  return { padding: "4px 12px", borderRadius: 4, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", background: active ? "#388bfd" : "transparent", color: active ? "#fff" : "#8b949e" };
}

createRoot(document.getElementById("root")).render(<App />);
