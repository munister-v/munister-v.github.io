// Model diff → Oracle migration script (from = what the database has, to = the current model)
import { ident, qname, str, generateDDL, columnDef, tableOptions, sequenceDDL, viewDDL } from './ddl-gen.js?v=202609171817';
import { t as tr } from './i18n.js?v=202609171817';

const U = s => (s || '').toUpperCase();
const norm = s => (s || '').replace(/\s+/g, ' ').trim().toUpperCase();
const colNames = (tb, ids) => ids.map(id => tb.columns.find(c => c.id === id)?.name).filter(Boolean);
const sig = (tb, ids) => colNames(tb, ids).map(U).join(',');
const list = names => names.map(ident).join(', ');

function fkSig(model, f) {
  const from = model.tables.find(x => x.id === f.fromTable), to = model.tables.find(x => x.id === f.toTable);
  if (!from || !to) return null;
  return `${U(from.name)}(${sig(from, f.columns.map(p => p.from))})->${U(to.name)}(${sig(to, f.columns.map(p => p.to))})|${f.onDelete || ''}`;
}

export function diffModels(from, to, { destructive = false } = {}) {
  const changes = [];
  const out = { dropView: [], dropFk: [], dropIdx: [], dropUk: [], dropCk: [], dropPk: [], seq: [], table: [], create: [], addPk: [], addUk: [], addCk: [], addIdx: [], addFk: [], views: [], comments: [], dropTable: [], dropSeq: [] };
  const change = (kind, text, destructiveChange = false) => changes.push({ kind, text, destructive: destructiveChange });
  const emit = (bucket, sql, isDestructive = false) => out[bucket].push(isDestructive && !destructive ? sql.split('\n').map(l => `-- ${l}`).join('\n') : sql);

  const fromT = new Map(from.tables.map(x => [U(x.name), x]));
  const toT = new Map(to.tables.map(x => [U(x.name), x]));

  // ----- tables that only exist in the model: full CREATE (constraints and indexes included) -----
  const created = to.tables.filter(x => !fromT.has(U(x.name)));
  if (created.length) {
    const ddl = generateDDL({ name: to.name, tables: created, fks: [] }).split('\n').slice(4).join('\n').trim();
    out.create.push(ddl);
    created.forEach(x => change('add', tr('mig.addTable', { t: x.name })));
  }

  // ----- dropped tables -----
  for (const x of from.tables) {
    if (toT.has(U(x.name))) continue;
    emit('dropTable', `DROP TABLE ${qname(x)} CASCADE CONSTRAINTS;`, true);
    change('drop', tr('mig.dropTable', { t: x.name }), true);
  }

  // ----- tables in both -----
  for (const b of to.tables) {
    const a = fromT.get(U(b.name));
    if (!a) continue;
    const T = qname(b);
    const aCols = new Map(a.columns.map(c => [U(c.name), c]));
    const bCols = new Map(b.columns.map(c => [U(c.name), c]));

    for (const c of b.columns) {
      const old = aCols.get(U(c.name));
      if (!old) {
        emit('table', `ALTER TABLE ${T} ADD ( ${columnDef(c)} );`);
        change('add', tr('mig.addCol', { t: b.name, c: c.name, ty: c.type }));
        if (!c.nullable && !c.default && !c.identity && !c.virtual) change('warn', tr('mig.nnNoDefault', { t: b.name, c: c.name }));
        if (c.comment) out.comments.push(`COMMENT ON COLUMN ${T}.${ident(c.name)} IS ${str(c.comment)};`);
        continue;
      }
      if (norm(old.virtual) !== norm(c.virtual)) {
        if (old.virtual && c.virtual) emit('table', `ALTER TABLE ${T} MODIFY ( ${ident(c.name)} AS ( ${c.virtual} ) );`);
        else {
          emit('table', `ALTER TABLE ${T} DROP COLUMN ${ident(c.name)};`, true);
          emit('table', `ALTER TABLE ${T} ADD ( ${columnDef(c)} );`);
        }
        change('modify', tr('mig.virtual', { t: b.name, c: c.name }), !(old.virtual && c.virtual));
        continue;
      }
      if (c.virtual) continue;
      const mods = [];
      if (norm(old.type) !== norm(c.type)) { mods.push(c.type); change('modify', tr('mig.type', { t: b.name, c: c.name, a: old.type, b: c.type })); }
      if (!c.identity && norm(old.default) !== norm(c.default)) { mods.push(`DEFAULT ${c.default || 'NULL'}`); change('modify', tr('mig.default', { t: b.name, c: c.name, v: c.default || 'NULL' })); }
      const oldNN = !old.nullable || old.pk, newNN = !c.nullable || c.pk;
      if (oldNN !== newNN) { mods.push(newNN ? 'NOT NULL' : 'NULL'); change('modify', tr(newNN ? 'mig.nn' : 'mig.null', { t: b.name, c: c.name })); }
      if (mods.length) emit('table', `ALTER TABLE ${T} MODIFY ( ${ident(c.name)} ${mods.join(' ')} );`);
      if ((old.comment || '') !== (c.comment || '')) {
        out.comments.push(`COMMENT ON COLUMN ${T}.${ident(c.name)} IS ${str(c.comment || '')};`);
        change('modify', tr('mig.comment', { o: `${b.name}.${c.name}` }));
      }
    }
    for (const c of a.columns) {
      if (bCols.has(U(c.name))) continue;
      emit('table', `ALTER TABLE ${T} DROP COLUMN ${ident(c.name)};`, true);
      change('drop', tr('mig.dropCol', { t: b.name, c: c.name }), true);
    }
    if ((a.comment || '') !== (b.comment || '')) {
      out.comments.push(`COMMENT ON TABLE ${T} IS ${str(b.comment || '')};`);
      change('modify', tr('mig.comment', { o: b.name }));
    }

    // primary key
    const pkA = a.columns.filter(c => c.pk).map(c => U(c.name)).join(','), pkB = b.columns.filter(c => c.pk).map(c => U(c.name)).join(',');
    if (pkA !== pkB) {
      if (pkA) emit('dropPk', `ALTER TABLE ${T} DROP PRIMARY KEY KEEP INDEX;`);
      if (pkB) out.addPk.push(`ALTER TABLE ${T} ADD CONSTRAINT ${ident(b.pkName || `${b.name}_PK`)} PRIMARY KEY ( ${list(b.columns.filter(c => c.pk).map(c => c.name))} );`);
      change('modify', tr('mig.pk', { t: b.name, k: pkB || '—' }));
    }

    // check constraints (by expression)
    const ckA = new Map((a.checks || []).map(k => [norm(k.expr), k])), ckB = new Map((b.checks || []).filter(k => k.expr?.trim()).map(k => [norm(k.expr), k]));
    for (const [k, ck] of ckA) if (!ckB.has(k)) { emit('dropCk', `ALTER TABLE ${T} DROP CONSTRAINT ${ident(ck.name)};`); change('drop', tr('mig.dropCk', { n: ck.name })); }
    for (const [k, ck] of ckB) if (!ckA.has(k)) { out.addCk.push(`ALTER TABLE ${T} ADD CONSTRAINT ${ident(ck.name)} CHECK ( ${ck.expr.trim()} );`); change('add', tr('mig.addCk', { n: ck.name, e: ck.expr.trim() })); }

    // physical options
    if (U(a.tablespace) !== U(b.tablespace) && b.tablespace) {
      emit('table', `ALTER TABLE ${T} MOVE TABLESPACE ${ident(U(b.tablespace))} ONLINE;`);
      change('modify', tr('mig.tablespace', { t: b.name, s: U(b.tablespace) }));
      change('warn', tr('mig.moveWarn', { t: b.name }));
    }
    const partSig = x => x.partition?.type && x.partition.columns ? norm(tableOptions({ partition: x.partition })) : '';
    if (partSig(a) !== partSig(b) && partSig(b)) {
      emit('table', `ALTER TABLE ${T} MODIFY${tableOptions({ partition: b.partition }).replace(/\n/g, ' ')} ONLINE;`);
      change('modify', tr('mig.partition', { t: b.name, p: b.partition.type }));
      change('warn', tr('mig.partWarn'));
    }

    // unique keys (by column signature)
    const ukA = new Map(a.uniques.map(u => [sig(a, u.columns), u])), ukB = new Map(b.uniques.map(u => [sig(b, u.columns), u]));
    for (const [k, u] of ukA) if (k && !ukB.has(k)) { emit('dropUk', `ALTER TABLE ${T} DROP CONSTRAINT ${ident(u.name)};`); change('drop', tr('mig.dropUk', { n: u.name })); }
    for (const [k, u] of ukB) if (k && !ukA.has(k)) { out.addUk.push(`ALTER TABLE ${T} ADD CONSTRAINT ${ident(u.name)} UNIQUE ( ${list(colNames(b, u.columns))} );`); change('add', tr('mig.addUk', { n: u.name })); }

    // indexes (by columns + uniqueness)
    const ixKey = (tb, ix) => `${ix.unique ? 'U' : ''}:${sig(tb, ix.columns)}`;
    const ixA = new Map(a.indexes.map(ix => [ixKey(a, ix), ix])), ixB = new Map(b.indexes.map(ix => [ixKey(b, ix), ix]));
    for (const [k, ix] of ixA) if (!ixB.has(k)) { emit('dropIdx', `DROP INDEX ${ident(ix.name)};`); change('drop', tr('mig.dropIdx', { n: ix.name })); }
    for (const [k, ix] of ixB) if (!ixA.has(k)) { out.addIdx.push(`CREATE ${ix.unique ? 'UNIQUE ' : ''}INDEX ${ident(ix.name)} ON ${T} ( ${list(colNames(b, ix.columns))} );`); change('add', tr('mig.addIdx', { n: ix.name })); }
  }

  // ----- sequences -----
  const seqA = new Map((from.sequences || []).map(q => [U(q.name), q])), seqB = new Map((to.sequences || []).map(q => [U(q.name), q]));
  for (const [n, q] of seqB) {
    const old = seqA.get(n);
    if (!old) { out.seq.push(sequenceDDL(q)); change('add', tr('mig.addSeq', { n: q.name })); continue; }
    const parts = [];
    if (String(old.increment) !== String(q.increment)) parts.push(`INCREMENT BY ${q.increment || 1}`);
    if (String(old.cache) !== String(q.cache)) parts.push(+q.cache > 1 ? `CACHE ${q.cache}` : 'NOCACHE');
    if (!!old.cycle !== !!q.cycle) parts.push(q.cycle ? 'CYCLE' : 'NOCYCLE');
    if (String(old.maxvalue) !== String(q.maxvalue)) parts.push(q.maxvalue ? `MAXVALUE ${q.maxvalue}` : 'NOMAXVALUE');
    if (String(old.minvalue) !== String(q.minvalue)) parts.push(q.minvalue ? `MINVALUE ${q.minvalue}` : 'NOMINVALUE');
    if (String(old.start) !== String(q.start)) parts.push(`RESTART START WITH ${q.start || 1}`);
    if (parts.length) { out.seq.push(`ALTER SEQUENCE ${qname(q)} ${parts.join(' ')};`); change('modify', tr('mig.modSeq', { n: q.name })); }
  }
  for (const [n, q] of seqA) if (!seqB.has(n)) { emit('dropSeq', `DROP SEQUENCE ${qname(q)};`, true); change('drop', tr('mig.dropSeq', { n: q.name }), true); }

  // ----- views: recreated when the query changes -----
  const vA = new Map((from.views || []).map(v => [U(v.name), v])), vB = new Map((to.views || []).map(v => [U(v.name), v]));
  for (const [n, v] of vB) {
    const old = vA.get(n);
    if (!old || norm(old.sql) !== norm(v.sql)) { out.views.push(viewDDL(v)); change(old ? 'modify' : 'add', tr(old ? 'mig.modView' : 'mig.addView', { n: v.name })); }
    if ((old?.comment || '') !== (v.comment || '') && v.comment) out.comments.push(`COMMENT ON TABLE ${qname(v)} IS ${str(v.comment)};`);
  }
  for (const [n, v] of vA) if (!vB.has(n)) { emit('dropView', `DROP VIEW ${qname(v)};`); change('drop', tr('mig.dropView', { n: v.name })); }

  // indexes and comments of freshly created tables are already inside the CREATE block

  // ----- foreign keys (by signature, so renamed tables/ids do not matter) -----
  const fkA = new Map(from.fks.map(f => [fkSig(from, f), f]).filter(([k]) => k));
  const fkB = new Map(to.fks.map(f => [fkSig(to, f), f]).filter(([k]) => k));
  for (const [k, f] of fkA) {
    if (fkB.has(k)) continue;
    const child = from.tables.find(x => x.id === f.fromTable);
    if (!toT.has(U(child.name))) continue; // dropped with the table
    emit('dropFk', `ALTER TABLE ${qname(child)} DROP CONSTRAINT ${ident(f.name)};`);
    change('drop', tr('mig.dropFk', { n: f.name }));
  }
  for (const [k, f] of fkB) {
    if (fkA.has(k)) continue;
    const child = to.tables.find(x => x.id === f.fromTable), parent = to.tables.find(x => x.id === f.toTable);
    out.addFk.push(`ALTER TABLE ${qname(child)} ADD CONSTRAINT ${ident(f.name)} FOREIGN KEY ( ${list(colNames(child, f.columns.map(p => p.from)))} )\n    REFERENCES ${qname(parent)} ( ${list(colNames(parent, f.columns.map(p => p.to)))} )${f.onDelete ? ` ON DELETE ${f.onDelete}` : ''};`);
    change('add', tr('mig.addFk', { n: f.name, a: child.name, b: parent.name }));
  }

  const section = (key, items) => items.length ? [`-- ${tr(key)}`, ...items, ''] : [];
  const sql = [
    `-- ${tr('mig.header')}`,
    `-- ${tr('ddl.model')}: ${to.name}`,
    `-- ${new Date().toISOString()}`,
    ...(changes.some(c => c.destructive) && !destructive ? [`-- ${tr('mig.commented')}`] : []),
    '',
    ...section('mig.sDropViews', out.dropView),
    ...section('mig.sDropFk', out.dropFk),
    ...section('mig.sDropKeys', [...out.dropIdx, ...out.dropUk, ...out.dropCk, ...out.dropPk]),
    ...section('mig.sSeq', out.seq),
    ...section('mig.sCreate', out.create),
    ...section('mig.sAlter', out.table),
    ...section('mig.sKeys', [...out.addPk, ...out.addUk, ...out.addCk, ...out.addIdx]),
    ...section('mig.sFk', out.addFk),
    ...section('mig.sViews', out.views),
    ...section('mig.sComments', out.comments),
    ...section('mig.sDropTables', out.dropTable),
    ...section('mig.sDropSeq', out.dropSeq),
  ].join('\n');

  return { changes, sql: changes.length ? sql : `-- ${tr('mig.none')}\n` };
}
