// Модель данных + история (undo/redo) + автосохранение
import { t } from './i18n.js?v=202609171538';

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

export function emptyModel() {
  return { format: 'schemata-model', version: 1, name: t('model.default'), tables: [], fks: [] };
}

export function newColumn(name = 'COLUMN_1', type = 'VARCHAR2(100 CHAR)') {
  return { id: uid('c'), name, type, pk: false, nullable: true, identity: false, default: '', comment: '' };
}

export function newTable(name, x = 40, y = 40) {
  return {
    id: uid('t'), name, schema: '', x, y, comment: '',
    color: '', columns: [], uniques: [], indexes: [],
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
    const ok = s.kind === 'table' ? this.table(s.id) : this.model.fks.find(f => f.id === s.id);
    if (!ok) this.selection = null;
  }

  table(id) { return this.model.tables.find(t => t.id === id); }
  tableByName(name) {
    const n = name.toUpperCase();
    return this.model.tables.find(t => t.name.toUpperCase() === n);
  }
  isFkColumn(tableId, colId) {
    return this.model.fks.some(f => f.fromTable === tableId && f.columns.some(p => p.from === colId));
  }

  deleteTable(id) {
    this.update(m => {
      m.tables = m.tables.filter(t => t.id !== id);
      m.fks = m.fks.filter(f => f.fromTable !== id && f.toTable !== id);
    });
    this.selection = null; this.emit('select');
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
