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

1. ~~**SQL import** — Parse CREATE TABLE DDL into schema JSON~~ DONE
2. ~~**Editor mode** — Drag tables to reposition~~ DONE
3. ~~**Column editing** — Add/remove/reorder fields, edit types, PK/UQ/NN~~ DONE
4. ~~**Export** — PNG, SVG, JSON export of rendered diagrams~~ DONE
5. ~~**Auto-layout** — Hierarchical (FK depth) + grid layout algorithms~~ DONE
6. ~~**Group editor** — Create/edit/delete subject areas, change membership~~ DONE
7. ~~**Relationship editor** — FK CRUD + edge styling (color, dash, bold, arrows)~~ DONE
8. ~~**Embed mode** — iframe + postMessage API for documentation sites~~ DONE
9. ~~**PDF export** — jspdf via html-to-image raster~~ DONE
10. ~~**PNG export** — html-to-image (captures live DOM including foreignObject)~~ DONE
11. **RDF/ontology support** — Extend schema format for OWL classes, RDF properties, ontological hierarchies
12. **SVG export** — Needs proper foreignObject style inlining (deferred)
13. **Force-directed layout** — Physics-based layout for complex schemas

## Attribution

Rendering layer extracted from [DrawDB](https://github.com/drawdb-io/drawdb) by DrawDB contributors. Original codebase licensed under AGPL-3.0.
