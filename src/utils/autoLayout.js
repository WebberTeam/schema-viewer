/**
 * Auto-layout algorithms for schema diagrams.
 * No external dependencies — pure graph layout math.
 */
import { tableFieldHeight, tableHeaderHeight, tableColorStripHeight } from "./calcPath";

const TABLE_WIDTH = 220;
const PAD = 40;

function tableHeight(t) {
  return tableHeaderHeight + tableColorStripHeight +
    (t.fields?.length || 2) * tableFieldHeight +
    (t.comment ? 30 : 0);
}

/**
 * Hierarchical layout — tables arranged by FK dependency depth.
 * Root tables (no incoming FKs) at top, dependents below.
 * Tables in the same group are clustered together.
 *
 * @param {object} schema - { tables, relationships, subjectAreas }
 * @returns {object} Updated schema with new x,y positions
 */
export function hierarchicalLayout(schema) {
  const { tables, relationships, subjectAreas } = schema;
  if (tables.length === 0) return schema;

  // Build adjacency: which tables reference which (FK direction = child → parent)
  const incoming = new Map(); // tableId → set of tables that reference it
  const outgoing = new Map(); // tableId → set of tables it references
  for (const t of tables) {
    incoming.set(t.id, new Set());
    outgoing.set(t.id, new Set());
  }
  for (const r of relationships) {
    // startTable has the FK, endTable is referenced
    outgoing.get(r.startTableId)?.add(r.endTableId);
    incoming.get(r.endTableId)?.add(r.startTableId);
  }

  // Assign depth via BFS from roots (tables with no outgoing FKs = they reference nothing)
  const depth = new Map();
  const queue = [];
  for (const t of tables) {
    if (outgoing.get(t.id).size === 0) {
      depth.set(t.id, 0);
      queue.push(t.id);
    }
  }
  // Tables that reference others get deeper depth
  while (queue.length > 0) {
    const id = queue.shift();
    const d = depth.get(id);
    for (const childId of incoming.get(id) || []) {
      const existing = depth.get(childId);
      if (existing === undefined || existing < d + 1) {
        depth.set(childId, d + 1);
        queue.push(childId);
      }
    }
  }
  // Assign unvisited tables (cycles) to max depth + 1
  const maxDepth = Math.max(0, ...depth.values());
  for (const t of tables) {
    if (!depth.has(t.id)) depth.set(t.id, maxDepth + 1);
  }

  // Group tables by subject area first, then by depth within each group
  const groupMap = new Map(); // groupId → [tables]
  const ungrouped = [];
  for (const t of tables) {
    const area = subjectAreas?.find((a) => a.tableIds?.includes(t.id));
    if (area) {
      if (!groupMap.has(area.id)) groupMap.set(area.id, []);
      groupMap.get(area.id).push(t);
    } else {
      ungrouped.push(t);
    }
  }

  // Layout each group as a column cluster
  const positioned = new Map();
  let groupX = PAD;

  const layoutCluster = (cluster) => {
    // Sort by depth
    cluster.sort((a, b) => (depth.get(a.id) || 0) - (depth.get(b.id) || 0));

    // Stack vertically
    let y = PAD;
    let maxW = 0;
    for (const t of cluster) {
      positioned.set(t.id, { x: groupX, y });
      y += tableHeight(t) + PAD;
      maxW = Math.max(maxW, TABLE_WIDTH);
    }
    groupX += maxW + PAD * 2;
  };

  // Layout grouped clusters
  for (const [, members] of groupMap) {
    layoutCluster(members);
  }

  // Layout ungrouped
  if (ungrouped.length > 0) {
    layoutCluster(ungrouped);
  }

  // Apply positions
  const updatedTables = tables.map((t) => ({
    ...t,
    x: positioned.get(t.id)?.x ?? t.x,
    y: positioned.get(t.id)?.y ?? t.y,
  }));

  return { ...schema, tables: updatedTables };
}

/**
 * Grid layout — simple grid arrangement, grouped clusters side by side.
 *
 * @param {object} schema
 * @param {number} cols - Max columns per cluster
 * @returns {object} Updated schema
 */
export function gridLayout(schema, cols = 3) {
  const { tables, subjectAreas } = schema;
  if (tables.length === 0) return schema;

  const positioned = new Map();
  let offsetX = PAD;

  const layoutGrid = (cluster) => {
    let col = 0, rowY = PAD, rowMaxH = 0;
    const startX = offsetX;
    for (const t of cluster) {
      const x = startX + col * (TABLE_WIDTH + PAD);
      positioned.set(t.id, { x, y: rowY });
      rowMaxH = Math.max(rowMaxH, tableHeight(t));
      col++;
      if (col >= cols) {
        col = 0;
        rowY += rowMaxH + PAD;
        rowMaxH = 0;
      }
    }
    offsetX = startX + Math.min(cluster.length, cols) * (TABLE_WIDTH + PAD) + PAD * 2;
  };

  // Group clusters
  const grouped = new Set();
  for (const area of (subjectAreas || [])) {
    const members = tables.filter((t) => area.tableIds?.includes(t.id));
    if (members.length > 0) {
      layoutGrid(members);
      members.forEach((t) => grouped.add(t.id));
    }
  }

  // Ungrouped
  const ungrouped = tables.filter((t) => !grouped.has(t.id));
  if (ungrouped.length > 0) layoutGrid(ungrouped);

  const updatedTables = tables.map((t) => ({
    ...t,
    x: positioned.get(t.id)?.x ?? t.x,
    y: positioned.get(t.id)?.y ?? t.y,
  }));

  return { ...schema, tables: updatedTables };
}
