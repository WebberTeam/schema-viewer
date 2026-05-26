/**
 * SchemaViewer — Read-only interactive ER diagram renderer.
 * Derived from DrawDB (AGPL-3.0). Editor logic removed; pure visualization.
 *
 * Usage:
 *   <SchemaViewer schema={jsonSchema} theme="dark" width="100%" height="600px" />
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { TableNode } from "./TableNode";
import { RelationshipPath } from "./RelationshipPath";
import { SubjectArea } from "./SubjectArea";

const GRID_SIZE = 24;
const DEFAULT_TABLE_WIDTH = 220;

export function SchemaViewer({
  schema,
  theme = "dark",
  width = "100%",
  height = "600px",
  tableWidth = DEFAULT_TABLE_WIDTH,
  showComments = true,
  showCardinality = true,
  showRelationshipLabels = true,
}) {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState(() => computeInitialViewBox(schema));
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const tables = schema?.tables || [];
  const relationships = schema?.relationships || [];
  const areas = schema?.subjectAreas || [];

  const colors = useMemo(() => ({
    bg: theme === "dark" ? "#0d1117" : "#ffffff",
    surface: theme === "dark" ? "#161b22" : "#f8f9fa",
    border: theme === "dark" ? "#30363d" : "#d0d7de",
    text: theme === "dark" ? "#c9d1d9" : "#1f2328",
    textDim: theme === "dark" ? "#8b949e" : "#656d76",
    grid: theme === "dark" ? "#21262d" : "#e8ecf0",
    relationship: theme === "dark" ? "#8b949e" : "#656d76",
    relationshipHover: "#388bfd",
  }), [theme]);

  // Pan handlers
  const handlePointerDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === "rect") {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = (e.clientX - panStart.x) * (viewBox.width / svgRef.current.clientWidth);
    const dy = (e.clientY - panStart.y) * (viewBox.height / svgRef.current.clientHeight);
    setViewBox((v) => ({ ...v, left: v.left - dx, top: v.top - dy }));
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart, viewBox]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * viewBox.width + viewBox.left;
    const my = ((e.clientY - rect.top) / rect.height) * viewBox.height + viewBox.top;

    setViewBox((v) => {
      const newWidth = Math.max(200, Math.min(10000, v.width * scale));
      const newHeight = Math.max(150, Math.min(8000, v.height * scale));
      return {
        left: mx - (mx - v.left) * (newWidth / v.width),
        top: my - (my - v.top) * (newHeight / v.height),
        width: newWidth,
        height: newHeight,
      };
    });
  }, [viewBox]);

  // Fit all
  const fitAll = useCallback(() => {
    setViewBox(computeInitialViewBox(schema));
  }, [schema]);

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden", background: colors.bg, borderRadius: "8px" }}>
      {/* Controls */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, display: "flex", gap: 4 }}>
        <button onClick={fitAll} style={btnStyle(colors)} title="Fit all">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h4v1.5H3.5V6H2V2zm8 0h4v4h-1.5V3.5H10V2zM2 10h1.5v2.5H6V14H2v-4zm10 2.5V10h1.5v4h-4v-1.5h2.5z"/></svg>
        </button>
        <button onClick={() => setViewBox(v => ({ ...v, width: v.width * 0.8, height: v.height * 0.8 }))} style={btnStyle(colors)} title="Zoom in">+</button>
        <button onClick={() => setViewBox(v => ({ ...v, width: v.width * 1.25, height: v.height * 1.25 }))} style={btnStyle(colors)} title="Zoom out">-</button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.left} ${viewBox.top} ${viewBox.width} ${viewBox.height}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r="0.85" fill={colors.grid} />
          </pattern>
        </defs>
        <rect
          x={viewBox.left - 1000}
          y={viewBox.top - 1000}
          width={viewBox.width + 2000}
          height={viewBox.height + 2000}
          fill="url(#grid)"
        />

        {/* Subject Areas (behind tables) */}
        {areas.map((area) => (
          <SubjectArea key={area.id} data={area} colors={colors} />
        ))}

        {/* Relationships */}
        {relationships.map((rel) => (
          <RelationshipPath
            key={rel.id}
            data={rel}
            tables={tables}
            tableWidth={tableWidth}
            showComments={showComments}
            showCardinality={showCardinality}
            showLabels={showRelationshipLabels}
            colors={colors}
          />
        ))}

        {/* Tables */}
        {tables.map((table) => (
          <TableNode
            key={table.id}
            data={table}
            tableWidth={tableWidth}
            showComments={showComments}
            colors={colors}
          />
        ))}
      </svg>
    </div>
  );
}

function computeInitialViewBox(schema) {
  const tables = schema?.tables || [];
  if (tables.length === 0) return { left: -50, top: -50, width: 1200, height: 800 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tables) {
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + (DEFAULT_TABLE_WIDTH || 220));
    maxY = Math.max(maxY, t.y + 200);
  }
  const pad = 80;
  return {
    left: minX - pad,
    top: minY - pad,
    width: Math.max(600, maxX - minX + pad * 2),
    height: Math.max(400, maxY - minY + pad * 2),
  };
}

function btnStyle(colors) {
  return {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    color: colors.text,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1,
  };
}
