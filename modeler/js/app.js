import { Store, newTable, nextTableName, newColumn, newSequence, newView, emptyModel, uid, uniqueName, TABLE_COLORS, tableLevels } from './model.js?v=202609241405';
import { TEMPLATES, COLUMN_PRESETS } from './templates.js?v=202609241405';
import { checkModel, fixFkIndexes, fixPkNaming } from './checks.js?v=202609241405';
import { guessType, inferColumn, describe, findParent, physName, isLogical, applyInference, toPhysical, L2P_STEPS, suggestFieldNames, singular, cascadeTableRename, safeColumnName, nameInfo, getNaming, setNaming } from './autodef.js?v=202609241405';
import { Diagram, tableSize, viewSize, resolveOverlaps } from './diagram.js?v=202609241405';
import { DiagramTabs } from './diagrams-ui.js?v=202609241405';
import { Panel } from './panel.js?v=202609241405';
import { Sidebar } from './sidebar.js?v=202609241405';
import { Palette } from './palette.js?v=202609241405';
import { generateDDL, viewDDL } from './ddl-gen.js?v=202609241405';
import { parseDDL } from './ddl-parse.js?v=202609241405';
import { SAMPLE_DDL } from './sample.js?v=202609241405';
import { initWorkspace } from './workspace.js?v=202609241405';
import { diffModels } from './diff.js?v=202609241405';
import { dictionaryHTML, dictionaryMarkdown } from './docs.js?v=202609241405';
import { migrateModel, listSnapshots } from './storage.js?v=202609241405';
import { Sandbox } from './sandbox.js?v=202609241405';
import { parseText, buildModel, TEXT_EXAMPLES } from './textmodel.js?v=202609241405';
import { ENTITY_GROUPS, ATTRIBUTE_GROUPS, RELATION_BLOCKS, findEntity, findAttrSet, tableForBlock, placeEntity, addColumns } from './blocks.js?v=202609241405';
import { Wizard } from './wizard.js?v=202609241405';
import { CanvasSearch } from './canvas-search.js?v=202609241405';
import { t, getLang, setLang, onLang, applyStatic } from './i18n.js?v=202609241405';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const store = new Store();

const diagram = new Diagram($('#canvas'), store, {
  onAddTable: p => addTable(p),
  onRelation: (child, parent, e) => kitRelation(child, parent) || openMenu(e.clientX, e.clientY, relationTypeItems(child, parent)),
  onAddField: id => openFieldEditor(id, null),
  onEditColumn: (id, colId) => openFieldEditor(id, colId),
  onRenameTable: id => openRenameTable(id),
  onEditView: id => { store.select({ kind: 'view', id }); setTimeout(() => $('#panel .sql-edit')?.focus()); },
  onZoom: k => { $('#zoom').textContent = `${Math.round(k * 100)}%`; },
  minimap: $('#minimap'),
  onLinkClick: from => { setRelationMode(true); diagram.relFrom = from; diagram.render(); },
  onLinkToEmpty: (from, p) => linkToNewTable(from, p),
  insetLeft: () => { try { return kitVisibleRect().left; } catch { return 0; } }, // the builder panel is declared further down
});
const canvasSearch = new CanvasSearch($('.stage'), store, diagram);
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
function addTable(p = diagram.center(), focusPanel = true) {
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
  if (focusPanel) setTimeout(() => $('#panel input[data-f="table.name"]')?.select());
  return tb.id;
}

// st по умолчанию не привязан к глобальному store: вызов autoLayout(model) для
// модели, ещё не ставшей активной (свежий шаблон, импорт DDL), раньше молча
// брал ЖИВОЙ store — isItemOnActiveDiagram сверялся со СТАРОЙ диаграммой, ни одна
// новая таблица в неё не входила, visibleTables оказывался пустым, и autoLayout
// ничего не делал: все таблицы оставались на (40, 40) из newTable() и рисовались
// одна поверх другой. Явная передача store (см. action 'layout' ниже) — осознанный
// выбор для действия, перекладывающего уже активную модель.
export function autoLayout(model, st = null) {
  const visibleTables = st ? model.tables.filter(t => st.isItemOnActiveDiagram(t.id)) : model.tables;
  const level = tableLevels(model);
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
    migrateModel(m); // places any table/view not yet on a diagram onto the active one
  }, 'load');
  store.select(null);
  requestAnimationFrame(() => diagram.fit());
  $('#import-log').innerHTML = warnings.length
    ? `<b>${t('imp.warnings', { n: warnings.length })}</b><ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
  toast(t('t.imported', { n: created }) + (warnings.length ? t('t.importedWarn', { n: warnings.length }) : ''), !created);
  if (created && !warnings.length && $('#import-dialog').open) $('#import-dialog').close();
}

let kitPendingRel = null; // builder relation waiting for its parent click
function setRelationMode(on) {
  if (!on) { kitPendingRel = null; $('#mode-hint-text').textContent = t('t.relHint'); }
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
  'no-overlaps': () => animateLayout(() => {
    const visibleTables = store.model.tables.filter(t => store.isItemOnActiveDiagram(t.id));
    store.checkpoint();
    resolveOverlaps(visibleTables, id => store.posOf(id), (id, x, y) => store.setPos(id, x, y));
    store.emit('load');
    store.persist();
    toast(t('tb.noOverlaps.t'));
  }),

  layout: () => animateLayout(() => store.update(m => autoLayout(m, store), 'load')),
  undo: () => store.undo(),
  redo: () => store.redo(),
  'zoom-in': () => diagram.zoomBy(1.25),
  'zoom-out': () => diagram.zoomBy(1 / 1.25),
  'zoom-reset': () => diagram.zoomBy(1 / diagram.view.k),
  fit: () => diagram.fit(),
  sample: () => importDDL(SAMPLE_DDL, true),
  palette: () => palette.open(),
  search: () => canvasSearch.toggle(),
  physical: () => wizard.open(),
  rules: () => openPhysical(),
  assistant: () => toggleAssistant(),
  fromText: () => openTextModel(),
  kit: () => toggleKit(),
};

// Rearranging glides tables to their new places instead of jumping: the change is applied (and
// undoable) at once, then the diagram replays it from the old positions over ~half a second.
function animateLayout(run) {
  const ids = [...store.model.tables, ...(store.model.views || [])].map(x => x.id).filter(id => store.isItemOnActiveDiagram(id));
  const from = new Map(ids.map(id => [id, { ...store.posOf(id) }]));
  run();
  const to = new Map(ids.map(id => [id, { ...store.posOf(id) }]));
  const moved = ids.filter(id => from.get(id).x !== to.get(id).x || from.get(id).y !== to.get(id).y);
  diagram.fit();
  if (!moved.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now(), dur = 560, ease = x => 1 - Math.pow(1 - x, 3);
  const frame = now => {
    const k = Math.min(1, (now - t0) / dur), e = ease(k);
    store.silent(() => moved.forEach(id => {
      const a = from.get(id), b = to.get(id);
      store.setPos(id, a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e);
    }), 'move', moved);
    if (k < 1) requestAnimationFrame(frame);
    else { store.silent(() => moved.forEach(id => { const b = to.get(id); store.setPos(id, b.x, b.y); }), 'move', moved); store.persist(); }
  };
  requestAnimationFrame(frame);
}

// icons come from the toolbar and dock only: close buttons inside panels share an action but show a ×
const ICONS = Object.fromEntries([...document.querySelectorAll('[data-action] svg')].filter(s => !s.closest('.kit, .assistant, dialog')).map(s => [s.closest('[data-action]').dataset.action, s.outerHTML]));
ICONS.search = `<svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>`;
const palette = new Palette(store, {
  onPick: pick,
  actions: () => [
    ['search', 'cs.search', '⌘F'],
    ['table', 'tb.table', 'T'], ['relation', 'tb.relation', 'R'], ['zone', 'tb.zone.t', 'Z'],
    ['layout', 'tb.layout'], ['no-overlaps', 'tb.noOverlaps.t'], ['fit', 'tb.fit.t', 'F'],
    ['ddl', 'tb.ddl.t'], ['import', 'tb.import'], ['svg', 'tb.svg.t'],
    ['templates', 'tb.templates.t'], ['check', 'tb.check.t'], ['kit', 'kit.toggle'], ['fromText', 'tb.text.t'], ['physical', 'tb.l2p.t'], ['rules', 'l2p.title'], ['assistant', 'as.toggle'], ['duplicate', 'cm.duplicate', '⌘D'], ['png', 'tb.png.t'],
    ['newView', 'cm.newView'], ['newSequence', 'cm.newSeq'],
    ['migrate', 'tb.migrate.t'], ['export', 'tb.export.t'], ['sandbox', 'tb.sandbox.t'],
    ['projects', 'ws.projects'], ['history', 'ws.history'], ['snapshot', 'ws.saveVersion'], ['settings', 'ws.settings'], ['shortcuts', 'ws.shortcuts', '?'],
    ['save', 'tb.save', '⌘S'], ['open', 'tb.open'],
    ['undo', 'tb.undo.t'], ['redo', 'tb.redo.t'],
  ].map(([a, key, hint]) => ({ label: t(key).replace(/\s*\(.*\)$/, ''), hint, svg: ICONS[a], run: actions[a] })),
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b && !b.closest('.palette')) actions[b.dataset.action]?.(b);
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
  if (mod && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F')) {
    if (!typing || document.activeElement?.classList.contains('cs-input')) {
      e.preventDefault();
      canvasSearch.toggle();
      return;
    }
  }
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
      }, 'move', store.selection.ids);
    } else {
      const id = store.selection.id;
      const p = store.posOf(id);
      store.silent(() => { store.setPos(id, p.x + dx, p.y + dy); }, 'move', [id]);
    }
  }
  else if (e.key === 'Escape' && canvasSearch.isOpen) canvasSearch.close();
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
    </article>
    <article class="tpl text">
      <div class="tpl-art"><em>✎</em><div class="tpl-lines"><i></i><i></i><i></i></div></div>
      <h3>${t('tpl.text')}</h3><p>${t('tpl.textDesc')}</p>
      <div class="tpl-actions"><button class="primary" type="button" data-tpl="text">${t('tpl.textOpen')}</button></div>
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
  if (open?.dataset.tpl === 'text') { tmMode = 'new'; openTextModel(); return; }
  const tp = TEMPLATES.find(x => x.id === (open || add).dataset[open ? 'tpl' : 'tplAdd']);
  const name = tp.name[getLang()] || tp.name.en;
  if (open) { ws.create(templateModel(tp)); toast(t('t.tplLoaded', { n: name })); return; }
  importDDL(tp.ddl, false);
  // colour tables of a freshly opened template so the diagram reads at a glance
  toast(t('t.tplLoaded', { n: name }));
});

// ---------- checks ----------
const CHECK_FIXES = {
  fkIndex: { label: 'chk.fixIdx', done: 'chk.fixed', run: m => fixFkIndexes(m, uid, uniqueName) },
  pkNaming: { label: 'chk.fixPk', done: 'chk.fixedPk', run: m => fixPkNaming(m) },
};
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
  const fixes = [...new Set(issues.map(x => x.fix).filter(Boolean))];
  $('#chk-fixes').innerHTML = fixes.map(id => `<button class="secondary" type="button" data-fix="${id}">${esc(t(CHECK_FIXES[id].label))}</button>`).join('');
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
$('#chk-fixes').addEventListener('click', e => {
  const btn = e.target.closest('[data-fix]');
  if (!btn) return;
  const cfg = CHECK_FIXES[btn.dataset.fix];
  let n = 0;
  store.update(m => { n = cfg.run(m); });
  toast(t(cfg.done, { n }));
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

// ---------- logical → physical ----------
const L2P_KEY = 'schemata:l2p';
let l2pSteps = Object.fromEntries(L2P_STEPS.map(x => [x.id, x.on]));
try { Object.assign(l2pSteps, JSON.parse(localStorage.getItem(L2P_KEY) || '{}')); } catch {}
function openPhysical() { renderPhysical(); $('#l2p-dialog').showModal(); }
function renderPhysical() {
  // preview on a copy: the same function later runs on the live model inside store.update()
  const log = toPhysical(JSON.parse(JSON.stringify(store.model)), l2pSteps, t);
  const count = id => log.filter(x => x.step === id).length;
  $('#l2p-steps').innerHTML = L2P_STEPS.map(({ id }) => `
    <li><label class="check">
      <input type="checkbox" data-step="${id}" ${l2pSteps[id] ? 'checked' : ''}>
      <span><b>${esc(t(`l2p.s.${id}`))}</b>${l2pSteps[id] && count(id) ? ` <span class="count">${count(id)}</span>` : ''}<small>${esc(t(`l2p.d.${id}`))}</small></span>
    </label></li>`).join('');
  $('#l2p-log').innerHTML = !log.length
    ? `<div class="chk-ok"><span>✓</span>${esc(t('l2p.none'))}</div>`
    : L2P_STEPS.filter(({ id }) => count(id)).map(({ id }) => `
      <section class="chk-group info">
        <h4><i></i>${esc(t(`l2p.s.${id}`))} <span class="count">${count(id)}</span></h4>
        <ul>${log.filter(x => x.step === id).slice(0, 300).map(x => `<li class="mono">${esc(x.text)}</li>`).join('')}</ul>
      </section>`).join('');
  const btn = $('#l2p-apply');
  btn.disabled = !log.length;
  btn.textContent = log.length ? t('l2p.applyN', { n: log.length }) : t('l2p.apply');
}
$('#l2p-steps').addEventListener('change', e => {
  const cb = e.target.closest('[data-step]');
  if (!cb) return;
  l2pSteps[cb.dataset.step] = cb.checked;
  try { localStorage.setItem(L2P_KEY, JSON.stringify(l2pSteps)); } catch {}
  renderPhysical();
  renderAssistant();
});
$('#l2p-apply').addEventListener('click', () => {
  let log = [];
  store.update(m => { log = toPhysical(m, l2pSteps, t); });
  $('#l2p-dialog').close();
  toast(t('l2p.done', { n: log.length }));
});
onLang(() => { if ($('#l2p-dialog').open) renderPhysical(); });


// ---------- assistant mode ----------
// Live version of the same rules: after every edit it shows what can still be auto-defined
// for the selected table (or the whole model) and applies it in one click.
const AS_KEY = 'schemata:assistant';
let assistantOn = false;
try { assistantOn = localStorage.getItem(AS_KEY) === '1'; } catch {}
const asScope = () => {
  const s = store.selection;
  if (s?.kind === 'table' && store.table(s.id)) return new Set([s.id]);
  if (s?.kind === 'multi') return new Set(s.ids.filter(id => store.table(id)));
  return null;
};
function renderAssistant() {
  $('#assistant-btn').classList.toggle('on', assistantOn);
  $('#assistant').hidden = !assistantOn;
  const scope = asScope();
  const log = toPhysical(JSON.parse(JSON.stringify(store.model)), l2pSteps, t, scope);
  const b = $('#assistant-badge');
  b.hidden = assistantOn || !log.length; b.textContent = log.length > 99 ? '99+' : log.length;
  if (!assistantOn) return;
  $('#as-scope').textContent = scope?.size === 1 ? t('as.table', { t: store.table([...scope][0]).name }) : t('as.model');
  const shown = log.slice(0, 7);
  $('#as-list').innerHTML = !log.length
    ? `<li class="as-ok">✓ ${esc(t('as.ok'))}</li>`
    : shown.map(x => `<li class="mono" data-id="${x.target}" title="${esc(t(`l2p.s.${x.step}`))}"><i class="as-${x.step}"></i>${esc(x.text)}</li>`).join('') +
      (log.length > shown.length ? `<li class="as-more">${esc(t('as.more', { n: log.length - shown.length }))}</li>` : '');
  const btn = $('#as-apply');
  btn.hidden = !log.length;
  btn.textContent = t('as.apply', { n: log.length });
}
function toggleAssistant() {
  assistantOn = !assistantOn;
  try { localStorage.setItem(AS_KEY, assistantOn ? '1' : '0'); } catch {}
  renderAssistant();
}
let asTimer;
store.subscribe(r => { if (r === 'move') return; clearTimeout(asTimer); asTimer = setTimeout(renderAssistant, r === 'select' ? 0 : 200); });
$('#as-apply').addEventListener('click', () => {
  const scope = asScope();
  let log = [];
  store.update(m => { log = toPhysical(m, l2pSteps, t, scope); });
  toast(t('as.done', { n: log.length }));
});
$('#as-list').addEventListener('click', e => { const li = e.target.closest('[data-id]'); if (li && store.table(li.dataset.id)) pick(li.dataset.id); });
onLang(renderAssistant);
renderAssistant();


// ---------- model from text ----------
// Plain sentences on the left, a live diagram on the right (a second Diagram on its own
// throwaway Store, so the preview can pan/zoom but never touches the real model or autosave).
const TM_KEY = 'schemata:textmodel';
const tmText = $('#tm-text');
const tmStore = new Store();
let tmDiagram = null, tmResult = null, tmTimer = null, tmFitted = false;
let tmMode = 'new';
const noop = () => {};
const TM_CHIPS = [
  { label: 'tm.c.entity', ins: () => `\n${t('tm.i.entity')}` },
  { label: 'tm.c.belongs', ins: () => `\n${t('tm.i.belongs')}` },
  { label: 'tm.c.many', ins: () => `\n${t('tm.i.many')}` },
  { label: 'tm.c.mn', ins: () => `\n${t('tm.i.mn')}` },
  { label: 'tm.c.11', ins: () => `\n${t('tm.i.11')}` },
  { code: '#', label: 'tm.c.pk', ins: () => '# ' },
  { code: '*', label: 'tm.c.nn', ins: () => '* ' },
  { code: 'o', label: 'tm.c.opt', ins: () => 'o ' },
  { code: '[…]', label: 'tm.c.uq', ins: () => getLang() === 'uk' ? ' [унікальний]' : ' [unique]' },
  { code: 'NUMBER(5)', label: 'tm.c.type', ins: () => ' NUMBER(5)' },
];
function tmInsert(text) {
  const { selectionStart: a, selectionEnd: b, value } = tmText;
  const pre = value.slice(0, a);
  const put = text.startsWith('\n') && (!pre || pre.endsWith('\n')) ? text.slice(1) : text;
  tmText.setRangeText(put, a, b, 'end');
  tmText.focus();
  tmUpdate();
}
function openTextModel() {
  try { if (!tmText.value) tmText.value = localStorage.getItem(TM_KEY) || ''; } catch {}
  tmMode = store.model.tables.length ? tmMode : 'new';
  $('#tm-examples').innerHTML = (TEXT_EXAMPLES[getLang()] || TEXT_EXAMPLES.en).map(x => `<button type="button" class="pill small" data-ex="${x.id}">${esc(x.label)}</button>`).join('');
  $('#tm-chips').innerHTML = TM_CHIPS.map((c, i) => `<button type="button" class="tm-chip" data-chip="${i}">${c.code ? `<code>${esc(c.code)}</code>` : ''}${esc(t(c.label))}</button>`).join('');
  $('#tm-dialog').showModal();
  if (!tmDiagram) {
    tmDiagram = new Diagram($('#tm-canvas'), tmStore, { onAddTable: noop, onRelation: noop, onAddField: noop, onEditColumn: noop, onRenameTable: noop, onEditView: noop, onZoom: noop });
  }
  tmFitted = false;
  tmUpdate(true);
  requestAnimationFrame(() => { tmText.focus(); tmText.setSelectionRange(tmText.value.length, tmText.value.length); });
}
function tmUpdate(now = false) {
  clearTimeout(tmTimer);
  tmGutter();
  tmTimer = setTimeout(tmRender, now ? 0 : 140);
}
function tmGutter() {
  const n = tmText.value.split('\n').length;
  const bad = new Set((tmResult?.parsed.issues || []).map(x => x.line));
  $('#tm-gutter').innerHTML = Array.from({ length: n }, (_, i) => `<span${bad.has(i + 1) ? ' class="bad"' : ''}>${i + 1}</span>`).join('\n');
  $('#tm-gutter').scrollTop = tmText.scrollTop;
}
function tmBuild() {
  const parsed = parseText(tmText.value);
  const merge = tmMode === 'merge';
  const base = merge ? structuredClone(store.model) : emptyModel();
  const res = buildModel(parsed, { base, steps: $('#tm-rules').checked ? l2pSteps : null, t });
  const m = res.model;
  const fresh = m.tables.filter(x => res.created.includes(x.id));
  fresh.forEach((x, i) => { x.color = TABLE_COLORS[(i % 6) + 1]; });
  if (!merge) autoLayout(m);
  else if (fresh.length) {
    // new tables go to the right of what is already there, like DDL import
    const d = m.diagrams.find(x => x.id === m.activeDiagram) || m.diagrams[0];
    const pos = x => d?.positions?.[x.id] || { x: x.x, y: x.y };
    const old = m.tables.filter(x => !res.created.includes(x.id));
    autoLayout({ tables: fresh, fks: m.fks.filter(f => res.created.includes(f.fromTable) && res.created.includes(f.toTable)) });
    const offX = old.length ? Math.max(...old.map(x => pos(x).x + tableSize(x).w)) + 160 : 0;
    fresh.forEach(x => { x.x += offX; });
  }
  migrateModel(m);
  if (merge) {
    // the preview only needs what the text touches: new and extended tables plus their parents
    const keep = new Set([...res.created, ...res.extended]);
    m.fks.forEach(f => { if (keep.has(f.fromTable)) keep.add(f.toTable); });
    m.diagrams.forEach(d => { d.tableIds = d.tableIds.filter(id => keep.has(id)); d.viewIds = []; });
  }
  return { parsed, ...res };
}
function tmRender() {
  let r;
  try { r = tmBuild(); } catch (e) { console.error(e); return; }
  tmResult = r;
  try { localStorage.setItem(TM_KEY, tmText.value); } catch {}
  const m = r.model, scope = new Set([...r.created, ...r.extended]);
  const tables = m.tables.filter(x => scope.has(x.id));
  const cols = tables.reduce((n, x) => n + x.columns.length, 0);
  const rels = m.fks.filter(f => scope.has(f.fromTable)).length;
  const cons = tables.reduce((n, x) => n + x.uniques.length + (x.checks || []).length, 0);
  const stat = (v, k, cls = '') => `<span class="tm-stat ${cls}"><b>${v}</b>${esc(t(k))}</span>`;
  $('#tm-stats').innerHTML = !tables.length ? '' : [stat(r.created.length, 'tm.s.tables'), r.extended.length ? stat(r.extended.length, 'tm.s.ext', 'ext') : '', stat(cols, 'tm.s.cols'), stat(rels, 'tm.s.rels'), stat(cons, 'tm.s.cons')].join('');
  $('#tm-issues').innerHTML = [...r.parsed.issues.map(x => t(x.key, { n: x.line })), ...r.notes.map(x => t(x.key, x.p))].map(x => `<li>${esc(x)}</li>`).join('');
  $('#tm-empty').hidden = !!tables.length;
  // keep the view while typing; fit once when the first tables appear
  const view = { ...tmDiagram.view };
  tmStore.model = m;
  tmStore.selection = null;
  tmStore.emit('load');
  if (!tmFitted && tables.length) { requestAnimationFrame(() => tmDiagram.fit(false)); tmFitted = true; }
  else if (tmFitted) { tmDiagram.view = view; tmDiagram.applyView(); }
  tmFollowCursor();
  tmGutter();
  const btn = $('#tm-create');
  btn.disabled = !r.created.length && !r.extended.length;
  btn.textContent = tmMode === 'merge' ? t('tm.addN', { n: r.created.length }) : r.created.length ? t('tm.createN', { n: r.created.length }) : t('tm.create');
  btn.title = '⌘↵';
  document.querySelectorAll('#tm-mode [data-mode]').forEach(b => { b.classList.toggle('on', b.dataset.mode === tmMode); b.disabled = b.dataset.mode === 'merge' && !store.model.tables.length; });
}
// the table the cursor's line is about is highlighted (with its relations) in the preview
function tmFollowCursor() {
  if (!tmResult) return;
  const line = tmText.value.slice(0, tmText.selectionStart).split('\n').length;
  const id = tmResult.lineTable.get(line);
  const sel = id ? { kind: 'table', id } : null;
  if (tmStore.selection?.id === sel?.id) return;
  tmStore.select(sel);
}
function tmCreate() {
  const r = tmBuild();
  if (!r.created.length && !r.extended.length) return;
  if (tmMode === 'merge') {
    store.update(m => {
      const full = r.model;
      m.tables = full.tables; m.fks = full.fks;
      migrateModel(m);
      const d = m.diagrams.find(x => x.id === m.activeDiagram) || m.diagrams[0];
      r.created.forEach(id => { const x = m.tables.find(y => y.id === id); if (x && d) d.positions[id] = { x: x.x, y: x.y }; });
    }, 'load');
    toast(t('tm.merged', { n: r.created.length, e: r.extended.length }));
  } else {
    const m = r.model;
    m.name = r.parsed.title || t('model.default');
    // the new project gets the whole model on its main diagram (the preview filter is merge-only)
    ws.create(m);
    toast(t('tm.done', { n: r.created.length }));
  }
  $('#tm-dialog').close();
  requestAnimationFrame(() => diagram.fit());
}
tmText.addEventListener('input', () => tmUpdate());
tmText.addEventListener('scroll', () => { $('#tm-gutter').scrollTop = tmText.scrollTop; });
['keyup', 'click', 'select'].forEach(ev => tmText.addEventListener(ev, tmFollowCursor));
tmText.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); tmCreate(); }
  else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); tmText.setRangeText(', ', tmText.selectionStart, tmText.selectionEnd, 'end'); tmUpdate(); }
});
$('#tm-examples').addEventListener('click', e => {
  const b = e.target.closest('[data-ex]');
  if (!b) return;
  tmText.value = (TEXT_EXAMPLES[getLang()] || TEXT_EXAMPLES.en).find(x => x.id === b.dataset.ex).text;
  tmFitted = false;
  tmUpdate(true);
});
$('#tm-chips').addEventListener('click', e => { const b = e.target.closest('[data-chip]'); if (b) tmInsert(TM_CHIPS[+b.dataset.chip].ins()); });
$('#tm-mode').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b && !b.disabled) { tmMode = b.dataset.mode; tmFitted = false; tmUpdate(true); } });
$('#tm-rules').addEventListener('change', () => tmUpdate(true));
$('#tm-create').addEventListener('click', tmCreate);
onLang(() => { if ($('#tm-dialog').open) openTextModel(); });


// ---------- builder (constructor library) ----------
// Ready entities, field sets and relations dragged (or clicked) onto the canvas.
const KIT_KEY = 'schemata:kit';
let kitOpen = matchMedia('(min-width: 1081px)').matches, kitTab = 'entities', kitDrag = null;
try { const v = localStorage.getItem(KIT_KEY); if (v !== null) kitOpen = v === '1'; } catch {}
const kitLabel = b => b.label[getLang()] || b.label.en;
const inModel = b => !!tableForBlock(store.model, b);
function toggleKit(force) {
  kitOpen = force ?? !kitOpen;
  try { localStorage.setItem(KIT_KEY, kitOpen ? '1' : '0'); } catch {}
  renderKit();
  if (kitOpen) requestAnimationFrame(() => $('#kit-q').focus({ preventScroll: true }));
}
function renderKit() {
  $('#kit').hidden = !kitOpen;
  $('.stage').classList.toggle('kit-open', kitOpen);
  $('#kit-btn').classList.toggle('on', kitOpen);
  if (!kitOpen) return;
  const q = $('#kit-q').value.trim().toLowerCase();
  const hit = (b, extra = '') => !q || `${b.label.uk} ${b.label.en} ${b.name || ''} ${(b.cols || []).join(' ')} ${extra}`.toLowerCase().includes(q);
  const tabs = [['entities', ENTITY_GROUPS], ['attrs', ATTRIBUTE_GROUPS], ['rels', null]];
  const count = groups => groups ? groups.reduce((n, g) => n + g.items.filter(b => hit(b)).length, 0) : RELATION_BLOCKS.filter(b => hit(b, `${b.hint.uk} ${b.hint.en}`)).length;
  $('#kit-tabs').innerHTML = tabs.map(([id, g]) => `<button type="button" data-tab="${id}" class="${kitTab === id ? 'on' : ''}">${esc(t(`kit.tab.${id}`))}${q ? ` <small>${count(g)}</small>` : ''}</button>`).join('');
  const tile = (kind, b, sub, extra = '') => `<button type="button" class="kit-tile${extra}" data-kind="${kind}" data-id="${b.id}">
      <span class="kit-ic">${b.icon}</span><span class="kit-txt"><b>${esc(kitLabel(b))}</b><small>${esc(sub)}</small></span></button>`;
  let html = `<p class="kit-help">${esc(t(`kit.help.${kitTab}`))}</p>`;
  if (kitTab === 'rels') {
    const items = RELATION_BLOCKS.filter(b => hit(b, `${b.hint.uk} ${b.hint.en}`));
    html += items.length ? `<div class="kit-grid one">${items.map(b => tile('rel', b, b.hint[getLang()] || b.hint.en)).join('')}</div>` : '';
  } else {
    const groups = (kitTab === 'entities' ? ENTITY_GROUPS : ATTRIBUTE_GROUPS).map(g => [g, g.items.filter(b => hit(b))]).filter(([, l]) => l.length);
    html += groups.map(([g, list]) => `<section><h5>${esc(kitLabel(g))}</h5><div class="kit-grid">${list.map(b => kitTab === 'entities'
      ? tile('entity', b, inModel(b) ? `✓ ${t('kit.in')}` : b.name, inModel(b) ? ' in' : '')
      : tile('attr', b, b.cols.map(c => c.replace(/[#!]|:.*$/g, '')).join(', '))).join('')}</div></section>`).join('');
  }
  $('#kit-body').innerHTML = html + (html.includes('kit-tile') ? '' : `<p class="kit-empty">${esc(t('kit.empty'))}</p>`);
  kitPeek(null);
}
// what a hovered block will do: its fields and the tables it will wire itself to
function kitPeek(el) {
  const box = $('#kit-peek');
  if (!el) { box.hidden = true; return; }
  const { kind, id } = el.dataset;
  let html = '';
  if (kind === 'entity') {
    const b = findEntity(id);
    const cols = ['ID', ...b.cols.map(c => c.replace(/[#!]|:.*$/g, ''))];
    const linkNames = b.links.map(l => l.replace('!', '')).filter(x => x !== b.id);
    const present = linkNames.map(x => tableForBlock(store.model, findEntity(x))?.name).filter(Boolean);
    const missing = linkNames.filter(x => !tableForBlock(store.model, findEntity(x))).map(x => kitLabel(findEntity(x)));
    html = `<b>${esc(b.name)}</b><code>${esc(cols.join(', '))}</code>` +
      (present.length ? `<span class="ok">${esc(t('kit.peek.links', { t: present.join(', ') }))}</span>` : '') +
      (missing.length ? `<span>${esc(t('kit.peek.wait', { t: missing.join(', ') }))}</span>` : '');
  } else if (kind === 'attr') {
    const a = findAttrSet(id);
    html = `<b>${esc(kitLabel(a))}</b><code>${esc(a.cols.map(c => { const n = c.replace(/[#!]|:.*$/g, ''); return `${n} ${inferColumn(n).type}`; }).join('\n'))}</code>`;
  } else {
    const r = RELATION_BLOCKS.find(x => x.id === id);
    html = `<b>${esc(kitLabel(r))}</b><span>${esc(r.hint[getLang()] || r.hint.en)}</span>`;
  }
  box.innerHTML = html; box.hidden = false;
}
// first spot near p where a table of this size overlaps nothing on the active diagram
function freeSpot(p, size) {
  const rects = store.model.tables.filter(x => store.isItemOnActiveDiagram(x.id)).map(x => ({ ...store.posOf(x.id), ...tableSize(x) }));
  const hits = (x, y) => rects.some(r => x < r.x + r.w + 30 && x + size.w + 30 > r.x && y < r.y + r.h + 30 && y + size.h + 30 > r.y);
  for (let ring = 0; ring < 30; ring++) for (let i = 0; i <= ring * 4; i++) {
    const a = ring ? (i / (ring * 4)) * Math.PI * 2 : 0;
    const x = Math.round((p.x + Math.cos(a) * ring * 80) / 10) * 10, y = Math.round((p.y + Math.sin(a) * ring * 60) / 10) * 10;
    if (!hits(x, y)) return { x, y };
  }
  return p;
}
// the canvas area not covered by the builder panel (screen px relative to the svg)
function kitVisibleRect() {
  const r = diagram.svg.getBoundingClientRect(), k = $('#kit');
  const left = kitOpen && !k.hidden ? Math.max(0, k.getBoundingClientRect().right - r.left + 16) : 0;
  return { left, top: 0, width: r.width - left, height: r.height };
}
function kitCenterWorld() {
  const v = kitVisibleRect(), { x, y, k } = diagram.view;
  return { x: (v.left + v.width / 2 - x) / k, y: (v.top + v.height / 2 - y) / k };
}
// pan (without zooming) just enough to bring a table out from under the panel / off-screen
function kitReveal(id) {
  const tb = store.table(id);
  if (!tb) return;
  const v = kitVisibleRect(), s = tableSize(tb), p = store.posOf(id), { x, y, k } = diagram.view;
  const sx = p.x * k + x, sy = p.y * k + y, w = s.w * k, h = s.h * k;
  if (sx >= v.left + 8 && sx + w <= v.left + v.width - 8 && sy >= 8 && sy + h <= v.height - 8) return;
  diagram.animateTo({ k, x: v.left + v.width / 2 - (p.x + s.w / 2) * k, y: v.height / 2 - (p.y + s.h / 2) * k });
}
const tableAt = (x, y) => document.elementFromPoint(x, y)?.closest('#canvas .table')?.dataset.id || null;
function kitPlaceEntity(id, at, exact) {
  const b = findEntity(id);
  let placed = null;
  store.update(m => {
    const r = placeEntity(m, b, getLang(), 0, 0);
    const size = tableSize(r.table);
    // next to what it is wired to: a child to the right of its parent, a parent to the left of its child
    const d0 = m.diagrams?.find(x => x.id === m.activeDiagram) || m.diagrams?.[0];
    const posOf = tb => d0?.positions?.[tb.id] || { x: tb.x, y: tb.y };
    const f = m.fks.find(x => x.fromTable === r.table.id && x.toTable !== r.table.id) || m.fks.find(x => x.toTable === r.table.id && x.fromTable !== r.table.id);
    const other = f && m.tables.find(x => x.id === (f.fromTable === r.table.id ? f.toTable : f.fromTable));
    let anchor = { x: at.x - size.w / 2, y: at.y - size.h / 2 };
    if (other) { const op = posOf(other); anchor = f.fromTable === r.table.id ? { x: op.x + tableSize(other).w + 120, y: op.y } : { x: op.x - size.w - 120, y: op.y }; }
    const p = exact ? { x: Math.round((at.x - size.w / 2) / 10) * 10, y: Math.round((at.y - 18) / 10) * 10 } : freeSpot(anchor, size);
    Object.assign(r.table, p);
    const d = m.diagrams?.find(x => x.id === m.activeDiagram) || m.diagrams?.[0];
    if (d) { d.tableIds ||= []; d.tableIds.push(r.table.id); d.positions ||= {}; d.positions[r.table.id] = { ...p }; }
    placed = r;
  });
  store.select({ kind: 'table', id: placed.table.id });
  requestAnimationFrame(() => document.querySelector(`#canvas .table[data-id="${placed.table.id}"]`)?.classList.add('kit-new'));
  toast(placed.linked.length ? t('kit.t.linked', { t: placed.table.name, l: placed.linked.join(', ') }) : t('kit.t.placed', { t: placed.table.name }));
  renderKit();
  return placed.table.id;
}
function kitAddFields(id, tableId) {
  const tb = store.table(tableId);
  if (!tb) return toast(t('kit.t.pickTable'), true);
  let added = [];
  store.update(m => { added = addColumns(m, tb, findAttrSet(id).cols); });
  store.select({ kind: 'table', id: tableId });
  toast(added.length ? t('kit.t.cols', { t: tb.name, c: added.join(', ') }) : t('kit.t.noCols', { t: tb.name }), !added.length);
}
function kitStartRelation(kind, childId) {
  if (!store.table(childId)) return toast(t('kit.t.pickTable'), true);
  if (kind === 'self') return createRelation(childId, childId, {});
  setRelationMode(true);
  kitPendingRel = kind;
  diagram.relFrom = childId;
  diagram.render();
  $('#mode-hint-text').textContent = t('kit.t.pickParent');
}
// relation mode finished on a parent: a pending builder relation is created without the type menu
function kitRelation(child, parent) {
  const kind = kitPendingRel;
  if (!kind) return false;
  setRelationMode(false);
  if (kind === 'mn') createJunction(child, parent);
  else createRelation(child, parent, { '1n': {}, '1nm': { mandatory: true }, '11': { kind: '11' }, ident: { identifying: true } }[kind]);
  return true;
}
$('#kit-q').addEventListener('input', () => {
  renderKit();
  // jump to the tab that has results
  const tabWith = [...$('#kit-tabs').querySelectorAll('[data-tab]')].find(b => +b.querySelector('small')?.textContent > 0);
  if (!$('#kit-body .kit-tile') && tabWith) { kitTab = tabWith.dataset.tab; renderKit(); }
});
$('#kit-q').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { e.target.value ? (e.target.value = '', renderKit()) : toggleKit(false); } });
$('#kit-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { kitTab = b.dataset.tab; renderKit(); } });
$('#kit-body').addEventListener('pointerover', e => kitPeek(e.target.closest('.kit-tile')));
$('#kit-body').addEventListener('pointerleave', () => kitPeek(null));
$('#kit-body').addEventListener('click', e => {
  const el = e.target.closest('.kit-tile');
  if (!el) return;
  const { kind, id } = el.dataset, sel = store.selection?.kind === 'table' ? store.selection.id : null;
  if (kind === 'entity') {
    const existing = tableForBlock(store.model, findEntity(id));
    if (existing) { store.select({ kind: 'table', id: existing.id }); kitReveal(existing.id); toast(t('kit.t.exists', { t: existing.name })); return; }
    kitReveal(kitPlaceEntity(id, kitCenterWorld(), false));
  } else if (kind === 'attr') kitAddFields(id, sel);
  else kitStartRelation(id, sel);
});
// Drag with pointer events rather than HTML5 drag-and-drop: works with touch, lets <button>
// tiles be dragged in every browser, and gives a custom ghost under the pointer.
let kitHoverId = null, kitPress = null, kitSuppressClick = false;
function kitHover(id) {
  if (id === kitHoverId) return;
  document.querySelectorAll('#canvas .table.drop-target').forEach(g => g.classList.remove('drop-target'));
  kitHoverId = id;
  if (id) document.querySelector(`#canvas .table[data-id="${id}"]`)?.classList.add('drop-target');
}
const stage = $('.stage');
const overCanvas = (x, y) => { const el = document.elementFromPoint(x, y); return !!el && stage.contains(el) && !el.closest('#kit, .dock, .nav-card, .assistant, .diagram-tabs'); };
function kitDragMove(x, y) {
  const g = kitDrag.ghost;
  g.style.transform = `translate(${x - 18}px, ${y - 18}px)`;
  const hint = $('#kit-hint');
  if (!overCanvas(x, y)) { kitHover(null); hint.hidden = true; g.classList.remove('armed'); return; }
  const target = kitDrag.kind === 'entity' ? null : tableAt(x, y);
  kitHover(target);
  const tb = target && store.table(target), r = stage.getBoundingClientRect();
  hint.textContent = kitDrag.kind === 'entity' ? t('kit.h.entity', { n: kitLabel(findEntity(kitDrag.id)) })
    : tb ? t(kitDrag.kind === 'attr' ? 'kit.h.attr' : 'kit.h.rel', { t: tb.name }) : t('kit.h.need');
  const ok = kitDrag.kind === 'entity' || !!tb;
  hint.classList.toggle('warn', !ok);
  g.classList.toggle('armed', ok);
  hint.style.transform = `translate(${x - r.left + 20}px, ${y - r.top + 22}px)`;
  hint.hidden = false;
}
function kitDragEnd(x, y, cancel = false) {
  const d = kitDrag;
  kitDrag = null;
  d.ghost.remove(); d.el.classList.remove('dragging');
  document.body.classList.remove('kit-dragging');
  kitHover(null); $('#kit-hint').hidden = true;
  if (cancel || !overCanvas(x, y)) return;
  const target = tableAt(x, y);
  if (d.kind === 'entity') kitReveal(kitPlaceEntity(d.id, diagram.toWorld({ clientX: x, clientY: y }), true));
  else if (!target) toast(t('kit.t.pickTable'), true);
  else if (d.kind === 'attr') kitAddFields(d.id, target);
  else kitStartRelation(d.id, target);
}
$('#kit-body').addEventListener('pointerdown', e => {
  const el = e.target.closest('.kit-tile');
  if (!el || e.button !== 0) return;
  kitPress = { el, x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType !== 'mouse' };
});
window.addEventListener('pointermove', e => {
  if (kitDrag) { e.preventDefault(); kitDragMove(e.clientX, e.clientY); return; }
  if (!kitPress || e.pointerId !== kitPress.id) return;
  const dx = e.clientX - kitPress.x, dy = e.clientY - kitPress.y;
  if (Math.hypot(dx, dy) < 6) return;
  // on touch a mostly vertical move is the panel scrolling, not a drag
  if (kitPress.touch && Math.abs(dy) > Math.abs(dx)) { kitPress = null; return; }
  const el = kitPress.el;
  kitPress = null;
  const ghost = el.cloneNode(true);
  ghost.className = 'kit-tile kit-ghost';
  ghost.style.width = `${el.offsetWidth}px`;
  document.body.append(ghost);
  el.classList.add('dragging');
  document.body.classList.add('kit-dragging');
  kitDrag = { kind: el.dataset.kind, id: el.dataset.id, el, ghost };
  kitSuppressClick = true;
  kitDragMove(e.clientX, e.clientY);
}, { passive: false });
window.addEventListener('pointerup', e => {
  kitPress = null;
  if (kitDrag) kitDragEnd(e.clientX, e.clientY);
  // the click (if any) follows pointerup synchronously; after that the guard must not linger
  setTimeout(() => { kitSuppressClick = false; });
});
window.addEventListener('pointercancel', () => { kitPress = null; if (kitDrag) kitDragEnd(0, 0, true); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && kitDrag) kitDragEnd(0, 0, true); }, true);
// the click that ends a drag must not also run the tile's click action
$('#kit-body').addEventListener('click', e => { if (kitSuppressClick) { kitSuppressClick = false; e.stopImmediatePropagation(); } }, true);
store.subscribe(r => { if (kitOpen && (r === 'load' || r === 'change') && kitTab === 'entities') { clearTimeout(renderKit.timer); renderKit.timer = setTimeout(renderKit, 150); } });
onLang(renderKit);
renderKit();

// ---------- empty canvas: ways to start ----------
function renderEmptyState() {
  const empty = !store.model.tables.some(x => store.isItemOnActiveDiagram(x.id)) && !(store.model.views || []).some(x => store.isItemOnActiveDiagram(x.id));
  const el = $('#empty-state');
  el.hidden = !empty;
  if (!empty) return;
  const card = (act, ic, key) => `<button type="button" class="es-card" data-es="${act}"><span class="es-ic">${ic}</span><b>${esc(t(`es.${key}`))}</b><small>${esc(t(`es.${key}.d`))}</small></button>`;
  el.innerHTML = `<div class="es-box">
    <h2>${esc(t('es.title'))}</h2><p>${esc(t('es.sub'))}</p>
    <ol class="es-steps">${[1, 2, 3].map(i => `<li><b>${i}</b><span>${esc(t(`es.p${i}`))}</span></li>`).join('')}</ol>
    <div class="es-grid">
      ${card('kit', ICONS.kit || '▦', 'kit')}
      ${card('fromText', ICONS.fromText || '✎', 'text')}
      ${card('templates', ICONS.templates || '▦', 'tpl')}
      ${card('import', ICONS.import || '⇪', 'ddl')}
    </div>
    <p class="es-tip">${esc(t('es.tip'))}</p></div>`;
}
$('#empty-state').addEventListener('click', e => {
  const b = e.target.closest('[data-es]');
  if (!b) return;
  if (b.dataset.es === 'kit') toggleKit(true); else actions[b.dataset.es]();
});
store.subscribe(r => { if (r !== 'move' && r !== 'select') renderEmptyState(); });
onLang(renderEmptyState);
renderEmptyState();

// ---------- logical → physical wizard ----------
const wizard = new Wizard({
  store, dialog: $('#wz-dialog'), highlight: sql => highlightSQL(sql),
  openKit: () => toggleKit(true),
  openText: () => openTextModel(),
  onApply: (r, snap) => {
    if (snap) ws.snapshot(false);
    store.update(m => { m.tables = r.m.tables; m.fks = r.m.fks; m.views = r.m.views; });
    toast(t('wz.done'));
    requestAnimationFrame(() => diagram.fit());
  },
});
onLang(() => { if ($('#wz-dialog').open) wizard.render(); });

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

// drag a relation out of a table onto empty canvas: a new parent table appears there, already
// linked, and its name is typed right away (the FK column follows the name on rename)
function linkToNewTable(childId, p) {
  const id = addTable({ x: p.x + 110, y: p.y + 20 }, false);
  try { store.addRelation(childId, id, {}); } catch (e) { toast(e.message, true); }
  // bring it into view first (the pan animates), then type its name on top of it
  kitReveal(id);
  setTimeout(() => openRenameTable(id), 420);
}
// ---------- inline field editor ----------
const editor = document.createElement('div');
editor.className = 'field-editor';
editor.hidden = true;
editor.innerHTML = `
  <div class="fe-row">
    <input class="fe-name mono" list="field-names" spellcheck="false" autocomplete="off">
    <datalist id="field-names"></datalist>
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
  // autocomplete: FK columns to other tables, typical fields for this kind of table, common names
  editor.querySelector('#field-names').innerHTML = col ? '' : suggestFieldNames(store.model, tb).slice(0, 40).map(n => `<option value="${n}"></option>`).join('');
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
  // logical names ("Дата народження", "unit price") become identifiers; the wording stays as the comment
  const raw = fe.name.value.trim();
  const name = st.mode === 'rename' ? physName(raw) : safeColumnName(tb.name, physName(raw));
  const note = isLogical(raw) ? raw.replace(/\s+/g, ' ').replace(/^./, ch => ch.toUpperCase()) : '';
  if (st.mode === 'rename') {
    if (name && tb) store.update(m => {
      const oldName = tb.name;
      tb.name = name;
      if (note && !tb.comment) tb.comment = note;
      cascadeTableRename(m, tb, oldName);
    });
    closeEditor();
    return;
  }
  if (!name) { closeEditor(); return; }
  const typed = fe.type.value.trim().toUpperCase();
  if (st.colId) {
    const col = tb.columns.find(c => c.id === st.colId);
    store.update(() => {
      Object.assign(col, { name, type: typed || col.type, pk: fe.pk.checked });
      col.nullable = !(fe.nn.checked || fe.pk.checked);
      if (note && !col.comment) col.comment = note;
    });
    closeEditor();
    return;
  }
  const col = newColumn(name, typed || guessType(name));
  col.pk = fe.pk.checked;
  col.nullable = !(fe.nn.checked || fe.pk.checked);
  if (note) col.comment = note;
  const autoParent = findParent(store.model, tb.id, name);
  if (autoParent && !typed) col.type = autoParent.columns.find(c => c.pk).type;
  let inf = null;
  store.update(m => {
    tb.columns.splice(st.index, 0, col);
    // a FK column takes its type from the parent key; everything else gets the full auto-definition
    if (!autoParent) inf = applyInference(m, tb, col, { keepType: !!typed, keepNn: fe.nn.checked || fe.pk.checked });
  });
  if (autoParent && !store.model.fks.some(f => f.fromTable === tb.id && f.toTable === autoParent.id)) {
    store.addRelation(tb.id, autoParent.id, { columnId: col.id, mandatory: !col.nullable });
    toast(t('t.autoFk', { c: name, t: autoParent.name }));
  } else if (inf?.rule && (inf.check || inf.unique || inf.def || inf.nn)) toast(t('t.autoDef', { c: name, v: describe(inf) }));
  if (next) openFieldEditor(tb.id, null, st.index + 1);
  else closeEditor();
}
fe.name.addEventListener('input', () => {
  if (!feState) return;
  const raw = fe.name.value.trim(), info = nameInfo(raw);
  const tbName = store.table(feState.tableId)?.name || '';
  const name = feState.mode === 'rename' ? info.name : safeColumnName(tbName, info.name);
  // words the dictionary does not know stay transliterated — say so, the user may want to type the English
  const warn = info.unknown.length ? `  ·  ⚠ ${t('ie.unknown', { w: info.unknown.join(', ') })}` : '';
  fe.hint.classList.toggle('warn', !!info.unknown.length);
  if (feState.mode === 'rename') { fe.hint.textContent = name && name !== raw ? `→ ${name}${warn}` : t('ie.hintEdit'); return; }
  if (!feState.typeTouched) fe.type.placeholder = guessType(name || 'X');
  if (!raw) { fe.hint.textContent = feState.colId ? t('ie.hintEdit') : t('ie.hint'); return; }
  const parent = !feState.colId && findParent(store.model, feState.tableId, name);
  const facts = feState.colId ? '' : parent ? `FK → ${parent.name}` : describe(inferColumn(name));
  fe.hint.textContent = ([name !== raw ? `→ ${name}` : '', facts].filter(Boolean).join('  ·  ') || t('ie.hint')) + warn;
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
    { label: t('kit.title'), icon: '▦', run: actions.kit },
    { label: t('tb.text.t'), icon: '✎', run: actions.fromText },
    { label: t('tb.l2p.t'), icon: '⇲', run: actions.physical },
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
  if (tp.layout) m.tables.forEach(x => { const p = tp.layout[x.name]; if (p) [x.x, x.y] = p; });
  m.tables.forEach((x, i) => { x.color = TABLE_COLORS[(i % 6) + 1]; });
  let vy = 40;
  const vx = Math.max(0, ...m.tables.map(x => x.x + tableSize(x).w)) + 160;
  m.views.forEach(v => { v.x = vx; v.y = vy; vy += viewSize(v).h + 48; });
  return m;
}
renderLang();
const linkedTpl = TEMPLATES.find(x => x.id === new URLSearchParams(location.search).get('template'));
const ws = initWorkspace({
  store, diagram, toast, download, readFile,
  openTemplates: () => openTemplates(),
  firstModel: blank => blank ? emptyModel() : templateModel(linkedTpl || TEMPLATES[0]),
  openMigration: id => openMigration(id),
  afterLoad: () => { nameInput.value = store.model.name; updateCheckBadge(); },
});
actions.projects = () => ws.projects();
// ?template=<id> opens a ready-made schema, so a schema can be linked to directly
if (linkedTpl) {
  const name = linkedTpl.name[getLang()] || linkedTpl.name.en;
  ws.openOrCreate(name, () => templateModel(linkedTpl));
  history.replaceState(null, '', location.pathname + location.hash);
  toast(t('t.tplLoaded', { n: name }));
}

// ---------- export menu ----------
function exportMenuItems() {
  return [
    { label: t('exp.sql'), icon: '⌨', run: () => download(fileName('sql'), generateDDL(store.model)) },
    { label: t('exp.html'), icon: '📄', run: () => download(fileName('html'), dictionaryHTML(store.model), 'text/html') },
    { label: t('exp.md'), icon: 'M↓', run: () => download(fileName('md'), dictionaryMarkdown(store.model), 'text/markdown') },
    { label: t('exp.print'), icon: '⎙', run: printDocs },
    '-',
    { label: t('exp.svg'), icon: '◇', run: actions.svg },
    { label: t('exp.png'), icon: '▣', run: actions.png },
    '-',
    { label: t('exp.json'), icon: '{}', kbd: '⌘S', run: actions.save },
  ];
}
actions.export = () => {
  const b = $('[data-action="export"]').getBoundingClientRect();
  openMenu(b.left, b.bottom + 6, exportMenuItems());
};
// Narrow screens hide the less-common dock actions (see .dock-adv in
// style.css); this puts them behind one button, same idea as actions.more
// below for the top bar's own overflow.
actions['dock-more'] = btn => {
  const r = btn.getBoundingClientRect();
  openMenu(r.left, r.top - 6, [
    { label: t('tb.relation'), icon: ICONS.relation, kbd: 'R', run: actions.relation },
    { label: t('tb.zone'), icon: ICONS.zone, run: actions.zone },
    '-',
    { label: t('tb.layout'), icon: ICONS.layout, run: actions.layout },
    { label: t('tb.noOverlaps'), icon: ICONS['no-overlaps'], run: actions['no-overlaps'] },
  ]);
};
// Narrow screens hide the secondary toolbar groups; this puts them behind one button.
actions.more = btn => {
  const r = btn.getBoundingClientRect();
  const checkBadge = $('#check-badge');
  openMenu(r.right, r.bottom + 6, [
    { label: t('tb.templates'), icon: ICONS.templates, run: actions.templates },
    { label: t('tb.check'), icon: ICONS.check, kbd: checkBadge.hidden ? undefined : checkBadge.textContent, run: actions.check },
    { label: t('kit.title'), icon: ICONS.kit, run: actions.kit },
    { label: t('tb.text'), icon: ICONS.fromText, run: actions.fromText },
    { label: t('tb.l2p'), icon: ICONS.physical, run: actions.physical },
    '-',
    { label: t('ws.projects'), icon: ICONS.projects, run: actions.projects },
    { label: t('ws.history'), icon: ICONS.history, run: actions.history },
    { label: t('tb.save'), icon: ICONS.save, kbd: '⌘S', run: actions.save },
    '-',
    { label: t('tb.import'), icon: ICONS.import, run: actions.import },
    { label: t('tb.migrate'), icon: ICONS.migrate, run: actions.migrate },
    { label: t('tb.export'), icon: ICONS.export, sub: exportMenuItems },
    { label: t('tb.sandbox'), icon: ICONS.sandbox, run: actions.sandbox },
  ]);
};
function printDocs() {
  const w = window.open(URL.createObjectURL(new Blob([dictionaryHTML(store.model)], { type: 'text/html' })), '_blank');
  if (w) w.addEventListener('load', () => setTimeout(() => w.print(), 300));
}

// ---------- SQL sandbox ----------
const sandbox = new Sandbox();
function renderSandboxSchema() {
  const tables = store.model.tables;
  $('#sbx-tables').innerHTML = tables.length ? tables.map(tb => `
    <li>
      <button type="button" class="sbx-tbl-name" data-ins="${esc(tb.name)}">${esc(tb.name)}</button>
      <ul class="sbx-cols">${tb.columns.map(c => `<li><button type="button" data-ins="${esc(tb.name)}.${esc(c.name)}">${esc(c.name)}</button><i>${esc(c.type || '')}</i></li>`).join('')}</ul>
    </li>`).join('') : `<li class="sbx-empty">${t('sbx.noTables')}</li>`;
}
function renderSandboxWarnings(failed) {
  const el = $('#sbx-warnings');
  el.hidden = !failed.length;
  el.innerHTML = failed.length ? `<b>${t('sbx.warn', { n: failed.length })}</b><ul>${failed.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
}
const sbxCell = v => v === null ? '<i>NULL</i>' : esc(String(v));
function renderSandboxResult(results, sql = '') {
  const el = $('#sbx-result');
  if (!results.length) {
    // SELECT без строк и INSERT — разные события: сказать про «рядків змінено: 0»
    // на запрос чтения значит показать поломку там, где её нет.
    const reading = /^\s*(?:WITH|SELECT|PRAGMA|EXPLAIN)\b/i.test(sql);
    el.innerHTML = `<div class="sbx-ok">${reading ? t('sbx.empty') : t('sbx.ok', { n: sandbox.changes })}</div>`;
    return;
  }
  el.innerHTML = results.map(r => {
    const rows = r.values.slice(0, 200);
    return `<div class="sbx-table-wrap"><table class="sbx-table"><thead><tr>${r.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map(v => `<td>${sbxCell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      ${r.values.length > 200 ? `<div class="sbx-more">${t('sbx.more', { n: r.values.length - 200 })}</div>` : ''}</div>`;
  }).join('');
}
async function openSandbox() {
  $('#sandbox-dialog').showModal();
  renderSandboxSchema();
  $('#sbx-result').innerHTML = '';
  $('#sbx-run').disabled = true;
  renderSandboxWarnings([]);
  try {
    renderSandboxWarnings(await sandbox.open(store.model));
    $('#sbx-result').innerHTML = `<div class="sbx-ok">${t('sbx.seeded', { n: sandbox.seeded })}</div>`;
  } catch (e) {
    renderSandboxWarnings([t('sbx.engineFail', { e: e.message })]);
  } finally {
    $('#sbx-run').disabled = false;
  }
}
actions.sandbox = openSandbox;
function runSandboxSql() {
  const sql = $('#sbx-sql').value.trim();
  if (!sql || $('#sbx-run').disabled) return;
  try { renderSandboxResult(sandbox.run(sql), sql); }
  catch (e) { $('#sbx-result').innerHTML = `<div class="sbx-err">${esc(e.message)}</div>`; }
}
$('#sbx-run').addEventListener('click', runSandboxSql);
$('#sbx-sql').addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runSandboxSql(); } });
$('#sbx-reset').addEventListener('click', async () => {
  $('#sbx-run').disabled = true;
  $('#sbx-result').innerHTML = '';
  try {
    renderSandboxWarnings(await sandbox.open(store.model));
    toast(t('sbx.resetDone'));
  } catch (e) {
    renderSandboxWarnings([t('sbx.engineFail', { e: e.message })]);
  } finally {
    $('#sbx-run').disabled = false;
  }
});
$('#sbx-tables').addEventListener('click', e => {
  const b = e.target.closest('[data-ins]');
  if (!b) return;
  const ta = $('#sbx-sql');
  ta.focus();
  ta.setRangeText(b.dataset.ins, ta.selectionStart, ta.selectionEnd, 'end');
});

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
