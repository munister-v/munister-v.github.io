// Workspace: projects, version history, settings, status bar, cross-tab sync, offline updates
import * as S from './storage.js?v=202609192212';
import { setDiagramOptions } from './diagram.js?v=202609192212';
import { t, getLang, onLang } from './i18n.js?v=202609192212';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function initWorkspace(ctx) {
  const { store, diagram, toast, download, readFile, openTemplates, firstModel, afterLoad, openMigration } = ctx;
  const ws = { id: null, settingsState: S.loadSettings(), savedAt: null, saveError: false, lastSnapshotRaw: null };
  setDiagramOptions(ws.settingsState);
  const bar = $('#statusbar');
  const time = ts => new Date(ts).toLocaleTimeString(getLang() === 'uk' ? 'uk-UA' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  const kb = b => b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  // ---------- open the right project ----------
  S.migrateLegacy();
  const open = (id, model, { fit = true } = {}) => {
    store.flush();
    ws.id = id;
    S.setCurrent(id);
    store.model = model;
    store.undoStack = []; store.redoStack = [];
    store.selection = null;
    store.dirty = false;
    ws.lastSnapshotRaw = JSON.stringify(model);
    store.emit('load');
    store.dirty = false; clearTimeout(store.saveTimer);
    ws.savedAt = S.listProjects().find(p => p.id === id)?.updated || Date.now();
    renderStatus();
    afterLoad?.();
    if (fit) requestAnimationFrame(() => diagram.fit(false));
  };
  ws.open = id => {
    const m = S.loadProject(id);
    if (!m) { toast(t('ws.missing'), true); return; }
    snapshotIfChanged(true);
    open(id, m);
  };
  ws.create = model => {
    snapshotIfChanged(true);
    const id = S.createProject(model);
    open(id, S.loadProject(id));
    return id;
  };

  let startId = S.getCurrent();
  let startModel = startId && S.loadProject(startId);
  if (!startModel) {
    const first = S.listProjects()[0];
    if (first) { startId = first.id; startModel = S.loadProject(first.id); }
  }
  if (startModel) open(startId, startModel);
  else { const m = firstModel(); const id = S.createProject(m); open(id, S.loadProject(id)); }

  // ---------- saving ----------
  store.onPersist = model => {
    const ok = S.saveProject(ws.id, model);
    ws.saveError = !ok;
    if (ok) ws.savedAt = Date.now();
    else toast(t('ws.saveFail'), true);
    renderStatus();
  };
  store.subscribe(r => { if (r !== 'select' && r !== 'move') { ws.pending = true; renderStatus(); } });
  window.addEventListener('pagehide', () => { store.flush(); snapshotIfChanged(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); });

  // ---------- snapshots ----------
  function snapshotIfChanged(auto, label = '') {
    if (!ws.id) return false;
    const raw = JSON.stringify(store.model);
    if (auto && (!ws.settingsState.autoSnapshot || raw === ws.lastSnapshotRaw)) return false;
    const ok = S.addSnapshot(ws.id, store.model, { auto, label });
    if (ok) ws.lastSnapshotRaw = raw;
    return ok;
  }
  ws.snapshot = snapshotIfChanged;
  setInterval(() => snapshotIfChanged(true), 5 * 60 * 1000);

  // ---------- status bar ----------
  function renderStatus() {
    if (!bar) return;
    const m = store.model;
    const cols = m.tables.reduce((n, x) => n + x.columns.length, 0);
    const u = S.usage();
    const state = ws.saveError ? `<span class="st-save err"><i></i>${t('ws.saveErr')}</span>`
      : store.dirty ? `<span class="st-save busy"><i></i>${t('ws.saving')}</span>`
      : `<span class="st-save ok"><i></i>${t('ws.savedAt', { t: ws.savedAt ? time(ws.savedAt) : '—' })}</span>`;
    bar.innerHTML = `
      <button class="st-btn st-project" data-ws="projects" title="${t('ws.projects')}">
        <svg viewBox="0 0 16 16"><path d="M1.75 4.25v8.5h12.5v-7H7.5L6 4.25z"/></svg><b>${esc(m.name)}</b><span class="caret">▾</span>
      </button>
      ${state}
      <span class="st-sep"></span>
      <span class="st-stat">${t('ws.stat', { t: m.tables.length, c: cols, r: m.fks.length })}</span>
      <span class="st-grow"></span>
      ${navigator.onLine ? '' : `<span class="st-offline"><i></i>${t('ws.offline')}</span>`}
      <button class="st-btn" data-ws="history" title="${t('ws.history')}"><svg viewBox="0 0 16 16"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v2.2h2.2M8 5v3.2l2 1.3"/></svg><span>${t('ws.history')}</span></button>
      <span class="st-usage" title="${t('ws.usage', { u: kb(u.bytes), q: kb(u.quota) })}"><span class="st-meter"><i style="width:${Math.max(2, u.ratio * 100).toFixed(1)}%"${u.ratio > .8 ? ' class="hi"' : ''}></i></span>${kb(u.bytes)}</span>
      <button class="st-btn icon" data-ws="shortcuts" title="${t('ws.shortcuts')}"><svg viewBox="0 0 16 16"><rect x="1.75" y="4" width="12.5" height="8" rx="1.5"/><path d="M4 6.5h1M7 6.5h1M10 6.5h2M4.5 9.5h7"/></svg></button>
      <button class="st-btn icon" data-ws="settings" title="${t('ws.settings')}"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05"/></svg></button>`;
  }
  ws.renderStatus = renderStatus;
  setInterval(renderStatus, 30 * 1000);
  window.addEventListener('online', renderStatus);
  window.addEventListener('offline', renderStatus);
  bar?.addEventListener('click', e => {
    const b = e.target.closest('[data-ws]');
    if (b) ws[b.dataset.ws]();
  });

  // ---------- projects dialog ----------
  const rel = ts => {
    const s = Math.round((Date.now() - ts) / 1000);
    const rtf = new Intl.RelativeTimeFormat(getLang() === 'uk' ? 'uk' : 'en', { numeric: 'auto' });
    if (s < 60) return rtf.format(0, 'second');
    if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
    if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
    return new Date(ts).toLocaleDateString(getLang() === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  let projQuery = '';
  function renderProjects() {
    store.flush();
    const list = S.listProjects().filter(p => !projQuery || p.name.toLowerCase().includes(projQuery));
    const u = S.usage();
    $('#proj-list').innerHTML = list.length ? list.map(p => `
      <article class="proj${p.id === ws.id ? ' current' : ''}" data-id="${p.id}">
        <div class="proj-art">${Array.from({ length: Math.min(p.tables, 9) }, () => '<i></i>').join('')}</div>
        <div class="proj-body">
          <h3>${esc(p.name)}${p.id === ws.id ? `<span class="tag">${t('ws.current')}</span>` : ''}</h3>
          <p>${t('ws.meta', { t: p.tables, r: p.fks })} · ${rel(p.updated)}</p>
        </div>
        <div class="proj-actions">
          ${p.id === ws.id ? '' : `<button class="primary" type="button" data-p="open">${t('tpl.open')}</button>`}
          <button class="ic" type="button" data-p="rename" title="${t('cm.rename')}"><svg viewBox="0 0 16 16"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg></button>
          <button class="ic" type="button" data-p="duplicate" title="${t('cm.duplicate')}"><svg viewBox="0 0 16 16"><rect x="5" y="5" width="8.5" height="8.5" rx="1.5"/><path d="M3 10.5H2.5V2.5h8V3"/></svg></button>
          <button class="ic danger" type="button" data-p="delete" title="${t('cm.delete')}"><svg viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9"/></svg></button>
        </div>
      </article>`).join('') : `<p class="empty-note">${t('sb.noMatch')}</p>`;
    $('#proj-usage').innerHTML = `<span class="st-meter wide"><i style="width:${Math.max(1, u.ratio * 100).toFixed(1)}%"${u.ratio > .8 ? ' class="hi"' : ''}></i></span>${t('ws.usage', { u: kb(u.bytes), q: kb(u.quota) })}`;
  }
  ws.projects = () => { projQuery = ''; $('#proj-search').value = ''; renderProjects(); $('#projects-dialog').showModal(); setTimeout(() => $('#proj-search').focus()); };
  $('#proj-search').addEventListener('input', e => { projQuery = e.target.value.trim().toLowerCase(); renderProjects(); });
  $('#proj-list').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'), card = e.target.closest('.proj');
    if (!card) return;
    const id = card.dataset.id;
    const action = b?.dataset.p || (id !== ws.id ? 'open' : null);
    if (action === 'open') { $('#projects-dialog').close(); ws.open(id); toast(t('ws.opened')); }
    else if (action === 'rename') {
      const p = S.listProjects().find(x => x.id === id);
      const name = prompt(t('cm.rename'), p.name)?.trim();
      if (!name) return;
      if (id === ws.id) store.update(m => { m.name = name; }); else S.renameProject(id, name);
      store.flush(); renderProjects(); renderStatus();
    } else if (action === 'duplicate') { S.duplicateProject(id, t('ws.copySuffix')); renderProjects(); }
    else if (action === 'delete') {
      const p = S.listProjects().find(x => x.id === id);
      if (!confirm(t('ws.confirmDelete', { n: p.name }))) return;
      S.deleteProject(id);
      if (id === ws.id) {
        const next = S.listProjects()[0];
        if (next) open(next.id, S.loadProject(next.id));
        else { const nid = S.createProject(firstModel(true)); open(nid, S.loadProject(nid)); }
      }
      renderProjects(); renderStatus();
    }
  });
  $('#proj-new').addEventListener('click', () => { $('#projects-dialog').close(); openTemplates(); });
  $('#proj-export').addEventListener('click', () => {
    store.flush();
    download(`schemata-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S.exportBackup(), null, 1), 'application/json');
  });
  $('#proj-import').addEventListener('click', async () => {
    try {
      const data = JSON.parse(await readFile('.json,application/json'));
      if (data?.format === 'schemata-backup') toast(t('ws.restored', { n: S.importBackup(data) }));
      else { ws.create(S.migrateModel(data)); $('#projects-dialog').close(); toast(t('t.opened')); return; }
      renderProjects();
    } catch (err) { toast(t('t.openFail', { e: err.message }), true); }
  });

  // ---------- history dialog ----------
  function diffSummary(snap) {
    const now = new Set(store.model.tables.map(x => x.name));
    const then = new Set(snap.model.tables.map(x => x.name));
    const added = [...now].filter(n => !then.has(n)).length;
    const removed = [...then].filter(n => !now.has(n)).length;
    const parts = [];
    if (added) parts.push(`<span class="plus">+${added}</span>`);
    if (removed) parts.push(`<span class="minus">−${removed}</span>`);
    return parts.length ? parts.join(' ') : `<span class="same">${t('ws.sameTables')}</span>`;
  }
  function renderHistory() {
    store.flush();
    const snaps = S.listSnapshots(ws.id);
    $('#hist-list').innerHTML = snaps.length ? snaps.map(s => `
      <li data-id="${s.id}">
        <span class="hist-dot${s.auto ? '' : ' named'}"></span>
        <div class="hist-body">
          <b>${s.label ? esc(s.label) : s.auto ? t('ws.autoSnap') : t('ws.manualSnap')}</b>
          <span>${new Date(s.at).toLocaleString(getLang() === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${t('ws.meta', { t: s.tables, r: s.fks })} · ${diffSummary(s)}</span>
        </div>
        <button class="secondary" type="button" data-h="alter" title="${t('tb.migrate.t')}">${t('ws.alter')}</button>
        <button class="secondary" type="button" data-h="restore">${t('ws.restore')}</button>
        <button class="ic danger" type="button" data-h="delete" title="${t('cm.delete')}"><svg viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9"/></svg></button>
      </li>`).join('') : `<li class="empty-note">${t('ws.noSnaps')}</li>`;
  }
  ws.history = () => { renderHistory(); $('#history-dialog').showModal(); };
  $('#hist-save').addEventListener('click', () => {
    const label = $('#hist-label').value.trim();
    // a named version is kept even when nothing changed since the last automatic one
    const ok = S.addSnapshot(ws.id, store.model, { label, auto: false, force: true });
    if (ok) { ws.lastSnapshotRaw = JSON.stringify(store.model); $('#hist-label').value = ''; toast(t('ws.snapSaved')); }
    renderHistory();
  });
  $('#hist-label').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#hist-save').click(); } });
  $('#hist-list').addEventListener('click', e => {
    const b = e.target.closest('[data-h]'), li = e.target.closest('li[data-id]');
    if (!b || !li) return;
    const snap = S.listSnapshots(ws.id).find(s => s.id === li.dataset.id);
    if (b.dataset.h === 'delete') { S.deleteSnapshot(ws.id, snap.id); renderHistory(); return; }
    if (b.dataset.h === 'alter') { $('#history-dialog').close(); openMigration?.(snap.id); return; }
    if (!confirm(t('ws.confirmRestore'))) return;
    snapshotIfChanged(false, t('ws.beforeRestore'));
    const model = S.migrateModel(structuredClone(snap.model));
    store.update(m => { Object.keys(m).forEach(k => delete m[k]); Object.assign(m, model); }, 'load');
    store.flush();
    $('#history-dialog').close();
    requestAnimationFrame(() => diagram.fit());
    toast(t('ws.restoredSnap'));
  });

  // ---------- settings ----------
  const SETTINGS = ['snap', 'showTypes', 'compact', 'zebra', 'orthoLinks', 'autoSnapshot'];
  ws.settings = () => {
    SETTINGS.forEach(k => { $(`#set-${k}`).checked = !!ws.settingsState[k]; });
    $('#settings-dialog').showModal();
  };
  SETTINGS.forEach(k => $(`#set-${k}`).addEventListener('change', e => {
    ws.settingsState[k] = e.target.checked;
    S.saveSettings(ws.settingsState);
    setDiagramOptions(ws.settingsState);
    store.emit('select');
    diagram.render();
  }));
  $('#set-clear-history').addEventListener('click', () => {
    if (!confirm(t('ws.confirmClearHist'))) return;
    S.listProjects().forEach(p => S.listSnapshots(p.id).forEach(s => S.deleteSnapshot(p.id, s.id)));
    renderStatus();
    toast(t('ws.histCleared'));
  });

  // ---------- shortcuts ----------
  ws.shortcuts = () => $('#shortcuts-dialog').showModal();

  // ---------- other tabs ----------
  window.addEventListener('storage', e => {
    if (!ws.id || e.key !== S.storageKeyFor(ws.id) || !e.newValue) return;
    if (store.dirty) { toast(t('ws.conflict'), true); return; }
    try {
      const model = S.migrateModel(JSON.parse(e.newValue));
      store.model = model;
      store.selection = store.selection && (store.selection.kind === 'table' ? store.table(store.selection.id) : model.fks.find(f => f.id === store.selection.id)) ? store.selection : null;
      store.emit('select');
      store.listeners.forEach(fn => fn('load'));
      store.dirty = false; clearTimeout(store.saveTimer);
      ws.savedAt = Date.now();
      renderStatus();
      toast(t('ws.synced'));
    } catch {}
  });

  // ---------- service worker: offline + update prompt ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').then(reg => {
      const prompt = worker => {
        const el = $('#update-bar');
        el.hidden = false;
        el.querySelector('button').onclick = () => { store.flush(); worker.postMessage('skip-waiting'); };
      };
      if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) prompt(w); });
      });
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
  }

  onLang(renderStatus);
  renderStatus();
  return ws;
}
