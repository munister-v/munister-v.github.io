// Local persistence: several projects, version snapshots, settings, quota handling.
//
// Keys (all under the "schemata:" prefix):
//   schemata:index            [{ id, name, tables, fks, created, updated }]   project list
//   schemata:p:<id>           model JSON
//   schemata:v:<id>           [{ id, at, label, auto, tables, fks, model }]   snapshots, newest first
//   schemata:current          id of the last opened project
//   schemata:settings         UI settings
//   schemata-lang             interface language (kept from earlier versions)

export const MODEL_VERSION = 2;
const P = 'schemata:';
const MAX_SNAPSHOTS = 25;
const QUOTA_BYTES = 5 * 1024 * 1024;

const read = key => {
  try { const raw = localStorage.getItem(key); return raw == null ? null : JSON.parse(raw); } catch { return null; }
};

// Write with a recovery path: on QuotaExceeded, drop the oldest automatic snapshots and retry
function write(key, value) {
  const raw = JSON.stringify(value);
  for (let attempt = 0; attempt < 6; attempt++) {
    try { localStorage.setItem(key, raw); return true; } catch (e) {
      if (!isQuota(e) || !pruneSnapshots()) break;
    }
  }
  return false;
}
const isQuota = e => e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
const remove = key => { try { localStorage.removeItem(key); } catch {} };

function pruneSnapshots() {
  let best = null;
  for (const p of listProjects()) {
    const snaps = read(`${P}v:${p.id}`) || [];
    const autoIdx = snaps.map((s, i) => [s, i]).filter(([s]) => s.auto);
    const victim = autoIdx.at(-1) || (snaps.length > 1 ? [snaps.at(-1), snaps.length - 1] : null);
    if (victim && (!best || victim[0].at < best.at)) best = { id: p.id, index: victim[1], at: victim[0].at };
  }
  if (!best) return false;
  const snaps = read(`${P}v:${best.id}`);
  snaps.splice(best.index, 1);
  try { localStorage.setItem(`${P}v:${best.id}`, JSON.stringify(snaps)); } catch { return false; }
  return true;
}

// ---------- model format ----------
export function migrateModel(m) {
  if (!m || !Array.isArray(m.tables)) throw new Error('bad model');
  m.fks ||= [];
  m.tables.forEach(t => {
    t.uniques ||= []; t.indexes ||= []; t.columns ||= [];
    t.color ??= ''; t.schema ??= ''; t.comment ??= '';
    t.columns.forEach(c => { c.default ??= ''; c.comment ??= ''; c.identity ??= false; c.nullable ??= true; });
  });
  m.format = 'schemata-model';
  m.version = MODEL_VERSION;
  return m;
}

// ---------- projects ----------
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const meta = (id, model, prev = {}) => ({
  id, name: model.name, tables: model.tables.length, fks: model.fks.length,
  created: prev.created || Date.now(), updated: Date.now(),
});

export const listProjects = () => (read(`${P}index`) || []).sort((a, b) => b.updated - a.updated);
const saveIndex = list => write(`${P}index`, list);

export function loadProject(id) {
  const m = read(`${P}p:${id}`);
  return m ? migrateModel(m) : null;
}

export function saveProject(id, model) {
  if (!write(`${P}p:${id}`, model)) return false;
  const list = listProjects();
  const i = list.findIndex(p => p.id === id);
  const entry = meta(id, model, list[i]);
  if (i >= 0) list[i] = entry; else list.push(entry);
  return saveIndex(list);
}

export function createProject(model) {
  const id = newId();
  saveProject(id, migrateModel(structuredClone(model)));
  return id;
}

export function duplicateProject(id, suffix) {
  const m = loadProject(id);
  if (!m) return null;
  m.name = `${m.name} ${suffix}`;
  return createProject(m);
}

export function renameProject(id, name) {
  const m = loadProject(id);
  if (!m) return;
  m.name = name;
  saveProject(id, m);
}

export function deleteProject(id) {
  remove(`${P}p:${id}`); remove(`${P}v:${id}`);
  saveIndex(listProjects().filter(p => p.id !== id));
  if (getCurrent() === id) remove(`${P}current`);
}

export const getCurrent = () => { try { return localStorage.getItem(`${P}current`); } catch { return null; } };
export const setCurrent = id => { try { localStorage.setItem(`${P}current`, id); } catch {} };

// ---------- snapshots ----------
export const listSnapshots = id => read(`${P}v:${id}`) || [];

export function addSnapshot(id, model, { label = '', auto = false, force = false } = {}) {
  const snaps = listSnapshots(id);
  const raw = JSON.stringify(model);
  // identical to the latest one: nothing to keep
  if (!force && snaps[0] && JSON.stringify(snaps[0].model) === raw) return false;
  snaps.unshift({ id: newId(), at: Date.now(), label, auto, tables: model.tables.length, fks: model.fks.length, model: JSON.parse(raw) });
  // keep every named version, trim automatic ones first
  while (snaps.length > MAX_SNAPSHOTS) {
    const i = snaps.map(s => s.auto).lastIndexOf(true);
    snaps.splice(i >= 0 ? i : snaps.length - 1, 1);
  }
  return write(`${P}v:${id}`, snaps);
}

export function deleteSnapshot(id, snapId) {
  write(`${P}v:${id}`, listSnapshots(id).filter(s => s.id !== snapId));
}

// ---------- settings ----------
export const DEFAULT_SETTINGS = { snap: true, showTypes: true, compact: false, autoSnapshot: true, zebra: true };
export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...(read(`${P}settings`) || {}) });
export const saveSettings = s => write(`${P}settings`, s);

// ---------- usage / backup ----------
export function usage() {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('schemata')) bytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
  } catch {}
  return { bytes, quota: QUOTA_BYTES, ratio: Math.min(1, bytes / QUOTA_BYTES) };
}

export function exportBackup() {
  return {
    format: 'schemata-backup', version: MODEL_VERSION, exported: new Date().toISOString(),
    projects: listProjects().map(p => ({ ...p, model: loadProject(p.id), snapshots: listSnapshots(p.id) })),
  };
}

export function importBackup(data) {
  if (data?.format !== 'schemata-backup' || !Array.isArray(data.projects)) throw new Error('bad backup');
  let n = 0;
  for (const p of data.projects) {
    if (!p.model) continue;
    const id = createProject(p.model);
    if (Array.isArray(p.snapshots)) write(`${P}v:${id}`, p.snapshots.slice(0, MAX_SNAPSHOTS));
    n++;
  }
  return n;
}

// One-time move from the single-model keys of earlier versions
export function migrateLegacy() {
  if (read(`${P}index`)) return null;
  const legacy = read('schemata-model') || read('ferret-model');
  if (!legacy?.tables) return null;
  let id = null;
  try { id = createProject(legacy); } catch { return null; }
  setCurrent(id);
  remove('schemata-model'); remove('ferret-model'); remove('ferret-theme'); remove('ferret-lang');
  return id;
}

export const storageKeyFor = id => `${P}p:${id}`;
