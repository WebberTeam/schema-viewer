/**
 * Path calculation for relationship lines between table fields.
 * Extracted from DrawDB (AGPL-3.0) — pure math, no external dependencies.
 *
 * Generates SVG path "d" attribute strings with rounded corners
 * for connecting fields across tables in an ER diagram.
 */

export const tableFieldHeight = 36;
export const tableHeaderHeight = 50;
export const tableColorStripHeight = 7;

/**
 * Estimate comment height for a table (simplified — no canvas measurement).
 */
export function getCommentHeight(comment, tableWidth, showComments) {
  if (!comment || !showComments) return 0;
  const COMMENT_LINE_HEIGHT = 16;
  const COMMENT_PADDING_BOTTOM = 12;
  const charsPerLine = Math.floor((tableWidth - 28) / 7);
  const lines = Math.min(Math.ceil(comment.length / charsPerLine), 5);
  return lines * COMMENT_LINE_HEIGHT + COMMENT_PADDING_BOTTOM;
}

/**
 * Get the Y offset for a field at a given index.
 */
export function getFieldOffsetY(fields, fieldIndex, tableWidth, showComments) {
  if (fieldIndex < 0) return 0;
  let offset = 0;
  for (let i = 0; i < fieldIndex && i < fields.length; i++) {
    offset += tableFieldHeight;
    if (showComments && fields[i]?.comment) {
      offset += getCommentHeight(fields[i].comment, tableWidth, showComments);
    }
  }
  return offset;
}

/**
 * Calculate the total height of a table.
 */
export function getTableHeight(table, tableWidth, showComments) {
  const fields = table.fields || [];
  let height = tableHeaderHeight + tableColorStripHeight;
  height += getCommentHeight(table.comment, tableWidth, showComments);
  for (const field of fields) {
    height += tableFieldHeight;
    if (showComments && field.comment) {
      height += getCommentHeight(field.comment, tableWidth, showComments);
    }
  }
  return height;
}

/**
 * Generates an SVG path string for a relationship between two fields.
 *
 * @param {{
 *   startTable: { x: number, y: number, comment?: string, fields: Array },
 *   endTable: { x: number, y: number, comment?: string, fields: Array },
 *   startFieldIndex: number,
 *   endFieldIndex: number
 * }} r - Relationship path data.
 * @param {number} tableWidth - Width of each table.
 * @param {number} zoom - Zoom level (scales vertical spacing).
 * @param {boolean} showComments - Whether comments are visible.
 * @returns {string} SVG path "d" attribute string.
 */
export function calcPath(r, tableWidth = 200, zoom = 1, showComments = true) {
  if (!r) return "";

  const width = tableWidth * zoom;
  let x1 = r.startTable.x;
  let y1 =
    r.startTable.y +
    getFieldOffsetY(r.startTable.fields ?? [], r.startFieldIndex, tableWidth, showComments) +
    tableHeaderHeight +
    getCommentHeight(r.startTable.comment, tableWidth, showComments) +
    tableFieldHeight / 2;
  let x2 = r.endTable.x;
  let y2 =
    r.endTable.y +
    getFieldOffsetY(r.endTable.fields ?? [], r.endFieldIndex, tableWidth, showComments) +
    getCommentHeight(r.endTable.comment, tableWidth, showComments) +
    tableHeaderHeight +
    tableFieldHeight / 2;

  let radius = 10 * zoom;
  const midX = (x2 + x1 + width) / 2;
  const endX = x2 + width < x1 ? x2 + width : x2;

  if (Math.abs(y1 - y2) <= 36 * zoom) {
    radius = Math.abs(y2 - y1) / 3;
    if (radius <= 2) {
      if (x1 + width <= x2) return `M ${x1 + width} ${y1} L ${x2} ${y2 + 0.1}`;
      else if (x2 + width < x1) return `M ${x1} ${y1} L ${x2 + width} ${y2 + 0.1}`;
    }
  }

  if (y1 <= y2) {
    if (x1 + width <= x2) {
      return `M ${x1 + width} ${y1} L ${midX - radius} ${y1} A ${radius} ${radius} 0 0 1 ${midX} ${y1 + radius} L ${midX} ${y2 - radius} A ${radius} ${radius} 0 0 0 ${midX + radius} ${y2} L ${endX} ${y2}`;
    } else if (x2 <= x1 + width && x1 <= x2) {
      return `M ${x1 + width} ${y1} L ${x2 + width} ${y1} A ${radius} ${radius} 0 0 1 ${x2 + width + radius} ${y1 + radius} L ${x2 + width + radius} ${y2 - radius} A ${radius} ${radius} 0 0 1 ${x2 + width} ${y2} L ${x2 + width} ${y2}`;
    } else if (x2 + width >= x1 && x2 + width <= x1 + width) {
      return `M ${x1} ${y1} L ${x2 - radius} ${y1} A ${radius} ${radius} 0 0 0 ${x2 - radius - radius} ${y1 + radius} L ${x2 - radius - radius} ${y2 - radius} A ${radius} ${radius} 0 0 0 ${x2 - radius} ${y2} L ${x2} ${y2}`;
    } else {
      return `M ${x1} ${y1} L ${midX + radius} ${y1} A ${radius} ${radius} 0 0 0 ${midX} ${y1 + radius} L ${midX} ${y2 - radius} A ${radius} ${radius} 0 0 1 ${midX - radius} ${y2} L ${endX} ${y2}`;
    }
  } else {
    if (x1 + width <= x2) {
      return `M ${x1 + width} ${y1} L ${midX - radius} ${y1} A ${radius} ${radius} 0 0 0 ${midX} ${y1 - radius} L ${midX} ${y2 + radius} A ${radius} ${radius} 0 0 1 ${midX + radius} ${y2} L ${endX} ${y2}`;
    } else if (x1 + width >= x2 && x1 + width <= x2 + width) {
      return `M ${x1} ${y1} L ${x1 - radius - radius} ${y1} A ${radius} ${radius} 0 0 1 ${x1 - radius - radius - radius} ${y1 - radius} L ${x1 - radius - radius - radius} ${y2 + radius} A ${radius} ${radius} 0 0 1 ${x1 - radius - radius} ${y2} L ${endX} ${y2}`;
    } else if (x1 >= x2 && x1 <= x2 + width) {
      return `M ${x1 + width} ${y1} L ${x1 + width + radius} ${y1} A ${radius} ${radius} 0 0 0 ${x1 + width + radius + radius} ${y1 - radius} L ${x1 + width + radius + radius} ${y2 + radius} A ${radius} ${radius} 0 0 0 ${x1 + width + radius} ${y2} L ${x2 + width} ${y2}`;
    } else {
      return `M ${x1} ${y1} L ${midX + radius} ${y1} A ${radius} ${radius} 0 0 1 ${midX} ${y1 - radius} L ${midX} ${y2 + radius} A ${radius} ${radius} 0 0 0 ${midX - radius} ${y2} L ${endX} ${y2}`;
    }
  }
}
