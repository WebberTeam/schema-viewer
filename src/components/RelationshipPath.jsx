/**
 * RelationshipPath — Read-only SVG relationship line with cardinality labels.
 * Derived from DrawDB Relationship.jsx (AGPL-3.0). Editor SideSheet removed.
 */
import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { calcPath } from "../utils/calcPath";

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
  onClick,
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

  // Compute path string (stable — only changes when pathValues or tableWidth change)
  const d = useMemo(
    () => pathValues ? calcPath(pathValues, tableWidth, 1, showComments) : "",
    [pathValues, tableWidth, showComments]
  );

  // Position cardinality labels after path renders. useLayoutEffect + d dependency
  // prevents the infinite re-render loop (old code had useEffect with no deps).
  const [positions, setPositions] = useState(null);
  useLayoutEffect(() => {
    if (!pathRef.current || !d) { setPositions(null); return; }
    const len = pathRef.current.getTotalLength();
    if (len < 1) { setPositions(null); return; }

    const mid = pathRef.current.getPointAtLength(len / 2);
    const p1 = pathRef.current.getPointAtLength(Math.min(28, len * 0.15));
    const p2 = pathRef.current.getPointAtLength(Math.max(len - 28, len * 0.85));
    const lw = labelRef.current?.getBBox().width ?? 0;
    const lh = labelRef.current?.getBBox().height ?? 0;
    setPositions({ mid, p1, p2, lw, lh });
  }, [d]); // Only recompute when the path geometry changes

  if (!pathValues || !d) return null;

  const pathColor = data.strokeColor || colors.relationship;
  const dashArray = data.strokeStyle === "dashed" ? "8,4" : data.strokeStyle === "dotted" ? "2,3" : "none";
  const arrowId = `arrow_${data.id}`;

  return (
    <g style={{ pointerEvents: "visibleStroke", userSelect: "none", cursor: onClick ? "pointer" : "default" }}
       onClick={onClick}>
      {/* Arrow marker definition */}
      {(data.showArrow ?? true) && (
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={pathColor} />
          </marker>
        </defs>
      )}

      {/* Invisible wider hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />

      {/* Visible path */}
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke={pathColor}
        strokeWidth={1.5}
        strokeDasharray={dashArray}
        markerEnd={(data.showArrow ?? true) ? `url(#${arrowId})` : undefined}
      />

      {/* Relationship label */}
      {showLabels && data.name && positions && (
        <text
          ref={labelRef}
          x={positions.mid.x - positions.lw / 2}
          y={positions.mid.y + positions.lh / 2}
          fill={data.strokeColor || colors.textDim}
          fontSize={12}
          fontWeight={data.labelBold ? 700 : 500}
          fontStyle={data.labelItalic ? "italic" : "normal"}
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

  useLayoutEffect(() => {
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
