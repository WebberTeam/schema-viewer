/**
 * RelationshipPath — Read-only SVG relationship line with cardinality labels.
 * Derived from DrawDB Relationship.jsx (AGPL-3.0). Editor SideSheet removed.
 */
import { useMemo, useRef, useState, useEffect } from "react";
import { calcPath, tableFieldHeight, tableHeaderHeight, getCommentHeight } from "../utils/calcPath";

const CARDINALITY = {
  one_to_one: ["1", "1"],
  one_to_many: ["1", "n"],
  many_to_one: ["n", "1"],
};

export function RelationshipPath({
  data,
  tables,
  tableWidth = 220,
  showComments = true,
  showCardinality = true,
  showLabels = true,
  colors,
}) {
  const pathRef = useRef();
  const labelRef = useRef();

  const pathValues = useMemo(() => {
    const startTable = tables.find((t) => t.id === data.startTableId);
    const endTable = tables.find((t) => t.id === data.endTableId);
    if (!startTable || !endTable) return null;

    const startFields = startTable.fields || [];
    const endFields = endTable.fields || [];
    const startFieldIndex = startFields.findIndex((f) => f.id === data.startFieldId);
    const endFieldIndex = endFields.findIndex((f) => f.id === data.endFieldId);

    return {
      startFieldIndex: Math.max(0, startFieldIndex),
      endFieldIndex: Math.max(0, endFieldIndex),
      startTable: { x: startTable.x, y: startTable.y, comment: startTable.comment, fields: startFields },
      endTable: { x: endTable.x, y: endTable.y, comment: endTable.comment, fields: endFields },
    };
  }, [tables, data]);

  const [cardinalityStart, cardinalityEnd] = CARDINALITY[data.cardinality] || ["1", "1"];
  const customStart = data.cardinality === "many_to_one" ? (data.manyLabel || "n") : cardinalityStart;
  const customEnd = data.cardinality === "one_to_many" ? (data.manyLabel || "n") : cardinalityEnd;

  // Cardinality label positioning (requires rendered path)
  const [positions, setPositions] = useState(null);
  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    if (len < 1) return;

    const mid = pathRef.current.getPointAtLength(len / 2);
    const p1 = pathRef.current.getPointAtLength(28);
    const p2 = pathRef.current.getPointAtLength(len - 28);
    const lw = labelRef.current?.getBBox().width ?? 0;
    const lh = labelRef.current?.getBBox().height ?? 0;
    setPositions({ mid, p1, p2, lw, lh });
  });

  if (!pathValues) return null;

  const d = calcPath(pathValues, tableWidth, 1, showComments);

  return (
    <g className="select-none" style={{ pointerEvents: "visibleStroke" }}>
      {/* Invisible wider hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />

      {/* Visible path */}
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke={colors.relationship}
        strokeWidth={1.5}
      />

      {/* Relationship label */}
      {showLabels && data.name && positions && (
        <text
          ref={labelRef}
          x={positions.mid.x - positions.lw / 2}
          y={positions.mid.y + positions.lh / 2}
          fill={colors.textDim}
          fontSize={12}
          fontWeight={500}
          fontFamily="inherit"
        >
          {data.name}
        </text>
      )}

      {/* Cardinality badges */}
      {showCardinality && positions && (
        <>
          <CardinalityBadge x={positions.p1.x} y={positions.p1.y} text={customStart} />
          <CardinalityBadge x={positions.p2.x} y={positions.p2.y} text={customEnd} />
        </>
      )}
    </g>
  );
}

function CardinalityBadge({ x, y, text, r = 12 }) {
  const [tw, setTw] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) setTw(ref.current.getBBox().width);
  }, [text]);

  return (
    <g>
      <rect x={x - tw / 2 - 7} y={y - r} rx={r} ry={r} width={tw + 14} height={r * 2} fill="#6e7681" />
      <text ref={ref} x={x} y={y} fill="white" strokeWidth="0.5" textAnchor="middle" alignmentBaseline="middle" fontSize={12}>
        {text}
      </text>
    </g>
  );
}
