/**
 * SubjectArea — Colored grouping box that auto-sizes around contained tables.
 * Derived from DrawDB Area.jsx (AGPL-3.0). Resize handles removed.
 * Label rendered as HTML foreignObject extending beyond the dashed border.
 * Supports drag-to-move (moves all contained tables).
 */

const TABLE_WIDTH = 220;
const FIELD_HEIGHT = 36;
const HEADER_HEIGHT = 57;

function estimateTableHeight(t) {
  return HEADER_HEIGHT + (t.fields?.length || 3) * FIELD_HEIGHT + (t.comment ? 30 : 0);
}

export function SubjectArea({ data, colors, tables = null, editable, onPointerDown }) {
  const padInner = 48;   // enough room for cardinality badges + relationship curves
  const padRight = 56;   // extra right padding for relationship lines exiting tables
  const labelOverhang = 6;

  // Compute bounding box from contained tables
  let x, y, w, h;
  const contained = getContainedTables(data, tables, 40);

  if (contained.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of contained) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + TABLE_WIDTH);
      maxY = Math.max(maxY, t.y + estimateTableHeight(t));
    }
    x = minX - padInner;
    y = minY - padInner;
    w = Math.max(200, maxX - minX + padInner + padRight);
    h = Math.max(150, maxY - minY + padInner * 2);
  } else {
    x = data.x;
    y = data.y;
    w = data.width || 300;
    h = data.height || 200;
  }

  const labelY = y - 14; // label sits above the border
  const labelW = Math.min((data.name || "").length * 7.5 + 24, w);

  return (
    <g>
      {/* Dashed border */}
      <rect
        x={x} y={y} width={w} height={h}
        rx={8} ry={8}
        fill={`${data.color || colors.border}08`}
        stroke={data.color || colors.border}
        strokeWidth={2}
        strokeDasharray="6,4"
        style={{ cursor: editable ? "move" : "default" }}
        onPointerDown={editable ? onPointerDown : undefined}
        data-area-id={data.id}
      />

      {/* Clickable interior (for area drag — behind tables but catches empty space) */}
      {editable && (
        <rect
          x={x + 2} y={y + 2} width={w - 4} height={h - 4}
          fill="transparent"
          style={{ cursor: "move" }}
          onPointerDown={onPointerDown}
          data-area-id={data.id}
        />
      )}

      {/* Label — HTML foreignObject extending above the border */}
      <foreignObject
        x={x + labelOverhang}
        y={labelY}
        width={labelW}
        height={28}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            display: "inline-block",
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "'SF Mono','Cascadia Code','Consolas',monospace",
            color: data.color || colors.textDim,
            background: colors.bg,
            borderRadius: 4,
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          {data.name}
        </div>
      </foreignObject>
    </g>
  );
}

export function getContainedTables(area, tables, pad = 30) {
  if (!tables || tables.length === 0) return [];
  if (area.tableIds) {
    return tables.filter((t) => area.tableIds.includes(t.id));
  }
  return tables.filter((t) =>
    t.x >= area.x - pad &&
    t.y >= area.y - pad &&
    t.x <= area.x + (area.width || 300) + pad &&
    t.y <= area.y + (area.height || 200) + pad
  );
}
