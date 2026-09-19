// Sample rows for the SQL sandbox.
//
// An empty database is the reason the sandbox reads as broken: you open it, type
// SELECT * FROM CUSTOMERS, and get nothing back. The schema alone can't answer a
// query, so the sandbox seeds itself from the model — parents before children, values
// picked to satisfy the constraints the model already declares (types, NOT NULL,
// UNIQUE, CHECK ... IN, foreign keys). Anything it can't satisfy is skipped rather
// than guessed at: a row that violates a check is worse than no row.

const q = name => `"${String(name).replace(/"/g, '""')}"`;
const lit = v => v === null ? 'NULL'
  : typeof v === 'number' ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`;
const baseType = s => (s || '').trim().toUpperCase().split(/[\s(]/)[0];

const NUMERIC = ['NUMBER', 'INTEGER', 'INT', 'SMALLINT', 'DECIMAL', 'FLOAT',
  'BINARY_FLOAT', 'BINARY_DOUBLE', 'BOOLEAN'];
const isNumeric = type => NUMERIC.includes(baseType(type));
const isDate = type => /^(DATE|TIMESTAMP)/.test(baseType(type));

// NUMBER(12,2) → 2 знака после запятой; масштаб важен, иначе в денежное поле
// уедет целое и пример перестанет быть похожим на правду.
function scaleOf(type) {
  const m = /\(\s*\d+\s*,\s*(\d+)\s*\)/.exec(type || '');
  return m ? Number(m[1]) : 0;
}

// CHECK (STATUS IN ('NEW','PAID')) — единственный вид ограничения, из которого
// можно достать готовый список допустимых значений. Всё остальное (диапазоны,
// выражения) не разбираем: там честнее промахнуться и пропустить строку.
function allowedByCheck(table, column) {
  for (const k of table.checks || []) {
    const expr = (k.expr || '').trim();
    const re = new RegExp(`(?:"?${column.name}"?)\\s+IN\\s*\\(([^)]*)\\)`, 'i');
    const m = re.exec(expr);
    if (!m) continue;
    const values = [...m[1].matchAll(/'((?:[^']|'')*)'/g)].map(x => x[1].replace(/''/g, "'"));
    if (values.length) return values;
  }
  return null;
}

const WORDS = {
  email: i => `user${i}@example.com`,
  phone: i => `+380 44 000 ${String(1000 + i).slice(-4)}`,
  name: i => ['Olena Kravets', 'Andrii Shevchuk', 'Maryna Bondar', 'Petro Koval',
    'Iryna Lysenko', 'Taras Moroz', 'Sofia Tkachenko', 'Yurii Zaitsev'][i % 8],
  city: i => ['Kyiv', 'Lviv', 'Odesa', 'Kharkiv', 'Dnipro', 'Vinnytsia'][i % 6],
  street: i => `${['Khreshchatyk', 'Soborna', 'Franka', 'Shevchenka'][i % 4]} St, ${i + 1}`,
  code: i => String(10000 + i * 137).slice(0, 5),
  sku: i => `SKU-${String(1000 + i)}`,
  title: i => ['Linen shirt', 'Wool scarf', 'Leather belt', 'Cotton tote',
    'Canvas jacket', 'Silk tie', 'Denim cap', 'Felt hat'][i % 8],
  method: i => ['CARD', 'CASH', 'TRANSFER'][i % 3],
  group: i => ['Shirts', 'Knitwear', 'Accessories', 'Bags', 'Outerwear', 'Hats'][i % 6],
  json: () => '{}',
};

// Строку подбираем по имени колонки: в поле EMAIL должен лежать адрес, а не
// «TEXT 1» — иначе пример не читается как данные.
function textValue(column, i, tableName = '') {
  const n = column.name.toUpperCase();
  // Название зависит от того, что именует таблица: в CATEGORIES.NAME должна быть
  // категория, а не товар, иначе JOIN показывает одно и то же слово дважды.
  const t = tableName.toUpperCase();
  if (n.includes('EMAIL')) return WORDS.email(i);
  if (n.includes('PHONE') || n.includes('TEL')) return WORDS.phone(i);
  if (n.includes('CITY')) return WORDS.city(i);
  if (n.includes('STREET') || n.includes('ADDRESS')) return WORDS.street(i);
  if (n.includes('POSTCODE') || n.includes('ZIP')) return WORDS.code(i);
  if (n.includes('SKU') || n.includes('CODE')) return WORDS.sku(i);
  if (n.includes('METHOD') || n.includes('TYPE')) return WORDS.method(i);
  if (n.includes('NAME') || n.includes('TITLE')) {
    if (/CATEG|GROUP|TYPE|TAG/.test(t)) return WORDS.group(i);
    return n.includes('FULL') || n.includes('CUSTOMER') || /CUSTOMER|USER|PERSON|AUTHOR/.test(t)
      ? WORDS.name(i) : WORDS.title(i);
  }
  if (baseType(column.type) === 'JSON') return WORDS.json();
  if (baseType(column.type) === 'CHAR') return i % 2 ? 'Y' : 'N';
  return `${column.name.toLowerCase()} ${i + 1}`;
}

function dateValue(i) {
  const d = new Date(Date.UTC(2026, 0, 1 + i * 3, 9, 0, 0));
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function numberValue(column, i) {
  const scale = scaleOf(column.type);
  if (scale > 0) return Number((19.9 + i * 7.35).toFixed(scale));
  const n = column.name.toUpperCase();
  if (n.includes('QTY') || n.includes('QUANTITY')) return 1 + (i % 5);
  if (n.includes('PRICE') || n.includes('TOTAL') || n.includes('AMOUNT')) return 100 + i * 25;
  return i + 1;
}

// Порядок вставки: родитель раньше ребёнка. Цикл в связях разрывается — такие
// таблицы уходят в конец и заполняются как получится.
function inOrder(model) {
  const byId = Object.fromEntries(model.tables.map(t => [t.id, t]));
  const parents = new Map(model.tables.map(t => [t.id, new Set()]));
  for (const f of model.fks) {
    if (f.fromTable === f.toTable) continue;
    if (byId[f.fromTable] && byId[f.toTable]) parents.get(f.fromTable).add(f.toTable);
  }
  const done = new Set(), out = [];
  let moved = true;
  while (moved) {
    moved = false;
    for (const t of model.tables) {
      if (done.has(t.id)) continue;
      if ([...parents.get(t.id)].every(p => done.has(p))) {
        done.add(t.id); out.push(t); moved = true;
      }
    }
  }
  for (const t of model.tables) if (!done.has(t.id)) out.push(t);
  return out;
}

/**
 * Builds INSERT statements for the whole model.
 * Returns [{ sql, label }] in an order the foreign keys accept.
 */
export function sqliteSeed(model, rowsPerTable = 6) {
  const byId = Object.fromEntries(model.tables.map(t => [t.id, t]));
  const colById = (t, id) => t.columns.find(c => c.id === id);
  const statements = [];
  // Что реально вставлено: таблица → колонка → список значений. Ребёнок берёт
  // ссылки отсюда, а не выдумывает их, иначе FK отвергнет строку.
  const stored = new Map();

  for (const table of inOrder(model)) {
    const columns = table.columns.filter(c => !c.virtual);
    if (!columns.length) continue;

    // Колонки, связанные внешним ключом, и их источник значений.
    const fkSource = new Map();
    for (const f of model.fks) {
      if (f.fromTable !== table.id) continue;
      const parent = byId[f.toTable];
      if (!parent) continue;
      for (const pair of f.columns) {
        const from = colById(table, pair.from), to = colById(parent, pair.to);
        if (from && to) {
          fkSource.set(from.id, { table: parent.id, column: to.id, self: f.toTable === table.id });
        }
      }
    }

    const values = new Map(columns.map(c => [c.id, []]));
    const rows = [];
    for (let i = 0; i < rowsPerTable; i++) {
      const row = [];
      let usable = true;
      for (const c of columns) {
        let v;
        const ref = fkSource.get(c.id);
        if (ref) {
          // Самоссылка (CATEGORIES.PARENT_ID → CATEGORIES): родителем может быть
          // только строка, уже созданная в этой же партии, а у первой её нет.
          const pool = ref.self ? values.get(ref.column).slice(0, i) : (stored.get(ref.table)?.get(ref.column) || []);
          if (!pool.length) {
            // Необязательная связь — это NULL, а не повод оставить таблицу пустой
            // и тем самым обнулить всех её потомков.
            if (c.nullable && !c.pk) { v = null; }
            else { usable = false; break; }
          } else v = pool[i % pool.length];
        } else {
          const allowed = allowedByCheck(table, c);
          if (allowed) v = allowed[i % allowed.length];
          else if (isNumeric(c.type)) v = c.pk ? i + 1 : numberValue(c, i);
          else if (isDate(c.type)) v = dateValue(i);
          else v = c.pk ? `${table.name}-${i + 1}` : textValue(c, i, table.name);
        }
        row.push(v);
        values.get(c.id).push(v);
      }
      if (!usable) break;
      rows.push(row);
    }
    if (!rows.length) continue;

    stored.set(table.id, values);
    statements.push({
      label: table.name,
      sql: `INSERT INTO ${q(table.name)} (${columns.map(c => q(c.name)).join(', ')}) VALUES\n` +
        rows.map(r => `  (${r.map(lit).join(', ')})`).join(',\n') + ';',
    });
  }
  return statements;
}
