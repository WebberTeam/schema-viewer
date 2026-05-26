/**
 * GroupEditor — Mini popup for editing subject area name, color, or deleting.
 * Appears on double-click on a group area border/label.
 * Groups without member tables are auto-removed on save.
 */
import { useState } from "react";
import { nanoid } from "nanoid";

const GROUP_COLORS = [
  "#bc8cff", "#3fb950", "#388bfd", "#d29922", "#f85149",
  "#0891b2", "#7c3aed", "#f778ba", "#059669", "#db6d28",
];

export function GroupEditor({ group, isNew, onSave, onDelete, onClose, colors }) {
  const [name, setName] = useState(group?.name || "New Group");
  const [color, setColor] = useState(group?.color || GROUP_COLORS[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...group,
      id: group?.id ?? `area_${nanoid(6)}`,
      name: name.trim(),
      color,
      tableIds: group?.tableIds || [],
    });
  };

  return (
    <div style={{
      width: 320, background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,.5)",
      fontFamily: "'SF Mono','Cascadia Code','Consolas',monospace", fontSize: 12, color: colors.text,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div data-drag-handle style={{
        padding: "10px 14px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 8, background: colors.bg, cursor: "grab",
      }}>
        <span style={{ opacity: 0.3, fontSize: 10, letterSpacing: 2 }}>&#9776;</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{isNew ? "New Group" : "Edit Group"}</span>
        <span style={{ flex: 1 }} />
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={closeBtn(colors)} data-no-drag>&times;</button>
      </div>

      <div style={{ padding: 14 }}>
        {/* Name */}
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(colors)} autoFocus />
        </div>

        {/* Color */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {GROUP_COLORS.map((c) => (
              <div key={c} onClick={() => setColor(c)} style={{
                width: 22, height: 22, borderRadius: 4, background: c, cursor: "pointer",
                border: c === color ? "2px solid #fff" : "2px solid transparent",
              }} />
            ))}
          </div>
        </div>

        {/* Member count */}
        {group?.tableIds && (
          <div style={{ fontSize: 10, color: colors.textDim, marginBottom: 10 }}>
            {group.tableIds.length} table{group.tableIds.length !== 1 ? "s" : ""} in this group
            {group.tableIds.length === 0 && " — will be removed on save"}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {!isNew && onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(group.id); }} style={deleteBtn}>Delete</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={cancelBtnStyle(colors)}>Cancel</button>
          <button onClick={(e) => { e.stopPropagation(); handleSave(); }} style={saveBtn}>Save</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 10, fontWeight: 600, color: "#8b949e", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" };
function inputStyle(c) { return { width: "100%", padding: "6px 8px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, color: c.text, fontSize: 12, fontFamily: "inherit", outline: "none" }; }
function closeBtn(c) { return { background: "none", border: "none", color: c.textDim, fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1 }; }
function cancelBtnStyle(c) { return { padding: "5px 12px", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 5, color: c.text, fontSize: 11, cursor: "pointer" }; }
const saveBtn = { padding: "5px 12px", background: "#238636", border: "1px solid #2ea043", borderRadius: 5, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" };
const deleteBtn = { padding: "5px 12px", background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)", borderRadius: 5, color: "#f85149", fontSize: 11, fontWeight: 600, cursor: "pointer", marginRight: "auto" };
