/**
 * SubjectArea — Read-only colored grouping box.
 * Derived from DrawDB Area.jsx (AGPL-3.0). Resize handles removed.
 */
export function SubjectArea({ data, colors }) {
  return (
    <foreignObject
      x={data.x}
      y={data.y}
      width={data.width || 300}
      height={data.height || 200}
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          width: "100%",
          height: "100%",
          border: `2px dashed ${data.color || colors.border}`,
          borderRadius: 8,
          background: `${data.color || colors.border}10`,
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute",
          top: -10,
          left: 12,
          background: colors.bg,
          padding: "0 6px",
          fontSize: 11,
          fontWeight: 600,
          color: data.color || colors.textDim,
          fontFamily: "inherit",
        }}>
          {data.name}
        </div>
      </div>
    </foreignObject>
  );
}
