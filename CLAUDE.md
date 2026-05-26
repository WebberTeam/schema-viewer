# CLAUDE.md — Schema Viewer

## What This Is

A read-only interactive database schema viewer extracted from [DrawDB](https://github.com/drawdb-io/drawdb). Takes a JSON schema definition (tables, fields, relationships, subject areas) and renders an interactive SVG ER diagram in the browser.

**License:** AGPL-3.0-or-later (inherited from DrawDB).

## Stack

- React 19 + Vite 6
- Pure SVG rendering (no graphics library)
- Zero external UI dependencies (original DrawDB uses Semi-UI; we stripped it)

## Architecture

```
src/
├── components/
│   ├── SchemaViewer.jsx    # Root component: SVG container, zoom/pan, grid
│   ├── TableNode.jsx       # Table box rendered as foreignObject
│   ├── RelationshipPath.jsx # SVG path + cardinality badges
│   ├── SubjectArea.jsx     # Colored grouping box
│   └── index.js            # Barrel export
├── utils/
│   └── calcPath.js         # Bezier path routing (pure math, 0 deps)
├── data/
│   └── demo-schema.js      # Demo PostgreSQL schema
└── main.jsx                # Demo app entry point
```

## Usage

```jsx
import { SchemaViewer } from './components';

<SchemaViewer
  schema={jsonSchema}     // DrawDB-compatible JSON
  theme="dark"            // "dark" | "light"
  width="100%"
  height="600px"
  showComments={true}
  showCardinality={true}
  showRelationshipLabels={true}
/>
```

## Schema JSON Format

Compatible with DrawDB export format. See `src/data/demo-schema.js` for a complete example.

```json
{
  "tables": [{ "id", "name", "x", "y", "color", "fields": [{ "id", "name", "type", "primary", "notNull", "unique" }] }],
  "relationships": [{ "id", "name", "startTableId", "startFieldId", "endTableId", "endFieldId", "cardinality" }],
  "subjectAreas": [{ "id", "name", "x", "y", "width", "height", "color" }]
}
```

## Development

```bash
npm install
npm run dev     # http://localhost:5174
npm run build   # Production build to dist/
```

## Roadmap

1. **SQL import** — Parse CREATE TABLE DDL into schema JSON (port from DrawDB's node-sql-parser logic)
2. **Editor mode** — Re-enable drag/edit for schema design (optional toggle)
3. **RDF/ontology support** — Extend schema format to support OWL classes, RDF properties, ontological hierarchies
4. **Export** — PNG, SVG, PDF export of rendered diagrams
5. **Embed mode** — `<iframe>` / Web Component packaging for documentation sites

## Attribution

Rendering layer extracted from [DrawDB](https://github.com/drawdb-io/drawdb) by DrawDB contributors. Original codebase licensed under AGPL-3.0.
