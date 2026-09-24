// Model from text: entities, attributes and relations written as plain sentences
// (Ukrainian or English) become a physical Oracle model.
//
//   Клієнт: # код, * ім'я, прізвище, email [унікальний], дата народження
//   Замовлення: дата!, сума, статус, клієнт!      ← an attribute named after an entity is a relation
//   Кожне замовлення належить одному клієнту       ← N:1
//   Замовлення *-* Товар                           ← M:N through a junction table
//
// Barker notation from Oracle Academy works too: # identifier, * mandatory, o optional.
import { newTable, newColumn, uid, uniqueName, emptyModel } from './model.js?v=202609241405';
import { physName, isLogical, singular, plural, applyInference, toPhysical, safeColumnName } from './autodef.js?v=202609241405';

const TYPE_RE = /\s+((?:N?VARCHAR2|N?CHAR|RAW|NUMBER|FLOAT|TIMESTAMP)(?:\s*\([^)]*\))?(?:\s+WITH(?:\s+LOCAL)?\s+TIME\s+ZONE)?|INTEGER|DATE|CLOB|NCLOB|BLOB|JSON|BOOLEAN|BINARY_(?:FLOAT|DOUBLE)|XMLTYPE)\s*$/; // upper case only: "birth date" is a name, "born DATE" is a type
// \b only knows ASCII letters, so word edges are spelled out for Cyrillic
const w = alts => `(?<![\\p{L}\\d])(?:${alts})(?![\\p{L}\\d])`;
const rx = (src, f = 'iu') => new RegExp(src, f);
const MANDATORY = rx(`\\s*(?:!|\\(?${w("обов['’ʼ]?язков\\p{L}*|required|mandatory")}\\)?)\\s*`, 'giu');
const LEAD = rx(`^${w('кожн\\p{L}*|every|each|один|одна|одне|одному|одного|одній|one|a|an|the')}\\s+`);
// relations, most specific first. dir: 'ab' — A is the child (holds the FK), 'ba' — B is the child
const RELS = [
  { kind: 'mn', re: rx(`^(.+?)\\s*(?:\\*\\s*-\\s*\\*|<->|↔|${w('m\\s*:\\s*n|n\\s*:\\s*m|багато[- ]до[- ]багатьох|many[- ]to[- ]many')})\\s*(.+)$`) },
  { kind: '11', dir: 'ab', re: rx(`^(.+?)\\s*(?:${w('1\\s*:\\s*1|1-1|один[- ]до[- ]одного|one[- ]to[- ]one')})\\s*(.+)$`) },
  { kind: '1n', dir: 'ba', re: rx(`^(.+?)\\s*(?:<-|←|-<|${w('1\\s*:\\s*n|1-n|має\\s+(?:багато|кілька|декілька|безліч)|містить\\s+(?:багато|кілька)|has\\s+(?:many|several)|one[- ]to[- ]many')})\\s*(.+)$`) },
  { kind: '1n', dir: 'ab', re: rx(`^(.+?)\\s*(?:->|→|=>|${w("n\\s*:\\s*1|належить(?:\\s+до)?|відноситься\\s+до|посилається\\s+на|привʼязан\\p{L}*\\s+до|прив['’]язан\\p{L}*\\s+до|belongs\\s+to|references|refers\\s+to|many[- ]to[- ]one")})\\s*(.+)$`) },
];
// the same relation words with one side missing ("Замовлення належить") — reported, not turned into a table
const HALF_RELS = RELS.map(r => new RegExp(r.re.source.replace('^(.+?)', '^(.*?)').replace('(.+)$', '(.*)$'), r.re.flags));
const ENTITY = [/^([^:(]+?)\s*[:(]\s*(.*?)\)?\s*\.?$/, /^(.+?)\s+(?:має|містить|включає|складається\s+з|has|contains|with)\s+(.+?)\.?$/i];

const clean = s => s.replace(MANDATORY, ' ').replace(LEAD, '').replace(/[.;]+$/, '').replace(/\s+/g, ' ').trim();
const stem = w => w.slice(0, Math.max(3, w.length - 2));
// "клієнту" ~ "Клієнт", "товари" ~ "Товар", "orders" ~ "Order": word by word, tolerant to case endings
function sameName(a, b) {
  const pa = physName(a), pb = physName(b);
  if (!pa || !pb) return false;
  if (pa === pb || singular(pa) === singular(pb) || plural(pa) === pb || plural(pb) === pa) return true;
  const wa = a.toLowerCase().split(/[\s_]+/).filter(Boolean), wb = b.toLowerCase().split(/[\s_]+/).filter(Boolean);
  // a case ending changes a word by a few letters at most: "видача" must not match "видавництво"
  return wa.length === wb.length && wa.every((w, i) => Math.abs(w.length - wb[i].length) <= 3 && (w.startsWith(stem(wb[i])) || wb[i].startsWith(stem(w))));
}

// text → { entities: [{ raw, attrs: [{ raw, pk, nn, optional, unique, type }] }], rels: [{ a, b, kind, nn, line }], issues }
export function parseText(text) {
  const entities = [], rels = [], issues = [], lineOwner = new Map();
  const entity = raw => {
    let e = entities.find(x => sameName(x.raw, raw));
    if (!e) { e = { raw, attrs: [], lines: [] }; entities.push(e); }
    return e;
  };
  // one statement per line; pasted paragraphs are split on sentence ends too
  // "# Інтернет-магазин" on the first line names the model
  const title = (text.match(/^\s*#\s+([^#\n]{2,60})$/m) || [])[1]?.trim() || '';
  const lines = text.split('\n').flatMap((l, i) => l.split(/\.\s+(?=\p{Lu})/u).map(s => ({ s: s.trim(), n: i + 1 })));
  for (const { s, n } of lines) {
    if (!s || /^(#\s|\/\/|--)/.test(s)) continue;
    const rel = RELS.find(r => r.re.test(s));
    if (rel) {
      const [, x, y] = s.match(rel.re);
      const nn = /!|обов['’ʼ]?язков|required|mandatory/iu.test(s);
      const [a, b] = [clean(x), clean(y)];
      if (!a || !b) { issues.push({ line: n, key: 'tm.e.rel' }); continue; }
      const [child, parent] = rel.dir === 'ba' ? [b, a] : [a, b];
      rels.push({ a: entity(child).raw, b: entity(parent).raw, kind: rel.kind, nn, line: n });
      lineOwner.set(n, child);
      continue;
    }
    if (!/[:(]/.test(s) && HALF_RELS.some(re => re.test(s))) { issues.push({ line: n, key: 'tm.e.rel' }); continue; }
    const m = ENTITY.map(re => s.match(re)).find(Boolean);
    const name = clean(m ? m[1] : s);
    if (!name || !physName(name)) { issues.push({ line: n, key: 'tm.e.name' }); continue; }
    const e = entity(name);
    lineOwner.set(n, e.raw);
    if (!m) continue;
    for (let part of m[2].split(/\s*[,;]\s*|\s+(?:і|й|та|and)\s+/i)) {
      part = part.trim();
      if (!part) continue;
      const a = { raw: '', pk: false, nn: false, optional: false, unique: false, type: '' };
      // Barker: # unique identifier, * mandatory, o optional
      const lead = part.match(/^(#|\*|o|○)\s+/i) || part.match(/^(#|\*)/);
      if (lead) { if (lead[1] === '#') a.pk = true; else if (lead[1] === '*') a.nn = true; else a.optional = true; part = part.slice(lead[0].length); }
      part = part.replace(/\[([^\]]*)\]|\(([^)]*)\)/g, (_, x = '', y = '') => {
        const f = (x || y).toLowerCase();
        if (/pk|ключ|ідентиф|\bid\b|key/.test(f)) a.pk = true;
        if (/uniq|унікальн|uq/.test(f)) a.unique = true;
        if (/обов|required|not null|nn/.test(f)) a.nn = true;
        return ' ';
      });
      if (/!\s*$/.test(part)) { a.nn = true; part = part.replace(/!\s*$/, ''); }
      if (/\?\s*$/.test(part)) { a.optional = true; part = part.replace(/\?\s*$/, ''); }
      const ty = part.match(TYPE_RE);
      if (ty) { a.type = ty[1].toUpperCase().replace(/\s+/g, ' '); part = part.slice(0, ty.index); }
      a.raw = part.replace(/\s+/g, ' ').trim();
      if (a.raw && physName(a.raw)) e.attrs.push(a);
    }
  }
  // an attribute named after another entity is a relation to it ("Замовлення: клієнт!")
  for (const e of entities) {
    e.attrs = e.attrs.filter(a => {
      const target = !a.type && !a.pk && entities.find(x => x !== e && sameName(x.raw, a.raw));
      if (!target) return true;
      rels.push({ a: e.raw, b: target.raw, kind: '1n', nn: a.nn, fromAttr: true });
      return false;
    });
  }
  return { title, entities, rels, issues, lineOwner };
}

// parsed text → tables/fks added to `base` (a model; a copy of the current one when merging).
// Entities that match an existing table extend it instead of creating a duplicate.
export function buildModel(parsed, { base = emptyModel(), steps = null, t = k => k } = {}) {
  const m = base;
  const created = [], extended = new Set(), notes = [];
  const byRaw = new Map();
  const before = new Map(m.tables.map(x => [x.id, JSON.stringify(x)]));
  for (const e of parsed.entities) {
    const name = physName(e.raw);
    let tb = m.tables.find(x => sameName(x.name, name) || (x.comment && sameName(x.comment, e.raw)));
    if (tb) extended.add(tb.id);
    else {
      let nm = name, i = 2;
      while (m.tables.some(x => x.name === nm)) nm = `${name}_${i++}`;
      tb = newTable(nm);
      if (isLogical(e.raw) || e.raw !== nm) tb.comment = e.raw.charAt(0).toUpperCase() + e.raw.slice(1);
      m.tables.push(tb);
      created.push(tb.id);
    }
    byRaw.set(e.raw, tb);
    for (const a of e.attrs) {
      const cn = safeColumnName(tb.name, physName(a.raw));
      if (tb.columns.some(c => c.name === cn)) continue;
      const col = newColumn(cn, a.type || undefined);
      if (isLogical(a.raw)) col.comment = a.raw.charAt(0).toUpperCase() + a.raw.slice(1);
      tb.columns.push(col);
      applyInference(m, tb, col, { keepType: !!a.type, keepNn: a.optional });
      if (a.pk) { col.pk = true; col.nullable = false; col.default = ''; }
      else if (a.nn) col.nullable = false;
      else if (a.optional) col.nullable = true;
      if (a.unique && !a.pk && !tb.uniques.some(u => u.columns.length === 1 && u.columns[0] === col.id)) {
        tb.uniques.push({ id: uid('u'), name: uniqueName(m, `${tb.name}_${col.name}_UN`), columns: [col.id] });
      }
      if (a.pk && tb.columns.filter(c => c.pk).length === 1 && /NUMBER|INTEGER/.test(col.type) && /(^|_)(ID|KOD)$|^ID_/.test(col.name) && !tb.columns.some(c => c.identity)) col.identity = true;
    }
  }
  // every new table needs a key before relations can point at it; # attributes already are one
  for (const id of created) {
    const tb = m.tables.find(x => x.id === id);
    if (tb.columns.some(c => c.pk)) {
      // key columns go first
      tb.columns.sort((x, y) => (y.pk ? 1 : 0) - (x.pk ? 1 : 0));
      continue;
    }
    tb.columns.unshift(Object.assign(newColumn('ID', 'NUMBER'), { pk: true, identity: true, nullable: false }));
  }
  const ensurePk = tb => {
    if (!tb.columns.some(c => c.pk)) tb.columns.unshift(Object.assign(newColumn('ID', 'NUMBER'), { pk: true, identity: true, nullable: false }));
    return tb.columns.filter(c => c.pk);
  };
  const link = (child, parent, { identifying = false, nn = false, one = false } = {}) => {
    if (m.fks.some(f => f.fromTable === child.id && f.toTable === parent.id) && !identifying) return null;
    const pk = ensurePk(parent);
    const pairs = pk.map(pc => {
      // generic key names (CODE, KOD) get the parent prefix so two parents don't both give "CODE"
      const sg = singular(parent.name);
      let base = pc.name === 'ID' ? `${sg}_ID` : pc.name.startsWith(sg) ? pc.name : `${sg}_${pc.name}`;
      if (child === parent) base = `PARENT_${base}`;
      let col = child.columns.find(c => c.name === base && !m.fks.some(f => f.fromTable === child.id && f.columns.some(p => p.from === c.id)));
      if (!col) {
        col = newColumn(base, pc.type);
        child.columns.splice(child.columns.filter(c => c.pk).length, 0, col);
      } else col.type = pc.type;
      if (identifying) { col.pk = true; col.nullable = false; } else if (nn) col.nullable = false;
      return { from: col.id, to: pc.id };
    });
    if (one && !identifying) child.uniques.push({ id: uid('u'), name: uniqueName(m, `${child.name}_${parent.name}_UN`), columns: pairs.map(p => p.from) });
    const f = { id: uid('f'), name: uniqueName(m, `${child.name}_${parent.name}_FK`), fromTable: child.id, toTable: parent.id, columns: pairs, onDelete: identifying ? 'CASCADE' : '' };
    m.fks.push(f);
    return f;
  };
  for (const r of parsed.rels) {
    const a = byRaw.get(r.a), b = byRaw.get(r.b);
    if (!a || !b) continue;
    if (r.kind === 'mn') {
      let name = `${a.name}_${b.name}`;
      if (m.tables.some(x => x.name === name)) { notes.push({ key: 'tm.n.junctionExists', p: { t: name } }); continue; }
      const j = newTable(name);
      j.comment = `${a.comment || a.name} ↔ ${b.comment || b.name}`;
      m.tables.push(j); created.push(j.id);
      link(j, a, { identifying: true }); link(j, b, { identifying: true });
    } else link(a, b, { nn: r.nn, one: r.kind === '11' });
  }
  const scope = new Set([...created, ...extended]);
  if (steps) toPhysical(m, { ...steps, names: false }, t, scope);
  // which table a text line is about, so the preview can follow the cursor
  const tableOf = raw => byRaw.get(raw) || byRaw.get(parsed.entities.find(e => sameName(e.raw, raw))?.raw);
  const lineTable = new Map([...(parsed.lineOwner || [])].map(([n, raw]) => [n, tableOf(raw)?.id]).filter(([, id]) => id));
  // a table only mentioned in a relation (the parent side) is not "extended"
  const changed = [...extended].filter(id => before.get(id) !== JSON.stringify(m.tables.find(x => x.id === id)));
  return { model: m, created, extended: changed, notes, lineTable };
}

export const TEXT_EXAMPLES = {
  uk: [
    { id: 'shop', label: 'Магазин', text: `# Інтернет-магазин
Клієнт: ім'я!, прізвище!, email [унікальний], телефон, дата народження
Адреса: місто, вулиця, поштовий індекс
Клієнт має багато адрес
Категорія: назва, опис
Товар: назва, артикул, ціна, кількість, опис
Товар належить категорії
Замовлення: номер, дата, статус, сума
Кожне замовлення обов'язково належить клієнту
Замовлення *-* Товар
Оплата: сума, валюта, дата оплати
Оплата належить замовленню` },
    { id: 'uni', label: 'Університет', text: `Факультет: назва, код
Кафедра: назва
Кафедра належить факультету
Викладач: ПІБ, email, телефон
Викладач належить кафедрі
Студент: ПІБ, email, дата народження, рік вступу
Група: код, рік
Студент належить групі
Дисципліна: назва, кредити
Викладач *-* Дисципліна
Оцінка: бал, дата
Оцінка належить студенту
Оцінка належить дисципліні` },
    { id: 'barker', label: 'Нотація Баркера', text: `# Oracle Academy: # ідентифікатор, * обовʼязковий, o необовʼязковий
Співробітник: # код, * імʼя, * прізвище, o email, * дата прийому, o зарплата
Відділ: # код, * назва, o місто
Співробітник належить відділу
Проєкт: # код, * назва, * дата початку, o дата кінця
Співробітник *-* Проєкт` },
  ],
  en: [
    { id: 'shop', label: 'Online store', text: `# Online store
Customer: first name!, last name!, email [unique], phone, birth date
Address: city, street, postal code
Customer has many addresses
Category: name, description
Product: name, sku, price, quantity, description
Product belongs to category
Order: order no, order date, status, total
Each order belongs to a customer!
Order *-* Product
Payment: amount, currency, paid at
Payment belongs to order` },
    { id: 'uni', label: 'University', text: `Faculty: name, code
Department: name
Department belongs to faculty
Teacher: full name, email, phone
Teacher belongs to department
Student: full name, email, birth date, enrollment year
Course: title, credits
Teacher *-* Course
Grade: score, graded on
Grade belongs to student
Grade belongs to course` },
    { id: 'barker', label: 'Barker notation', text: `# Oracle Academy: # identifier, * mandatory, o optional
Employee: # code, * first name, * last name, o email, * hire date, o salary
Department: # code, * name, o city
Employee belongs to department
Project: # code, * name, * start date, o end date
Employee *-* Project` },
  ],
};
