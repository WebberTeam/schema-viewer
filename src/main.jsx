import { createRoot } from "react-dom/client";
import { SchemaViewer } from "./components";
import { demoSchema } from "./data/demo-schema";

function App() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "12px 20px",
        borderBottom: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#161b22",
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: "#f0f6fc" }}>
          Schema Viewer
        </h1>
        <span style={{
          background: "#21262d",
          padding: "2px 10px",
          borderRadius: 12,
          fontSize: 11,
          color: "#58a6ff",
        }}>
          {demoSchema.title}
        </span>
        <span style={{ fontSize: 11, color: "#8b949e", marginLeft: "auto" }}>
          {demoSchema.tables.length} tables | {demoSchema.relationships.length} relationships
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <SchemaViewer
          schema={demoSchema}
          theme="dark"
          width="100%"
          height="100%"
          showComments={true}
          showCardinality={true}
          showRelationshipLabels={true}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
