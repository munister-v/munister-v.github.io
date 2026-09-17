// Модель данных + история (undo/redo) + автосохранение
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

export function emptyModel() {
  return { format: 'ferret-model', version: 1, name: 'Новая модель', tables: [], fks: [] };
}

export function newColumn(name = 'COLUMN_1', type = 'VARCHAR2(100 CHAR)') {
  return { id: uid('c'), name, type, pk: false, nullable: true, identity: false, default: '', comment: '' };
}

export function newTable(name, x = 40, y = 40) {
  return {
    id: uid('t'), name, schema: '', x, y, comment: '',
    columns: [], uniques: [], indexes: [],
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
  emit(reason) { this.listeners.forEach(fn => fn(reason)); this.persist(); }

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
    if (!model || !Array.isArray(model.tables)) throw new Error('Неверный формат модели');
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

  // Связь как в Data Modeler: в дочернюю таблицу добавляются колонки PK родителя
  addRelation(childId, parentId) {
    const parent = this.table(parentId);
    const child = this.table(childId);
    const pkCols = parent.columns.filter(c => c.pk);
    if (!pkCols.length) throw new Error(`У таблицы ${parent.name} нет первичного ключа`);
    let fkId;
    this.update(m => {
      const c = m.tables.find(t => t.id === childId);
      const pairs = pkCols.map(pc => {
        let colName = pc.name === 'ID' ? `${parent.name}_ID` : pc.name;
        if (childId === parentId) colName = `PARENT_${colName}`;
        const existing = c.columns.find(x => x.name.toUpperCase() === colName.toUpperCase());
        if (existing && !existing.pk) return { from: existing.id, to: pc.id };
        if (existing) colName = `${colName}_${c.columns.length}`;
        const col = newColumn(colName, pc.type);
        c.columns.push(col);
        return { from: col.id, to: pc.id };
      });
      fkId = uid('f');
      m.fks.push({
        id: fkId, name: uniqueName(m, `${child.name}_${parent.name}_FK`),
        fromTable: childId, toTable: parentId, columns: pairs, onDelete: '',
      });
    });
    return fkId;
  }

  persist() {
    try { localStorage.setItem('ferret-model', JSON.stringify(this.model)); } catch {}
  }
  restore() {
    try {
      const raw = localStorage.getItem('ferret-model');
      if (raw) { this.model = JSON.parse(raw); return true; }
    } catch {}
    return false;
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
