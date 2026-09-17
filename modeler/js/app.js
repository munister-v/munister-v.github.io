import { Store, newTable, nextTableName, newColumn } from './model.js';
import { Diagram, tableSize } from './diagram.js';
import { Panel } from './panel.js';
import { generateDDL } from './ddl-gen.js';
import { parseDDL } from './ddl-parse.js';
import { SAMPLE_DDL } from './sample.js';

const $ = s => document.querySelector(s);
const store = new Store();
const diagram = new Diagram($('#canvas'), store, {
  onAddTable: p => addTable(p),
  onRelation: (child, parent) => {
    try {
      const id = store.addRelation(child, parent);
      store.select({ kind: 'fk', id });
      toast('Связь создана');
    } catch (e) { toast(e.message, true); }
  },
  onZoom: k => { $('#zoom').textContent = `${Math.round(k * 100)}%`; },
});
new Panel($('#panel'), store);

// ---------- действия ----------
function addTable(p = diagram.center()) {
  const t = newTable(nextTableName(store.model), Math.round((p.x - 90) / 10) * 10, Math.round((p.y - 30) / 10) * 10);
  const id = newColumn('ID', 'NUMBER');
  Object.assign(id, { pk: true, identity: true, nullable: false });
  t.columns.push(id);
  store.update(m => m.tables.push(t));
  store.select({ kind: 'table', id: t.id });
  setTimeout(() => $('#panel input[data-f="table.name"]')?.select());
}

export function autoLayout(model) {
  // Уровень таблицы = длина самой длинной цепочки до корневого родителя
  const level = new Map();
  const parents = id => model.fks.filter(f => f.fromTable === id && f.toTable !== id).map(f => f.toTable);
  const depth = (id, seen = new Set()) => {
    if (level.has(id)) return level.get(id);
    if (seen.has(id)) return 0;
    seen.add(id);
    const d = Math.max(-1, ...parents(id).map(p => depth(p, seen))) + 1;
    level.set(id, d); return d;
  };
  model.tables.forEach(t => depth(t.id));
  const cols = [];
  model.tables.forEach(t => (cols[level.get(t.id)] ||= []).push(t));
  let x = 40;
  for (const col of cols.filter(Boolean)) {
    let y = 40, w = 0;
    for (const t of col) { const s = tableSize(t); t.x = x; t.y = y; y += s.h + 40; w = Math.max(w, s.w); }
    x += w + 120;
  }
}

const download = (name, text, type = 'text/plain') => {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
const fileName = ext => `${(store.model.name || 'model').replace(/[^\p{L}\p{N}_-]+/gu, '_')}.${ext}`;

function readFile(accept) {
  return new Promise(resolve => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept });
    inp.onchange = () => inp.files[0]?.text().then(resolve);
    inp.click();
  });
}

let toastTimer;
function toast(msg, err = false) {
  const el = $('#toast');
  el.textContent = msg; el.className = `show${err ? ' err' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.className = '', 3200);
}

// ---------- модальные окна ----------
function openModal(id) { $(id).showModal(); }

function showDDL() {
  $('#ddl-out').value = generateDDL(store.model, { comments: $('#opt-comments').checked, drop: $('#opt-drop').checked });
  if (!$('#ddl-dialog').open) openModal('#ddl-dialog');
}

function importDDL(text, replace) {
  const base = replace ? { tables: [], fks: [] } : structuredClone({ tables: store.model.tables, fks: store.model.fks });
  const before = new Set(base.tables.map(t => t.id));
  const { model, warnings, created } = parseDDL(text, base);
  store.update(m => {
    const fresh = model.tables.filter(t => !before.has(t.id));
    if (replace || !before.size) autoLayout(model);
    else {
      // новые таблицы — справа от существующих
      const sub = { tables: fresh, fks: model.fks.filter(f => fresh.some(t => t.id === f.fromTable) && fresh.some(t => t.id === f.toTable)) };
      autoLayout(sub);
      const offX = Math.max(0, ...m.tables.map(t => t.x + tableSize(t).w)) + 160;
      fresh.forEach(t => t.x += offX);
    }
    m.tables = model.tables; m.fks = model.fks;
  }, 'load');
  store.select(null);
  requestAnimationFrame(() => diagram.fit());
  $('#import-log').innerHTML = warnings.length
    ? `<b>Предупреждения (${warnings.length}):</b><ul>${warnings.map(w => `<li>${w.replace(/</g, '&lt;')}</li>`).join('')}</ul>` : '';
  toast(`Импортировано таблиц: ${created}${warnings.length ? `, предупреждений: ${warnings.length}` : ''}`, !created);
  if (created && !warnings.length) $('#import-dialog').close();
}

// ---------- тулбар ----------
const actions = {
  new: () => { if (confirm('Создать новую пустую модель? Несохранённые изменения можно будет отменить через ⌘Z.')) { store.load({ format: 'ferret-model', version: 1, name: 'Новая модель', tables: [], fks: [] }); diagram.fit(); } },
  open: async () => {
    try { store.load(JSON.parse(await readFile('.json,application/json'))); diagram.fit(); toast('Модель открыта'); }
    catch (e) { toast(`Не удалось открыть: ${e.message}`, true); }
  },
  save: () => download(fileName('ferret.json'), JSON.stringify(store.model, null, 2), 'application/json'),
  import: () => { $('#import-log').innerHTML = ''; openModal('#import-dialog'); },
  ddl: showDDL,
  svg: () => download(fileName('svg'), diagram.exportSVG(), 'image/svg+xml'),
  table: () => addTable(),
  relation: () => {
    const on = diagram.mode !== 'relation';
    diagram.setMode(on ? 'relation' : 'select');
    $('[data-action="relation"]').classList.toggle('active', on);
    if (on) toast('Кликните дочернюю таблицу, затем родительскую (Esc — отмена)');
  },
  layout: () => { store.update(m => autoLayout(m), 'load'); diagram.fit(); },
  undo: () => store.undo(),
  redo: () => store.redo(),
  'zoom-in': () => diagram.zoomBy(1.2),
  'zoom-out': () => diagram.zoomBy(1 / 1.2),
  fit: () => diagram.fit(),
  theme: () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ferret-theme', root.dataset.theme); } catch {}
  },
  sample: () => { importDDL(SAMPLE_DDL, true); },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b) actions[b.dataset.action]?.();
});

$('#import-file').addEventListener('click', async () => { $('#import-text').value = await readFile('.sql,.ddl,.txt'); });
$('#import-run').addEventListener('click', e => {
  e.preventDefault();
  const text = $('#import-text').value;
  if (!text.trim()) return toast('Вставьте DDL-скрипт', true);
  importDDL(text, $('#import-replace').checked);
});
$('#opt-comments').addEventListener('change', showDDL);
$('#opt-drop').addEventListener('change', showDDL);
$('#ddl-copy').addEventListener('click', e => { e.preventDefault(); navigator.clipboard.writeText($('#ddl-out').value).then(() => toast('Скопировано')); });
$('#ddl-download').addEventListener('click', e => { e.preventDefault(); download(fileName('sql'), $('#ddl-out').value); });

document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); }
  else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); store.redo(); }
  else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); actions.save(); }
  else if (e.key === 'Escape' && diagram.mode === 'relation') actions.relation();
  else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && store.selection) {
    const s = store.selection;
    if (s.kind === 'table') store.deleteTable(s.id);
    else { store.update(m => { m.fks = m.fks.filter(f => f.id !== s.id); }); store.select(null); }
  } else if (!typing && !mod) {
    if (e.key === 't') actions.table();
    if (e.key === 'r') actions.relation();
    if (e.key === 'f') actions.fit();
  }
});

// ---------- старт ----------
try { const th = localStorage.getItem('ferret-theme'); if (th) document.documentElement.dataset.theme = th; } catch {}
if (store.restore() && store.model.tables) { store.emit('load'); requestAnimationFrame(() => diagram.fit()); }
else actions.sample();
