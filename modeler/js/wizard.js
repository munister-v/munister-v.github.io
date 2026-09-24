// Logical → physical wizard: five steps that walk from "entities and attributes in plain words"
// to an Oracle schema, with every decision visible and editable, and nothing applied until the end.
// Each step re-computes the whole result from the current model on a copy (compute()), so going
// back and changing an earlier choice is always safe.
import { nameInfo, physName, plural, singular, toPhysical, cascadeTableRename, safeColumnName, renameIn, renameToken, getNaming, setNaming } from './autodef.js?v=202609241405';
import { generateDDL } from './ddl-gen.js?v=202609241405';
import { t } from './i18n.js?v=202609241405';

const CYR = /[а-яёєіїґ]/i;
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const STEPS = ['logical', 'names', 'keys', 'types', 'review'];
// the words a person used: the Ukrainian comment when there is one, else the name itself
const logicalOf = x => (x.comment && CYR.test(x.comment) ? x.comment : x.name);

export class Wizard {
  constructor({ store, dialog, highlight, onApply, openKit, openText }) {
    Object.assign(this, { store, dlg: dialog, highlight, onApply, openKit, openText });
    this.step = 0;
    this.reset();
    dialog.addEventListener('click', e => this.onClick(e));
    dialog.addEventListener('change', e => this.onChange(e));
    dialog.addEventListener('input', e => { if (e.target.matches('[data-name]')) this.onNameInput(e.target); });
  }
  reset() {
    this.o = {
      naming: getNaming(), plural: true, pkStyle: 'id',
      steps: { pk: true, fks: true, fkIdx: true, types: true, rules: true, ranges: true, audit: false },
      names: new Map(), types: new Map(), nn: new Map(),
    };
  }
  open() { this.step = 0; this.reset(); this.render(); this.dlg.showModal(); }

  // ---------- the whole transformation, on a copy ----------
  compute() {
    const m = structuredClone(this.store.model), o = this.o;
    const junction = tb => { const fks = m.fks.filter(f => f.fromTable === tb.id); return fks.length >= 2 && tb.columns.every(c => fks.some(f => f.columns.some(p => p.from === c.id))); };
    const rows = [];
    // 1. names: tables first (their final names are needed for the reserved-word guard on columns)
    for (const tb of m.tables) {
      const logical = logicalOf(tb), info = o.naming === 'keep' ? { name: tb.name, unknown: [] } : nameInfo(logical, o.naming);
      let auto = info.name || tb.name;
      if (o.plural && o.naming !== 'keep' && !junction(tb) && !(o.naming === 'translit' && CYR.test(logical))) auto = plural(auto);
      const final = o.names.get(tb.id) || auto, old = tb.name;
      rows.push({ key: tb.id, table: true, logical, auto, final, unknown: info.unknown, tb });
      if (CYR.test(logical) && !tb.comment) tb.comment = logical;
      if (final !== old && !m.tables.some(x => x !== tb && x.name === final)) {
        tb.name = final;
        cascadeTableRename(m, tb, old);
        (m.views || []).forEach(v => { v.sql = renameIn(v.sql, old, final); });
      }
    }
    for (const tb of m.tables) {
      for (const c of tb.columns) {
        const logical = logicalOf(c), key = `${tb.id}.${c.id}`;
        const info = o.naming === 'keep' || !CYR.test(logical) && !/\s/.test(logical) ? { name: c.name, unknown: [] } : nameInfo(logical, o.naming);
        const auto = safeColumnName(tb.name, info.name || c.name), final = o.names.get(key) || auto, old = c.name;
        rows.push({ key, table: false, logical, auto, final, unknown: info.unknown, tb, c });
        if (CYR.test(logical) && !c.comment) c.comment = logical;
        if (final !== old && !tb.columns.some(x => x !== c && x.name === final)) {
          c.name = final;
          (tb.checks || []).forEach(k => { k.expr = renameIn(k.expr, old, final); });
          tb.columns.forEach(x => { if (x.virtual) x.virtual = renameIn(x.virtual, old, final); });
          // constraint names built from the old column name (<TABLE>_<COLUMN>_UN / _CK / _IDX) follow it
          [...tb.uniques, ...tb.indexes, ...(tb.checks || [])].forEach(x => { x.name = renameToken(x.name, old, final); });
        }
      }
    }
    // 2. keys, relations, types, constraints — the same rules as everywhere else in the app
    const log = toPhysical(m, { ...o.steps, names: false, plural: false, retypeDefault: true }, t);
    // 3. primary key naming: surrogate single-column keys are ID or <TABLE>_ID
    if (o.pkStyle !== 'keep') {
      const carried = new Set(m.fks.flatMap(f => f.columns.map(p => p.from)));
      for (const tb of m.tables) {
        const pk = tb.columns.filter(c => c.pk);
        if (pk.length !== 1 || carried.has(pk[0].id) || !/^(ID|.+_ID)$/.test(pk[0].name)) continue;
        const want = o.pkStyle === 'id' ? 'ID' : `${singular(tb.name)}_ID`;
        if (pk[0].name !== want && !tb.columns.some(c => c.name === want)) pk[0].name = want;
      }
    }
    // 4. hand edits of types and NOT NULL
    for (const tb of m.tables) for (const c of tb.columns) {
      const key = `${tb.id}.${c.id}`;
      if (o.types.has(key)) c.type = o.types.get(key);
      if (o.nn.has(key) && !c.pk) c.nullable = !o.nn.get(key);
    }
    return { m, rows, log };
  }

  // ---------- rendering ----------
  render() {
    const r = this.res = this.compute();
    const d = this.dlg;
    d.querySelector('.wz-steps').innerHTML = STEPS.map((s, i) => `
      <li class="${i === this.step ? 'on' : i < this.step ? 'done' : ''}" data-go="${i}">
        <span class="wz-num">${i < this.step ? '✓' : i + 1}</span>
        <span><b>${esc(t(`wz.s.${s}`))}</b><small>${esc(this.stepNote(s, r))}</small></span>
      </li>`).join('');
    d.querySelector('.wz-main').innerHTML = `<header class="wz-head"><span class="wz-kicker">${esc(t('wz.stepOf', { n: this.step + 1, total: STEPS.length }))}</span>
      <h3>${esc(t(`wz.s.${STEPS[this.step]}`))}</h3><p>${esc(t(`wz.d.${STEPS[this.step]}`))}</p></header>` + this[`view_${STEPS[this.step]}`](r);
    d.querySelector('[data-wz="back"]').disabled = this.step === 0;
    d.querySelector('[data-wz="next"]').hidden = this.step === STEPS.length - 1;
    d.querySelector('[data-wz="apply"]').hidden = this.step !== STEPS.length - 1;
    d.querySelector('.wz-main').scrollTop = 0;
  }
  stepNote(s, r) {
    const m = this.store.model;
    if (s === 'logical') return t('wz.n.logical', { e: m.tables.length, r: m.fks.length });
    if (s === 'names') { const unk = r.rows.filter(x => x.unknown.length).length; return unk ? t('wz.n.namesUnk', { n: unk }) : t('wz.n.names', { n: this.renamedCount(r) }); }
    if (s === 'keys') return t('wz.n.keys', { n: r.m.fks.length });
    if (s === 'types') return t('wz.n.types', { n: r.m.tables.reduce((n, x) => n + (x.checks || []).length + x.uniques.length, 0) });
    return t('wz.n.review');
  }
  renamedCount(r) {
    const before = new Map(this.store.model.tables.flatMap(tb => [[tb.id, tb.name], ...tb.columns.map(c => [`${tb.id}.${c.id}`, c.name])]));
    return r.rows.filter(x => before.get(x.key) !== x.final).length;
  }

  view_logical() {
    const m = this.store.model;
    if (!m.tables.length) return `<div class="wz-empty"><p>${esc(t('wz.emptyModel'))}</p><div class="wz-actions"><button type="button" class="primary" data-wz="kit">${esc(t('kit.title'))}</button><button type="button" class="secondary" data-wz="text">${esc(t('tb.text'))}</button></div></div>`;
    const byId = Object.fromEntries(m.tables.map(x => [x.id, x]));
    const issues = [];
    for (const tb of m.tables) {
      const attrs = tb.columns.filter(c => !c.pk && !m.fks.some(f => f.fromTable === tb.id && f.columns.some(p => p.from === c.id)));
      if (!attrs.length) issues.push(t('wz.i.noAttrs', { t: logicalOf(tb) }));
      if (!m.fks.some(f => f.fromTable === tb.id || f.toTable === tb.id) && m.tables.length > 1) issues.push(t('wz.i.alone', { t: logicalOf(tb) }));
    }
    const cards = m.tables.map(tb => {
      // FK columns are shown as the relation line below, not as attributes
      const attrs = tb.columns.filter(c => !c.pk && !m.fks.some(f => f.fromTable === tb.id && f.columns.some(p => p.from === c.id)));
      const parents = m.fks.filter(f => f.fromTable === tb.id).map(f => byId[f.toTable]).filter(Boolean);
      return `<article class="wz-ent"><h4>${esc(logicalOf(tb))}${logicalOf(tb) !== tb.name ? `<small>${esc(tb.name)}</small>` : ''}</h4>
        <div class="wz-chips">${attrs.map(c => `<span>${esc(logicalOf(c))}</span>`).join('') || `<em>${esc(t('wz.noAttrs'))}</em>`}</div>
        ${parents.length ? `<p class="wz-rel">→ ${parents.map(p => esc(logicalOf(p))).join(', ')}</p>` : ''}</article>`;
    }).join('');
    return `<div class="wz-explain">${t('wz.explain')}</div>
      ${issues.length ? `<ul class="wz-issues">${issues.slice(0, 8).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="wz-ok">✓ ${esc(t('wz.logicalOk'))}</p>`}
      <div class="wz-ents">${cards}</div>
      <div class="wz-actions small"><span>${esc(t('wz.addMore'))}</span><button type="button" class="secondary small" data-wz="kit">${esc(t('kit.title'))}</button><button type="button" class="secondary small" data-wz="text">${esc(t('tb.text'))}</button></div>`;
  }

  view_names(r) {
    const o = this.o;
    const seg = ['translate', 'translit', 'keep'].map(k => `<button type="button" data-naming="${k}" class="${o.naming === k ? 'on' : ''}">${esc(t(`wz.naming.${k}`))}</button>`).join('');
    const unk = r.rows.filter(x => x.unknown.length);
    const rows = r.rows.filter(x => x.table).map(tr => {
      const cols = r.rows.filter(x => !x.table && x.tb.id === tr.key);
      const line = x => `<tr class="${x.table ? 'wz-t' : ''}${x.unknown.length ? ' unk' : ''}">
        <td>${x.table ? '▦ ' : ''}${esc(x.logical)}</td>
        <td><input class="mono" data-name="${x.key}" value="${esc(x.final)}" placeholder="${esc(x.auto)}" spellcheck="false">${x.unknown.length ? `<span class="wz-unk" title="${esc(t('wz.unkTip'))}">⚠ ${esc(x.unknown.join(', '))}</span>` : ''}${o.names.has(x.key) ? `<button type="button" class="wz-undo" data-unname="${x.key}" title="${esc(t('wz.auto'))}">↺</button>` : ''}</td></tr>`;
      return line(tr) + cols.map(line).join('');
    }).join('');
    return `<div class="wz-row"><div class="seg-switch wz-seg">${seg}</div>
        <label class="check"><input type="checkbox" data-opt="plural" ${o.plural ? 'checked' : ''} ${o.naming === 'keep' ? 'disabled' : ''}> ${esc(t('wz.plural'))}</label></div>
      <p class="wz-hint">${esc(t(`wz.namingHint.${o.naming}`))}</p>
      ${unk.length ? `<p class="wz-warn">⚠ ${esc(t('wz.unkCount', { n: unk.length }))}</p>` : ''}
      <table class="wz-names"><thead><tr><th>${esc(t('wz.col.logical'))}</th><th>${esc(t('wz.col.physical'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  view_keys(r) {
    const o = this.o, m = r.m, byId = Object.fromEntries(m.tables.map(x => [x.id, x]));
    const toggle = (k, extra = '') => `<label class="wz-toggle"><input type="checkbox" data-step="${k}" ${o.steps[k] ? 'checked' : ''}><span><b>${esc(t(`l2p.s.${k}`))}</b><small>${esc(t(`l2p.d.${k}`))}${extra}</small></span></label>`;
    const pk = ['id', 'table_id', 'keep'].map(k => `<label class="wz-radio"><input type="radio" name="wz-pk" value="${k}" ${o.pkStyle === k ? 'checked' : ''}><span><b>${esc(t(`wz.pk.${k}`))}</b><small>${esc(t(`wz.pk.${k}.d`))}</small></span></label>`).join('');
    const kind = f => {
      const child = byId[f.fromTable], cols = f.columns.map(p => child?.columns.find(c => c.id === p.from)).filter(Boolean);
      const ident = cols.every(c => c.pk), one = child?.uniques.some(u => u.columns.length === cols.length && cols.every(c => u.columns.includes(c.id)));
      return ident ? t('rel.ident') : one ? '1:1' : cols.every(c => !c.nullable) ? t('wz.rel.mand') : '1:N';
    };
    const rels = m.fks.map(f => `<tr><td class="mono">${esc(byId[f.fromTable]?.name)}.${esc(f.columns.map(p => byId[f.fromTable]?.columns.find(c => c.id === p.from)?.name).join(', '))}</td><td>→</td><td class="mono">${esc(byId[f.toTable]?.name)}</td><td><span class="wz-tag">${esc(kind(f))}</span></td></tr>`).join('');
    return `<h5>${esc(t('wz.pkTitle'))}</h5><div class="wz-radios">${pk}</div>
      <h5>${esc(t('wz.keysRules'))}</h5><div class="wz-toggles">${toggle('pk')}${toggle('fks')}${toggle('fkIdx')}</div>
      <h5>${esc(t('wz.relsTitle', { n: m.fks.length }))}</h5>
      ${rels ? `<table class="wz-rels">${rels}</table>` : `<p class="wz-hint">${esc(t('wz.noRels'))}</p>`}`;
  }

  view_types(r) {
    const o = this.o;
    const toggle = k => `<label class="wz-toggle"><input type="checkbox" data-step="${k}" ${o.steps[k] ? 'checked' : ''}><span><b>${esc(t(`l2p.s.${k}`))}</b><small>${esc(t(`l2p.d.${k}`))}</small></span></label>`;
    const tables = r.m.tables.map(tb => {
      const cons = [...(tb.checks || []).map(k => `CHECK ${k.expr}`), ...tb.uniques.map(u => `UNIQUE (${u.columns.map(id => tb.columns.find(c => c.id === id)?.name).join(', ')})`)];
      return `<details class="wz-tbl"><summary><b class="mono">${esc(tb.name)}</b><span>${esc(logicalOf(tb) !== tb.name ? logicalOf(tb) : '')}</span><em>${tb.columns.length} · ${cons.length ? `${cons.length} ${esc(t('wz.cons'))}` : ''}</em></summary>
        <table class="wz-cols">${tb.columns.map(c => { const key = `${tb.id}.${c.id}`; return `<tr><td class="mono">${c.pk ? '<i class="pk">PK</i>' : ''}${esc(c.name)}</td>
          <td><input class="mono" list="oracle-types" data-type="${key}" value="${esc(c.type)}" ${c.pk && c.identity ? 'disabled' : ''}></td>
          <td><label class="check"><input type="checkbox" data-nn="${key}" ${!c.nullable || c.pk ? 'checked' : ''} ${c.pk ? 'disabled' : ''}> NN</label></td>
          <td class="wz-def mono">${c.identity ? 'IDENTITY' : esc(c.default || '')}</td></tr>`; }).join('')}</table>
        ${cons.length ? `<ul class="wz-cons">${cons.map(x => `<li class="mono">${esc(x)}</li>`).join('')}</ul>` : ''}</details>`;
    }).join('');
    return `<div class="wz-toggles">${toggle('types')}${toggle('rules')}${toggle('ranges')}${toggle('audit')}</div>
      <h5>${esc(t('wz.tablesTitle'))}</h5><div class="wz-tbls">${tables}</div>`;
  }

  view_review(r) {
    const m = r.m, before = this.store.model;
    const n = {
      renamed: this.renamedCount(r),
      pks: m.tables.filter(x => x.columns.some(c => c.pk)).length - before.tables.filter(x => x.columns.some(c => c.pk)).length,
      fks: m.fks.length - before.fks.length,
      cons: m.tables.reduce((a, x) => a + (x.checks || []).length + x.uniques.length, 0) - before.tables.reduce((a, x) => a + (x.checks || []).length + x.uniques.length, 0),
      idx: m.tables.reduce((a, x) => a + x.indexes.length, 0) - before.tables.reduce((a, x) => a + x.indexes.length, 0),
    };
    const card = (k, v) => `<div class="wz-stat"><b>${v > 0 && k !== 'renamed' ? '+' : ''}${v}</b><span>${esc(t(`wz.r.${k}`))}</span></div>`;
    const ddl = generateDDL({ ...m, name: before.name }, { comments: true });
    return `<div class="wz-stats">${Object.entries(n).map(([k, v]) => card(k, v)).join('')}</div>
      <p class="wz-hint">${esc(t('wz.reviewHint'))}</p>
      <label class="check"><input type="checkbox" data-opt="snapshot" ${this.o.snapshot !== false ? 'checked' : ''}> ${esc(t('wz.snapshot'))}</label>
      <pre class="wz-ddl">${this.highlight(ddl)}</pre>`;
  }

  // ---------- events ----------
  onClick(e) {
    const go = e.target.closest('[data-go]');
    if (go) { this.step = +go.dataset.go; this.render(); return; }
    const b = e.target.closest('[data-wz]');
    const nm = e.target.closest('[data-naming]');
    const un = e.target.closest('[data-unname]');
    if (nm) { this.o.naming = nm.dataset.naming; if (nm.dataset.naming !== 'keep') setNaming(nm.dataset.naming); this.o.names.clear(); this.render(); return; }
    if (un) { this.o.names.delete(un.dataset.unname); this.render(); return; }
    if (!b) return;
    const a = b.dataset.wz;
    if (a === 'next') { this.step = Math.min(STEPS.length - 1, this.step + 1); this.render(); }
    else if (a === 'back') { this.step = Math.max(0, this.step - 1); this.render(); }
    else if (a === 'apply') { const r = this.compute(); this.dlg.close(); this.onApply(r, this.o.snapshot !== false); }
    else if (a === 'kit') { this.dlg.close(); this.openKit(); }
    else if (a === 'text') { this.dlg.close(); this.openText(); }
  }
  onChange(e) {
    const el = e.target;
    if (el.dataset.step) this.o.steps[el.dataset.step] = el.checked;
    else if (el.dataset.opt === 'plural') this.o.plural = el.checked;
    else if (el.dataset.opt === 'snapshot') { this.o.snapshot = el.checked; return; }
    else if (el.name === 'wz-pk') this.o.pkStyle = el.value;
    else if (el.dataset.type) { this.o.types.set(el.dataset.type, el.value.trim().toUpperCase()); }
    else if (el.dataset.nn) { this.o.nn.set(el.dataset.nn, el.checked); }
    else if (el.dataset.name) { this.commitName(el); }
    else return;
    this.renderKeepingDetails();
  }
  onNameInput(el) { el.closest('tr')?.classList.toggle('edited', true); }
  commitName(el) {
    const v = physName(el.value, this.o.naming === 'keep' ? 'translit' : this.o.naming) || '';
    const row = this.res.rows.find(x => x.key === el.dataset.name);
    if (!v || v === row?.auto) this.o.names.delete(el.dataset.name); else this.o.names.set(el.dataset.name, v);
  }
  // re-render without collapsing the <details> the user has open on the types step
  renderKeepingDetails() {
    const open = [...this.dlg.querySelectorAll('details[open] summary b')].map(x => x.textContent);
    const y = this.dlg.querySelector('.wz-main').scrollTop;
    this.render();
    this.dlg.querySelectorAll('details summary b').forEach(b => { if (open.includes(b.textContent)) b.closest('details').open = true; });
    this.dlg.querySelector('.wz-main').scrollTop = y;
  }
}
