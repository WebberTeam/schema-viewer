/**
 * TableEditor — Popup editor for table metadata, fields, relationships, and constraints.
 * Appears on double-click. Validates PK/FK/UNIQUE constraints before accepting.
 * Includes relationship styling (color, line type, label format, arrows).
 */
import { useState, useCallback } from "react";
import { nanoid } from "nanoid";

const COLORS = ["#175e7a", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#4f46e5", "#ca8a04", "#e11d48"];
const EDGE_COLORS = ["", "#8b949e", "#388bfd", "#3fb950", "#d29922", "#f85149", "#bc8cff", "#f778ba"];
const LINE_STYLES = [
  { value: "solid", label: "Solid ───" },
  { value: "dashed", label: "Dashed - - -" },
  { value: "dotted", label: "Dotted ···" },
];
const CARDINALITIES = [
  { value: "one_to_one", label: "1 : 1" },
  { value: "one_to_many", label: "1 : N" },
  { value: "many_to_one", label: "N : 1" },
];

export function TableEditor({ table, allTables, relationships, subjectAreas, initialTab = "fields", onSave, onClose, colors }) {
  const [name, setName] = useState(table.name);
  const [comment, setComment] = useState(table.comment || "");
  const [color, setColor] = useState(table.color || "#175e7a");
  const [fields, setFields] = useState(() => (table.fields || []).map((f) => ({ ...f })));
  const [rels, setRels] = useState(() =>
    relationships
      .filter((r) => r.startTableId === table.id || r.endTableId === table.id)
      .map((r) => ({ ...r }))
  );
  const [errors, setErrors] = useState([]);
  const [tab, setTab] = useState(initialTab);

  // Group membership — editable
  const currentGroupId = subjectAreas?.find((a) => a.tableIds?.includes(table.id))?.id ?? "";
  const [selectedGroupId, setSelectedGroupId] = useState(currentGroupId);
  const group = subjectAreas?.find((a) => a.id === selectedGroupId) || null;

  const updateField = useCallback((idx, key, value) => {
    setFields((prev) => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  }, []);

  const addField = useCallback(() => {
    setFields((prev) => [...prev, {
      id: `f_${nanoid(8)}`, name: "", type: "TEXT",
      primary: false, unique: false, notNull: false, default: "",
    }]);
  }, []);

  const removeField = useCallback((idx) => {
    const field = fields[idx];
    const isReferenced = rels.some(
      (r) => (r.endTableId === table.id && r.endFieldId === field.id) ||
             (r.startTableId === table.id && r.startFieldId === field.id)
    );
    if (isReferenced) {
      setErrors([`Cannot remove "${field.name}" — part of a foreign key`]);
      return;
    }
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setErrors([]);
  }, [fields, rels, table.id]);

  const updateRel = useCallback((idx, key, value) => {
    setRels((prev) => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  }, []);

  const addRelationship = useCallback(() => {
    const otherTables = allTables.filter((t) => t.id !== table.id && t.fields?.length > 0);
    if (otherTables.length === 0) return;
    const target = otherTables[0];
    const sourceField = fields.find((f) => f.primary) || fields[0];
    const targetField = target.fields.find((f) => f.primary) || target.fields[0];
    if (!sourceField || !targetField) return;

    setRels((prev) => [...prev, {
      id: nanoid(), name: `fk_${table.name}_${sourceField.name}`,
      startTableId: table.id, startFieldId: sourceField.id,
      endTableId: target.id, endFieldId: targetField.id,
      cardinality: "many_to_one",
      strokeStyle: "solid", strokeColor: "", labelBold: false, labelItalic: false,
      showArrow: true,
    }]);
  }, [allTables, table, fields]);

  const removeRel = useCallback((idx) => {
    setRels((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const validate = useCallback(() => {
    const errs = [];
    if (!name.trim()) errs.push("Table name is required");
    if (/\s/.test(name)) errs.push("Table name cannot contain spaces");
    const names = fields.map((f) => f.name.toLowerCase());
    const dupes = names.filter((n, i) => n && names.indexOf(n) !== i);
    if (dupes.length > 0) errs.push(`Duplicate field names: ${[...new Set(dupes)].join(", ")}`);
    for (const f of fields) {
      if (!f.name.trim()) errs.push("All fields must have a name");
      if (!f.type.trim()) errs.push(`Field "${f.name}" must have a type`);
    }
    const hadPK = table.fields?.some((f) => f.primary);
    const hasPK = fields.some((f) => f.primary);
    if (hadPK && !hasPK) errs.push("Table must retain at least one primary key");
    for (const rel of rels) {
      if (rel.startTableId === table.id) {
        if (!fields.find((f) => f.id === rel.startFieldId)) errs.push(`FK "${rel.name}" references removed field`);
      }
      if (rel.endTableId === table.id) {
        if (!fields.find((f) => f.id === rel.endFieldId)) errs.push(`FK target "${rel.name}" references removed field`);
      }
    }
    return errs;
  }, [name, fields, rels, table]);

  const handleSave = () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    onSave(
      { ...table, name, comment, color, fields },
      rels,
      { groupId: selectedGroupId || null, prevGroupId: currentGroupId || null },
    );
  };

  // Helper: get table name by id
  const tn = (id) => allTables.find((t) => t.id === id)?.name || "?";
  // Helper: get field name by id from a table
  const fn = (tableId, fieldId) => {
    const t = allTables.find((t) => t.id === tableId);
    return t?.fields?.find((f) => f.id === fieldId)?.name || "?";
  };

  return (
    <div style={{
      width: 580, maxHeight: "75vh", background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: 10, boxShadow: "0 16px 48px rgba(0,0,0,.5)",
      display: "flex", flexDirection: "column",
      fontFamily: "'SF Mono','Cascadia Code','Consolas',monospace", fontSize: 12, color: colors.text,
      overflow: "hidden",
    }}>
      {/* Header — drag handle */}
      <div data-drag-handle style={{ padding: "12px 16px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: 8, background: colors.bg, cursor: "grab" }}>
        <span style={{ opacity: 0.3, fontSize: 10, letterSpacing: 2 }}>&#9776;</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Edit Table</span>
        {group && (
          <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: `${group.color}20`, color: group.color, border: `1px solid ${group.color}40` }}>
            {group.name}
          </span>
        )}
        {!group && subjectAreas?.length > 0 && (
          <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, color: colors.textDim, border: `1px solid ${colors.border}` }}>
            ungrouped
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={closeBtnStyle(colors)} data-no-drag>&times;</button>
      </div>

      {/* Body */}
      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        {/* Name + color */}
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

        {/* Group membership */}
        {subjectAreas && subjectAreas.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Group</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value === "" ? "" : Number(e.target.value) || e.target.value)}
                style={{ ...inputStyle(colors), flex: 1 }}
              >
                <option value="">No group (ungrouped)</option>
                {subjectAreas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {group && (
                <div style={{ width: 18, height: 18, borderRadius: 4, background: group.color, border: `1px solid ${colors.border}`, flexShrink: 0 }} />
              )}
            </div>
          </div>
        )}

        {/* Tab toggle */}
        <div style={{ display: "flex", gap: 2, background: colors.bg, borderRadius: 6, padding: 2, marginBottom: 12 }}>
          <button onClick={() => setTab("fields")} style={tabBtn(tab === "fields", colors)}>Fields ({fields.length})</button>
          <button onClick={() => setTab("relationships")} style={tabBtn(tab === "relationships", colors)}>Relationships ({rels.length})</button>
        </div>

        {/* Fields tab */}
        {tab === "fields" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Fields</label>
              <button onClick={addField} style={addBtnStyle()}>+ Add Field</button>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ display: "flex", background: colors.bg, borderBottom: `1px solid ${colors.border}`, padding: "4px 8px", fontSize: 10, color: colors.textDim, fontWeight: 600 }}>
                <span style={{ width: 130 }}>Name</span>
                <span style={{ width: 90 }}>Type</span>
                <span style={{ width: 28, textAlign: "center" }}>PK</span>
                <span style={{ width: 28, textAlign: "center" }}>UQ</span>
                <span style={{ width: 28, textAlign: "center" }}>NN</span>
                <span style={{ flex: 1 }}>Default</span>
                <span style={{ width: 24 }} />
              </div>
              {fields.map((field, idx) => (
                <div key={field.id || idx} style={{ display: "flex", alignItems: "center", padding: "3px 8px", borderBottom: idx < fields.length - 1 ? `1px solid ${colors.border}` : "none" }}>
                  <input value={field.name} onChange={(e) => updateField(idx, "name", e.target.value)} style={{ ...miniInput(colors), width: 130 }} placeholder="field_name" />
                  <input value={field.type} onChange={(e) => updateField(idx, "type", e.target.value)} style={{ ...miniInput(colors), width: 90 }} placeholder="TEXT" />
                  <Chk checked={field.primary} onChange={(v) => updateField(idx, "primary", v)} />
                  <Chk checked={field.unique} onChange={(v) => updateField(idx, "unique", v)} />
                  <Chk checked={field.notNull} onChange={(v) => updateField(idx, "notNull", v)} />
                  <input value={field.default || ""} onChange={(e) => updateField(idx, "default", e.target.value)} style={{ ...miniInput(colors), flex: 1 }} placeholder="default" />
                  <button onClick={() => removeField(idx)} style={rmBtn()}>&times;</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationships tab */}
        {tab === "relationships" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Relationships</label>
              <button onClick={addRelationship} style={addBtnStyle()}>+ Add FK</button>
            </div>

            {rels.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: colors.textDim, fontSize: 11 }}>No relationships on this table</div>
            )}

            {rels.map((rel, idx) => {
              const isSource = rel.startTableId === table.id;
              const otherTableId = isSource ? rel.endTableId : rel.startTableId;
              const otherTable = allTables.find((t) => t.id === otherTableId);

              return (
                <div key={rel.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: 10, marginBottom: 8, background: colors.bg }}>
                  {/* Row 1: Name + cardinality + delete */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <input value={rel.name || ""} onChange={(e) => updateRel(idx, "name", e.target.value)} style={{ ...miniInput(colors), flex: 1 }} placeholder="Relationship name" />
                    <select value={rel.cardinality} onChange={(e) => updateRel(idx, "cardinality", e.target.value)} style={selectStyle(colors)}>
                      {CARDINALITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <button onClick={() => removeRel(idx)} style={rmBtn()}>&times;</button>
                  </div>

                  {/* Row 2: Source field → Target table.field (both sides mutable) */}
                  <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 6, fontSize: 11, flexWrap: "wrap" }}>
                    <span style={{ color: colors.textDim, fontSize: 9, width: 32 }}>{isSource ? "from" : "to"}</span>
                    <select value={isSource ? rel.startFieldId : rel.endFieldId}
                      onChange={(e) => updateRel(idx, isSource ? "startFieldId" : "endFieldId", e.target.value)}
                      style={selectStyle(colors)}>
                      {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <span style={{ color: colors.textDim }}>&rarr;</span>
                    <select value={otherTableId}
                      onChange={(e) => {
                        const newTargetId = e.target.value;
                        const newTarget = allTables.find((t) => t.id === newTargetId);
                        const firstField = newTarget?.fields?.[0];
                        if (isSource) {
                          updateRel(idx, "endTableId", newTargetId);
                          if (firstField) updateRel(idx, "endFieldId", firstField.id);
                        } else {
                          updateRel(idx, "startTableId", newTargetId);
                          if (firstField) updateRel(idx, "startFieldId", firstField.id);
                        }
                      }}
                      style={selectStyle(colors)}>
                      {allTables.filter((t) => t.id !== table.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <span style={{ color: colors.textDim }}>.</span>
                    <select value={isSource ? rel.endFieldId : rel.startFieldId}
                      onChange={(e) => updateRel(idx, isSource ? "endFieldId" : "startFieldId", e.target.value)}
                      style={selectStyle(colors)}>
                      {(otherTable?.fields || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>

                  {/* Row 3: Styling — line type, color, label format, arrow */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <select value={rel.strokeStyle || "solid"} onChange={(e) => updateRel(idx, "strokeStyle", e.target.value)} style={selectStyle(colors)} title="Line style">
                      {LINE_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    {/* Edge color swatches */}
                    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                      {EDGE_COLORS.map((c, ci) => (
                        <div key={ci} onClick={() => updateRel(idx, "strokeColor", c)} style={{
                          width: 14, height: 14, borderRadius: 3, cursor: "pointer",
                          background: c || colors.relationship,
                          border: (rel.strokeColor || "") === c ? "2px solid #fff" : "1px solid " + colors.border,
                        }} title={c || "Default"} />
                      ))}
                    </div>

                    <span style={{ width: 1, height: 16, background: colors.border }} />

                    {/* Label formatting */}
                    <button onClick={() => updateRel(idx, "labelBold", !rel.labelBold)}
                      style={{ ...fmtBtn(colors), fontWeight: 700, background: rel.labelBold ? "rgba(56,139,253,.2)" : "transparent" }} title="Bold label">B</button>
                    <button onClick={() => updateRel(idx, "labelItalic", !rel.labelItalic)}
                      style={{ ...fmtBtn(colors), fontStyle: "italic", background: rel.labelItalic ? "rgba(56,139,253,.2)" : "transparent" }} title="Italic label">I</button>

                    <span style={{ width: 1, height: 16, background: colors.border }} />

                    {/* Arrow toggle */}
                    <button onClick={() => updateRel(idx, "showArrow", !(rel.showArrow ?? true))}
                      style={{ ...fmtBtn(colors), background: (rel.showArrow ?? true) ? "rgba(56,139,253,.2)" : "transparent" }} title="Show arrow">&#x2192;</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{ background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)", borderRadius: 6, padding: "8px 12px", marginTop: 8 }}>
            {errors.map((e, i) => <div key={i} style={{ color: "#f85149", fontSize: 11 }}>{e}</div>)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${colors.border}`, display: "flex", justifyContent: "flex-end", gap: 8, background: colors.bg }}>
        <button onClick={onClose} style={cancelBtn(colors)}>Cancel</button>
        <button onClick={handleSave} style={saveBtn}>Save</button>
      </div>
    </div>
  );
}

// --- Tiny helpers ---
function Chk({ checked, onChange }) {
  return <div style={{ width: 28, textAlign: "center" }}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /></div>;
}

const labelStyle = { fontSize: 10, fontWeight: 600, color: "#8b949e", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" };
function inputStyle(c) { return { width: "100%", padding: "6px 8px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, color: c.text, fontSize: 12, fontFamily: "inherit", outline: "none" }; }
function miniInput(c) { return { padding: "2px 4px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 3, color: c.text, fontSize: 11, fontFamily: "inherit", outline: "none" }; }
function selectStyle(c) { return { padding: "2px 4px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 3, color: c.text, fontSize: 10, fontFamily: "inherit", outline: "none" }; }
function closeBtnStyle(c) { return { background: "none", border: "none", color: c.textDim, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }; }
function addBtnStyle() { return { marginLeft: "auto", padding: "2px 8px", background: "rgba(56,139,253,.1)", border: "1px solid rgba(56,139,253,.3)", borderRadius: 4, color: "#58a6ff", fontSize: 10, fontWeight: 600, cursor: "pointer" }; }
function rmBtn() { return { width: 24, background: "none", border: "none", color: "#f85149", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }; }
function fmtBtn(c) { return { width: 24, height: 24, border: `1px solid ${c.border}`, borderRadius: 3, color: c.text, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }; }
function tabBtn(active, c) { return { padding: "4px 12px", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 500, cursor: "pointer", background: active ? "#388bfd" : "transparent", color: active ? "#fff" : "#8b949e" }; }
function cancelBtn(c) { return { padding: "6px 14px", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 12, cursor: "pointer" }; }
const saveBtn = { padding: "6px 14px", background: "#238636", border: "1px solid #2ea043", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" };
