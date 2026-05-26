# @webberproject/schema-viewer

[![npm version](https://img.shields.io/npm/v/@webberproject/schema-viewer)](https://www.npmjs.com/package/@webberproject/schema-viewer)
[![license](https://img.shields.io/npm/l/@webberproject/schema-viewer)](https://github.com/WebberTeam/schema-viewer/blob/master/LICENSE)

Interactive database schema viewer and editor. Renders ER diagrams from JSON schema definitions with zoom, pan, relationship routing, and inline editing.

Derived from [DrawDB](https://github.com/drawdb-io/drawdb) (AGPL-3.0).

## Features

- **Pure SVG rendering** — no Canvas, no WebGL, no heavy graphics libraries
- **Zoom & pan** — mouse wheel zoom, click-drag pan
- **Editor mode** — drag tables (grid-snap), double-click to edit fields/relationships
- **Relationship routing** — Bezier paths with rounded corners, cardinality labels, arrow markers
- **Edge styling** — solid/dashed/dotted lines, color swatches, bold/italic labels
- **Subject areas** — colored grouping boxes that auto-size and move with their tables
- **SQL import** — paste `CREATE TABLE` DDL (PostgreSQL, MySQL, SQLite, MariaDB, MSSQL)
- **Export** — PNG (retina), PDF (auto-sized), JSON
- **Embed** — iframe with URL params + postMessage API
- **Auto-layout** — grid and hierarchical algorithms with intra-group force relaxation
- **Dark & light themes**

## Quick Start

```bash
npm install
npm run dev
```

## Usage

```jsx
import { SchemaViewer, importSQL } from '@webberteam/schema-viewer/src';

// Read-only viewer
<SchemaViewer schema={mySchema} theme="dark" width="100%" height="600px" />

// Editable (drag tables, double-click to edit)
<SchemaViewer schema={mySchema} editable={true} onChange={setSchema} />

// Import from SQL
const schema = importSQL(`
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE);
  CREATE TABLE posts (id SERIAL PRIMARY KEY, author_id INTEGER REFERENCES users(id));
`, 'postgres');
```

## CDN (pre-v1)

GitHub Pages serves the latest `master` build as a CDN at:

```
https://webberteam.github.io/schema-viewer/
```

Every push to `master` triggers an automated build + deploy via GitHub Actions.

### Embed via iframe (CDN)
```html
<iframe
  src="https://webberteam.github.io/schema-viewer/?schema=https://example.com/my-schema.json&theme=dark"
  width="100%" height="600" style="border:none; border-radius:8px;"
/>
```

### Embed via iframe (self-hosted)
```html
<iframe src="/schema-viewer/index.html?schema=/api/schema.json&theme=dark" height="600" />
```

### Load schema dynamically via postMessage
```js
const viewer = document.getElementById('my-viewer');
viewer.contentWindow.postMessage({ type: 'loadSchema', schema: mySchemaJSON }, '*');

// Listen for edits
window.addEventListener('message', (e) => {
  if (e.data?.type === 'schemaChanged') console.log('Updated:', e.data.schema);
});
```

### URL Parameters
| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `schema` | URL | — | Load schema JSON from URL |
| `theme` | `dark` \| `light` | `dark` | Color theme |
| `editable` | `true` \| `false` | `false` | Enable editor mode |
| `title` | string | — | Title bar text |

## Schema Format

Compatible with [DrawDB](https://github.com/drawdb-io/drawdb) JSON export.

```json
{
  "tables": [
    {
      "id": "t1", "name": "users", "x": 100, "y": 100, "color": "#175e7a",
      "fields": [
        { "id": "f1", "name": "id", "type": "SERIAL", "primary": true },
        { "id": "f2", "name": "email", "type": "TEXT", "notNull": true, "unique": true }
      ]
    }
  ],
  "relationships": [
    {
      "id": "r1", "name": "post_author",
      "startTableId": "t2", "startFieldId": "f3",
      "endTableId": "t1", "endFieldId": "f1",
      "cardinality": "many_to_one"
    }
  ],
  "subjectAreas": [
    { "id": 1, "name": "AUTH", "color": "#7c3aed", "tableIds": ["t1"] }
  ]
}
```

## Export

```jsx
import { exportPNG, exportPDF, exportJSON } from '@webberteam/schema-viewer/src';

exportPNG(containerElement);  // Downloads schema.png (2x retina)
exportPDF(containerElement);  // Downloads schema.pdf
exportJSON(schemaObject);     // Downloads schema.json
```

## License

AGPL-3.0-or-later — inherited from [DrawDB](https://github.com/drawdb-io/drawdb).

See [LICENSE](LICENSE) for details.
