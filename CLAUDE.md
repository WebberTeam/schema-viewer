# CLAUDE.md — Schema Viewer

## What This Is

A read-only interactive database schema viewer extracted from [DrawDB](https://github.com/drawdb-io/drawdb). Takes a JSON schema definition (tables, fields, relationships, subject areas) and renders an interactive SVG ER diagram in the browser.

**License:** AGPL-3.0-or-later (inherited from DrawDB).

## Stack

- React 19 + Vite 6
- Pure SVG rendering (no graphics library — `<svg>` + `<foreignObject>`)
- html-to-image + jspdf for PNG/PDF export
- node-sql-parser for SQL DDL import
- nanoid for ID generation
- Zero UI framework dependencies (no Semi-UI, no Tailwind)

## Architecture

```
src/
├── index.js                # Library barrel export
├── components/
│   ├── SchemaViewer.jsx    # Root: SVG canvas, zoom/pan, grid, drag, popups, export
│   ├── TableNode.jsx       # Table box (foreignObject HTML, draggable in editor mode)
│   ├── RelationshipPath.jsx # Bezier SVG paths + cardinality badges + arrow markers
│   ├── SubjectArea.jsx     # Auto-sizing group boxes (dashed borders, drag-to-move-all)
│   ├── TableEditor.jsx     # Popup: fields, relationships, group membership, constraints
│   ├── GroupEditor.jsx     # Mini popup: group name, color, delete
│   └── index.js            # Component barrel
├── utils/
│   ├── calcPath.js         # Bezier path routing (pure math, 0 deps, from DrawDB)
│   ├── importSQL.js        # SQL DDL → schema JSON (node-sql-parser)
│   ├── autoLayout.js       # Grid + hierarchical layout + intra-group force relaxation
│   └── exportDiagram.js    # PNG (html-to-image), PDF (jspdf), JSON
examples/
├── demo/src/
│   ├── main.jsx            # Demo app: RDS schema + SQL import panel
│   └── demo-schema.js      # Sample PostgreSQL entity_resolution schema (11 tables)
└── embed/
    ├── index.html          # Embed entry point
    ├── embed.jsx           # Embed app: URL params + postMessage API
    ├── host-page.html      # Host page demo: 3 iframe configurations
    └── sample-schema.json  # Sample blog schema (4 tables)
```

## Usage

### As a React component
```jsx
import { SchemaViewer, importSQL } from './src';

// Read-only
<SchemaViewer schema={jsonSchema} theme="dark" width="100%" height="600px" />

// Editor mode (tables draggable, double-click to edit, constraint validation)
<SchemaViewer
  schema={jsonSchema}
  editable={true}
  onChange={(updated) => setSchema(updated)}
/>

// Import from SQL
const schema = importSQL('CREATE TABLE users (...); CREATE TABLE posts (...);', 'postgres');
```

### As an iframe embed
```html
<!-- Read-only with schema URL -->
<iframe src="embed/index.html?schema=my-schema.json&theme=dark&title=My%20DB" height="600" />

<!-- Editable via postMessage -->
<iframe id="sv" src="embed/index.html?editable=true" height="600" />
<script>
  document.getElementById('sv').contentWindow.postMessage(
    { type: 'loadSchema', schema: mySchemaJSON }, '*'
  );
</script>
```

### Programmatic export
```jsx
import { exportPNG, exportPDF, exportJSON } from './src';
exportPNG(containerElement);   // Downloads schema.png (html-to-image, 2x retina)
exportPDF(containerElement);   // Downloads schema.pdf (auto-sized page)
exportJSON(schemaObject);      // Downloads schema.json
```

## Features

| Feature | Status |
|---------|--------|
| SVG rendering (tables, relationships, subject areas) | Done |
| Zoom (mouse wheel) + pan (drag background) | Done |
| Table drag (grid-snap, z-ordering) | Done |
| Area drag (moves all member tables, preserves internal order) | Done |
| SQL import (PostgreSQL, MySQL, SQLite, MariaDB, MSSQL) | Done |
| Table editor (double-click: fields, types, PK/UQ/NN, defaults) | Done |
| Column reordering (up/down buttons) | Done |
| Relationship editor (FK CRUD, target table/field selection) | Done |
| Edge styling (solid/dashed/dotted, color swatches, bold/italic labels, arrow toggle) | Done |
| Group editor (double-click area: name, color, delete) | Done |
| Group membership (dropdown + create new from table editor) | Done |
| Empty group auto-cull | Done |
| PNG export (html-to-image, captures live DOM) | Done |
| PDF export (jspdf, auto-sized pages) | Done |
| JSON export | Done |
| Embed mode (iframe + postMessage API) | Done |
| Auto-layout: grid (grouped columns) | Done |
| Auto-layout: hierarchical (FK depth) | Done |
| Intra-group force relaxation (overlap separation) | Done |
| Dark + light themes | Done |

## Development

```bash
npm install
npm run dev           # Demo app at http://localhost:5174
npm run build         # Production build to dist/
npm run build:embed   # Embed build to dist-embed/
```

Embed host page demo: `http://localhost:5174/examples/embed/host-page.html`

## Schema JSON Format

Compatible with [DrawDB](https://github.com/drawdb-io/drawdb) export format, plus extensions for edge styling.

See `src/data/demo-schema.js` or `examples/embed/sample-schema.json` for complete examples.

## Roadmap

1. **RDF/ontology support** — OWL classes, RDF properties, ontological hierarchies
2. **SVG export** — Needs proper foreignObject style inlining
3. **Force-directed layout** — Physics-based for complex schemas
4. **Web Component packaging** — `<schema-viewer>` custom element
5. **Undo/redo** — Editor action history

## Attribution

Rendering layer extracted from [DrawDB](https://github.com/drawdb-io/drawdb) by DrawDB contributors (AGPL-3.0).
