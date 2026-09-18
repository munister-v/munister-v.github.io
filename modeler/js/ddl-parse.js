// Import Oracle DDL: CREATE TABLE, ALTER TABLE ... ADD CONSTRAINT, CREATE INDEX, COMMENT ON
import { newTable, newColumn, uid } from './model.js?v=202609181149';
import { t as tr } from './i18n.js?v=202609181149';

function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  const push = (tok, start, end) => toks.push({ ...tok, pos: start, end });
  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '-' && src[i + 1] === '-') { while (i < n && src[i] !== '\n') i++; continue; }
    if (ch === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (ch === "'") {
      let j = i + 1, v = '';
      while (j < n) {
        if (src[j] === "'" && src[j + 1] === "'") { v += "'"; j += 2; continue; }
        if (src[j] === "'") break;
        v += src[j++];
      }
      push({ t: 'str', v, raw: src.slice(i, j + 1) }, i, j + 1); i = j + 1; continue;
    }
    if (ch === '"') {
      const e = src.indexOf('"', i + 1);
      const end = e < 0 ? n : e + 1;
      const v = src.slice(i + 1, e < 0 ? n : e);
      push({ t: 'id', v, raw: `"${v}"`, quoted: true }, i, end); i = end; continue;
    }
    if (/[\p{L}_$#]/u.test(ch)) {
      let j = i; while (j < n && /[\p{L}\p{N}_$#]/u.test(src[j])) j++;
      const raw = src.slice(i, j);
      push({ t: 'id', v: raw.toUpperCase(), raw }, i, j); i = j; continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i; while (j < n && /[0-9.]/.test(src[j])) j++;
      push({ t: 'num', v: src.slice(i, j), raw: src.slice(i, j) }, i, j); i = j; continue;
    }
    push({ t: 'p', v: ch, raw: ch }, i, i + 1); i++;
  }
  return toks;
}

function splitStatements(toks) {
  const stmts = [];
  let cur = [], depth = 0;
  for (const k of toks) {
    if (k.t === 'p' && k.v === '(') depth++;
    if (k.t === 'p' && k.v === ')') depth--;
    if (k.t === 'p' && (k.v === ';' || (k.v === '/' && depth === 0 && !cur.length)) && depth <= 0) {
      if (cur.length) stmts.push(cur);
      cur = []; depth = 0; continue;
    }
    cur.push(k);
  }
  if (cur.length) stmts.push(cur);
  return stmts;
}

class Cursor {
  constructor(toks) { this.toks = toks; this.i = 0; }
  peek(o = 0) { return this.toks[this.i + o]; }
  next() { return this.toks[this.i++]; }
  eof() { return this.i >= this.toks.length; }
  is(v, o = 0) { const k = this.peek(o); return k && k.v === v && k.t !== 'str' && !k.quoted; }
  accept(...vs) {
    if (vs.every((v, o) => this.is(v, o))) { this.i += vs.length; return true; }
    return false;
  }
  expect(v) { if (!this.accept(v)) throw new Error(tr('w.expected', { a: v, b: this.peek()?.raw ?? tr('w.end') })); }
  // Сбалансированная группа в скобках → массив токенов внутри
  group() {
    this.expect('(');
    const start = this.i; let depth = 1;
    while (!this.eof()) {
      const k = this.next();
      if (k.t === 'p' && k.v === '(') depth++;
      if (k.t === 'p' && k.v === ')' && --depth === 0) return this.toks.slice(start, this.i - 1);
    }
    throw new Error(tr('w.paren'));
  }
  // Имя вида [schema.]name
  qname() {
    const a = this.next();
    if (!a || a.t !== 'id') throw new Error(tr('w.expectedName', { b: a?.raw ?? tr('w.end') }));
    if (this.is('.')) { this.next(); const b = this.next(); return { schema: a.v, name: b.v }; }
    return { schema: '', name: a.v };
  }
}

// Разбить токены по запятым верхнего уровня
function splitCommas(toks) {
  const parts = []; let cur = [], d = 0;
  for (const k of toks) {
    if (k.t === 'p' && k.v === '(') d++;
    if (k.t === 'p' && k.v === ')') d--;
    if (k.t === 'p' && k.v === ',' && d === 0) { parts.push(cur); cur = []; continue; }
    cur.push(k);
  }
  if (cur.length) parts.push(cur);
  return parts;
}

const idList = toks => splitCommas(toks).map(p => p[0]?.v).filter(Boolean);

function joinRaw(toks) {
  let s = '';
  toks.forEach((k, i) => {
    const prev = toks[i - 1];
    const tight = k.v === ')' || k.v === ',' || k.v === '.' || prev?.v === '(' || prev?.v === '.' || (k.v === '(' && prev?.t === 'id');
    s += (i && !tight ? ' ' : '') + k.raw;
  });
  return s.replace(/ ,/g, ',');
}

const COL_STOP = new Set(['AS', 'NOT', 'NULL', 'CONSTRAINT', 'PRIMARY', 'UNIQUE', 'REFERENCES', 'CHECK', 'DEFAULT', 'GENERATED', 'ENABLE', 'DISABLE', 'COLLATE', 'VISIBLE', 'INVISIBLE', 'ENCRYPT', 'SORT']);

function parseType(c) {
  const parts = [];
  while (!c.eof() && !(c.peek().t === 'id' && COL_STOP.has(c.peek().v) && !c.peek().quoted)) {
    const k = c.peek();
    if (k.t === 'p' && k.v === '(') { parts.push({ t: 'p', v: '(', raw: '(' }, ...c.group(), { t: 'p', v: ')', raw: ')' }); continue; }
    parts.push(c.next());
  }
  return joinRaw(parts).toUpperCase().replace(/\s+/g, ' ').replace(/, /g, ',');
}

export function parseDDL(src, existing = { tables: [], fks: [] }) {
  const model = { tables: [...existing.tables], fks: [...existing.fks], sequences: [...(existing.sequences || [])], views: [...(existing.views || [])] };
  // exact source text of a token range (keeps the author's formatting for views and expressions)
  const text = toks => toks.length ? src.slice(toks[0].pos, toks.at(-1).end).trim() : '';
  const warnings = [];
  const pendingFks = [];
  let created = 0;

  const findTable = (q) => model.tables.find(t => t.name === q.name && (!q.schema || !t.schema || t.schema === q.schema));
  const findCol = (t, name) => t.columns.find(c => c.name === name);

  for (const stmt of splitStatements(tokenize(src))) {
    const c = new Cursor(stmt);
    try {
      if (c.accept('CREATE')) {
        c.accept('OR', 'REPLACE');
        c.accept('GLOBAL'); c.accept('PRIVATE'); c.accept('TEMPORARY'); c.accept('SHARDED'); c.accept('DUPLICATED'); c.accept('BLOCKCHAIN'); c.accept('IMMUTABLE');
        if (c.accept('TABLE')) { parseCreateTable(c); continue; }
        if (c.accept('SEQUENCE')) { parseSequence(c); continue; }
        c.accept('NO', 'FORCE'); c.accept('FORCE'); c.accept('EDITIONABLE'); c.accept('NONEDITIONABLE'); c.accept('EDITIONING');
        if (c.accept('VIEW')) { parseView(c, stmt); continue; }
        const unique = c.accept('UNIQUE'); c.accept('BITMAP');
        if (c.accept('INDEX')) { parseIndex(c, unique); continue; }
      } else if (c.accept('ALTER', 'TABLE')) {
        const t = findTable(c.qname());
        if (!t) { warnings.push(tr('w.alterNoTable')); continue; }
        while (c.accept('ADD')) {
          if (c.is('(')) { c.group(); continue; }
          parseConstraint(c, t);
          c.accept(',');
        }
        continue;
      } else if (c.accept('COMMENT', 'ON')) {
        if (c.accept('TABLE')) {
          const q = c.qname(); c.expect('IS');
          const t = findTable(q) || model.views.find(v => v.name === q.name);
          if (t) t.comment = c.next().v;
        } else if (c.accept('COLUMN')) {
          const parts = [c.next().v];
          while (c.accept('.')) parts.push(c.next().v);
          c.expect('IS');
          const colName = parts.pop();
          const t = findTable({ name: parts.pop(), schema: parts.pop() || '' });
          const col = t && findCol(t, colName);
          if (col) col.comment = c.next().v;
        }
        continue;
      }
      const head = stmt.slice(0, 4).map(k => k.raw).join(' ');
      if (!/^(CREATE (OR REPLACE )?(SEQUENCE|VIEW|TRIGGER|SYNONYM|PACKAGE|PROCEDURE|FUNCTION)|DROP|GRANT|PROMPT|SET|INSERT|BEGIN|END)/i.test(head))
        warnings.push(tr('w.skipped', { s: head }));
    } catch (e) {
      warnings.push(tr('w.in', { m: e.message, s: stmt.slice(0, 4).map(k => k.raw).join(' ') }));
    }
  }

  function parseCreateTable(c) {
    const q = c.qname();
    let t = findTable(q);
    if (t) { warnings.push(tr('w.replaced', { t: q.name })); model.tables = model.tables.filter(x => x !== t); model.fks = model.fks.filter(f => f.fromTable !== t.id && f.toTable !== t.id); }
    if (!c.is('(')) { warnings.push(tr('w.noCols', { t: q.name })); return; }
    t = newTable(q.name); t.schema = q.schema;
    model.tables.push(t); created++;
    for (const part of splitCommas(c.group())) {
      const pc = new Cursor(part);
      const first = pc.peek();
      if (!first) continue;
      if (!first.quoted && ['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK', 'SUPPLEMENTAL', 'SCOPE', 'REF'].includes(first.v)) {
        parseConstraint(pc, t); continue;
      }
      const col = newColumn(pc.next().v, '');
      col.type = parseType(pc);
      let pendingName = '';
      t.columns.push(col);
      while (!pc.eof()) {
        if (pc.accept('NOT', 'NULL')) col.nullable = false;
        else if (pc.accept('NULL')) col.nullable = true;
        else if (pc.accept('DEFAULT')) {
          pc.accept('ON', 'NULL');
          const start = pc.i;
          while (!pc.eof() && !(COL_STOP.has(pc.peek().v) && !pc.peek().quoted && pc.peek().t === 'id' && pc.i > start)) {
            if (pc.is('(')) pc.group(); else pc.next();
          }
          col.default = joinRaw(part.slice(start, pc.i));
        } else if (pc.accept('GENERATED')) {
          const save = pc.i;
          if (pc.accept('ALWAYS') && pc.accept('AS') && pc.is('(')) { col.virtual = text(pc.group()); pc.accept('VIRTUAL'); }
          else {
            pc.i = save;
            while (!pc.eof() && !pc.is('IDENTITY')) pc.next();
            pc.accept('IDENTITY'); if (pc.is('(')) pc.group();
            col.identity = true; col.nullable = false;
          }
        } else if (pc.accept('AS') && pc.is('(')) { col.virtual = text(pc.group()); pc.accept('VIRTUAL'); }
        else if (pc.accept('CONSTRAINT')) { pendingName = pc.next().v; continue; }
        else if (pc.accept('PRIMARY', 'KEY')) { col.pk = true; col.nullable = false; }
        else if (pc.accept('UNIQUE')) t.uniques.push({ id: uid('u'), name: `${t.name}_${col.name}_UN`, columns: [col.id] });
        else if (pc.accept('REFERENCES')) {
          const ref = pc.qname();
          const cols = pc.is('(') ? idList(pc.group()) : [];
          pendingFks.push({ t, name: '', fromCols: [col.name], ref, toCols: cols, onDelete: parseOnDelete(pc) });
        } else if (pc.accept('CHECK')) { if (pc.is('(')) addCheck(t, pendingName, text(pc.group())); }
        else if (pc.is('(')) pc.group();
        else pc.next();
        pendingName = '';
      }
      if (!col.type && !col.virtual) col.type = 'VARCHAR2(100 CHAR)';
    }
    // physical options after the column list
    while (!c.eof()) {
      if (c.accept('TABLESPACE')) t.tablespace = c.next().v;
      else if (c.accept('PARTITION', 'BY')) {
        const p = { type: c.next().v, columns: '', interval: '', count: '', definitions: '' };
        if (c.is('(')) p.columns = idList(c.group()).join(', ');
        if (c.accept('INTERVAL') && c.is('(')) p.interval = text(c.group());
        if (c.accept('PARTITIONS')) p.count = c.next().v;
        if (c.accept('STORE', 'IN') && c.is('(')) c.group();
        if (c.is('(')) p.definitions = text(c.group());
        t.partition = p;
      } else if (c.is('(')) c.group();
      else c.next();
    }
  }

  function readNumber(c) {
    const neg = c.accept('-');
    const k = c.next();
    return k ? `${neg ? '-' : ''}${k.v}` : '';
  }

  function parseSequence(c) {
    const q = c.qname();
    model.sequences = model.sequences.filter(x => x.name !== q.name);
    const seq = { id: uid('s'), name: q.name, schema: q.schema, start: '1', increment: '1', minvalue: '', maxvalue: '', cache: '20', cycle: false, order: false, comment: '' };
    while (!c.eof()) {
      if (c.accept('START', 'WITH')) seq.start = readNumber(c);
      else if (c.accept('INCREMENT', 'BY')) seq.increment = readNumber(c);
      else if (c.accept('MINVALUE')) seq.minvalue = readNumber(c);
      else if (c.accept('MAXVALUE')) seq.maxvalue = readNumber(c);
      else if (c.accept('CACHE')) seq.cache = readNumber(c);
      else if (c.accept('NOCACHE')) seq.cache = '0';
      else if (c.accept('CYCLE')) seq.cycle = true;
      else if (c.accept('ORDER')) seq.order = true;
      else c.next();
    }
    model.sequences.push(seq);
    created++;
  }

  function parseView(c, stmt) {
    const q = c.qname();
    if (c.is('(')) c.group();
    while (!c.eof() && !c.is('AS')) c.next();
    c.expect('AS');
    const sql = text(stmt.slice(c.i));
    const old = model.views.find(v => v.name === q.name);
    const view = { id: old?.id || uid('v'), name: q.name, schema: q.schema, sql, comment: old?.comment || '', color: old?.color || '', x: old?.x ?? 0, y: old?.y ?? 0 };
    model.views = model.views.filter(v => v !== old);
    model.views.push(view);
    created++;
  }

  function addCheck(t, name, expr) {
    // SQL Developer exports NOT NULL as CHECK ("COL" IS NOT NULL)
    const nn = expr.match(/^"?([\p{L}_][\p{L}\p{N}_$#]*)"?\s+IS\s+NOT\s+NULL$/iu);
    if (nn) { const col = findCol(t, nn[1].toUpperCase()) || findCol(t, nn[1]); if (col) { col.nullable = false; return; } }
    t.checks ||= [];
    t.checks.push({ id: uid('k'), name: name || `${t.name}_CK_${t.checks.length + 1}`, expr });
  }

  function parseOnDelete(c) {
    if (c.accept('ON', 'DELETE')) {
      if (c.accept('CASCADE')) return 'CASCADE';
      if (c.accept('SET', 'NULL')) return 'SET NULL';
    }
    return '';
  }

  function parseConstraint(c, t) {
    let name = '';
    if (c.accept('CONSTRAINT')) name = c.next().v;
    if (c.accept('PRIMARY', 'KEY')) {
      idList(c.group()).forEach(n => { const col = findCol(t, n); if (col) { col.pk = true; col.nullable = false; } });
      if (name && name !== `${t.name}_PK`) t.pkName = name;
    } else if (c.accept('UNIQUE')) {
      const cols = idList(c.group()).map(n => findCol(t, n)?.id).filter(Boolean);
      t.uniques.push({ id: uid('u'), name: name || `${t.name}_UN_${t.uniques.length + 1}`, columns: cols });
    } else if (c.accept('FOREIGN', 'KEY')) {
      const fromCols = idList(c.group());
      c.expect('REFERENCES');
      const ref = c.qname();
      const toCols = c.is('(') ? idList(c.group()) : [];
      pendingFks.push({ t, name, fromCols, ref, toCols, onDelete: parseOnDelete(c) });
    } else if (c.accept('CHECK')) {
      if (c.is('(')) addCheck(t, name, text(c.group()));
    }
    while (!c.eof() && !c.is('ADD') && !c.is(',')) { if (c.is('(')) c.group(); else c.next(); }
  }

  function parseIndex(c, unique) {
    const ixName = c.qname().name;
    c.expect('ON');
    const t = findTable(c.qname());
    if (!t) { warnings.push(tr('w.idxNoTable', { i: ixName })); return; }
    const cols = splitCommas(c.group()).map(p => findCol(t, p[0]?.v)).filter(Boolean);
    if (!cols.length) { warnings.push(tr('w.idxFunc', { i: ixName })); return; }
    t.indexes.push({ id: uid('i'), name: ixName, unique, columns: cols.map(x => x.id) });
  }

  // FK разрешаем в конце, когда все таблицы известны
  for (const p of pendingFks) {
    const to = findTable(p.ref);
    if (!to) { warnings.push(tr('w.fkNoTable', { f: p.name || p.t.name, t: p.ref.name })); continue; }
    const toCols = p.toCols.length ? p.toCols : to.columns.filter(x => x.pk).map(x => x.name);
    const columns = p.fromCols.map((n, i) => ({ from: findCol(p.t, n)?.id, to: findCol(to, toCols[i])?.id }));
    if (columns.some(x => !x.from || !x.to)) { warnings.push(tr('w.fkNoCols', { f: p.name || p.t.name })); continue; }
    model.fks.push({ id: uid('f'), name: p.name || `${p.t.name}_${to.name}_FK`.toUpperCase(), fromTable: p.t.id, toTable: to.id, columns, onDelete: p.onDelete });
  }

  return { model, warnings, created };
}
