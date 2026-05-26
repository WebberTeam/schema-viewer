/**
 * SubjectArea — Colored grouping box that auto-sizes around contained tables.
 * Derived from DrawDB Area.jsx (AGPL-3.0). Resize handles removed.
 * When `tables` prop is provided, auto-computes bounding box.
 */
export function SubjectArea({ data, colors, tables = null }) {
  // If tables are provided, compute bounding box from contained tables
  let { x, y, width, height } = data;
  const pad = 30;
  const labelHeight = 24;

  if (tables && tables.length > 0) {
    // Find tables inside this area (by checking which tables fall within the original bounds,
    // or by explicit membership if data.tableIds is set)
    const contained = data.tableIds
      ? tables.filter((t) => data.tableIds.includes(t.id))
      : tables.filter((t) =>
          t.x >= data.x - pad &&
          t.y >= data.y - pad &&
          t.x <= data.x + (data.width || 300) + pad &&
          t.y <= data.y + (data.height || 200) + pad
        );

    if (contained.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const t of contained) {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + 220); // tableWidth
        maxY = Math.max(maxY, t.y + 300); // approximate max height
      }
      x = minX - pad;
      y = minY - pad - labelHeight;
      width = Math.max(200, maxX - minX + pad * 2);
      height = Math.max(150, maxY - minY + pad * 2 + labelHeight);
    }
  }

  return (
    <g>
      {/* Background rect */}
      <rect
        x={x}
        y={y}
        width={width || 300}
        height={height || 200}
        rx={8}
        ry={8}
        fill={`${data.color || colors.border}08`}
        stroke={data.color || colors.border}
        strokeWidth={2}
        strokeDasharray="6,4"
      />
      {/* Label — rendered as SVG text above the box so it's never clipped */}
      <rect
        x={x + 8}
        y={y - 2}
        width={Math.min((data.name || "").length * 8 + 16, (width || 300) - 16)}
        height={18}
        rx={3}
        fill={colors.bg}
      />
      <text
        x={x + 16}
        y={y + 11}
        fill={data.color || colors.textDim}
        fontSize={11}
        fontWeight={600}
        fontFamily="inherit"
      >
        {data.name}
      </text>
    </g>
  );
}
