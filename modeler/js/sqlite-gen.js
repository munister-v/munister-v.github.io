// Best-effort translation of the model into SQLite DDL for the in-browser SQL sandbox.
// SQLite has no sequences, no VARCHAR2/DATE types and no ALTER TABLE ADD CONSTRAINT for
// foreign keys, so this is a separate, simplified generator from ddl-gen.js (real Oracle DDL).

const q = name => `"${String(name).replace(/"/g, '""')}"`;
const baseType = s => (s || '').trim().toUpperCase().split(/[\s(]/)[0];

function sqliteType(oracleType) {
  const b = baseType(oracleType);
  if (b === 'BLOB' || b === 'RAW') return 'BLOB';
  if (['NUMBER', 'INTEGER', 'INT', 'SMALLINT', 'DECIMAL', 'FLOAT', 'BINARY_FLOAT', 'BINARY_DOUBLE', 'BOOLEAN'].includes(b)) return 'NUMERIC';
  return 'TEXT'; // VARCHAR2, CHAR, CLOB, DATE, TIMESTAMP*, INTERVAL*, JSON, XMLTYPE, ROWID, unknown
}

function sqliteDefault(def) {
  if (!def?.trim()) return '';
  const d = def.trim();
  if (/\.NEXTVAL$/i.test(d)) return ''; // no sequences in SQLite; identity/AUTOINCREMENT covers the common case
  if (/^SYS(DATE|TIMESTAMP)$/i.test(d)) return ' DEFAULT CURRENT_TIMESTAMP';
  if (/^CURRENT_(TIMESTAMP|DATE|TIME)$/i.test(d)) return ` DEFAULT ${d.toUpperCase()}`;
  // string / numeric / NULL literals and parenthesised expressions translate as-is; anything
  // else is an Oracle function or bareword SQLite wouldn't recognise either - drop it rather
  // than risk it being silently stored as a literal string.
  if (/^'(?:[^']|'')*'$/.test(d) || /^-?\d+(\.\d+)?$/.test(d) || /^NULL$/i.test(d) || /^\(.*\)$/.test(d)) return ` DEFAULT ${d}`;
  return '';
}

function columnDef(c, isSinglePk) {
  if (c.virtual) return `${q(c.name)} ${sqliteType(c.type)} GENERATED ALWAYS AS (${c.virtual}) VIRTUAL`;
  let s = q(c.name);
  if (isSinglePk) s += ` ${c.identity ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : `${sqliteType(c.type)} PRIMARY KEY`}`;
  else s += ` ${sqliteType(c.type)}`;
  if (!c.nullable || c.pk) s += ' NOT NULL';
  if (!c.pk) s += sqliteDefault(c.default);
  return s;
}

// Returns [{ sql, label }, ...] so the caller can run and report failures statement by statement.
export function sqliteSchema(model) {
  const statements = [{ sql: 'PRAGMA foreign_keys = ON;', label: 'PRAGMA' }];
  const byId = Object.fromEntries(model.tables.map(t => [t.id, t]));
  const col = (t, id) => t.columns.find(c => c.id === id);

  for (const t of model.tables) {
    if (!t.columns.length) continue;
    const pk = t.columns.filter(c => c.pk);
    const singlePkId = pk.length === 1 ? pk[0].id : null;
    const lines = t.columns.map(c => `  ${columnDef(c, c.id === singlePkId)}`);
    if (pk.length > 1) lines.push(`  PRIMARY KEY (${pk.map(c => q(c.name)).join(', ')})`);
    for (const u of t.uniques) {
      const cols = u.columns.map(id => col(t, id)).filter(Boolean);
      if (cols.length) lines.push(`  UNIQUE (${cols.map(c => q(c.name)).join(', ')})`);
    }
    for (const k of t.checks || []) if (k.expr?.trim()) lines.push(`  CHECK (${k.expr.trim()})`);
    for (const f of model.fks) {
      if (f.fromTable !== t.id) continue;
      const to = byId[f.toTable];
      if (!to) continue;
      const fc = f.columns.map(p => col(t, p.from)).filter(Boolean);
      const tc = f.columns.map(p => col(to, p.to)).filter(Boolean);
      if (!fc.length || fc.length !== tc.length) continue;
      lines.push(`  FOREIGN KEY (${fc.map(c => q(c.name)).join(', ')}) REFERENCES ${q(to.name)} (${tc.map(c => q(c.name)).join(', ')})${f.onDelete ? ` ON DELETE ${f.onDelete}` : ''}`);
    }
    statements.push({ sql: `CREATE TABLE ${q(t.name)} (\n${lines.join(',\n')}\n);`, label: t.name });

    for (const ix of t.indexes) {
      const cols = ix.columns.map(id => col(t, id)).filter(Boolean);
      if (!cols.length) continue;
      statements.push({ sql: `CREATE ${ix.unique ? 'UNIQUE ' : ''}INDEX ${q(ix.name)} ON ${q(t.name)} (${cols.map(c => q(c.name)).join(', ')});`, label: ix.name });
    }
  }

  for (const v of model.views || []) {
    const body = (v.sql || '').trim().replace(/;\s*$/, '')
      .replace(/\bNVL\s*\(/gi, 'IFNULL(')
      .replace(/\bSYSDATE\b/gi, 'CURRENT_TIMESTAMP');
    if (!body) continue;
    statements.push({ sql: `CREATE VIEW ${q(v.name)} AS\n${body};`, label: v.name });
  }
  return statements;
}
