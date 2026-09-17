import { Store, newTable, nextTableName, newColumn, emptyModel } from './model.js';
import { Diagram, tableSize } from './diagram.js';
import { Panel } from './panel.js';
import { Sidebar } from './sidebar.js';
import { Palette } from './palette.js';
import { generateDDL } from './ddl-gen.js';
import { parseDDL } from './ddl-parse.js';
import { SAMPLE_DDL } from './sample.js';
import { t, getLang, setLang, onLang, applyStatic } from './i18n.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const store = new Store();

const diagram = new Diagram($('#canvas'), store, {
  onAddTable: p => addTable(p),
  onRelation: (child, parent) => {
    try {
      const id = store.addRelation(child, parent);
      store.select({ kind: 'fk', id });
      toast(t('t.relCreated'));
    } catch (e) { toast(e.message, true); }
  },
  onZoom: k => { $('#zoom').textContent = `${Math.round(k * 100)}%`; },
  minimap: $('#minimap'),
});
const panel = new Panel($('#panel'), store);
const pick = id => { store.select({ kind: 'table', id }); diagram.centerOn(id); };
const sidebar = new Sidebar($('#sidebar'), store, { onPick: pick });

// ---------- model name + saved indicator ----------
const nameInput = $('#model-name');
nameInput.addEventListener('change', () => {
  const v = nameInput.value.trim() || t('model.default');
  store.update(m => { m.name = v; });
});
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); });
let savedTimer;
store.subscribe(r => {
  if (document.activeElement !== nameInput) nameInput.value = store.model.name;
  if (r === 'select') return;
  const el = $('#saved');
  el.classList.add('show');
  clearTimeout(savedTimer); savedTimer = setTimeout(() => el.classList.remove('show'), 1600);
});

// ---------- language ----------
function renderLang() {
  // an untouched default model name follows the interface language
  if (['Нова модель', 'New model', 'Новая модель'].includes(store.model.name)) { store.model.name = t('model.default'); store.persist(); }
  nameInput.value = store.model.name;
  applyStatic();
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  $('#mode-hint-text').textContent = t('t.relHint');
  if ($('#ddl-dialog').open) showDDL();
  diagram.render();
  panel.render();
  sidebar.render();
}
onLang(renderLang);
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

// ---------- actions ----------
function addTable(p = diagram.center()) {
  const tb = newTable(nextTableName(store.model), Math.round((p.x - 110) / 10) * 10, Math.round((p.y - 40) / 10) * 10);
  const id = newColumn('ID', 'NUMBER');
  Object.assign(id, { pk: true, identity: true, nullable: false });
  tb.columns.push(id);
  store.update(m => m.tables.push(tb));
  store.select({ kind: 'table', id: tb.id });
  setTimeout(() => $('#panel input[data-f="table.name"]')?.select());
}

export function autoLayout(model) {
  // Level = longest chain of parents above the table
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
  const cols = [];
  model.tables.forEach(tb => (cols[level.get(tb.id)] ||= []).push(tb));
  let x = 40;
  for (const col of cols.filter(Boolean)) {
    let y = 40, w = 0;
    for (const tb of col) { const s = tableSize(tb); tb.x = x; tb.y = y; y += s.h + 56; w = Math.max(w, s.w); }
    x += w + 140;
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
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.className = '', 3000);
}

// ---------- DDL ----------
const SQL_KW = /\b(CREATE|TABLE|ALTER|ADD|CONSTRAINT|PRIMARY|FOREIGN|KEY|REFERENCES|UNIQUE|INDEX|ON|DELETE|CASCADE|SET|NULL|NOT|DEFAULT|GENERATED|BY|AS|IDENTITY|COMMENT|IS|COLUMN|DROP|CONSTRAINTS|PURGE)\b/g;
const SQL_TY = /\b(VARCHAR2|NVARCHAR2|CHAR|NUMBER|INTEGER|FLOAT|BINARY_FLOAT|BINARY_DOUBLE|DATE|TIMESTAMP|WITH|LOCAL|TIME|ZONE|INTERVAL|DAY|TO|SECOND|YEAR|MONTH|CLOB|NCLOB|BLOB|RAW|BOOLEAN|JSON|XMLTYPE|ROWID)\b/g;
function highlightSQL(sql) {
  return sql.split('\n').map(line => {
    if (line.trimStart().startsWith('--')) return `<span class="c">${esc(line)}</span>`;
    // split out string literals so keywords inside them stay plain
    return line.split(/('(?:[^']|'')*')/).map((part, i) => i % 2
      ? `<span class="s">${esc(part)}</span>`
      : esc(part).replace(/\b(\d+)\b/g, '<span class="n">$1</span>').replace(SQL_KW, '<span class="k">$1</span>').replace(SQL_TY, '<span class="ty">$1</span>')
    ).join('');
  }).join('\n');
}
function showDDL() {
  const sql = generateDDL(store.model, { comments: $('#opt-comments').checked, drop: $('#opt-drop').checked });
  $('#ddl-out').value = sql;
  $('#ddl-code').innerHTML = highlightSQL(sql);
  if (!$('#ddl-dialog').open) $('#ddl-dialog').showModal();
}

function importDDL(text, replace) {
  const base = replace ? { tables: [], fks: [] } : structuredClone({ tables: store.model.tables, fks: store.model.fks });
  const before = new Set(base.tables.map(x => x.id));
  const { model, warnings, created } = parseDDL(text, base);
  store.update(m => {
    const fresh = model.tables.filter(x => !before.has(x.id));
    if (replace || !before.size) autoLayout(model);
    else {
      // new tables go to the right of the existing ones
      const sub = { tables: fresh, fks: model.fks.filter(f => fresh.some(x => x.id === f.fromTable) && fresh.some(x => x.id === f.toTable)) };
      autoLayout(sub);
      const offX = Math.max(0, ...m.tables.map(x => x.x + tableSize(x).w)) + 160;
      fresh.forEach(x => x.x += offX);
    }
    m.tables = model.tables; m.fks = model.fks;
  }, 'load');
  store.select(null);
  requestAnimationFrame(() => diagram.fit());
  $('#import-log').innerHTML = warnings.length
    ? `<b>${t('imp.warnings', { n: warnings.length })}</b><ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
  toast(t('t.imported', { n: created }) + (warnings.length ? t('t.importedWarn', { n: warnings.length }) : ''), !created);
  if (created && !warnings.length && $('#import-dialog').open) $('#import-dialog').close();
}

function setRelationMode(on) {
  diagram.setMode(on ? 'relation' : 'select');
  $('.dock [data-action="relation"]').classList.toggle('on', on);
  $('.dock [data-action="select"]').classList.toggle('on', !on);
  $('#mode-hint').hidden = !on;
}

// ---------- toolbar ----------
const actions = {
  new: () => { if (confirm(t('confirm.new'))) { store.load(emptyModel()); diagram.fit(); } },
  open: async () => {
    try { store.load(JSON.parse(await readFile('.json,application/json'))); diagram.fit(); toast(t('t.opened')); }
    catch (e) { toast(t('t.openFail', { e: e.message }), true); }
  },
  save: () => download(fileName('schemata.json'), JSON.stringify(store.model, null, 2), 'application/json'),
  import: () => { $('#import-log').innerHTML = ''; $('#import-dialog').showModal(); },
  ddl: showDDL,
  svg: () => download(fileName('svg'), diagram.exportSVG(), 'image/svg+xml'),
  select: () => setRelationMode(false),
  table: () => addTable(),
  relation: () => setRelationMode(diagram.mode !== 'relation'),
  layout: () => { store.update(m => autoLayout(m), 'load'); diagram.fit(); },
  undo: () => store.undo(),
  redo: () => store.redo(),
  'zoom-in': () => diagram.zoomBy(1.25),
  'zoom-out': () => diagram.zoomBy(1 / 1.25),
  'zoom-reset': () => diagram.zoomBy(1 / diagram.view.k),
  fit: () => diagram.fit(),
  sample: () => importDDL(SAMPLE_DDL, true),
  palette: () => palette.open(),
};

const ICONS = Object.fromEntries([...document.querySelectorAll('[data-action] svg')].map(s => [s.closest('[data-action]').dataset.action, s.outerHTML]));
const palette = new Palette(store, {
  onPick: pick,
  actions: () => [
    ['table', 'tb.table', 'T'], ['relation', 'tb.relation', 'R'], ['layout', 'tb.layout'], ['fit', 'tb.fit.t', 'F'],
    ['ddl', 'tb.ddl.t'], ['import', 'tb.import'], ['svg', 'tb.svg.t'],
    ['save', 'tb.save', '⌘S'], ['open', 'tb.open'], ['new', 'tb.new.t'],
    ['undo', 'tb.undo.t'], ['redo', 'tb.redo.t'],
  ].map(([a, key, hint]) => ({ label: t(key).replace(/\s*\(.*\)$/, ''), hint, svg: ICONS[a], run: actions[a] })),
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b && !b.closest('.palette')) actions[b.dataset.action]?.();
});

$('#import-file').addEventListener('click', async () => { $('#import-text').value = await readFile('.sql,.ddl,.txt'); });
$('#import-run').addEventListener('click', e => {
  e.preventDefault();
  const text = $('#import-text').value;
  if (!text.trim()) return toast(t('t.pasteDDL'), true);
  importDDL(text, $('#import-replace').checked);
});
$('#opt-comments').addEventListener('change', showDDL);
$('#opt-drop').addEventListener('change', showDDL);
$('#ddl-copy').addEventListener('click', e => { e.preventDefault(); navigator.clipboard.writeText($('#ddl-out').value).then(() => toast(t('t.copied'))); });
$('#ddl-download').addEventListener('click', e => { e.preventDefault(); download(fileName('sql'), $('#ddl-out').value); });

document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.code === 'KeyK') { e.preventDefault(); palette.isOpen ? palette.close() : palette.open(); return; }
  if (palette.isOpen) return;
  if (mod && e.code === 'KeyZ' && !typing) { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); }
  else if (mod && e.code === 'KeyY' && !typing) { e.preventDefault(); store.redo(); }
  else if (mod && e.code === 'KeyS') { e.preventDefault(); actions.save(); }
  else if (e.key === 'Escape' && diagram.mode === 'relation') setRelationMode(false);
  else if (e.key === 'Escape' && !typing && store.selection) store.select(null);
  else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && store.selection) {
    const s = store.selection;
    if (s.kind === 'table') store.deleteTable(s.id);
    else { store.update(m => { m.fks = m.fks.filter(f => f.id !== s.id); }); store.select(null); }
  } else if (!typing && !mod && !document.querySelector('dialog[open]')) {
    // e.code keeps shortcuts working on the Ukrainian layout
    const map = { KeyT: 'table', KeyR: 'relation', KeyF: 'fit', KeyV: 'select' };
    if (map[e.code]) actions[map[e.code]]();
    if (e.key === '/') { e.preventDefault(); sidebar.focus(); }
    if (e.key === '=' || e.key === '+') actions['zoom-in']();
    if (e.key === '-') actions['zoom-out']();
  }
});
window.addEventListener('resize', () => diagram.renderMinimap());

// ---------- start ----------
try { localStorage.removeItem('ferret-theme'); } catch {}
const restored = store.restore() && store.model.tables;
renderLang();
if (restored) { store.emit('load'); requestAnimationFrame(() => diagram.fit(false)); }
else actions.sample();
