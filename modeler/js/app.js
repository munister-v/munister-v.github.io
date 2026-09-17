import { Store, newTable, nextTableName, newColumn, newSequence, newView, emptyModel, uid, uniqueName, TABLE_COLORS } from './model.js?v=202609172122';
import { TEMPLATES, COLUMN_PRESETS } from './templates.js?v=202609172122';
import { checkModel, fixFkIndexes } from './checks.js?v=202609172122';
import { Diagram, tableSize, viewSize, resolveOverlaps } from './diagram.js?v=202609172122';
import { DiagramTabs } from './diagrams-ui.js?v=202609172122';
import { Panel } from './panel.js?v=202609172122';
import { Sidebar } from './sidebar.js?v=202609172122';
import { Palette } from './palette.js?v=202609172122';
import { generateDDL, viewDDL } from './ddl-gen.js?v=202609172122';
import { parseDDL } from './ddl-parse.js?v=202609172122';
import { SAMPLE_DDL } from './sample.js?v=202609172122';
import { initWorkspace } from './workspace.js?v=202609172122';
import { diffModels } from './diff.js?v=202609172122';
import { dictionaryHTML, dictionaryMarkdown } from './docs.js?v=202609172122';
import { migrateModel, listSnapshots } from './storage.js?v=202609172122';
import { t, getLang, setLang, onLang, applyStatic } from './i18n.js?v=202609172122';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const store = new Store();

const diagram = new Diagram($('#canvas'), store, {
  onAddTable: p => addTable(p),
  onRelation: (child, parent, e) => openMenu(e.clientX, e.clientY, relationTypeItems(child, parent)),
  onAddField: id => openFieldEditor(id, null),
  onEditColumn: (id, colId) => openFieldEditor(id, colId),
  onRenameTable: id => openRenameTable(id),
  onEditView: id => { store.select({ kind: 'view', id }); setTimeout(() => $('#panel .sql-edit')?.focus()); },
  onZoom: k => { $('#zoom').textContent = `${Math.round(k * 100)}%`; },
  minimap: $('#minimap'),
});
const diagramTabs = new DiagramTabs($('#diagram-tabs'), store, {
  openMenu: (x, y, items) => openMenu(x, y, items),
  onSwitch: () => { diagram.render(); diagram.fit(false); },
});
const panel = new Panel($('#panel'), store, { toast: (m, e) => toast(m, e), copyTableDDL: id => copyTableDDL(id) });
const pick = id => { store.select({ kind: 'table', id }); diagram.centerOn(id); };
const sidebar = new Sidebar($('#sidebar'), store, { onPick: pick });
sidebar.onPickObject = (kind, id) => { store.select({ kind, id }); if (kind === 'view') diagram.centerOn(id); };
sidebar.onAddObject = kind => kind === 'view' ? addView() : addSequence();
sidebar.onPickFk = id => { const f = store.model.fks.find(x => x.id === id); store.select({ kind: 'fk', id }); if (f) diagram.centerOn(f.fromTable); };

// ---------- model name + saved indicator ----------
const nameInput = $('#model-name');
nameInput.addEventListener('change', () => {
  const v = nameInput.value.trim() || t('model.default');
  store.update(m => { m.name = v; });
});
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); });
store.subscribe(() => { if (document.activeElement !== nameInput) nameInput.value = store.model.name; });

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
  store.update(m => {
    m.tables.push(tb);
    const d = m.diagrams?.find(x => x.id === m.activeDiagram) || m.diagrams?.[0];
    if (d) {
      d.tableIds ||= [];
      d.tableIds.push(tb.id);
      d.positions ||= {};
      d.positions[tb.id] = { x: tb.x, y: tb.y };
    }
  });
  store.select({ kind: 'table', id: tb.id });
  setTimeout(() => $('#panel input[data-f="table.name"]')?.select());
}

export function autoLayout(model, st = store) {
  const visibleTables = st ? model.tables.filter(t => st.isItemOnActiveDiagram(t.id)) : model.tables;
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
  visibleTables.forEach(tb => depth(tb.id));
  const cols = [];
  visibleTables.forEach(tb => (cols[level.get(tb.id)] ||= []).push(tb));
  let x = 40;
  for (const col of cols.filter(Boolean)) {
    let y = 40, w = 0;
    for (const tb of col) {
      const s = tableSize(tb);
      if (st) st.setPos(tb.id, x, y);
      else { tb.x = x; tb.y = y; }
      y += s.h + 56;
      w = Math.max(w, s.w);
    }
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
  const base = replace ? { tables: [], fks: [], views: [], sequences: [] } : structuredClone({ tables: store.model.tables, fks: store.model.fks, views: store.model.views || [], sequences: store.model.sequences || [] });
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
    // views without a position go to the right of everything
    const placed = new Set(replace ? [] : (m.views || []).map(v => v.id));
    const freshViews = model.views.filter(v => !placed.has(v.id));
    if (freshViews.length) {
      let y = 40;
      const x = Math.max(0, ...model.tables.map(t => t.x + tableSize(t).w), ...(replace ? [] : m.views || []).map(v => v.x + viewSize(v).w)) + 160;
      freshViews.forEach(v => { v.x = x; v.y = y; y += viewSize(v).h + 48; });
    }
    m.tables = model.tables; m.fks = model.fks; m.views = model.views; m.sequences = model.sequences;
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
    try { ws.create(migrateModel(JSON.parse(await readFile('.json,application/json')))); toast(t('t.opened')); }
    catch (e) { toast(t('t.openFail', { e: e.message }), true); }
  },
  save: () => download(fileName('schemata.json'), JSON.stringify(store.model, null, 2), 'application/json'),
  import: () => { $('#import-log').innerHTML = ''; $('#import-dialog').showModal(); },
  ddl: showDDL,
  svg: () => download(fileName('svg'), diagram.exportSVG(), 'image/svg+xml'),
  select: () => setRelationMode(false),
  table: () => addTable(),
  relation: () => setRelationMode(diagram.mode !== 'relation'),
  zone: () => {
    const c = diagram.center();
    store.addZone(t('zone.default'), 'blue', Math.round((c.x - 200) / 10) * 10, Math.round((c.y - 140) / 10) * 10);
    diagram.render();
  },
  'no-overlaps': () => {
    const visibleTables = store.model.tables.filter(t => store.isItemOnActiveDiagram(t.id));
    store.checkpoint();
    resolveOverlaps(visibleTables, id => store.posOf(id), (id, x, y) => store.setPos(id, x, y));
    store.emit('load');
    store.persist();
    toast(t('tb.noOverlaps.t'));
  },
  layout: () => { store.update(m => autoLayout(m, store), 'load'); diagram.fit(); },
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
    ['table', 'tb.table', 'T'], ['relation', 'tb.relation', 'R'], ['zone', 'tb.zone.t', 'Z'],
    ['layout', 'tb.layout'], ['no-overlaps', 'tb.noOverlaps.t'], ['fit', 'tb.fit.t', 'F'],
    ['ddl', 'tb.ddl.t'], ['import', 'tb.import'], ['svg', 'tb.svg.t'],
    ['templates', 'tb.templates.t'], ['check', 'tb.check.t'], ['duplicate', 'cm.duplicate', '⌘D'], ['png', 'tb.png.t'],
    ['newView', 'cm.newView'], ['newSequence', 'cm.newSeq'],
    ['migrate', 'tb.migrate.t'], ['export', 'tb.export.t'],
    ['projects', 'ws.projects'], ['history', 'ws.history'], ['snapshot', 'ws.saveVersion'], ['settings', 'ws.settings'], ['shortcuts', 'ws.shortcuts', '?'],
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
  else if (e.key.startsWith('Arrow') && !typing && !mod && ['table', 'view', 'multi'].includes(store.selection?.kind) && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    const step = e.shiftKey ? 50 : 10;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    if (store.selection.kind === 'multi') {
      store.silent(() => {
        store.selection.ids.forEach(id => {
          const p = store.posOf(id);
          store.setPos(id, p.x + dx, p.y + dy);
        });
      }, 'move');
    } else {
      const id = store.selection.id;
      const p = store.posOf(id);
      store.silent(() => { store.setPos(id, p.x + dx, p.y + dy); }, 'move');
    }
  }
  else if (e.key === 'Escape' && diagram.mode === 'relation') setRelationMode(false);
  else if (e.key === 'Escape' && !typing && store.selection) store.select(null);
  else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && store.selection) {
    const s = store.selection;
    if (s.kind === 'table') store.deleteTable(s.id);
    else if (s.kind === 'view') store.deleteView(s.id);
    else if (s.kind === 'seq') store.deleteSequence(s.id);
    else if (s.kind === 'zone') store.deleteZone(s.id);
    else if (s.kind === 'multi') {
      const ids = [...(s.ids || [])];
      store.update(m => {
        ids.forEach(id => {
          m.tables = m.tables.filter(t => t.id !== id);
          m.views = (m.views || []).filter(v => v.id !== id);
          m.fks = m.fks.filter(f => f.fromTable !== id && f.toTable !== id);
          (m.diagrams || []).forEach(d => {
            d.tableIds = (d.tableIds || []).filter(tid => tid !== id);
            d.viewIds = (d.viewIds || []).filter(vid => vid !== id);
            if (d.positions) delete d.positions[id];
          });
        });
      });
      store.select(null);
    }
    else { store.update(m => { m.fks = m.fks.filter(f => f.id !== s.id); }); store.select(null); }
  } else if (!typing && !mod && !document.querySelector('dialog[open]')) {
    // e.code keeps shortcuts working on the Ukrainian layout
    const map = { KeyT: 'table', KeyR: 'relation', KeyF: 'fit', KeyV: 'select' };
    if (map[e.code]) actions[map[e.code]]();
    if (e.key === '/') { e.preventDefault(); sidebar.focus(); }
    if (e.key === '?') { e.preventDefault(); actions.shortcuts(); }
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
  if (open?.dataset.tpl === 'blank') { ws.create(emptyModel()); toast(t('ws.created')); return; }
  const tp = TEMPLATES.find(x => x.id === (open || add).dataset[open ? 'tpl' : 'tplAdd']);
  const name = tp.name[getLang()] || tp.name.en;
  if (open) { ws.create(templateModel(tp)); toast(t('t.tplLoaded', { n: name })); return; }
  importDDL(tp.ddl, false);
  // colour tables of a freshly opened template so the diagram reads at a glance
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
  else if (li.dataset.kind === 'view') { store.select({ kind: 'view', id: li.dataset.id }); diagram.centerOn(li.dataset.id); }
  else if (li.dataset.kind === 'seq') store.select({ kind: 'seq', id: li.dataset.id });
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
  store.update(m => {
    m.tables.push(...tables);
    m.fks.push(...fks);
    const d = m.diagrams?.find(x => x.id === m.activeDiagram) || m.diagrams?.[0];
    if (d) {
      d.tableIds ||= [];
      d.positions ||= {};
      tables.forEach(t => {
        if (!d.tableIds.includes(t.id)) d.tableIds.push(t.id);
        d.positions[t.id] = { x: t.x, y: t.y };
      });
    }
  });
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

// ---------- views & sequences ----------
function uniqueObjectName(base) {
  const taken = new Set([...store.model.tables, ...(store.model.views || []), ...(store.model.sequences || [])].map(x => x.name));
  let name = base, i = 2;
  while (taken.has(name)) name = `${base}_${i++}`;
  return name;
}
function addView(at = diagram.center(), fromTableId = null) {
  const src = fromTableId && store.table(fromTableId);
  const sql = src
    ? `SELECT ${src.columns.filter(c => !c.virtual).map(c => c.name.toLowerCase()).join(',\n       ')}\n  FROM ${src.name.toLowerCase()}`
    : 'SELECT *\n  FROM ';
  const v = newView(uniqueObjectName(src ? `V_${src.name}` : 'V_NEW'), sql, Math.round(at.x / 10) * 10, Math.round(at.y / 10) * 10);
  store.update(m => {
    (m.views ||= []).push(v);
    const d = m.diagrams?.find(x => x.id === m.activeDiagram) || m.diagrams?.[0];
    if (d) {
      d.viewIds ||= [];
      d.viewIds.push(v.id);
      d.positions ||= {};
      d.positions[v.id] = { x: v.x, y: v.y };
    }
  });
  store.select({ kind: 'view', id: v.id });
  setTimeout(() => $('#panel .sql-edit')?.focus());
}
function addSequence(forTableId = null) {
  const tb = forTableId && store.table(forTableId);
  const q = newSequence(uniqueObjectName(tb ? `${tb.name}_SEQ` : 'NEW_SEQ'));
  store.update(m => {
    (m.sequences ||= []).push(q);
    // wire the single-column primary key to the new sequence
    const pk = tb?.columns.filter(c => c.pk);
    if (pk?.length === 1) Object.assign(pk[0], { identity: false, default: `${q.name}.NEXTVAL` });
  });
  store.select({ kind: 'seq', id: q.id });
  toast(t('t.seqCreated', { n: q.name }));
}
actions.newView = () => addView();
actions.newSequence = () => addSequence();

// ---------- relations ----------
function createRelation(child, parent, opts) {
  try {
    const id = store.addRelation(child, parent, opts);
    store.select({ kind: 'fk', id });
    toast(t('t.relCreated'));
  } catch (e) { toast(e.message, true); }
}
function createJunction(a, b) {
  try {
    const id = store.addJunction(a, b);
    store.select({ kind: 'table', id });
    toast(t('t.junction', { t: store.table(id).name }));
  } catch (e) { toast(e.message, true); }
}
function relationTypeItems(child, parent, extra = {}) {
  const a = store.table(child), b = store.table(parent);
  return [
    { header: t('rel.pick', { a: a.name, b: b.name }) },
    { label: t('rel.1n'), icon: '⟜', run: () => createRelation(child, parent, extra) },
    { label: t('rel.1nm'), icon: '⊸', run: () => createRelation(child, parent, { ...extra, mandatory: true }) },
    { label: t('rel.11'), icon: '─', run: () => createRelation(child, parent, { ...extra, kind: '11' }) },
    { label: t('rel.ident'), icon: '⊷', run: () => createRelation(child, parent, { ...extra, identifying: true }) },
    ...(child !== parent ? ['-', { label: t('rel.mn'), icon: '⋈', run: () => createJunction(child, parent) }] : []),
  ];
}

// ---------- inline field editor ----------
const guessType = name => {
  const n = name.toUpperCase();
  if (/(^|_)ID$/.test(n)) return 'NUMBER';
  if (/_AT$|TIMESTAMP/.test(n)) return 'TIMESTAMP';
  if (/_(DATE|ON)$|^DATE_|BIRTH/.test(n)) return 'DATE';
  if (/^(IS|HAS|CAN)_/.test(n)) return 'CHAR(1)';
  if (/EMAIL/.test(n)) return 'VARCHAR2(255 CHAR)';
  if (/PHONE/.test(n)) return 'VARCHAR2(20 CHAR)';
  if (/PRICE|AMOUNT|TOTAL|SUM|BALANCE|SALARY|COST/.test(n)) return 'NUMBER(12,2)';
  if (/QTY|QUANTITY|COUNT|NUMBER|_NO$|YEAR|AGE/.test(n)) return 'NUMBER(10)';
  if (/DESCRIPTION|NOTE|COMMENT|TEXT|BODY/.test(n)) return 'VARCHAR2(4000 CHAR)';
  if (/CODE|STATUS|TYPE|KIND/.test(n)) return 'VARCHAR2(30 CHAR)';
  if (/CURRENCY/.test(n)) return 'CHAR(3)';
  if (/JSON|ATTRIBUTES|PAYLOAD/.test(n)) return 'JSON';
  return 'VARCHAR2(100 CHAR)';
};
// CUSTOMER_ID → CUSTOMERS / CUSTOMER table with a single-column PK
function findParentFor(tableId, name) {
  const m = name.toUpperCase().match(/^(.+)_ID$/);
  if (!m) return null;
  const base = m[1];
  const cands = [base, `${base}S`, `${base}ES`, base.replace(/Y$/, 'IES')];
  return store.model.tables.find(x => x.id !== tableId && cands.includes(x.name.toUpperCase()) && x.columns.filter(c => c.pk).length === 1) || null;
}

const editor = document.createElement('div');
editor.className = 'field-editor';
editor.hidden = true;
editor.innerHTML = `
  <div class="fe-row">
    <input class="fe-name mono" spellcheck="false" autocomplete="off">
    <input class="fe-type mono" list="oracle-types" spellcheck="false" autocomplete="off">
    <label class="tog" title="PK"><input type="checkbox" class="fe-pk"><span>PK</span></label>
    <label class="tog" title="NOT NULL"><input type="checkbox" class="fe-nn"><span>NN</span></label>
  </div>
  <div class="fe-hint"></div>`;
document.querySelector('.stage').append(editor);
const fe = { name: editor.querySelector('.fe-name'), type: editor.querySelector('.fe-type'), pk: editor.querySelector('.fe-pk'), nn: editor.querySelector('.fe-nn'), hint: editor.querySelector('.fe-hint') };
let feState = null;

function placeEditor(tb, rowIndex, header = false) {
  const s = tableSize(tb), k = diagram.view.k;
  const x = diagram.view.x + tb.x * k, y = diagram.view.y + (tb.y + (header ? 4 : 42 + rowIndex * 24)) * k;
  editor.style.left = `${Math.max(8, x - 6)}px`;
  editor.style.top = `${Math.max(8, y - 6)}px`;
  editor.style.minWidth = `${Math.max(300, s.w * k + 12)}px`;
}
function openFieldEditor(tableId, colId, insertAt = null) {
  const tb = store.table(tableId);
  if (!tb) return;
  closeCtx();
  store.select({ kind: 'table', id: tableId });
  const col = colId && tb.columns.find(c => c.id === colId);
  const index = col ? tb.columns.indexOf(col) : (insertAt ?? tb.columns.length);
  feState = { tableId, colId: col?.id || null, index, typeTouched: !!col, mode: 'field' };
  editor.classList.remove('rename');
  fe.name.value = col?.name || '';
  fe.name.placeholder = t('ie.name');
  fe.type.value = col?.type || '';
  fe.type.placeholder = t('ie.type');
  fe.pk.checked = !!col?.pk; fe.nn.checked = col ? (!col.nullable || col.pk) : false;
  fe.hint.textContent = col ? t('ie.hintEdit') : t('ie.hint');
  placeEditor(tb, index);
  editor.hidden = false;
  requestAnimationFrame(() => { fe.name.focus(); fe.name.select(); });
}
function openRenameTable(tableId) {
  const tb = store.table(tableId);
  closeCtx();
  store.select({ kind: 'table', id: tableId });
  feState = { tableId, mode: 'rename' };
  editor.classList.add('rename');
  fe.name.value = tb.name;
  fe.hint.textContent = t('ie.hintEdit');
  placeEditor(tb, 0, true);
  editor.hidden = false;
  requestAnimationFrame(() => { fe.name.focus(); fe.name.select(); });
}
function closeEditor() { editor.hidden = true; feState = null; }

function commitEditor(next) {
  const st = feState;
  if (!st) return;
  const tb = store.table(st.tableId);
  const name = fe.name.value.trim().toUpperCase().replace(/\s+/g, '_');
  if (st.mode === 'rename') {
    if (name && tb) store.update(() => { tb.name = name; });
    closeEditor();
    return;
  }
  if (!name) { closeEditor(); return; }
  const type = (fe.type.value.trim() || guessType(name)).toUpperCase();
  let autoParent = null;
  if (st.colId) {
    const col = tb.columns.find(c => c.id === st.colId);
    store.update(() => {
      Object.assign(col, { name, type, pk: fe.pk.checked });
      col.nullable = !(fe.nn.checked || fe.pk.checked);
    });
    closeEditor();
    return;
  }
  const col = newColumn(name, type);
  col.pk = fe.pk.checked;
  col.nullable = !(fe.nn.checked || fe.pk.checked);
  autoParent = findParentFor(tb.id, name);
  if (autoParent && !fe.type.value.trim()) col.type = autoParent.columns.find(c => c.pk).type;
  store.update(() => tb.columns.splice(st.index, 0, col));
  if (autoParent && !store.model.fks.some(f => f.fromTable === tb.id && f.toTable === autoParent.id)) {
    store.addRelation(tb.id, autoParent.id, { columnId: col.id, mandatory: !col.nullable });
    toast(t('t.autoFk', { c: name, t: autoParent.name }));
  }
  if (next) openFieldEditor(tb.id, null, st.index + 1);
  else closeEditor();
}
fe.name.addEventListener('input', () => {
  if (feState?.mode === 'field' && !feState.typeTouched) fe.type.placeholder = guessType(fe.name.value || 'X');
});
fe.type.addEventListener('input', () => { if (feState) feState.typeTouched = true; });
editor.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); commitEditor(!feState?.colId && feState?.mode === 'field'); }
  else if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
});
document.addEventListener('pointerdown', e => { if (!editor.hidden && !editor.contains(e.target)) commitEditor(false); }, true);
$('#canvas').addEventListener('wheel', () => { if (!editor.hidden) closeEditor(); });

// ---------- column operations ----------
function colOp(tableId, colId, fn) {
  const tb = store.table(tableId);
  const i = tb.columns.findIndex(c => c.id === colId);
  if (i >= 0) store.update(m => fn(tb, tb.columns[i], i, m));
}

// ---------- context menu ----------
const ctx = $('#ctx');
let ctxSub = null;
function closeCtx() { ctx.hidden = true; ctxSub?.remove(); ctxSub = null; }

function renderMenu(el, items) {
  el.innerHTML = items.map((it, i) => {
    if (it === '-') return '<hr>';
    if (it.header) return `<div class="ctx-head">${esc(it.header)}</div>`;
    if (it.colors) return `<div class="ctx-colors">${TABLE_COLORS.map(c => `<button class="sw${c ? ` c-${c}` : ''}${it.value === c ? ' on' : ''}" data-color="${c}" data-i="${i}"></button>`).join('')}</div>`;
    if (it.note) return `<div class="ctx-note">${esc(it.note)}</div>`;
    const check = it.checked !== undefined ? `<span class="ctx-check">${it.checked ? '✓' : ''}</span>` : `<span class="ctx-ic">${it.icon || ''}</span>`;
    return `<button data-i="${i}" class="${it.danger ? 'danger' : ''}${it.sub ? ' has-sub' : ''}"${it.disabled ? ' disabled' : ''}>${check}<span class="ctx-label">${esc(it.label)}</span>${it.kbd ? `<kbd>${it.kbd}</kbd>` : ''}${it.sub ? '<i class="ctx-arrow">›</i>' : ''}</button>`;
  }).join('');
}
function positionMenu(el, x, y) {
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`;
  el.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
}
function openMenu(x, y, items) {
  closeCtx();
  renderMenu(ctx, items);
  ctx.hidden = false;
  positionMenu(ctx, x, y);
  const act = (menuEl, list, ev) => {
    const b = ev.target.closest('[data-i]');
    if (!b || b.disabled) return;
    const it = list[+b.dataset.i];
    if (it.colors) { closeCtx(); it.run(b.dataset.color); return; }
    if (it.sub) return;
    closeCtx(); it.run?.();
  };
  ctx.onclick = ev => act(ctx, items, ev);
  ctx.onpointerover = ev => {
    const b = ev.target.closest('button[data-i]');
    if (!b) return;
    const it = items[+b.dataset.i];
    if (!it?.sub) { if (ctxSub && !b.classList.contains('open')) { ctxSub.remove(); ctxSub = null; ctx.querySelector('.open')?.classList.remove('open'); } return; }
    if (b.classList.contains('open')) return;
    ctx.querySelector('.open')?.classList.remove('open');
    ctxSub?.remove();
    b.classList.add('open');
    const sub = typeof it.sub === 'function' ? it.sub() : it.sub;
    ctxSub = document.createElement('div');
    ctxSub.className = 'ctx sub';
    renderMenu(ctxSub, sub);
    document.body.append(ctxSub);
    const r = b.getBoundingClientRect();
    const w = ctxSub.getBoundingClientRect().width;
    positionMenu(ctxSub, r.right + w + 12 > innerWidth ? r.left - w - 4 : r.right + 2, r.top - 5);
    ctxSub.onclick = ev => act(ctxSub, sub, ev);
  };
}

const tablesWithPk = exceptId => store.model.tables.filter(x => x.id !== exceptId && x.columns.some(c => c.pk)).sort((a, b) => a.name.localeCompare(b.name));
const tableList = (exceptId, run) => {
  const list = tablesWithPk(exceptId).map(x => ({ label: x.name, icon: `<span class="dot${x.color ? ` c-${x.color}` : ''}"></span>`, run: () => run(x.id) }));
  return list.length ? list : [{ note: t('cm.noTables') }];
};

function tableMenu(id, at) {
  const tb = store.table(id);
  return [
    { header: tb.name },
    { label: t('cm.addField'), icon: '＋', kbd: '2×', run: () => openFieldEditor(id, null) },
    { label: t('cm.quick'), icon: '⚡', sub: () => COLUMN_PRESETS.map(p => ({ label: p.label[getLang()] || p.label.en, run: () => applyPreset(id, p) })) },
    { label: t('cm.rename'), icon: '✎', run: () => openRenameTable(id) },
    '-',
    { label: t('cm.relTo'), icon: '⟜', sub: () => tableList(id, pid => openMenu(at.cx, at.cy, relationTypeItems(id, pid))) },
    { label: t('cm.mnWith'), icon: '⋈', sub: () => tableList(id, pid => createJunction(id, pid)) },
    { label: t('cm.viewFrom'), icon: 'V', run: () => addView({ x: tb.x + tableSize(tb).w + 80, y: tb.y }, id) },
    { label: t('cm.seqFor'), icon: 'S', disabled: tb.columns.filter(c => c.pk).length !== 1, run: () => addSequence(id) },
    { label: t('cm.addCheck'), icon: '✓', run: () => { store.update(m => { tb.checks ||= []; tb.checks.push({ id: uid('k'), name: uniqueName(m, `${tb.name}_CK`), expr: '' }); }); } },
    { label: t('cm.relFrom'), icon: '↗', kbd: 'R', run: () => { setRelationMode(true); diagram.relFrom = id; diagram.render(); } },
    '-',
    { colors: true, value: tb.color || '', run: c => store.update(() => { tb.color = c; }) },
    '-',
    { label: t('cm.duplicate'), icon: '⧉', kbd: '⌘D', run: () => duplicateTable(id) },
    { label: t('cm.copy'), icon: '⎘', kbd: '⌘C', run: () => copyTables([id]) },
    { label: t('cm.ddl'), icon: '⌨', run: () => copyTableDDL(id) },
    '-',
    { label: t('diag.removeFromDiag'), icon: '✕', run: () => store.removeTableFromDiagram(id) },
    { label: t('cm.delete'), icon: '🗑', kbd: 'Del', danger: true, run: () => store.deleteTable(id) },
  ];
}

function columnMenu(id, colId, at) {
  const tb = store.table(id);
  const col = tb.columns.find(c => c.id === colId);
  const i = tb.columns.indexOf(col);
  const single = u => u.columns.length === 1 && u.columns[0] === colId;
  const isUnique = tb.uniques.some(single);
  const isIndexed = tb.indexes.some(ix => ix.columns[0] === colId);
  const fk = store.model.fks.find(f => f.fromTable === id && f.columns.some(p => p.from === colId));
  const TYPES = ['NUMBER', 'NUMBER(10)', 'NUMBER(12,2)', 'VARCHAR2(100 CHAR)', 'VARCHAR2(255 CHAR)', 'VARCHAR2(4000 CHAR)', 'CHAR(1)', 'DATE', 'TIMESTAMP', 'CLOB', 'BLOB', 'JSON', 'BOOLEAN'];
  return [
    { header: `${tb.name}.${col.name}` },
    { label: t('cm.editCol'), icon: '✎', kbd: '2×', run: () => openFieldEditor(id, colId) },
    { label: `${t('cm.type')}: ${col.type}`, icon: 'Aa', sub: TYPES.map(ty => ({ label: ty, checked: col.type === ty, run: () => colOp(id, colId, (_, c) => { c.type = ty; }) })) },
    '-',
    { label: t('cm.pk'), checked: col.pk, run: () => colOp(id, colId, (_, c) => { c.pk = !c.pk; if (c.pk) c.nullable = false; }) },
    { label: t('cm.nn'), checked: !col.nullable || col.pk, disabled: col.pk, run: () => colOp(id, colId, (_, c) => { c.nullable = !c.nullable; }) },
    { label: t('cm.unique'), checked: isUnique, run: () => colOp(id, colId, (t2, c, _, m) => {
      if (isUnique) t2.uniques = t2.uniques.filter(u => !single(u));
      else t2.uniques.push({ id: uid('u'), name: uniqueName(m, `${t2.name}_${c.name}_UN`), columns: [c.id] });
    }) },
    { label: t('cm.colCheck'), icon: '✓', run: () => store.update(m => { tb.checks ||= []; tb.checks.push({ id: uid('k'), name: uniqueName(m, `${tb.name}_${col.name}_CK`), expr: /CHAR/.test(col.type) ? `${col.name} IN ('A', 'B')` : `${col.name} > 0` }); }) },
    { label: t('cm.index'), checked: isIndexed, run: () => colOp(id, colId, (t2, c, _, m) => {
      if (isIndexed) t2.indexes = t2.indexes.filter(ix => ix.columns[0] !== c.id);
      else t2.indexes.push({ id: uid('i'), name: uniqueName(m, `${t2.name}_${c.name}_IDX`), unique: false, columns: [c.id] });
    }) },
    fk
      ? { label: `FK → ${store.table(fk.toTable)?.name}`, icon: '⟜', run: () => { store.select({ kind: 'fk', id: fk.id }); } }
      : { label: t('cm.fkTo'), icon: '⟜', sub: () => tableList(id, pid => {
          const parent = store.table(pid);
          if (parent.columns.filter(c => c.pk).length !== 1) return createRelation(id, pid, {});
          createRelation(id, pid, { columnId: colId, mandatory: !col.nullable });
        }) },
    '-',
    { label: t('cm.insAbove'), icon: '⤒', run: () => openFieldEditor(id, null, i) },
    { label: t('cm.insBelow'), icon: '⤓', run: () => openFieldEditor(id, null, i + 1) },
    { label: t('cm.up'), icon: '↑', disabled: i === 0, run: () => colOp(id, colId, (t2, c, j) => { t2.columns.splice(j, 1); t2.columns.splice(j - 1, 0, c); }) },
    { label: t('cm.down'), icon: '↓', disabled: i === tb.columns.length - 1, run: () => colOp(id, colId, (t2, c, j) => { t2.columns.splice(j, 1); t2.columns.splice(j + 1, 0, c); }) },
    { label: t('cm.dupCol'), icon: '⧉', run: () => colOp(id, colId, (t2, c, j) => {
      let name = `${c.name}_2`, n = 3;
      while (t2.columns.some(x => x.name === name)) name = `${c.name}_${n++}`;
      t2.columns.splice(j + 1, 0, { ...structuredClone(c), id: uid('c'), name, pk: false });
    }) },
    '-',
    { label: t('cm.delCol'), icon: '🗑', danger: true, run: () => store.deleteColumn(id, colId) },
  ];
}

function relationMenu(fid) {
  const f = store.model.fks.find(x => x.id === fid);
  const kind = store.relationKind(f);
  const child = store.table(f.fromTable), parent = store.table(f.toTable);
  const childCols = () => f.columns.map(p => child.columns.find(c => c.id === p.from)).filter(Boolean);
  const setFk = fn => store.update(m => { const ff = m.fks.find(x => x.id === fid); fn(ff, m); });
  return [
    { header: `${child.name} → ${parent.name}` },
    { label: t('cm.mandatory'), checked: kind.mandatory, disabled: kind.identifying, run: () => store.update(() => childCols().forEach(c => { if (!c.pk) c.nullable = kind.mandatory; })) },
    { label: t('cm.identifying'), checked: kind.identifying, run: () => store.update(() => childCols().forEach(c => { c.pk = !kind.identifying; if (c.pk) c.nullable = false; })) },
    { label: t('cm.oneToOne'), checked: kind.oneToOne, disabled: kind.identifying, run: () => store.update(m => {
      const ids = f.columns.map(p => p.from);
      const same = u => u.columns.length === ids.length && ids.every(x => u.columns.includes(x));
      if (kind.oneToOne) child.uniques = child.uniques.filter(u => !same(u));
      else child.uniques.push({ id: uid('u'), name: uniqueName(m, `${child.name}_${parent.name}_UN`), columns: ids });
    }) },
    { label: `${t('cm.onDelete')}: ${f.onDelete || 'NO ACTION'}`, icon: '⌫', sub: [['', 'NO ACTION'], ['CASCADE', 'CASCADE'], ['SET NULL', 'SET NULL']].map(([v, l]) => ({ label: l, checked: (f.onDelete || '') === v, run: () => setFk(ff => { ff.onDelete = v; }) })) },
    '-',
    { label: t('cm.goParent'), icon: '↑', run: () => pick(parent.id) },
    { label: t('cm.goChild'), icon: '↓', run: () => pick(child.id) },
    '-',
    { label: t('cm.delRel'), icon: '🗑', danger: true, run: () => { store.update(m => { m.fks = m.fks.filter(x => x.id !== fid); }); store.select(null); } },
  ];
}

function applyPreset(tableId, preset) {
  const tb = store.table(tableId);
  const taken = new Set(tb.columns.map(x => x.name));
  const add = preset.cols.filter(x => !taken.has(x.name) && !(x.pk && tb.columns.some(y => y.pk)));
  if (!add.length) return;
  store.update(() => add.forEach(x => {
    const col = { ...newColumn(x.name, x.type), ...x, nullable: x.nullable ?? true, default: x.default || '' };
    if (x.pk) tb.columns.unshift(col); else tb.columns.push(col);
  }));
  toast(t('t.colsAdded', { n: add.length }));
}

$('#canvas').addEventListener('contextmenu', e => {
  e.preventDefault();
  if (!editor.hidden) commitEditor(false);
  const vg = e.target.closest('.view');
  if (vg) {
    const id = vg.dataset.view, v = store.view(id);
    store.select({ kind: 'view', id });
    openMenu(e.clientX, e.clientY, [
      { header: `VIEW ${v.name}` },
      { label: t('cm.editSql'), icon: '✎', kbd: '2×', run: () => setTimeout(() => $('#panel .sql-edit')?.focus()) },
      { colors: true, value: v.color || '', run: c => store.update(() => { v.color = c; }) },
      '-',
      { label: t('cm.ddl'), icon: '⌨', run: () => navigator.clipboard.writeText(viewDDL(v)).then(() => toast(t('t.ddlCopied'))) },
      { label: t('cm.delete'), icon: '🗑', danger: true, run: () => store.deleteView(id) },
    ]);
    return;
  }
  const tg = e.target.closest('.table'), row = e.target.closest('[data-col]'), rel = e.target.closest('.rel');
  const w = diagram.toWorld(e);
  const at = { x: w.x, y: w.y, cx: e.clientX, cy: e.clientY };
  if (diagram.mode === 'relation') setRelationMode(false);
  if (tg && row) { store.select({ kind: 'table', id: tg.dataset.id }); openMenu(e.clientX, e.clientY, columnMenu(tg.dataset.id, row.dataset.col, at)); }
  else if (tg) { store.select({ kind: 'table', id: tg.dataset.id }); openMenu(e.clientX, e.clientY, tableMenu(tg.dataset.id, at)); }
  else if (rel) { store.select({ kind: 'fk', id: rel.dataset.id }); openMenu(e.clientX, e.clientY, relationMenu(rel.dataset.id)); }
  else openMenu(e.clientX, e.clientY, [
    { label: t('cm.newTable'), icon: '＋', kbd: 'T', run: () => addTable(at) },
    { label: t('cm.newView'), icon: 'V', run: () => addView(at) },
    { label: t('cm.newSeq'), icon: 'S', run: () => addSequence() },
    { label: t('tb.templates.t'), icon: '▦', run: () => openTemplates() },
    { label: t('cm.paste'), icon: '⎘', kbd: '⌘V', disabled: !clipboard, run: () => pasteTables(clipboard, at) },
    '-',
    { label: t('cm.layout'), icon: '⊞', run: actions.layout },
    { label: t('cm.fit'), icon: '⤢', kbd: 'F', run: actions.fit },
    { label: t('cm.check'), icon: '✓', run: actions.check },
  ]);
});
// right-click on the sidebar list opens the same table menu
$('#sidebar').addEventListener('contextmenu', e => {
  const li = e.target.closest('[data-id]');
  if (!li) return;
  e.preventDefault();
  pick(li.dataset.id);
  openMenu(e.clientX, e.clientY, tableMenu(li.dataset.id, { cx: e.clientX, cy: e.clientY }));
});
document.addEventListener('pointerdown', e => {
  if (ctx.hidden || ctx.contains(e.target) || ctxSub?.contains(e.target)) return;
  closeCtx();
});
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
    try { ws.create(migrateModel(JSON.parse(text))); toast(t('t.opened')); } catch (err) { toast(t('t.openFail', { e: err.message }), true); }
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
// Build a coloured, laid-out model from a template without touching the current project
function templateModel(tp) {
  const { model } = parseDDL(tp.ddl);
  const m = { ...emptyModel(), ...model, name: tp.name[getLang()] || tp.name.en };
  autoLayout(m);
  m.tables.forEach((x, i) => { x.color = TABLE_COLORS[(i % 6) + 1]; });
  let vy = 40;
  const vx = Math.max(0, ...m.tables.map(x => x.x + tableSize(x).w)) + 160;
  m.views.forEach(v => { v.x = vx; v.y = vy; vy += viewSize(v).h + 48; });
  return m;
}
renderLang();
const ws = initWorkspace({
  store, diagram, toast, download, readFile,
  openTemplates: () => openTemplates(),
  firstModel: blank => blank ? emptyModel() : templateModel(TEMPLATES[0]),
  openMigration: id => openMigration(id),
  afterLoad: () => { nameInput.value = store.model.name; updateCheckBadge(); },
});
actions.projects = () => ws.projects();

// ---------- export menu ----------
actions.export = () => {
  const b = $('[data-action="export"]').getBoundingClientRect();
  openMenu(b.left, b.bottom + 6, [
    { label: t('exp.sql'), icon: '⌨', run: () => download(fileName('sql'), generateDDL(store.model)) },
    { label: t('exp.html'), icon: '📄', run: () => download(fileName('html'), dictionaryHTML(store.model), 'text/html') },
    { label: t('exp.md'), icon: 'M↓', run: () => download(fileName('md'), dictionaryMarkdown(store.model), 'text/markdown') },
    { label: t('exp.print'), icon: '⎙', run: printDocs },
    '-',
    { label: t('exp.svg'), icon: '◇', run: actions.svg },
    { label: t('exp.png'), icon: '▣', run: actions.png },
    '-',
    { label: t('exp.json'), icon: '{}', kbd: '⌘S', run: actions.save },
  ]);
};
function printDocs() {
  const w = window.open(URL.createObjectURL(new Blob([dictionaryHTML(store.model)], { type: 'text/html' })), '_blank');
  if (w) w.addEventListener('load', () => setTimeout(() => w.print(), 300));
}

// ---------- migration ----------
const mig = { src: 'snap', result: null };
function openMigration(snapId) {
  const snaps = listSnapshots(ws.id);
  const fmt = ts => new Date(ts).toLocaleString(getLang() === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  $('#mig-snap').innerHTML = snaps.length
    ? snaps.map((sn, i) => `<option value="${sn.id}"${(snapId ? sn.id === snapId : i === 0) ? ' selected' : ''}>${esc(sn.label || (sn.auto ? t('ws.autoSnap') : t('ws.manualSnap')))} · ${fmt(sn.at)} · ${sn.tables}</option>`).join('')
    : `<option disabled>${esc(t('mig.noSnaps'))}</option>`;
  setMigSource(snaps.length ? 'snap' : 'ddl');
  $('#migrate-dialog').showModal();
  runMigration();
}
function setMigSource(src) {
  mig.src = src;
  document.querySelectorAll('[data-src]').forEach(b => b.classList.toggle('on', b.dataset.src === src));
  $('#mig-snap').hidden = src !== 'snap';
  $('#mig-ddl').hidden = src !== 'ddl';
}
function runMigration() {
  let from = null;
  if (mig.src === 'snap') {
    const sn = listSnapshots(ws.id).find(x => x.id === $('#mig-snap').value);
    if (sn) from = migrateModel(structuredClone(sn.model));
  } else if ($('#mig-ddl').value.trim()) {
    from = { name: 'db', ...parseDDL($('#mig-ddl').value).model };
  }
  if (!from) { $('#mig-code').textContent = ''; $('#mig-changes').innerHTML = ''; $('#mig-count').textContent = '0'; mig.result = null; return; }
  const r = diffModels(from, store.model, { destructive: $('#mig-destructive').checked });
  mig.result = r;
  $('#mig-code').innerHTML = highlightSQL(r.sql);
  $('#mig-count').textContent = r.changes.filter(c => c.kind !== 'warn').length;
  const icon = { add: '+', drop: '−', modify: '~', warn: '!' };
  $('#mig-changes').innerHTML = r.changes.length
    ? r.changes.map(c => `<li class="${c.kind}"><i>${icon[c.kind]}</i><span>${esc(c.text)}</span></li>`).join('')
    : `<li class="none-ok"><i>✓</i><span>${esc(t('mig.none'))}</span></li>`;
}
document.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => { setMigSource(b.dataset.src); runMigration(); }));
$('#mig-snap').addEventListener('change', runMigration);
$('#mig-destructive').addEventListener('change', runMigration);
let migTimer;
$('#mig-ddl').addEventListener('input', () => { clearTimeout(migTimer); migTimer = setTimeout(runMigration, 300); });
$('#mig-copy').addEventListener('click', () => mig.result && navigator.clipboard.writeText(mig.result.sql).then(() => toast(t('t.copied'))));
$('#mig-download').addEventListener('click', () => mig.result && download(fileName('migration.sql'), mig.result.sql));
actions.migrate = () => openMigration();
actions.history = () => ws.history();
actions.settings = () => ws.settings();
actions.shortcuts = () => ws.shortcuts();
actions.snapshot = () => { ws.snapshot(false); toast(t('ws.snapSaved')); };
nameInput.addEventListener('change', () => ws.renderStatus());
window.__schemataReady = true;
