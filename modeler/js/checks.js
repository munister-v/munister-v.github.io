// Model checks: common Oracle modelling mistakes
import { t } from './i18n.js?v=202609172122';

const RESERVED = new Set('ACCESS ADD ALL ALTER AND ANY AS ASC AUDIT BETWEEN BY CHAR CHECK CLUSTER COLUMN COMMENT COMPRESS CONNECT CREATE CURRENT DATE DECIMAL DEFAULT DELETE DESC DISTINCT DROP ELSE EXCLUSIVE EXISTS FILE FLOAT FOR FROM GRANT GROUP HAVING IDENTIFIED IMMEDIATE IN INCREMENT INDEX INITIAL INSERT INTEGER INTERSECT INTO IS LEVEL LIKE LOCK LONG MAXEXTENTS MINUS MODE MODIFY NOAUDIT NOCOMPRESS NOT NOWAIT NULL NUMBER OF OFFLINE ON ONLINE OPTION OR ORDER PCTFREE PRIOR PUBLIC RAW RENAME RESOURCE REVOKE ROW ROWID ROWNUM ROWS SELECT SESSION SET SHARE SIZE SMALLINT START SUCCESSFUL SYNONYM SYSDATE TABLE THEN TO TRIGGER UID UNION UNIQUE UPDATE USER VALIDATE VALUES VARCHAR VARCHAR2 VIEW WHENEVER WHERE WITH'.split(' '));
const IDENT = /^[A-Z][A-Z0-9_$#]*$/;
const baseType = s => (s || '').replace(/\s*\(.*$/, '').trim();

// level: 'error' | 'warn' | 'info'
export function checkModel(model) {
  const out = [];
  const add = (level, key, params, target) => out.push({ level, text: t(key, params), target });
  const names = new Map();

  for (const tb of model.tables) {
    const T = { kind: 'table', id: tb.id };
    const nm = tb.name.toUpperCase();
    if (names.has(nm)) add('error', 'chk.dupTable', { t: tb.name }, T);
    names.set(nm, tb);
    if (!tb.columns.length) add('error', 'chk.noCols', { t: tb.name }, T);
    else if (!tb.columns.some(c => c.pk)) add('warn', 'chk.noPk', { t: tb.name }, T);
    if (RESERVED.has(nm)) add('error', 'chk.reserved', { n: tb.name }, T);
    else if (!IDENT.test(nm)) add('warn', 'chk.quoted', { n: tb.name }, T);
    if (tb.name.length > 30) add('info', 'chk.long', { n: tb.name }, T);

    const seen = new Set();
    for (const c of tb.columns) {
      const cn = c.name.toUpperCase();
      if (seen.has(cn)) add('error', 'chk.dupCol', { t: tb.name, c: c.name }, T);
      seen.add(cn);
      if (RESERVED.has(cn)) add('error', 'chk.reservedCol', { t: tb.name, c: c.name }, T);
      if (!c.type?.trim()) add('error', 'chk.noType', { t: tb.name, c: c.name }, T);
      if (/^VARCHAR2$/.test(c.type?.trim())) add('error', 'chk.varcharLen', { t: tb.name, c: c.name }, T);
      if (/^(VARCHAR|LONG)\b/.test(c.type || '')) add('info', 'chk.legacyType', { t: tb.name, c: c.name, ty: baseType(c.type) }, T);
      if (c.name.length > 30) add('info', 'chk.long', { n: `${tb.name}.${c.name}` }, T);
    }
    if (!tb.comment) add('info', 'chk.noComment', { t: tb.name }, T);
  }

  const byId = Object.fromEntries(model.tables.map(x => [x.id, x]));
  for (const f of model.fks) {
    const F = { kind: 'fk', id: f.id };
    const from = byId[f.fromTable], to = byId[f.toTable];
    if (!from || !to) continue;
    const pairs = f.columns.map(p => [from.columns.find(c => c.id === p.from), to.columns.find(c => c.id === p.to)]);
    for (const [a, b] of pairs) {
      if (a && b && baseType(a.type) !== baseType(b.type)) add('error', 'chk.fkType', { f: f.name, a: `${from.name}.${a.name}`, b: `${to.name}.${b.name}` }, F);
    }
    // FK columns should lead some index (or the PK / a unique key) to avoid locking on parent deletes
    const cols = f.columns.map(p => p.from);
    const leads = list => cols.every((id, i) => list[i] === id);
    const pk = from.columns.filter(c => c.pk).map(c => c.id);
    const covered = leads(pk) || from.indexes.some(ix => leads(ix.columns)) || from.uniques.some(u => leads(u.columns));
    if (!covered) add('warn', 'chk.fkIndex', { f: f.name, t: from.name }, F);
  }
  for (const tb of model.tables) {
    const T = { kind: 'table', id: tb.id };
    for (const k of tb.checks || []) if (!k.expr?.trim()) add('error', 'chk.emptyCheck', { t: tb.name, n: k.name }, T);
    const p = tb.partition;
    if (p?.type && !p.columns) add('error', 'chk.partKey', { t: tb.name }, T);
    if (p?.type) {
      const missing = p.columns.split(',').map(x => x.trim().toUpperCase()).filter(n => n && !tb.columns.some(c => c.name === n));
      if (missing.length) add('error', 'chk.partCol', { t: tb.name, c: missing.join(', ') }, T);
    }
    for (const c of tb.columns) {
      const m = (c.default || '').match(/^([A-Z0-9_$#]+)\.NEXTVAL$/i);
      if (m && !(model.sequences || []).some(q => q.name.toUpperCase() === m[1].toUpperCase())) add('error', 'chk.seqMissing', { t: tb.name, c: c.name, s: m[1] }, T);
      if (c.virtual && c.pk) add('warn', 'chk.virtualPk', { t: tb.name, c: c.name }, T);
    }
  }
  for (const q of model.sequences || []) {
    const S = { kind: 'seq', id: q.id };
    const used = model.tables.some(tb => tb.columns.some(c => new RegExp(`(^|[^A-Z0-9_$#])${q.name}\\.NEXTVAL`, 'i').test(c.default || '')));
    if (!used) add('info', 'chk.seqUnused', { s: q.name }, S);
    if (+q.increment === 0) add('error', 'chk.seqZero', { s: q.name }, S);
  }
  for (const v of model.views || []) {
    const V = { kind: 'view', id: v.id };
    if (!/^\s*(WITH|SELECT)\b/i.test(v.sql || '')) add('error', 'chk.viewSql', { v: v.name }, V);
    if (/SELECT\s+\*/i.test(v.sql || '')) add('info', 'chk.viewStar', { v: v.name }, V);
  }
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

// Create indexes for every FK that has none
export function fixFkIndexes(model, uid, uniqueName) {
  let n = 0;
  const byId = Object.fromEntries(model.tables.map(x => [x.id, x]));
  for (const f of model.fks) {
    const from = byId[f.fromTable];
    if (!from) continue;
    const cols = f.columns.map(p => p.from);
    const leads = list => cols.every((id, i) => list[i] === id);
    const pk = from.columns.filter(c => c.pk).map(c => c.id);
    if (leads(pk) || from.indexes.some(ix => leads(ix.columns)) || from.uniques.some(u => leads(u.columns))) continue;
    const first = from.columns.find(c => c.id === cols[0]);
    from.indexes.push({ id: uid('i'), name: uniqueName(model, `${from.name}_${first?.name || 'FK'}_IDX`), unique: false, columns: cols });
    n++;
  }
  return n;
}
