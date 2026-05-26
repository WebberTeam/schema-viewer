/**
 * TableNode — Read-only table box rendered as SVG foreignObject.
 * Derived from DrawDB Table.jsx (AGPL-3.0). All editor logic removed.
 */
import { useMemo } from "react";
import { getTableHeight, tableFieldHeight, tableHeaderHeight } from "../utils/calcPath";

const TYPE_COLORS = {
  INTEGER: "#eab308", INT: "#eab308", BIGINT: "#eab308", SMALLINT: "#eab308", SERIAL: "#eab308", BIGSERIAL: "#eab308",
  VARCHAR: "#f97316", TEXT: "#f97316", CHAR: "#f97316",
  BOOLEAN: "#8b5cf6", BOOL: "#8b5cf6",
  REAL: "#84cc16", FLOAT: "#84cc16", DOUBLE: "#84cc16", NUMERIC: "#84cc16", DECIMAL: "#84cc16",
  DATE: "#06b6d4", TIMESTAMP: "#06b6d4", TIMESTAMPTZ: "#06b6d4", TIME: "#06b6d4",
  JSONB: "#6366f1", JSON: "#6366f1",
  BYTEA: "#10b981", BLOB: "#10b981",
  UUID: "#f43f5e",
  ARRAY: "#0ea5e9", "TEXT[]": "#0ea5e9", "INTEGER[]": "#0ea5e9",
  TSVECTOR: "#a855f7",
};

function getTypeColor(type) {
  if (!type) return "#71717a";
  const upper = type.toUpperCase().replace(/\(.*\)/, "").trim();
  return TYPE_COLORS[upper] || "#71717a";
}

export function TableNode({ data, tableWidth = 220, showComments = true, colors, editable = false, isDragging = false, onPointerDown }) {
  const height = useMemo(
    () => getTableHeight(data, tableWidth, showComments),
    [data, tableWidth, showComments]
  );

  const fields = data.fields || [];
  if (data.hidden) return null;

  return (
    <foreignObject
      x={data.x}
      y={data.y}
      width={tableWidth}
      height={height}
      onPointerDown={editable ? onPointerDown : undefined}
      style={{ cursor: editable ? (isDragging ? "grabbing" : "grab") : "default", userSelect: "none", WebkitUserSelect: "none" }}
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          border: isDragging ? "2px solid #388bfd" : `1.5px solid ${colors.border}`,
          borderRadius: 8,
          overflow: "hidden",
          background: colors.surface,
          fontFamily: "'SF Mono','Cascadia Code','Consolas',monospace",
          fontSize: 12,
          color: colors.text,
          boxShadow: isDragging ? "0 8px 24px rgba(56,139,253,.3)" : "0 4px 12px rgba(0,0,0,.25)",
          transition: isDragging ? "none" : "box-shadow 0.15s",
        }}
      >
        {/* Color strip */}
        <div style={{ height: 7, background: data.color || "#175e7a" }} />

        {/* Header */}
        <div style={{
          padding: "8px 12px",
          fontWeight: 700,
          fontSize: 13,
          borderBottom: fields.length > 0 ? `1px solid ${colors.border}` : "none",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span style={{ opacity: 0.4, fontSize: 10 }}>&#9638;</span>
          {data.name}
        </div>

        {/* Comment */}
        {showComments && data.comment && (
          <div style={{
            padding: "4px 12px 8px",
            fontSize: 10,
            color: colors.textDim,
            fontStyle: "italic",
            borderBottom: `1px solid ${colors.border}`,
          }}>
            {data.comment}
          </div>
        )}

        {/* Fields */}
        {fields.map((field, i) => (
          <div
            key={field.id || i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              height: tableFieldHeight,
              borderBottom: i < fields.length - 1 ? `1px solid ${colors.border}` : "none",
              gap: 6,
            }}
          >
            {/* Key indicator */}
            {field.primary && (
              <span style={{ color: "#eab308", fontSize: 10, flexShrink: 0 }} title="Primary Key">&#9919;</span>
            )}
            {field.unique && !field.primary && (
              <span style={{ color: "#388bfd", fontSize: 10, flexShrink: 0 }} title="Unique">&#9670;</span>
            )}
            {!field.primary && !field.unique && (
              <span style={{ width: 10, flexShrink: 0 }} />
            )}

            {/* Field name */}
            <span style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: field.primary ? 600 : 400,
            }}>
              {field.name}
            </span>

            {/* Not null indicator */}
            {field.notNull && (
              <span style={{ color: colors.textDim, fontSize: 9, flexShrink: 0 }}>NN</span>
            )}

            {/* Type */}
            <span style={{
              color: getTypeColor(field.type),
              fontSize: 10,
              flexShrink: 0,
              opacity: 0.85,
            }}>
              {field.type}
            </span>
          </div>
        ))}
      </div>
    </foreignObject>
  );
}
