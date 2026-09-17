# Schemata

Schemata is an open-source browser data modeller for **Oracle Database**. Plain HTML5 and ES modules: no build step, no dependencies, no backend. Interface in Ukrainian and English.

Live: https://munister.com.ua/modeler/

## Features
- ER diagram: tables, columns, primary / unique keys, indexes, foreign keys (crow's foot notation)
- Relations the Oracle Data Modeler way: the parent key is carried into the child table
- Oracle DDL generation: `CREATE TABLE`, identity columns, defaults, constraints, `CREATE INDEX`, `COMMENT ON`, `ON DELETE`
- DDL import (scripts from SQL Developer or `DBMS_METADATA.GET_DDL`)
- JSON model files that diff cleanly in Git, autosave in the browser
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
| `Del` | delete selection |
| `⌘Z` / `⌘⇧Z` | undo / redo |
| `⌘S` | save JSON |

## Layout
```
js/model.js      model, undo/redo, autosave
js/diagram.js    SVG diagram, pan/zoom, drag
js/panel.js      properties panel
js/sidebar.js    table list
js/palette.js    command palette
js/ddl-gen.js    Oracle DDL generator
js/ddl-parse.js  Oracle DDL importer
js/i18n.js       Ukrainian / English strings
js/app.js        toolbar, dialogs, wiring
```

## License
MIT
