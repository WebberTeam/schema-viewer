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
├── index.js                # Library barrel export
├── components/
│   ├── SchemaViewer.jsx    # Root component: SVG container, zoom/pan, grid, editor drag
│   ├── TableNode.jsx       # Table box rendered as foreignObject (draggable in editor mode)
│   ├── RelationshipPath.jsx # SVG path + cardinality badges
│   ├── SubjectArea.jsx     # Colored grouping box
│   └── index.js            # Component barrel export
├── utils/
│   ├── calcPath.js         # Bezier path routing (pure math, 0 deps)
│   └── importSQL.js        # SQL DDL → schema JSON (node-sql-parser)
examples/
└── demo/
    └── src/
        ├── main.jsx        # Demo app with SQL import panel + RDS schema
        └── demo-schema.js  # Sample PostgreSQL entity_resolution schema
```

## Usage

```jsx
import { SchemaViewer, importSQL } from './src';

// Read-only mode (default)
<SchemaViewer schema={jsonSchema} theme="dark" width="100%" height="600px" />

// Editor mode (tables are draggable, snaps to grid)
<SchemaViewer
  schema={jsonSchema}
  theme="dark"
  editable={true}
  onChange={(updated) => setSchema(updated)}
/>

// Import from SQL DDL
const schema = importSQL(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE);
  CREATE TABLE posts (id SERIAL PRIMARY KEY, author_id INTEGER REFERENCES users(id));
`, "postgres");
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

1. ~~**SQL import** — Parse CREATE TABLE DDL into schema JSON~~ DONE (v0.1.0)
2. ~~**Editor mode** — Drag tables to reposition~~ DONE (v0.1.0)
3. **Column editing** — Add/remove/reorder fields, edit types
4. **RDF/ontology support** — Extend schema format to support OWL classes, RDF properties, ontological hierarchies
5. **Export** — PNG, SVG, PDF export of rendered diagrams
6. **Embed mode** — `<iframe>` / Web Component packaging for documentation sites
7. **Auto-layout** — Force-directed or hierarchical graph layout algorithms

## Attribution

Rendering layer extracted from [DrawDB](https://github.com/drawdb-io/drawdb) by DrawDB contributors. Original codebase licensed under AGPL-3.0.
