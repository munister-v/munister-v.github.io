import { Store, newTable, nextTableName, newColumn, emptyModel, uid, uniqueName, TABLE_COLORS } from './model.js';
import { TEMPLATES } from './templates.js';
import { checkModel, fixFkIndexes } from './checks.js';
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
const panel = new Panel($('#panel'), store, { toast: (m, e) => toast(m, e), copyTableDDL: id => copyTableDDL(id) });
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
  if ($('#tpl-dialog').open) renderTemplates();
  if ($('#check-dialog').open) renderChecks();
  updateCheckBadge();
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
  new: () => openTemplates(),
  templates: () => openTemplates(),
  check: () => { renderChecks(); $('#check-dialog').showModal(); },
  png: () => exportPNG(),
  duplicate: () => { if (store.selection?.kind === 'table') duplicateTable(store.selection.id); },
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
    ['templates', 'tb.templates.t'], ['check', 'tb.check.t'], ['duplicate', 'cm.duplicate', '⌘D'], ['png', 'tb.png.t'],
    ['save', 'tb.save', '⌘S'], ['open', 'tb.open'],
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
  else if (mod && e.code === 'KeyD' && !typing) { e.preventDefault(); actions.duplicate(); }
  else if (mod && e.code === 'KeyC' && !typing && store.selection?.kind === 'table' && !getSelection().toString()) { copyTables([store.selection.id]); }
  else if (e.key.startsWith('Arrow') && !typing && !mod && store.selection?.kind === 'table' && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    const step = e.shiftKey ? 50 : 10;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    const tb = store.table(store.selection.id);
    store.update(() => { tb.x += dx; tb.y += dy; }, 'move');
  }
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

// ---------- templates ----------
function openTemplates() { renderTemplates(); $('#tpl-dialog').showModal(); }
function renderTemplates() {
  const lang = getLang();
  const preview = n => Array.from({ length: Math.min(n, 8) }, (_, i) => `<i class="c-${TABLE_COLORS[(i % 6) + 1]}"></i>`).join('');
  $('#tpl-grid').innerHTML = `
    <article class="tpl blank">
      <div class="tpl-art"><span>+</span></div>
      <h3>${t('tpl.blank')}</h3><p>${t('tpl.blankDesc')}</p>
      <div class="tpl-actions"><button class="primary" type="button" data-tpl="blank">${t('tpl.open')}</button></div>
    </article>` + TEMPLATES.map(tp => `
    <article class="tpl">
      <div class="tpl-art"><em>${tp.icon}</em><div class="tpl-mini">${preview(tp.tables)}</div></div>
      <h3>${esc(tp.name[lang] || tp.name.en)}</h3>
      <p>${esc(tp.desc[lang] || tp.desc.en)}</p>
      <span class="tpl-meta">${t('tpl.tables', { n: tp.tables })}</span>
      <div class="tpl-actions">
        <button class="primary" type="button" data-tpl="${tp.id}">${t('tpl.open')}</button>
        <button class="secondary" type="button" data-tpl-add="${tp.id}">${t('tpl.add')}</button>
      </div>
    </article>`).join('');
}
$('#tpl-grid').addEventListener('click', e => {
  const open = e.target.closest('[data-tpl]'), add = e.target.closest('[data-tpl-add]');
  if (!open && !add) return;
  $('#tpl-dialog').close();
  if (open?.dataset.tpl === 'blank') { store.load(emptyModel()); diagram.fit(); return; }
  const tp = TEMPLATES.find(x => x.id === (open || add).dataset[open ? 'tpl' : 'tplAdd']);
  const name = tp.name[getLang()] || tp.name.en;
  importDDL(tp.ddl, !!open);
  if (open) store.update(m => { m.name = name; }, 'panel');
  // colour tables of a freshly opened template so the diagram reads at a glance
  if (open) store.update(m => m.tables.forEach((x, i) => { x.color = TABLE_COLORS[(i % 6) + 1]; }), 'load');
  toast(t('t.tplLoaded', { n: name }));
});

// ---------- checks ----------
function renderChecks() {
  const issues = checkModel(store.model);
  const groups = ['error', 'warn', 'info'].map(level => [level, issues.filter(x => x.level === level)]).filter(([, l]) => l.length);
  $('#chk-list').innerHTML = !issues.length
    ? `<div class="chk-ok"><span>✓</span>${t('chk.ok')}</div>`
    : groups.map(([level, list]) => `
      <section class="chk-group ${level}">
        <h4><i></i>${t(`chk.${level}`)} <span class="count">${list.length}</span></h4>
        <ul>${list.map(x => `<li data-kind="${x.target.kind}" data-id="${x.target.id}">${esc(x.text)}</li>`).join('')}</ul>
      </section>`).join('');
  $('#chk-fix').hidden = !issues.some(x => x.text && x.target.kind === 'fk' && /index|індекс/i.test(x.text));
  updateCheckBadge(issues);
}
$('#chk-list').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  $('#check-dialog').close();
  if (li.dataset.kind === 'table') pick(li.dataset.id);
  else {
    const f = store.model.fks.find(x => x.id === li.dataset.id);
    store.select({ kind: 'fk', id: li.dataset.id });
    if (f) diagram.centerOn(f.fromTable);
  }
});
$('#chk-fix').addEventListener('click', () => {
  let n = 0;
  store.update(m => { n = fixFkIndexes(m, uid, uniqueName); });
  toast(t('chk.fixed', { n }));
  renderChecks();
});
let badgeTimer;
function updateCheckBadge(issues) {
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    const n = (issues || checkModel(store.model)).filter(x => x.level !== 'info').length;
    const b = $('#check-badge');
    b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
  }, issues ? 0 : 250);
}
store.subscribe(r => { if (r !== 'select' && r !== 'move') updateCheckBadge(); });

// ---------- duplicate / copy / paste ----------
function cloneTables(tables, fks, offset = 40) {
  const model = store.model;
  const idMap = new Map();
  const names = new Set(model.tables.map(x => x.name));
  const out = tables.map(src => {
    const tb = structuredClone(src);
    const newId = uid('t');
    idMap.set(src.id, newId);
    tb.id = newId;
    let name = `${src.name}_COPY`, i = 2;
    while (names.has(name)) name = `${src.name}_COPY${i++}`;
    names.add(name); tb.name = name;
    tb.x += offset; tb.y += offset;
    tb.columns.forEach(c => { const nid = uid('c'); idMap.set(c.id, nid); c.id = nid; });
    tb.uniques.forEach(u => { u.id = uid('u'); u.name = uniqueName(model, `${name}_UN`); u.columns = u.columns.map(id => idMap.get(id)).filter(Boolean); });
    tb.indexes.forEach(ix => { ix.id = uid('i'); ix.name = uniqueName(model, `${name}_IDX`); ix.columns = ix.columns.map(id => idMap.get(id)).filter(Boolean); });
    return tb;
  });
  // keep FKs whose parent is inside the copy or still exists in the model
  const newFks = fks.filter(f => idMap.has(f.fromTable)).map(f => {
    const parentInside = idMap.has(f.toTable);
    if (!parentInside && !model.tables.some(x => x.id === f.toTable)) return null;
    return {
      ...structuredClone(f), id: uid('f'), name: uniqueName(model, `${f.name}_COPY`),
      fromTable: idMap.get(f.fromTable), toTable: parentInside ? idMap.get(f.toTable) : f.toTable,
      columns: f.columns.map(p => ({ from: idMap.get(p.from), to: parentInside ? idMap.get(p.to) : p.to })),
    };
  }).filter(Boolean);
  return { tables: out, fks: newFks };
}
function insertTables({ tables, fks }) {
  store.update(m => { m.tables.push(...tables); m.fks.push(...fks); });
  if (tables.length) store.select({ kind: 'table', id: tables[0].id });
}
function duplicateTable(id) {
  const tb = store.table(id);
  if (!tb) return;
  insertTables(cloneTables([tb], store.model.fks));
  toast(t('t.duplicated'));
}
let clipboard = null;
function copyTables(ids) {
  const tables = store.model.tables.filter(x => ids.includes(x.id));
  clipboard = { tables: structuredClone(tables), fks: structuredClone(store.model.fks.filter(f => ids.includes(f.fromTable))) };
  navigator.clipboard?.writeText(JSON.stringify({ schemata: 'tables', ...clipboard })).catch(() => {});
  toast(t('t.copiedTables'));
}
function pasteTables(data, at) {
  const res = cloneTables(data.tables, data.fks, at ? 0 : 40);
  if (at && res.tables.length) {
    const dx = at.x - res.tables[0].x, dy = at.y - res.tables[0].y;
    res.tables.forEach(x => { x.x = Math.round((x.x + dx) / 10) * 10; x.y = Math.round((x.y + dy) / 10) * 10; });
  }
  insertTables(res);
  toast(t('t.pasted', { n: res.tables.length }));
}
document.addEventListener('paste', e => {
  if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.querySelector('dialog[open]')) return;
  const text = e.clipboardData?.getData('text') || '';
  try {
    const data = JSON.parse(text);
    if (data?.schemata === 'tables') { e.preventDefault(); pasteTables(data); return; }
  } catch {}
  if (/\bCREATE\s+TABLE\b/i.test(text)) { e.preventDefault(); importDDL(text, false); return; }
  if (clipboard) { e.preventDefault(); pasteTables(clipboard); }
});
function copyTableDDL(id) {
  const tb = store.table(id);
  const sql = generateDDL({ name: store.model.name, tables: [tb], fks: store.model.fks.filter(f => f.fromTable === id) });
  navigator.clipboard.writeText(sql.split('\n').slice(4).join('\n')).then(() => toast(t('t.ddlCopied')));
}

// ---------- context menu ----------
const ctx = $('#ctx');
function closeCtx() { ctx.hidden = true; }
$('#canvas').addEventListener('contextmenu', e => {
  e.preventDefault();
  const tg = e.target.closest('.table');
  const at = diagram.toWorld(e);
  const item = (label, run, cls = '', kbd = '') => ({ label, run, cls, kbd });
  let items;
  if (tg) {
    const id = tg.dataset.id;
    store.select({ kind: 'table', id });
    items = [
      item(t('cm.addCol'), () => { const tb = store.table(id); store.update(() => tb.columns.push(newColumn(`COLUMN_${tb.columns.length + 1}`))); }),
      item(t('cm.relFrom'), () => { setRelationMode(true); diagram.relFrom = id; diagram.render(); }, '', 'R'),
      '-',
      item(t('cm.duplicate'), () => duplicateTable(id), '', '⌘D'),
      item(t('cm.copy'), () => copyTables([id]), '', '⌘C'),
      item(t('cm.ddl'), () => copyTableDDL(id)),
      { colors: id },
      '-',
      item(t('cm.delete'), () => store.deleteTable(id), 'danger', 'Del'),
    ];
  } else {
    items = [
      item(t('cm.newTable'), () => addTable(at), '', 'T'),
      item(t('cm.paste'), () => clipboard && pasteTables(clipboard, at), clipboard ? '' : 'disabled', '⌘V'),
      '-',
      item(t('cm.layout'), actions.layout),
      item(t('cm.fit'), actions.fit, '', 'F'),
    ];
  }
  ctx.innerHTML = items.map((it, i) => it === '-' ? '<hr>'
    : it.colors ? `<div class="ctx-colors">${TABLE_COLORS.map(c => `<button class="sw${c ? ` c-${c}` : ''}${(store.table(it.colors).color || '') === c ? ' on' : ''}" data-color="${c}"></button>`).join('')}</div>`
    : `<button data-i="${i}" class="${it.cls}"${it.cls === 'disabled' ? ' disabled' : ''}><span>${esc(it.label)}</span>${it.kbd ? `<kbd>${it.kbd}</kbd>` : ''}</button>`).join('');
  ctx.onclick = ev => {
    const sw = ev.target.closest('[data-color]');
    if (sw) { const tb = store.table(tg.dataset.id); store.update(() => { tb.color = sw.dataset.color; }); closeCtx(); return; }
    const b = ev.target.closest('[data-i]');
    if (b) { closeCtx(); items[+b.dataset.i].run(); }
  };
  ctx.hidden = false;
  const r = ctx.getBoundingClientRect();
  ctx.style.left = `${Math.min(e.clientX, innerWidth - r.width - 8)}px`;
  ctx.style.top = `${Math.min(e.clientY, innerHeight - r.height - 8)}px`;
});
document.addEventListener('pointerdown', e => { if (!ctx.hidden && !ctx.contains(e.target)) closeCtx(); });
window.addEventListener('blur', closeCtx);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCtx(); }, true);

// ---------- drag & drop files ----------
let dragDepth = 0;
window.addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')) { dragDepth++; $('#drop').hidden = false; } });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#drop').hidden = true; } });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', async e => {
  e.preventDefault(); dragDepth = 0; $('#drop').hidden = true;
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const text = await file.text();
  if (/\.json$/i.test(file.name)) {
    try { store.load(JSON.parse(text)); diagram.fit(); toast(t('t.opened')); } catch (err) { toast(t('t.openFail', { e: err.message }), true); }
  } else importDDL(text, !store.model.tables.length);
});

// ---------- PNG export ----------
function exportPNG() {
  const svg = diagram.exportSVG();
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  img.onload = () => {
    const scale = 2;
    const c = Object.assign(document.createElement('canvas'), { width: img.width * scale, height: img.height * scale });
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.scale(scale, scale); g.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    c.toBlob(b => {
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(b), download: fileName('png') });
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  };
  img.src = url;
}

// ---------- start ----------
try { localStorage.removeItem('ferret-theme'); } catch {}
const restored = store.restore() && store.model.tables;
renderLang();
if (restored) { store.emit('load'); requestAnimationFrame(() => diagram.fit(false)); }
else {
  // first visit: open the online-store template, coloured
  const tp = TEMPLATES[0];
  importDDL(tp.ddl, true);
  store.model.name = tp.name[getLang()] || tp.name.en;
  store.model.tables.forEach((x, i) => { x.color = TABLE_COLORS[(i % 6) + 1]; });
  store.undoStack = [];
  store.emit('load');
}
