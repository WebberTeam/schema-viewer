# @webberteam/schema-viewer

Read-only interactive database schema viewer. Renders ER diagrams from JSON schema definitions with zoom, pan, and relationship routing.

## What it does

Takes a JSON schema definition (tables, fields, relationships, subject areas) and renders an interactive SVG diagram in the browser. No editing — pure visualization.

```jsx
import { SchemaViewer } from '@webberteam/schema-viewer';

<SchemaViewer schema={mySchema} theme="dark" />
```

## Features

- **SVG-based rendering** — no Canvas, no WebGL, no heavy graphics libraries
- **Zoom & pan** — mouse wheel zoom, click-drag pan
- **Relationship routing** — Bezier path routing with rounded corners between table fields
- **Cardinality labels** — 1:1, 1:N, N:M with customizable labels
- **Subject areas** — colored grouping boxes
- **Dark & light themes**
- **Zero edit capability** — read-only by design

## Schema Format

Compatible with [DrawDB](https://github.com/drawdb-io/drawdb) JSON export format.

```json
{
  "database": "postgres",
  "tables": [
    {
      "id": "t1",
      "name": "users",
      "x": 100, "y": 100,
      "color": "#175e7a",
      "fields": [
        { "id": "f1", "name": "id", "type": "INTEGER", "primary": true },
        { "id": "f2", "name": "email", "type": "VARCHAR(255)", "notNull": true, "unique": true }
      ]
    }
  ],
  "relationships": [
    {
      "id": "r1",
      "name": "user_posts",
      "startTableId": "t1", "startFieldId": "f1",
      "endTableId": "t2", "endFieldId": "f3",
      "cardinality": "one_to_many"
    }
  ],
  "subjectAreas": []
}
```

## Attribution

This project is a derivative work of [DrawDB](https://github.com/drawdb-io/drawdb) by the DrawDB contributors. The rendering layer (SVG table boxes, relationship path routing, viewport management) was extracted and stripped to read-only mode. All editor functionality, persistence, import/export, and code editing features were removed.

## License

AGPL-3.0-or-later (inherited from DrawDB)
