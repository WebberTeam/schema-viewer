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
 */
export function hierarchicalLayout(schema) {
  const { tables, relationships, subjectAreas } = schema;
  if (tables.length === 0) return schema;

  const incoming = new Map();
  const outgoing = new Map();
  for (const t of tables) { incoming.set(t.id, new Set()); outgoing.set(t.id, new Set()); }
  for (const r of relationships) {
    outgoing.get(r.startTableId)?.add(r.endTableId);
    incoming.get(r.endTableId)?.add(r.startTableId);
  }

  const depth = new Map();
  const queue = [];
  for (const t of tables) {
    if (outgoing.get(t.id).size === 0) { depth.set(t.id, 0); queue.push(t.id); }
  }
  while (queue.length > 0) {
    const id = queue.shift();
    const d = depth.get(id);
    for (const childId of incoming.get(id) || []) {
      if ((depth.get(childId) ?? -1) < d + 1) { depth.set(childId, d + 1); queue.push(childId); }
    }
  }
  const maxD = Math.max(0, ...depth.values());
  for (const t of tables) { if (!depth.has(t.id)) depth.set(t.id, maxD + 1); }

  const positioned = new Map();
  let groupX = PAD;
  const { groupMap, ungrouped } = groupTables(tables, subjectAreas);

  const layoutCluster = (cluster) => {
    cluster.sort((a, b) => (depth.get(a.id) || 0) - (depth.get(b.id) || 0));
    let y = PAD;
    for (const t of cluster) { positioned.set(t.id, { x: groupX, y }); y += tableHeight(t) + PAD; }
    groupX += TABLE_WIDTH + PAD * 2;
  };

  for (const [, members] of groupMap) layoutCluster(members);
  if (ungrouped.length > 0) layoutCluster(ungrouped);

  return applyPositions(schema, positioned);
}

/**
 * Grid layout with intra-group force separation.
 * 1. Place tables in grid columns per group
 * 2. Run force-directed separation within each group to prevent overlap
 * 3. Separate groups from each other
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
      positioned.set(t.id, { x: startX + col * (TABLE_WIDTH + PAD), y: rowY });
      rowMaxH = Math.max(rowMaxH, tableHeight(t));
      col++;
      if (col >= cols) { col = 0; rowY += rowMaxH + PAD; rowMaxH = 0; }
    }
    // Apply intra-group force separation
    forceRelax(cluster, positioned);
    // Compute used width for this cluster
    let maxX = 0;
    for (const t of cluster) maxX = Math.max(maxX, positioned.get(t.id).x + TABLE_WIDTH);
    offsetX = maxX + PAD * 2;
  };

  const { groupMap, ungrouped } = groupTables(tables, subjectAreas);
  for (const [, members] of groupMap) layoutGrid(members);
  if (ungrouped.length > 0) layoutGrid(ungrouped);

  // Inter-group separation
  separateGroups(groupMap, ungrouped, positioned);

  return applyPositions(schema, positioned);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupTables(tables, subjectAreas) {
  const groupMap = new Map();
  const grouped = new Set();
  for (const area of (subjectAreas || [])) {
    const members = tables.filter((t) => area.tableIds?.includes(t.id));
    if (members.length > 0) { groupMap.set(area.id, members); members.forEach((t) => grouped.add(t.id)); }
  }
  return { groupMap, ungrouped: tables.filter((t) => !grouped.has(t.id)) };
}

function applyPositions(schema, positioned) {
  return {
    ...schema,
    tables: schema.tables.map((t) => ({
      ...t,
      x: positioned.get(t.id)?.x ?? t.x,
      y: positioned.get(t.id)?.y ?? t.y,
    })),
  };
}

/**
 * Intra-group force relaxation — push overlapping tables apart.
 * Balanced push (half each direction) with configurable iterations.
 */
function forceRelax(cluster, positioned, iterations = 6) {
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const a = cluster[i], b = cluster[j];
        const ap = positioned.get(a.id), bp = positioned.get(b.id);
        const ah = tableHeight(a), bh = tableHeight(b);
        const overlapX = (ap.x + TABLE_WIDTH + PAD) - bp.x;
        const overlapY = (ap.y + ah + PAD * 0.5) - bp.y;

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            ap.x -= Math.floor(overlapX / 2);
            bp.x += Math.ceil(overlapX / 2);
          } else {
            ap.y -= Math.floor(overlapY / 2);
            bp.y += Math.ceil(overlapY / 2);
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

/**
 * Inter-group separation — push group bounding boxes apart.
 */
function separateGroups(groupMap, ungrouped, positioned) {
  const groups = [];
  for (const [, members] of groupMap) groups.push(members);
  if (ungrouped.length > 0) groups.push(ungrouped);

  for (let iter = 0; iter < 5; iter++) {
    let moved = false;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const ba = groupBounds(groups[i], positioned);
        const bb = groupBounds(groups[j], positioned);
        const ox = (ba.maxX + PAD) - bb.minX;
        const oy = (ba.maxY + PAD) - bb.minY;
        if (ox > 0 && oy > 0) {
          if (ox < oy) {
            for (const t of groups[j]) positioned.get(t.id).x += ox;
          } else {
            for (const t of groups[j]) positioned.get(t.id).y += oy;
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

function groupBounds(members, positioned) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of members) {
    const p = positioned.get(t.id);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + TABLE_WIDTH);
    maxY = Math.max(maxY, p.y + tableHeight(t));
  }
  return { minX, minY, maxX, maxY };
}
