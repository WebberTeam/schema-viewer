/**
 * SchemaViewer — Read-only interactive ER diagram renderer.
 * Derived from DrawDB (AGPL-3.0). Editor logic removed; pure visualization.
 *
 * Usage:
 *   <SchemaViewer schema={jsonSchema} theme="dark" width="100%" height="600px" />
 */
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { TableNode } from "./TableNode";
import { RelationshipPath } from "./RelationshipPath";
import { SubjectArea, getContainedTables } from "./SubjectArea";
import { TableEditor } from "./TableEditor";

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
  editable = false,
  onChange = null,
}) {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState(() => computeInitialViewBox(schema));
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Editor state: internal copy of tables for drag positioning
  const [tablePositions, setTablePositions] = useState(() => {
    const positions = Object.fromEntries((schema?.tables || []).map((t) => [t.id, { x: t.x, y: t.y }]));
    return separateOverlaps(positions, schema?.tables || [], tableWidth, schema?.subjectAreas || []);
  });
  const [dragging, setDragging] = useState(null); // { tableId, startX, startY, origX, origY } OR { areaId, tableIds, ... }
  const [frontTableId, setFrontTableId] = useState(null); // table brought to front on click/drag
  const [editingTable, setEditingTable] = useState(null); // table being edited (double-click popup)

  const rawTables = schema?.tables || [];
  const relationships = schema?.relationships || [];
  const areas = schema?.subjectAreas || [];

  // Merge editor positions over schema positions
  const tables = useMemo(() =>
    rawTables.map((t) => ({
      ...t,
      x: tablePositions[t.id]?.x ?? t.x,
      y: tablePositions[t.id]?.y ?? t.y,
    })),
    [rawTables, tablePositions]
  );

  // Sort tables so the "front" table renders last (SVG z-order = paint order)
  const sortedTables = useMemo(() => {
    if (!frontTableId) return tables;
    const rest = tables.filter((t) => t.id !== frontTableId);
    const front = tables.find((t) => t.id === frontTableId);
    return front ? [...rest, front] : tables;
  }, [tables, frontTableId]);

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

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * viewBox.width + viewBox.left,
      y: ((clientY - rect.top) / rect.height) * viewBox.height + viewBox.top,
    };
  }, [viewBox]);

  // Table drag start (called from TableNode)
  const handleTablePointerDown = useCallback((e, tableId) => {
    if (!editable) return;
    e.stopPropagation();
    setFrontTableId(tableId); // bring to front
    const svgPt = screenToSVG(e.clientX, e.clientY);
    const pos = tablePositions[tableId];
    setDragging({
      tableId,
      startX: svgPt.x,
      startY: svgPt.y,
      origX: pos?.x ?? 0,
      origY: pos?.y ?? 0,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [editable, screenToSVG, tablePositions]);

  // Area drag start (moves all tables in the area)
  const handleAreaPointerDown = useCallback((e, areaData) => {
    if (!editable) return;
    e.stopPropagation();
    const svgPt = screenToSVG(e.clientX, e.clientY);
    const contained = getContainedTables(areaData, tables);
    const tableIds = contained.map((t) => t.id);
    const origPositions = Object.fromEntries(tableIds.map((id) => [id, { ...tablePositions[id] }]));
    setDragging({
      areaId: areaData.id,
      tableIds,
      origPositions,
      startX: svgPt.x,
      startY: svgPt.y,
    });
    e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
  }, [editable, screenToSVG, tables, tablePositions]);

  // Pan handlers
  const handlePointerDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === "rect" || e.target.closest("[data-grid]")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      svgRef.current.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e) => {
    // Dragging (table or area) takes priority
    if (dragging) {
      const svgPt = screenToSVG(e.clientX, e.clientY);
      const dx = svgPt.x - dragging.startX;
      const dy = svgPt.y - dragging.startY;

      if (dragging.tableId) {
        // Single table drag
        const newX = Math.round((dragging.origX + dx) / GRID_SIZE) * GRID_SIZE;
        const newY = Math.round((dragging.origY + dy) / GRID_SIZE) * GRID_SIZE;
        setTablePositions((prev) => ({ ...prev, [dragging.tableId]: { x: newX, y: newY } }));
      } else if (dragging.areaId) {
        // Area drag — move all contained tables
        const snapDx = Math.round(dx / GRID_SIZE) * GRID_SIZE;
        const snapDy = Math.round(dy / GRID_SIZE) * GRID_SIZE;
        setTablePositions((prev) => {
          const next = { ...prev };
          for (const id of dragging.tableIds) {
            const orig = dragging.origPositions[id];
            next[id] = { x: orig.x + snapDx, y: orig.y + snapDy };
          }
          return next;
        });
      }
      return;
    }

    if (!isPanning) return;
    const dx = (e.clientX - panStart.x) * (viewBox.width / svgRef.current.clientWidth);
    const dy = (e.clientY - panStart.y) * (viewBox.height / svgRef.current.clientHeight);
    setViewBox((v) => ({ ...v, left: v.left - dx, top: v.top - dy }));
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [dragging, isPanning, panStart, viewBox, screenToSVG]);

  const handlePointerUp = useCallback(() => {
    if (dragging && onChange) {
      // Emit updated schema with new positions
      const updated = {
        ...schema,
        tables: tables.map((t) => ({
          ...t,
          x: tablePositions[t.id]?.x ?? t.x,
          y: tablePositions[t.id]?.y ?? t.y,
        })),
      };
      onChange(updated);
    }
    setDragging(null);
    setIsPanning(false);
  }, [dragging, onChange, schema, tables, tablePositions]);

  // Zoom handler — attached via useEffect with {passive:false} to allow preventDefault.
  // React's onWheel is passive by default in modern browsers, causing the console warning.
  const wheelHandlerRef = useRef(null);
  wheelHandlerRef.current = (e) => {
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
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e) => wheelHandlerRef.current(e);
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);

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
        style={{ cursor: isPanning ? "grabbing" : "grab", userSelect: "none", WebkitUserSelect: "none" }}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r="0.85" fill={colors.grid} />
          </pattern>
        </defs>
        <rect
          data-grid="true"
          x={viewBox.left - 1000}
          y={viewBox.top - 1000}
          width={viewBox.width + 2000}
          height={viewBox.height + 2000}
          fill="url(#grid)"
        />

        {/* Subject Areas (behind tables, auto-sized to contained tables) */}
        {areas.map((area) => (
          <SubjectArea
            key={area.id}
            data={area}
            colors={colors}
            tables={tables}
            editable={editable}
            onPointerDown={(e) => handleAreaPointerDown(e, area)}
          />
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

        {/* Tables — front table rendered last for z-ordering */}
        {sortedTables.map((table) => (
          <TableNode
            key={table.id}
            data={table}
            tableWidth={tableWidth}
            showComments={showComments}
            colors={colors}
            editable={editable}
            isDragging={dragging?.tableId === table.id}
            onPointerDown={(e) => handleTablePointerDown(e, table.id)}
            onDoubleClick={() => editable && setEditingTable(table)}
          />
        ))}
      </svg>

      {/* Double-click table editor popup */}
      {editingTable && (
        <>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 90 }}
            onClick={() => setEditingTable(null)}
          />
          <TableEditor
            table={editingTable}
            allTables={tables}
            relationships={relationships}
            colors={colors}
            onClose={() => setEditingTable(null)}
            onSave={(updated) => {
              if (onChange) {
                onChange({
                  ...schema,
                  tables: schema.tables.map((t) => t.id === updated.id ? updated : t),
                });
              }
              setEditingTable(null);
            }}
          />
        </>
      )}
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

/**
 * Two-level overlap separation:
 * 1. Lay out tables within each subject area (intra-group gravity)
 * 2. Compute each area's bounding box from its tables
 * 3. Separate areas so they don't overlap (inter-group gravity)
 * 4. Translate area tables by the area's displacement
 * 5. Separate any ungrouped tables against everything
 */
function separateOverlaps(positions, tables, tw = 220, areas = []) {
  if (tables.length < 2) return positions;

  const result = {};
  for (const t of tables) {
    result[t.id] = { x: positions[t.id]?.x ?? t.x, y: positions[t.id]?.y ?? t.y };
  }

  const PAD = 20;
  const AREA_PAD = 40;

  // Estimate table height from field count
  function tableHeight(t) {
    return 57 + (t.fields?.length || 3) * 36 + (t.comment ? 30 : 0);
  }

  // --- Step 1: Separate tables within each area ---
  const grouped = new Set();
  const areaGroups = [];

  for (const area of areas) {
    const memberIds = area.tableIds || [];
    if (memberIds.length === 0) continue;
    const members = tables.filter((t) => memberIds.includes(t.id));
    if (members.length === 0) continue;

    members.forEach((t) => grouped.add(t.id));
    separateTableSet(result, members, tw, PAD, tableHeight);
    areaGroups.push({ area, members });
  }

  // --- Step 2: Compute area bounding boxes ---
  const areaBounds = areaGroups.map(({ area, members }) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of members) {
      const p = result[t.id];
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + tw);
      maxY = Math.max(maxY, p.y + tableHeight(t));
    }
    return {
      area,
      members,
      x: minX - AREA_PAD,
      y: minY - AREA_PAD - 24, // room for label
      w: maxX - minX + AREA_PAD * 2,
      h: maxY - minY + AREA_PAD * 2 + 24,
    };
  });

  // --- Step 3: Separate areas from each other ---
  for (let iter = 0; iter < 8; iter++) {
    let moved = false;
    for (let i = 0; i < areaBounds.length; i++) {
      for (let j = i + 1; j < areaBounds.length; j++) {
        const a = areaBounds[i], b = areaBounds[j];
        const overlapX = (a.x + a.w + PAD) - b.x;
        const overlapY = (a.y + a.h + PAD) - b.y;

        if (overlapX > 0 && overlapY > 0) {
          // Push area B away along axis of least overlap
          let dx = 0, dy = 0;
          if (overlapX < overlapY) {
            dx = overlapX;
          } else {
            dy = overlapY;
          }
          b.x += dx;
          b.y += dy;
          // Translate all tables in area B
          for (const t of b.members) {
            result[t.id] = { x: result[t.id].x + dx, y: result[t.id].y + dy };
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // --- Step 4: Separate ungrouped tables against all others ---
  const ungrouped = tables.filter((t) => !grouped.has(t.id));
  if (ungrouped.length > 0) {
    // First separate ungrouped from each other
    separateTableSet(result, ungrouped, tw, PAD, tableHeight);

    // Then separate ungrouped from all grouped tables
    const allGrouped = tables.filter((t) => grouped.has(t.id));
    for (let iter = 0; iter < 5; iter++) {
      let moved = false;
      for (const u of ungrouped) {
        for (const g of allGrouped) {
          const ux = result[u.id].x, uy = result[u.id].y;
          const gx = result[g.id].x, gy = result[g.id].y;
          const oh = tableHeight(g);
          const uh = tableHeight(u);

          const overlapX = Math.min(ux + tw + PAD, gx + tw + PAD) - Math.max(ux, gx);
          const overlapY = Math.min(uy + uh + PAD, gy + oh + PAD) - Math.max(uy, gy);

          if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) {
              result[u.id] = { x: ux + (ux < gx ? -overlapX : overlapX), y: uy };
            } else {
              result[u.id] = { x: ux, y: uy + (uy < gy ? -overlapY : overlapY) };
            }
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  return result;
}

/** Separate a set of tables from each other (in-place on result). */
function separateTableSet(result, tables, tw, pad, heightFn) {
  for (let iter = 0; iter < 8; iter++) {
    let moved = false;
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const a = tables[i], b = tables[j];
        const ax = result[a.id].x, ay = result[a.id].y;
        const bx = result[b.id].x, by = result[b.id].y;
        const ah = heightFn(a), bh = heightFn(b);

        const overlapX = (ax + tw + pad) - bx;
        const overlapY = (ay + ah + pad) - by;

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            // Push B right (half each for balance)
            result[a.id] = { ...result[a.id], x: ax - Math.floor(overlapX / 2) };
            result[b.id] = { ...result[b.id], x: bx + Math.ceil(overlapX / 2) };
          } else {
            result[a.id] = { ...result[a.id], y: ay - Math.floor(overlapY / 2) };
            result[b.id] = { ...result[b.id], y: by + Math.ceil(overlapY / 2) };
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
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
