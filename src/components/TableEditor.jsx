/**
 * TableEditor — Popup editor for table metadata, fields, and constraints.
 * Appears on double-click. Validates PK/FK/UNIQUE constraints before accepting.
 */
import { useState, useCallback, useMemo } from "react";

export function TableEditor({ table, allTables, relationships, onSave, onClose, colors }) {
  const [name, setName] = useState(table.name);
  const [comment, setComment] = useState(table.comment || "");
  const [color, setColor] = useState(table.color || "#175e7a");
  const [fields, setFields] = useState(() =>
    (table.fields || []).map((f) => ({ ...f }))
  );
  const [errors, setErrors] = useState([]);

  const COLORS = ["#175e7a", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#4f46e5", "#ca8a04", "#e11d48"];

  const updateField = useCallback((idx, key, value) => {
    setFields((prev) => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  }, []);

  const addField = useCallback(() => {
    setFields((prev) => [...prev, {
      id: `f_new_${Date.now()}`,
      name: "",
      type: "TEXT",
      primary: false,
      unique: false,
      notNull: false,
      default: "",
    }]);
  }, []);

  const removeField = useCallback((idx) => {
    const field = fields[idx];
    // Check if this field is referenced by a FK
    const isReferenced = relationships.some(
      (r) => (r.endTableId === table.id && r.endFieldId === field.id) ||
             (r.startTableId === table.id && r.startFieldId === field.id)
    );
    if (isReferenced) {
      setErrors([`Cannot remove "${field.name}" — it is part of a foreign key relationship`]);
      return;
    }
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setErrors([]);
  }, [fields, relationships, table.id]);

  const validate = useCallback(() => {
    const errs = [];

    if (!name.trim()) errs.push("Table name is required");
    if (/\s/.test(name)) errs.push("Table name cannot contain spaces");

    // Check field names
    const names = fields.map((f) => f.name.toLowerCase());
    const dupes = names.filter((n, i) => n && names.indexOf(n) !== i);
    if (dupes.length > 0) errs.push(`Duplicate field names: ${[...new Set(dupes)].join(", ")}`);

    for (const f of fields) {
      if (!f.name.trim()) errs.push("All fields must have a name");
      if (!f.type.trim()) errs.push(`Field "${f.name}" must have a type`);
    }

    // PK constraint: at least one PK if table had one before
    const hadPK = table.fields?.some((f) => f.primary);
    const hasPK = fields.some((f) => f.primary);
    if (hadPK && !hasPK) errs.push("Table must have at least one primary key field");

    // FK integrity: referenced fields must still exist
    for (const rel of relationships) {
      if (rel.startTableId === table.id) {
        const field = fields.find((f) => f.id === rel.startFieldId);
        if (!field) errs.push(`FK field "${rel.name}" references a removed field`);
      }
      if (rel.endTableId === table.id) {
        const field = fields.find((f) => f.id === rel.endFieldId);
        if (!field) errs.push(`FK target "${rel.name}" references a removed field`);
      }
    }

    // UNIQUE fields referenced by FKs must stay unique
    for (const rel of relationships) {
      if (rel.endTableId === table.id && rel.cardinality === "one_to_one") {
        const field = fields.find((f) => f.id === rel.endFieldId);
        if (field && !field.unique && !field.primary) {
          errs.push(`"${field.name}" must be UNIQUE or PK — referenced by one-to-one FK "${rel.name}"`);
        }
      }
    }

    return errs;
  }, [name, fields, relationships, table]);

  const handleSave = () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    onSave({ ...table, name, comment, color, fields });
  };

  return (
    <div style={{
      position: "absolute",
      top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      width: 520, maxHeight: "80vh",
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      boxShadow: "0 16px 48px rgba(0,0,0,.5)",
      zIndex: 100,
      display: "flex", flexDirection: "column",
      fontFamily: "'SF Mono','Cascadia Code','Consolas',monospace",
      fontSize: 12,
      color: colors.text,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 8,
        background: colors.bg,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Edit Table</span>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} style={closeBtnStyle(colors)}>&times;</button>
      </div>

      {/* Body (scrollable) */}
      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        {/* Table name + color */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Table Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(colors)} />
          </div>
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
              {COLORS.map((c) => (
                <div key={c} onClick={() => setColor(c)} style={{
                  width: 18, height: 18, borderRadius: 4, background: c, cursor: "pointer",
                  border: c === color ? "2px solid #fff" : "2px solid transparent",
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Comment */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Comment</label>
          <input value={comment} onChange={(e) => setComment(e.target.value)} style={inputStyle(colors)} placeholder="Optional description..." />
        </div>

        {/* Fields */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Fields</label>
            <button onClick={addField} style={addBtnStyle(colors)}>+ Add Field</button>
          </div>

          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: "hidden" }}>
            {/* Column headers */}
            <div style={{ display: "flex", gap: 0, background: colors.bg, borderBottom: `1px solid ${colors.border}`, padding: "4px 8px", fontSize: 10, color: colors.textDim, fontWeight: 600 }}>
              <span style={{ width: 140 }}>Name</span>
              <span style={{ width: 100 }}>Type</span>
              <span style={{ width: 28, textAlign: "center" }} title="Primary Key">PK</span>
              <span style={{ width: 28, textAlign: "center" }} title="Unique">UQ</span>
              <span style={{ width: 28, textAlign: "center" }} title="Not Null">NN</span>
              <span style={{ flex: 1 }}>Default</span>
              <span style={{ width: 24 }} />
            </div>

            {fields.map((field, idx) => (
              <div key={field.id || idx} style={{
                display: "flex", gap: 0, alignItems: "center", padding: "3px 8px",
                borderBottom: idx < fields.length - 1 ? `1px solid ${colors.border}` : "none",
              }}>
                <input value={field.name} onChange={(e) => updateField(idx, "name", e.target.value)}
                  style={{ ...miniInputStyle(colors), width: 140 }} placeholder="field_name" />
                <input value={field.type} onChange={(e) => updateField(idx, "type", e.target.value)}
                  style={{ ...miniInputStyle(colors), width: 100 }} placeholder="TEXT" />
                <div style={{ width: 28, textAlign: "center" }}>
                  <input type="checkbox" checked={field.primary} onChange={(e) => updateField(idx, "primary", e.target.checked)} />
                </div>
                <div style={{ width: 28, textAlign: "center" }}>
                  <input type="checkbox" checked={field.unique} onChange={(e) => updateField(idx, "unique", e.target.checked)} />
                </div>
                <div style={{ width: 28, textAlign: "center" }}>
                  <input type="checkbox" checked={field.notNull} onChange={(e) => updateField(idx, "notNull", e.target.checked)} />
                </div>
                <input value={field.default || ""} onChange={(e) => updateField(idx, "default", e.target.value)}
                  style={{ ...miniInputStyle(colors), flex: 1 }} placeholder="default" />
                <button onClick={() => removeField(idx)} style={removeBtnStyle(colors)} title="Remove field">&times;</button>
              </div>
            ))}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{
            background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)",
            borderRadius: 6, padding: "8px 12px", marginTop: 8,
          }}>
            {errors.map((e, i) => (
              <div key={i} style={{ color: "#f85149", fontSize: 11 }}>{e}</div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 16px", borderTop: `1px solid ${colors.border}`,
        display: "flex", justifyContent: "flex-end", gap: 8, background: colors.bg,
      }}>
        <button onClick={onClose} style={cancelBtnStyle(colors)}>Cancel</button>
        <button onClick={handleSave} style={saveBtnStyle}>Save</button>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 10, fontWeight: 600, color: "#8b949e", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" };

function inputStyle(c) {
  return { width: "100%", padding: "6px 8px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, color: c.text, fontSize: 12, fontFamily: "inherit", outline: "none" };
}

function miniInputStyle(c) {
  return { padding: "2px 4px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 3, color: c.text, fontSize: 11, fontFamily: "inherit", outline: "none" };
}

function closeBtnStyle(c) {
  return { background: "none", border: "none", color: c.textDim, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 };
}

function addBtnStyle(c) {
  return { marginLeft: "auto", padding: "2px 8px", background: "rgba(56,139,253,.1)", border: `1px solid rgba(56,139,253,.3)`, borderRadius: 4, color: "#58a6ff", fontSize: 10, fontWeight: 600, cursor: "pointer" };
}

function removeBtnStyle(c) {
  return { width: 24, background: "none", border: "none", color: "#f85149", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 };
}

function cancelBtnStyle(c) {
  return { padding: "6px 14px", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 12, cursor: "pointer" };
}

const saveBtnStyle = { padding: "6px 14px", background: "#238636", border: "1px solid #2ea043", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" };
