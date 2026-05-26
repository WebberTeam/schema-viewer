/**
 * SQL Import SDK — Parse DDL into schema-viewer JSON format.
 * Derived from DrawDB importSQL (AGPL-3.0). Simplified for read-only viewer.
 *
 * Usage:
 *   import { importSQL } from './utils/importSQL';
 *   const schema = importSQL(sqlString, 'postgres');
 */
import { Parser } from "node-sql-parser";
import { nanoid } from "nanoid";
import { tableFieldHeight, tableHeaderHeight, tableColorStripHeight } from "./calcPath";

const TABLE_COLORS = [
  "#175e7a", "#7c3aed", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#4f46e5", "#0d9488", "#ca8a04", "#9333ea",
  "#2563eb", "#16a34a", "#e11d48", "#0284c7", "#7c2d12",
];

/**
 * Parse SQL DDL string into a schema-viewer compatible JSON object.
 *
 * @param {string} sql - DDL string (CREATE TABLE, ALTER TABLE, etc.)
 * @param {string} database - Database dialect: "postgres" | "mysql" | "sqlite" | "mariadb" | "transactsql"
 * @returns {{ tables: Array, relationships: Array, subjectAreas: Array }}
 */
export function importSQL(sql, database = "postgres") {
  const parser = new Parser();
  let ast;
  try {
    ast = parser.astify(sql, { database: dialectMap(database) });
  } catch (err) {
    throw new Error(`SQL parse error: ${err.message}`);
  }

  const statements = Array.isArray(ast) ? ast : [ast];
  const tables = [];
  const relationships = [];
  const enums = [];
  const indices = [];

  for (const stmt of statements) {
    if (!stmt) continue;

    if (stmt.type === "create" && stmt.keyword === "table") {
      parseCreateTable(stmt, tables, relationships, enums, database);
    } else if (stmt.type === "create" && stmt.keyword === "index") {
      indices.push(parseCreateIndex(stmt, tables));
    } else if (stmt.type === "alter") {
      parseAlterTable(stmt, tables, relationships);
    }
  }

  // Apply deferred indices to tables
  for (const idx of indices) {
    if (idx) {
      const table = tables.find((t) => t.name === idx.tableName);
      if (table) {
        table.indices = table.indices || [];
        table.indices.push(idx.index);
        // Mark unique fields
        if (idx.index.unique) {
          for (const fname of idx.index.fields) {
            const field = table.fields.find((f) => f.name === fname);
            if (field) field.unique = true;
          }
        }
      }
    }
  }

  // Re-resolve cardinality now that unique indices are applied
  for (const rel of relationships) {
    const startTable = tables.find((t) => t.id === rel.startTableId);
    if (startTable) {
      const startField = startTable.fields.find((f) => f.id === rel.startFieldId);
      if (startField?.unique || startField?.primary) {
        rel.cardinality = "one_to_one";
      }
    }
  }

  arrangeTables(tables);

  return { tables, relationships, subjectAreas: [] };
}

// ---------------------------------------------------------------------------
// CREATE TABLE
// ---------------------------------------------------------------------------

function parseCreateTable(stmt, tables, relationships, enums, database) {
  const tableName = extractTableName(stmt);
  const table = {
    id: nanoid(),
    name: tableName,
    comment: "",
    color: TABLE_COLORS[tables.length % TABLE_COLORS.length],
    x: 0,
    y: 0,
    fields: [],
    indices: [],
  };

  const defs = stmt.create_definitions || [];
  for (const d of defs) {
    if (d.resource === "column") {
      const field = parseColumn(d, database);
      table.fields.push(field);

      // Inline FOREIGN KEY on column (e.g., role_id INTEGER REFERENCES roles(id))
      if (d.reference_definition) {
        const rel = buildInlineRelationship(
          table, field, d.reference_definition, tables, d
        );
        if (rel) relationships.push(rel);
      }
    } else if (d.resource === "constraint") {
      parseConstraint(d, table, tables, relationships);
    }
  }

  // Table-level comment
  if (stmt.table_options) {
    for (const opt of stmt.table_options) {
      if (opt.keyword === "comment") {
        table.comment = opt.value?.toString() || "";
      }
    }
  }

  tables.push(table);
}

function parseColumn(d, database) {
  const field = {
    id: nanoid(),
    name: extractColumnName(d),
    type: extractType(d),
    default: "",
    comment: "",
    unique: !!d.unique,
    increment: !!d.auto_increment,
    notNull: !!d.nullable, // AST: nullable=true means NOT NULL
    primary: !!d.primary_key,
    size: "",
    check: "",
  };

  // Default value
  if (d.default_val) {
    field.default = extractDefault(d.default_val);
  }

  // Size / precision
  if (d.definition?.length) {
    field.size = d.definition.scale
      ? `${d.definition.length},${d.definition.scale}`
      : `${d.definition.length}`;
  }

  // Column comment
  if (d.comment) {
    field.comment = d.comment.value?.value || d.comment.value || "";
  }

  // Check constraint
  if (d.check) {
    field.check = astToSQL(d.check.definition?.[0]);
  }

  return field;
}

function parseConstraint(d, table, tables, relationships) {
  const ctype = d.constraint_type?.toUpperCase() || "";

  if (ctype === "PRIMARY KEY" || ctype.includes("PRIMARY")) {
    const cols = extractConstraintColumns(d);
    for (const col of cols) {
      const field = table.fields.find((f) => f.name === col);
      if (field) field.primary = true;
    }
  } else if (ctype === "UNIQUE") {
    const cols = extractConstraintColumns(d);
    for (const col of cols) {
      const field = table.fields.find((f) => f.name === col);
      if (field) field.unique = true;
    }
  } else if (ctype === "FOREIGN KEY" || d.reference_definition) {
    parseForeignKey(d, table, tables, relationships);
  }
}

function parseForeignKey(d, table, tables, relationships) {
  const refDef = d.reference_definition;
  if (!refDef) return;

  const startFieldName = extractConstraintColumns(d)[0];
  const endTableName = extractRefTableName(refDef);
  const endFieldName = extractRefColumns(refDef)[0];

  if (!startFieldName || !endTableName || !endFieldName) return;

  const endTable = tables.find((t) => t.name === endTableName);
  if (!endTable) return;

  const startField = table.fields.find((f) => f.name === startFieldName);
  const endField = endTable.fields.find((f) => f.name === endFieldName);
  if (!startField || !endField) return;

  const rel = {
    id: nanoid(),
    name: d.constraint || `fk_${table.name}_${startFieldName}_${endTableName}`,
    startTableId: table.id,
    startFieldId: startField.id,
    endTableId: endTable.id,
    endFieldId: endField.id,
    cardinality: startField.unique || startField.primary ? "one_to_one" : "many_to_one",
    updateConstraint: "No action",
    deleteConstraint: "No action",
  };

  // ON UPDATE / ON DELETE
  if (refDef.on_action) {
    for (const action of refDef.on_action) {
      const val = titleCase(action.value?.value || action.value || "No action");
      if (action.type === "on update") rel.updateConstraint = val;
      else if (action.type === "on delete") rel.deleteConstraint = val;
    }
  }

  relationships.push(rel);
}

/**
 * Build a relationship from an inline column-level REFERENCES clause.
 * e.g.: role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL
 */
function buildInlineRelationship(table, field, refDef, tables, colDef) {
  const endTableName = extractRefTableName(refDef);
  const endFieldName = extractRefColumns(refDef)[0];
  if (!endTableName || !endFieldName) return null;

  const endTable = tables.find((t) => t.name === endTableName);
  if (!endTable) return null;

  const endField = endTable.fields.find((f) => f.name === endFieldName);
  if (!endField) return null;

  const rel = {
    id: nanoid(),
    name: `fk_${table.name}_${field.name}_${endTableName}`,
    startTableId: table.id,
    startFieldId: field.id,
    endTableId: endTable.id,
    endFieldId: endField.id,
    cardinality: field.unique || field.primary ? "one_to_one" : "many_to_one",
    updateConstraint: "No action",
    deleteConstraint: "No action",
  };

  if (refDef.on_action) {
    for (const action of refDef.on_action) {
      const val = titleCase(action.value?.value || action.value || "No action");
      if (action.type === "on update") rel.updateConstraint = val;
      else if (action.type === "on delete") rel.deleteConstraint = val;
    }
  }

  return rel;
}

// ---------------------------------------------------------------------------
// CREATE INDEX
// ---------------------------------------------------------------------------

function parseCreateIndex(stmt, tables) {
  if (!stmt.table || !stmt.index_columns) return null;

  const tableName = stmt.table?.[0]?.table || stmt.table?.table || "";
  const indexName = stmt.index || stmt.index_name || "";
  const isUnique = stmt.index_type === "unique";
  const fields = stmt.index_columns
    .map((c) => c.column?.expr?.value || c.column || "")
    .filter(Boolean);

  return {
    tableName,
    index: {
      id: nanoid(),
      name: indexName,
      unique: isUnique,
      fields,
    },
  };
}

// ---------------------------------------------------------------------------
// ALTER TABLE
// ---------------------------------------------------------------------------

function parseAlterTable(stmt, tables, relationships) {
  const tableName = stmt.table?.[0]?.table || "";
  const table = tables.find((t) => t.name === tableName);
  if (!table) return;

  const exprs = stmt.expr || [];
  for (const expr of exprs) {
    if (expr.action === "add" && expr.resource === "constraint") {
      parseConstraint(expr, table, tables, relationships);
    }
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function arrangeTables(tables) {
  if (tables.length === 0) return;

  const tableWidth = 220;
  const gapX = 54;
  const gapY = 50;
  let maxHeight = -1;
  const half = Math.ceil(tables.length / 2);

  tables.forEach((table, i) => {
    const height =
      table.fields.length * tableFieldHeight +
      tableHeaderHeight +
      tableColorStripHeight;

    if (i < half) {
      table.x = i * tableWidth + (i + 1) * gapX;
      table.y = gapY;
      maxHeight = Math.max(height, maxHeight);
    } else {
      const index = tables.length - i - 1;
      table.x = index * tableWidth + (index + 1) * gapX;
      table.y = maxHeight + 2 * gapY;
    }
  });
}

// ---------------------------------------------------------------------------
// AST Helpers
// ---------------------------------------------------------------------------

function extractTableName(stmt) {
  if (stmt.table?.[0]?.table) return stmt.table[0].table;
  if (typeof stmt.table === "string") return stmt.table;
  return "unknown";
}

function extractColumnName(d) {
  // node-sql-parser has different shapes per dialect
  return (
    d.column?.column?.expr?.value ||
    d.column?.column ||
    d.column?.expr?.value ||
    d.column ||
    "unknown"
  );
}

function extractType(d) {
  const dt = d.definition?.dataType || d.definition?.data_type || "";
  return typeof dt === "string" ? dt.toUpperCase() : "TEXT";
}

function extractDefault(def) {
  const v = def.value;
  if (!v) return "";
  if (v.type === "null") return "NULL";
  if (v.type === "function") {
    const args = v.args?.value?.map((a) => a.value ?? a).join(", ") || "";
    return args ? `${v.name.name || v.name}(${args})` : `${v.name.name || v.name}()`;
  }
  if (v.type === "cast") return v.expr?.value?.toString() || "";
  if (v.type === "single_quote_string" || v.type === "double_quote_string") return `'${v.value}'`;
  return v.value?.toString() || "";
}

function extractConstraintColumns(d) {
  // Try multiple AST shapes
  if (d.definition) {
    if (Array.isArray(d.definition)) {
      return d.definition.map(
        (c) => c.column?.expr?.value || c.column || c
      );
    }
  }
  if (d.columns) {
    return d.columns.map((c) => c.column?.expr?.value || c.column || c);
  }
  return [];
}

function extractRefTableName(refDef) {
  if (refDef.table?.[0]?.table) return refDef.table[0].table;
  if (typeof refDef.table === "string") return refDef.table;
  return "";
}

function extractRefColumns(refDef) {
  if (refDef.definition) {
    return refDef.definition.map(
      (c) => c.column?.expr?.value || c.column || c
    );
  }
  if (refDef.columns) {
    return refDef.columns.map((c) => c.column?.expr?.value || c.column || c);
  }
  return [];
}

function astToSQL(node) {
  if (!node) return "";
  if (node.type === "binary_expr") {
    return `${astToSQL(node.left)} ${node.operator} ${astToSQL(node.right)}`;
  }
  if (node.type === "column_ref") return `"${node.column}"`;
  if (node.type === "function") return `${node.name}(${(node.args?.value || []).map((a) => a.value).join(", ")})`;
  if (typeof node.value === "string") return `'${node.value}'`;
  return node.value?.toString() || "";
}

function titleCase(s) {
  if (!s) return "No action";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function dialectMap(db) {
  const map = {
    postgres: "PostgreSQL",
    postgresql: "PostgreSQL",
    mysql: "MySQL",
    sqlite: "SQLite",
    mariadb: "MariaDB",
    mssql: "TransactSQL",
    transactsql: "TransactSQL",
  };
  return map[db.toLowerCase()] || "PostgreSQL";
}
