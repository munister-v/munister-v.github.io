// Модель данных + история (undo/redo) + автосохранение
import { t } from './i18n.js?v=202609210937';

let seq = Date.now();
export const uid = (p = 'id') => `${p}${(seq++).toString(36)}`;

export const ORACLE_TYPES = [
  'VARCHAR2(100 CHAR)', 'VARCHAR2(4000 CHAR)', 'NVARCHAR2(100)', 'CHAR(1)',
  'NUMBER', 'NUMBER(10)', 'NUMBER(19)', 'NUMBER(12,2)', 'INTEGER', 'FLOAT',
  'BINARY_FLOAT', 'BINARY_DOUBLE', 'DATE', 'TIMESTAMP', 'TIMESTAMP(6)',
  'TIMESTAMP WITH TIME ZONE', 'TIMESTAMP WITH LOCAL TIME ZONE',
  'INTERVAL DAY TO SECOND', 'INTERVAL YEAR TO MONTH',
  'CLOB', 'NCLOB', 'BLOB', 'RAW(16)', 'BOOLEAN', 'JSON', 'XMLTYPE', 'ROWID',
];

export const TABLE_COLORS = ['', 'blue', 'violet', 'green', 'amber', 'rose', 'teal'];

export function newSequence(name) {
  return { id: uid('s'), name, schema: '', start: '1', increment: '1', minvalue: '', maxvalue: '', cache: '20', cycle: false, order: false, comment: '' };
}

export function newView(name, sql, x = 40, y = 40) {
  return { id: uid('v'), name, schema: '', sql, comment: '', color: '', x, y };
}

export function newDiagram(name = t('diag.main') || 'Main') {
  return { id: uid('d'), name, tableIds: [], viewIds: [], positions: {}, zones: [], zoom: { x: 0, y: 0, k: 1 } };
}

export function newZone(name = t('zone.default') || 'Subject Area', color = 'blue', x = 40, y = 40, w = 420, h = 300) {
  return { id: uid('z'), name, color, x, y, w, h };
}

export function emptyModel() {
  const d = newDiagram(t('diag.main') || 'Main');
  return { format: 'schemata-model', version: 4, name: t('model.default'), tables: [], fks: [], sequences: [], views: [], diagrams: [d], activeDiagram: d.id };
}

// Уровень таблицы — длина самой длинной цепочки родителей над ней (0 у таблиц
// без внешних ключей наружу). Общая логика для авторазметки диаграммы
// (колонки слева направо) и списка таблиц слева (родители выше детей) —
// два места, которым нужен один и тот же порядок, а не два похожих.
export function tableLevels(model) {
  const level = new Map();
  const parents = id => model.fks.filter(f => f.fromTable === id && f.toTable !== id).map(f => f.toTable);
  const depth = (id, seen = new Set()) => {
    if (level.has(id)) return level.get(id);
    if (seen.has(id)) return 0;
    seen.add(id);
    const d = Math.max(-1, ...parents(id).map(p => depth(p, seen))) + 1;
    level.set(id, d); return d;
  };
  model.tables.forEach(tb => depth(tb.id));
  return level;
}

export function newColumn(name = 'COLUMN_1', type = 'VARCHAR2(100 CHAR)') {
  return { id: uid('c'), name, type, pk: false, nullable: true, identity: false, virtual: '', default: '', comment: '' };
}

export function newTable(name, x = 40, y = 40) {
  return {
    id: uid('t'), name, schema: '', x, y, comment: '',
    color: '', columns: [], uniques: [], indexes: [], checks: [], tablespace: '', partition: null,
  };
}

export class Store {
  constructor() {
    this.model = emptyModel();
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = new Set();
    this.selection = null; // {kind:'table'|'fk', id}
  }
  subscribe(fn) { this.listeners.add(fn); }
  emit(reason) {
    this.listeners.forEach(fn => fn(reason));
    // selection changes and in-progress drags are not edits
    if (reason !== 'select' && reason !== 'move') this.persist();
  }

  // Все мутации — через update(), чтобы работал undo
  update(fn, reason = 'change') {
    this.undoStack.push(JSON.stringify(this.model));
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
    fn(this.model);
    this.emit(reason);
  }
  // Снимок без мутации (для drag: снимок в начале, мутации без записи)
  checkpoint() {
    this.undoStack.push(JSON.stringify(this.model));
    this.redoStack = [];
  }
  silent(fn, reason = 'move') { fn(this.model); this.emit(reason); }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.stringify(this.model));
    this.model = JSON.parse(this.undoStack.pop());
    this.fixSelection(); this.emit('load');
  }
  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.stringify(this.model));
    this.model = JSON.parse(this.redoStack.pop());
    this.fixSelection(); this.emit('load');
  }
  load(model) {
    if (!model || !Array.isArray(model.tables)) throw new Error(t('e.format'));
    model.fks ||= [];
    model.tables.forEach(t => { t.uniques ||= []; t.indexes ||= []; });
    this.checkpoint();
    this.model = model;
    this.selection = null;
    this.emit('load');
  }
  select(sel) { this.selection = sel; this.listeners.forEach(fn => fn('select')); }
  fixSelection() {
    const s = this.selection;
    if (!s) return;
    const ok = s.kind === 'table' ? this.table(s.id) :
               s.kind === 'view' ? this.view(s.id) :
               s.kind === 'seq' ? this.sequence(s.id) :
               s.kind === 'zone' ? this.zone(s.id) :
               s.kind === 'multi' ? (s.ids && s.ids.length > 0) :
               this.model.fks.find(f => f.id === s.id);
    if (!ok) this.selection = null;
  }

  get activeDiagram() {
    const m = this.model;
    if (!m.diagrams || !m.diagrams.length) return null;
    return m.diagrams.find(d => d.id === m.activeDiagram) || m.diagrams[0];
  }

  posOf(id) {
    const d = this.activeDiagram;
    if (d?.positions && d.positions[id]) return d.positions[id];
    const t = this.table(id) || this.view(id);
    return { x: t?.x ?? 40, y: t?.y ?? 40 };
  }

  setPos(id, x, y) {
    const d = this.activeDiagram;
    if (d) {
      d.positions ||= {};
      d.positions[id] = { x, y };
    }
    const t = this.table(id) || this.view(id);
    if (t) { t.x = x; t.y = y; }
  }

  isItemOnActiveDiagram(id) {
    const d = this.activeDiagram;
    if (!d || !Array.isArray(d.tableIds)) return true;
    return d.tableIds.includes(id) || (d.viewIds || []).includes(id);
  }

  addDiagram(name = t('diag.new') || 'Diagram') {
    let diag;
    this.update(m => {
      m.diagrams ||= [];
      diag = newDiagram(name);
      m.diagrams.push(diag);
      m.activeDiagram = diag.id;
    });
    return diag;
  }

  duplicateDiagram(id) {
    let copy;
    this.update(m => {
      const src = m.diagrams.find(d => d.id === id);
      if (!src) return;
      copy = structuredClone(src);
      copy.id = uid('d');
      copy.name = `${src.name} (${t('diag.copy') || 'copy'})`;
      m.diagrams.push(copy);
      m.activeDiagram = copy.id;
    });
    return copy;
  }

  deleteDiagram(id) {
    this.update(m => {
      if (!m.diagrams || m.diagrams.length <= 1) return;
      m.diagrams = m.diagrams.filter(d => d.id !== id);
      if (m.activeDiagram === id) {
        m.activeDiagram = m.diagrams[0].id;
      }
    });
    this.selection = null;
    this.emit('load');
  }

  renameDiagram(id, name) {
    this.update(m => {
      const d = m.diagrams.find(x => x.id === id);
      if (d) d.name = name;
    });
  }

  setActiveDiagram(id) {
    if (this.model.activeDiagram === id) return;
    this.model.activeDiagram = id;
    this.selection = null;
    this.emit('load');
  }

  addTableToDiagram(tableId, diagramId = this.model.activeDiagram, pos = null) {
    this.update(m => {
      const d = (m.diagrams || []).find(x => x.id === diagramId);
      if (d && !d.tableIds.includes(tableId)) {
        d.tableIds.push(tableId);
        d.positions ||= {};
        const t = m.tables.find(x => x.id === tableId);
        d.positions[tableId] = pos ? { ...pos } : { x: t?.x ?? 40, y: t?.y ?? 40 };
      }
    });
  }

  removeTableFromDiagram(tableId, diagramId = this.model.activeDiagram) {
    this.update(m => {
      const d = (m.diagrams || []).find(x => x.id === diagramId);
      if (d) {
        d.tableIds = d.tableIds.filter(id => id !== tableId);
        if (d.positions) delete d.positions[tableId];
      }
    });
    if (this.selection?.id === tableId) {
      this.selection = null;
      this.emit('select');
    }
  }

  addZone(name = t('zone.default') || 'Subject Area', color = 'blue', x = 40, y = 40, w = 420, h = 300) {
    let zone;
    this.update(m => {
      const d = this.activeDiagram;
      if (!d) return;
      d.zones ||= [];
      zone = newZone(name, color, x, y, w, h);
      d.zones.push(zone);
    });
    if (zone) this.select({ kind: 'zone', id: zone.id });
    return zone;
  }

  zone(id) {
    return this.activeDiagram?.zones?.find(z => z.id === id);
  }

  deleteZone(id) {
    // Выбор снимается ДО update(), а не после: update() эмитит 'change' сразу
    // после мутации, и Panel.render() тут же читает this.store.selection — если оно
    // ещё указывает на только что удалённый объект, store.table(id)/view(id)/... вернёт
    // undefined, а renderTable/renderView/renderSeq упадут на первом же обращении к
    // его полям (Cannot read properties of undefined). Кнопка «Видалити» из-за этого
    // выглядела так, будто ничего не делает: объект пропадал из модели, но экран падал
    // раньше, чем успевал перерисоваться.
    if (this.selection?.id === id) this.selection = null;
    this.update(m => {
      const d = this.activeDiagram;
      if (d && d.zones) d.zones = d.zones.filter(z => z.id !== id);
    });
  }

  table(id) { return this.model.tables.find(t => t.id === id); }
  view(id) { return this.model.views?.find(v => v.id === id); }
  sequence(id) { return this.model.sequences?.find(q => q.id === id); }
  deleteView(id) {
    // Выбор снимается ДО update(), а не после: update() эмитит 'change' сразу
    // после мутации, и Panel.render() тут же читает this.store.selection — если оно
    // ещё указывает на только что удалённый объект, store.table(id)/view(id)/... вернёт
    // undefined, а renderTable/renderView/renderSeq упадут на первом же обращении к
    // его полям (Cannot read properties of undefined). Кнопка «Видалити» из-за этого
    // выглядела так, будто ничего не делает: объект пропадал из модели, но экран падал
    // раньше, чем успевал перерисоваться.
    this.selection = null;
    this.update(m => {
      m.views = m.views.filter(v => v.id !== id);
      (m.diagrams || []).forEach(d => {
        d.viewIds = (d.viewIds || []).filter(vid => vid !== id);
        if (d.positions) delete d.positions[id];
      });
    });
  }
  // см. примечание у deleteZone/deleteView: снимаем выбор до update(), а не после
  deleteSequence(id) { this.selection = null; this.update(m => { m.sequences = m.sequences.filter(q => q.id !== id); }); }
  // tables a view reads from: table names that occur as words in its SQL
  viewSources(v) {
    const sql = ` ${(v.sql || '').toUpperCase().replace(/"/g, '')} `;
    return this.model.tables.filter(t => new RegExp(`[^A-Z0-9_$#.]${t.name.replace(/[$#]/g, '\\$&')}[^A-Z0-9_$#]`).test(sql));
  }
  // columns whose DEFAULT uses the sequence
  sequenceUsers(q) {
    const re = new RegExp(`(^|[^A-Z0-9_$#])${q.name.replace(/[$#]/g, '\\$&')}\\.NEXTVAL`, 'i');
    return this.model.tables.flatMap(t => t.columns.filter(c => re.test(c.default || '')).map(c => ({ table: t, column: c })));
  }
  tableByName(name) {
    const n = name.toUpperCase();
    return this.model.tables.find(t => t.name.toUpperCase() === n);
  }
  isFkColumn(tableId, colId) {
    return this.model.fks.some(f => f.fromTable === tableId && f.columns.some(p => p.from === colId));
  }

  deleteTable(id) {
    // Выбор снимается ДО update(), а не после: update() эмитит 'change' сразу
    // после мутации, и Panel.render() тут же читает this.store.selection — если оно
    // ещё указывает на только что удалённый объект, store.table(id)/view(id)/... вернёт
    // undefined, а renderTable/renderView/renderSeq упадут на первом же обращении к
    // его полям (Cannot read properties of undefined). Кнопка «Видалити» из-за этого
    // выглядела так, будто ничего не делает: объект пропадал из модели, но экран падал
    // раньше, чем успевал перерисоваться.
    this.selection = null;
    this.update(m => {
      m.tables = m.tables.filter(t => t.id !== id);
      m.fks = m.fks.filter(f => f.fromTable !== id && f.toTable !== id);
      (m.diagrams || []).forEach(d => {
        d.tableIds = (d.tableIds || []).filter(tid => tid !== id);
        if (d.positions) delete d.positions[id];
      });
    });
  }
  deleteColumn(tableId, colId) {
    this.update(m => {
      const t = m.tables.find(x => x.id === tableId);
      t.columns = t.columns.filter(c => c.id !== colId);
      m.fks.forEach(f => {
        if (f.fromTable === tableId) f.columns = f.columns.filter(p => p.from !== colId);
        if (f.toTable === tableId) f.columns = f.columns.filter(p => p.to !== colId);
      });
      m.fks = m.fks.filter(f => f.columns.length);
    });
  }

  // Relation the Data Modeler way: the parent's PK columns are carried into the child.
  // opts.kind: '1n' | '11'; opts.identifying: FK becomes part of the child PK; opts.mandatory: NOT NULL
  addRelation(childId, parentId, opts = {}) {
    const { kind = '1n', identifying = false, mandatory = false, columnId = null } = opts;
    const parent = this.table(parentId);
    const child = this.table(childId);
    const pkCols = parent.columns.filter(c => c.pk);
    if (!pkCols.length) throw new Error(t('e.noPk', { t: parent.name }));
    let fkId;
    this.update(m => {
      const c = m.tables.find(x => x.id === childId);
      const pairs = pkCols.map((pc, i) => {
        // an explicit child column (e.g. from the column context menu) is used for single-column keys
        if (columnId && pkCols.length === 1) {
          const col = c.columns.find(x => x.id === columnId);
          if (col) return { from: col.id, to: pc.id };
        }
        const base = pc.name === 'ID' ? `${parent.name.replace(/S$/, '')}_ID` : pc.name;
        let colName = childId === parentId ? `PARENT_${base}` : base;
        const existing = c.columns.find(x => x.name.toUpperCase() === colName.toUpperCase());
        const used = m.fks.some(f => f.fromTable === childId && f.columns.some(p => p.from === existing?.id));
        if (existing && !used && (!existing.pk || identifying)) return { from: existing.id, to: pc.id };
        let n = 2;
        while (c.columns.some(x => x.name === colName)) colName = `${base}_${n++}`;
        const col = newColumn(colName, pc.type);
        // keep FK columns right after the key columns
        const at = c.columns.filter(x => x.pk).length;
        c.columns.splice(at + i, 0, col);
        return { from: col.id, to: pc.id };
      });
      for (const p of pairs) {
        const col = c.columns.find(x => x.id === p.from);
        if (identifying) { col.pk = true; col.nullable = false; }
        else if (mandatory) col.nullable = false;
      }
      if (kind === '11' && !identifying) {
        c.uniques.push({ id: uid('u'), name: uniqueName(m, `${child.name}_${parent.name}_UN`), columns: pairs.map(p => p.from) });
      }
      fkId = uid('f');
      m.fks.push({
        id: fkId, name: uniqueName(m, `${child.name}_${parent.name}_FK`),
        fromTable: childId, toTable: parentId, columns: pairs, onDelete: identifying ? 'CASCADE' : '',
      });
    });
    return fkId;
  }

  // M:N — a junction table with an identifying FK to each side
  addJunction(aId, bId) {
    const a = this.table(aId), b = this.table(bId);
    for (const x of [a, b]) if (!x.columns.some(c => c.pk)) throw new Error(t('e.noPk', { t: x.name }));
    let name = `${a.name}_${b.name}`, n = 2;
    while (this.model.tables.some(x => x.name === name)) name = `${a.name}_${b.name}_${n++}`;
    const j = newTable(name, Math.round((a.x + b.x) / 2 / 10) * 10, Math.round((Math.max(a.y, b.y) + 260) / 10) * 10);
    j.comment = `${a.name} ↔ ${b.name}`;
    this.update(m => m.tables.push(j));
    this.addRelation(j.id, aId, { identifying: true });
    this.addRelation(j.id, bId, { identifying: true });
    return j.id;
  }

  relationKind(f) {
    const child = this.table(f.fromTable);
    if (!child) return {};
    const cols = f.columns.map(p => child.columns.find(c => c.id === p.from)).filter(Boolean);
    const ids = cols.map(c => c.id);
    const same = list => list.length === ids.length && ids.every(id => list.includes(id));
    const pkIds = child.columns.filter(c => c.pk).map(c => c.id);
    return {
      identifying: cols.length > 0 && cols.every(c => c.pk),
      mandatory: cols.length > 0 && cols.every(c => c.pk || !c.nullable),
      oneToOne: same(pkIds) || child.uniques.some(u => same(u.columns)),
    };
  }

  // Debounced save; the host sets onPersist (see app.js)
  persist() {
    this.dirty = true;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 400);
  }
  flush() {
    clearTimeout(this.saveTimer);
    if (!this.dirty) return;
    this.dirty = false;
    this.onPersist?.(this.model);
  }
}

export function uniqueName(model, base) {
  const names = new Set([
    ...model.fks.map(f => f.name.toUpperCase()),
    ...model.tables.flatMap(t => [...t.uniques, ...t.indexes].map(x => x.name.toUpperCase())),
  ]);
  let name = base.toUpperCase().slice(0, 128), i = 1;
  while (names.has(name)) name = `${base.toUpperCase().slice(0, 124)}_${i++}`;
  return name;
}

export function nextTableName(model) {
  let i = model.tables.length + 1;
  while (model.tables.some(t => t.name === `TABLE_${i}`)) i++;
  return `TABLE_${i}`;
}
