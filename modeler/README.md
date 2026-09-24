# Schemata

Schemata is an open-source browser data modeller for **Oracle Database**. Plain HTML5 and ES modules: no build step, no backend. Interface in Ukrainian and English. The only third-party code is [sql.js](https://github.com/sql-js/sql.js) (MIT), vendored in `js/vendor/sqljs/`, which powers the SQL sandbox.

Live: https://munister.com.ua/modeler/

## Features
- Oracle objects beyond tables: sequences (with `DEFAULT seq.NEXTVAL` wiring), views drawn on the diagram with dependency lines, CHECK constraints with ready-made patterns, virtual columns, tablespaces and RANGE / LIST / HASH / interval partitioning — all imported, generated, diffed into migrations and documented
- Migrations: compare the model with a saved version or with DDL exported from the database and get an ordered ALTER script (drops commented out unless enabled) plus a change list with warnings
- Data dictionary export as a standalone HTML page (printable to PDF) or Markdown
- Projects: any number of models in the browser, with search, rename, duplicate, delete, full backup / restore
- Version history: automatic snapshots every 5 minutes, named versions, one-click restore with a safety snapshot
- Debounced autosave with a status bar (saved time, counts, storage used), quota recovery, cross-tab sync
- Offline-capable PWA: a service worker caches the app, and a banner offers new releases
- Responsive layout: usable down to phone width, with an overflow menu for the less-used toolbar actions
- Settings: column types, compact keys-only view, striped rows, snap to grid
- Inline field editing on the diagram: double-click a table to add fields (Enter adds the next one), a field to edit it; types are guessed from names, and `CUSTOMER_ID` automatically becomes a foreign key to `CUSTOMERS`
- Right-click menus for tables, fields and relations: 1:N, 1:1, identifying and M:N (junction table) relations, PK / NOT NULL / unique / index toggles, field types, ordering, ON DELETE
- Crow's-foot notation with optionality circles and one-to-one bars
- Eight ready-made schemas: online store, HR, university, bank, blog/CMS, warehouse, clinic, Oracle Academy OBL Store (1:1, 1:N, M:N) — open or merge into the current model
- Column presets (ID, audit, status, money, contacts, soft delete) and bulk column entry as text
- Model check: missing primary keys, unindexed foreign keys (one-click fix), reserved words, type mismatches, long names, circular FK dependencies, repeating-group columns (1NF), inconsistent primary-key naming (one-click fix)
- SQL sandbox: the model's schema translated to SQLite and run in-browser (sql.js/WASM) — write real SELECT / INSERT / UPDATE against it, click a table or column to insert its name, no backend and no real Oracle involved
- Duplicate / copy / paste tables, context menu, arrow-key nudging, drag-and-drop of `.sql` / `.json` files, PNG export
- ER diagram: tables, columns, primary / unique keys, indexes, foreign keys (crow's foot notation)
- Relations the Oracle Data Modeler way: the parent key is carried into the child table
- Oracle DDL generation: `CREATE TABLE`, identity columns, defaults, constraints, `CREATE INDEX`, `COMMENT ON`, `ON DELETE`
- DDL import (scripts from SQL Developer or `DBMS_METADATA.GET_DDL`)
- JSON model files that diff cleanly in Git, autosave in the browser
- Multiple diagrams per model (subject areas): tabs to split a large schema into focused views, each with its own table set, colour zones, and pan/zoom; marquee and rubber-band selection, drag-to-move zones
- Table list with filter, minimap, command palette (⌘K), table colours, relation highlighting
- Undo / redo, auto layout, SVG export

## Run locally
ES modules do not load over `file://`, so serve the folder with any static server:
```bash
python3 -m http.server 8765
```

## Shortcuts
| Key | Action |
|---|---|
| double-click | new table |
| `⌘K` | command palette |
| `/` | filter tables |
| `V` / `T` / `R` / `F` | select / table / relation mode / fit |
| `⌘D` / `⌘C` / `⌘V` | duplicate / copy / paste table |
| arrows (`⇧` ×5) | move selected table |
| right click | context menu (table, field, relation, canvas) |
| double-click table / field | add field / edit field |
| `Del` | delete selection |
| `⌘Z` / `⌘⇧Z` | undo / redo |
| `⌘S` | save JSON |

## Layout
```
js/model.js      model, undo/redo, autosave
js/diagram.js    SVG diagram, pan/zoom, drag
js/diagrams-ui.js diagram tabs: multiple diagrams (subject areas) per model
js/panel.js      properties panel
js/sidebar.js    table list
js/palette.js    command palette
js/ddl-gen.js    Oracle DDL generator
js/ddl-parse.js  Oracle DDL importer
js/i18n.js       Ukrainian / English strings
js/templates.js  ready-made schemas and column presets
js/checks.js     model validation
js/sqlite-gen.js best-effort model → SQLite DDL translation for the sandbox
js/sandbox.js    sql.js (WASM SQLite) lifecycle: build the sandbox DB, run SQL
js/diff.js       model diff and migration script
js/docs.js       data dictionary (HTML / Markdown)
js/storage.js    projects, snapshots, settings in localStorage
js/workspace.js  projects / history / settings UI, status bar, sync, updates
js/app.js        toolbar, dialogs, wiring
sw.js            service worker (offline, updates)
bump-version.sh  stamps a release version on every import and the service worker
```

## License
MIT
