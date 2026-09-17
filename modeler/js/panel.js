// Properties panel: model, table (columns, keys, indexes) or foreign key
import { ORACLE_TYPES, TABLE_COLORS, newColumn, uid, uniqueName } from './model.js';
import { t, onLang } from './i18n.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const upper = v => v.trim().toUpperCase().replace(/\s+/g, '_');
const ICON = {
  more: '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>',
  up: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 13V3M4 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  del: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  plus: '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
};

export class Panel {
  constructor(el, store) {
    this.el = el; this.store = store;
    store.subscribe(r => { if (r !== 'panel' && r !== 'move') this.render(); });
    onLang(() => this.render());
    el.addEventListener('change', e => this.onChange(e));
    el.addEventListener('click', e => this.onClick(e));
    document.body.insertAdjacentHTML('beforeend',
      `<datalist id="oracle-types">${ORACLE_TYPES.map(x => `<option value="${x}">`).join('')}</datalist>`);
  }

  render() {
    const s = this.store.selection;
    if (!s) return this.renderModel();
    if (s.kind === 'fk') return this.renderFk(this.store.model.fks.find(f => f.id === s.id));
    this.renderTable(this.store.table(s.id));
  }

  head(eyebrow, title, del) {
    return `<header class="p-head">
      <div><span class="eyebrow">${eyebrow}</span><h2>${esc(title)}</h2></div>
      ${del ? `<button class="pill danger" data-a="${del}">${t('p.delete')}</button>` : ''}
    </header>`;
  }

  renderModel() {
    const m = this.store.model;
    this.el.innerHTML = `
      ${this.head(t('p.model'), m.name)}
      <label class="field">${t('p.name')}<input data-f="model.name" value="${esc(m.name)}"></label>
      <div class="stats">
        <div><b>${m.tables.length}</b>${t('p.stat.tables')}</div>
        <div><b>${m.fks.length}</b>${t('p.stat.fks')}</div>
        <div><b>${m.tables.reduce((n, x) => n + x.columns.length, 0)}</b>${t('p.stat.cols')}</div>
      </div>
      <h3>${t('p.hints')}</h3>
      <ol class="hints">
        <li>${t('p.hint1')}</li><li>${t('p.hint2')}</li><li>${t('p.hint3')}</li><li>${t('p.hint4')}</li>
      </ol>`;
  }

  renderTable(tb) {
    const m = this.store.model;
    const cols = tb.columns.map((c, i) => `
      <div class="col-row${this.openCol === c.id ? ' open' : ''}" data-col="${c.id}">
        <input class="mono" data-f="col.name" value="${esc(c.name)}" spellcheck="false" aria-label="${t('p.col.name')}">
        <input class="mono" data-f="col.type" value="${esc(c.type)}" list="oracle-types" spellcheck="false" aria-label="${t('p.col.type')}">
        <label class="tog" title="${t('p.pk.t')}"><input type="checkbox" data-f="col.pk" ${c.pk ? 'checked' : ''}><span>PK</span></label>
        <label class="tog" title="NOT NULL"><input type="checkbox" data-f="col.nn" ${!c.nullable || c.pk ? 'checked' : ''} ${c.pk ? 'disabled' : ''}><span>NN</span></label>
        <span class="row-actions">
          <button class="ic" data-a="col-more" title="${t('p.more.t')}">${ICON.more}</button>
          <button class="ic" data-a="col-up" ${i ? '' : 'disabled'} title="${t('p.up.t')}">${ICON.up}</button>
          <button class="ic" data-a="col-del" title="${t('p.del.t')}">${ICON.del}</button>
        </span>
        <div class="col-more">
          <label class="field">DEFAULT<input class="mono" data-f="col.default" value="${esc(c.default)}" placeholder="${t('p.default.ph')}" ${c.identity ? 'disabled' : ''}></label>
          <label class="check"><input type="checkbox" data-f="col.identity" ${c.identity ? 'checked' : ''}> ${t('p.identity')}</label>
          <label class="field">${t('p.comment')}<input data-f="col.comment" value="${esc(c.comment)}"></label>
        </div>
      </div>`).join('');

    const colOptions = sel => tb.columns.map(c => `<option value="${c.id}" ${sel.includes(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    const keyList = (arr, kind) => arr.map(x => `
      <div class="key-card" data-${kind}="${x.id}">
        <div class="key-top"><input class="mono" data-f="${kind}.name" value="${esc(x.name)}" spellcheck="false">
          ${kind === 'idx' ? `<label class="tog wide"><input type="checkbox" data-f="idx.unique" ${x.unique ? 'checked' : ''}><span>UNIQUE</span></label>` : ''}
          <button class="ic" data-a="${kind}-del" title="${t('p.del.t')}">${ICON.del}</button></div>
        <select class="mono" multiple data-f="${kind}.columns" size="${Math.min(5, Math.max(2, tb.columns.length))}">${colOptions(x.columns)}</select>
      </div>`).join('');

    const fks = m.fks.filter(f => f.fromTable === tb.id || f.toTable === tb.id).map(f => {
      const out = f.fromTable === tb.id;
      const other = this.store.table(out ? f.toTable : f.fromTable);
      return `<li><a data-a="goto-fk" data-id="${f.id}">${esc(f.name)}</a><span>${out ? '→' : '←'} ${esc(other?.name)}</span></li>`;
    }).join('');
    const none = `<p class="none">${t('p.none')}</p>`;

    this.el.innerHTML = `
      ${this.head(t('p.table'), tb.name, 'table-del')}
      <div class="grid2">
        <label class="field">${t('p.name')}<input class="mono" data-f="table.name" value="${esc(tb.name)}" spellcheck="false"></label>
        <label class="field">${t('p.schema')}<input class="mono" data-f="table.schema" value="${esc(tb.schema)}" placeholder="—" spellcheck="false"></label>
      </div>
      <label class="field">${t('p.comment')}<textarea data-f="table.comment" rows="2">${esc(tb.comment)}</textarea></label>
      <div class="field">${t('p.color')}
        <div class="swatches">${TABLE_COLORS.map(c => `<button class="sw${c ? ` c-${c}` : ''}${(tb.color || '') === c ? ' on' : ''}" data-a="color" data-color="${c}" aria-label="${c || 'none'}"></button>`).join('')}</div>
      </div>

      <h3>${t('p.columns')} <span class="count">${tb.columns.length}</span><button class="pill small" data-a="col-add">${ICON.plus} ${t('p.addColumn')}</button></h3>
      <div class="cols">${cols}</div>

      <h3>${t('p.uniques')} <span class="count">${tb.uniques.length}</span><button class="pill small" data-a="uk-add">${ICON.plus}</button></h3>
      ${keyList(tb.uniques, 'uk') || none}

      <h3>${t('p.indexes')} <span class="count">${tb.indexes.length}</span><button class="pill small" data-a="idx-add">${ICON.plus}</button></h3>
      ${keyList(tb.indexes, 'idx') || none}

      <h3>${t('p.relations')}</h3>
      ${fks ? `<ul class="fklist">${fks}</ul>` : none}`;
  }

  renderFk(f) {
    const from = this.store.table(f.fromTable), to = this.store.table(f.toTable);
    const pairs = f.columns.map(p => `<li><span>${esc(from.columns.find(c => c.id === p.from)?.name)}</span><i>→</i><span>${esc(to.columns.find(c => c.id === p.to)?.name)}</span></li>`).join('');
    const mandatory = f.columns.every(p => from.columns.find(c => c.id === p.from)?.nullable === false);
    this.el.innerHTML = `
      ${this.head(t('p.fk'), f.name, 'fk-del')}
      <label class="field">${t('p.name')}<input class="mono" data-f="fk.name" value="${esc(f.name)}" spellcheck="false"></label>
      <div class="rel-card">
        <a data-a="goto-table" data-id="${from.id}">${esc(from.name)}</a>
        <svg viewBox="0 0 40 12" width="40" height="12"><path d="M0 6h38M32 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
        <a data-a="goto-table" data-id="${to.id}">${esc(to.name)}</a>
        <ul class="pairs">${pairs}</ul>
      </div>
      <label class="field">ON DELETE<select data-f="fk.onDelete">
        ${[['', 'NO ACTION'], ['CASCADE', 'CASCADE'], ['SET NULL', 'SET NULL']].map(([v, l]) => `<option value="${v}" ${f.onDelete === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label>
      <label class="check"><input type="checkbox" data-f="fk.mandatory" ${mandatory ? 'checked' : ''}> ${t('p.mandatory')}</label>`;
  }

  ctx(target) {
    const s = this.store.selection;
    return {
      colId: target.closest('[data-col]')?.dataset.col,
      ukId: target.closest('[data-uk]')?.dataset.uk,
      idxId: target.closest('[data-idx]')?.dataset.idx,
      tableId: s?.kind === 'table' ? s.id : null,
      fkId: s?.kind === 'fk' ? s.id : null,
    };
  }

  onChange(e) {
    const el = e.target, f = el.dataset.f;
    if (!f) return;
    const c = this.ctx(el);
    const val = el.type === 'checkbox' ? el.checked : el.value;
    let rerender = false;
    this.store.update(m => {
      const tb = c.tableId && m.tables.find(x => x.id === c.tableId);
      const col = tb && c.colId && tb.columns.find(x => x.id === c.colId);
      const uk = tb && c.ukId && tb.uniques.find(x => x.id === c.ukId);
      const idx = tb && c.idxId && tb.indexes.find(x => x.id === c.idxId);
      const fk = c.fkId && m.fks.find(x => x.id === c.fkId);
      switch (f) {
        case 'model.name': m.name = val; rerender = true; break;
        case 'table.name': tb.name = el.value = upper(val) || tb.name; rerender = true; break;
        case 'table.schema': tb.schema = el.value = upper(val); break;
        case 'table.comment': tb.comment = val; break;
        case 'col.name': col.name = el.value = upper(val) || col.name; break;
        case 'col.type': col.type = el.value = val.trim().toUpperCase(); break;
        case 'col.pk': col.pk = val; if (val) col.nullable = false; rerender = true; break;
        case 'col.nn': col.nullable = !val; break;
        case 'col.default': col.default = val.trim(); break;
        case 'col.identity': col.identity = val; if (val) { col.nullable = false; col.default = ''; } rerender = true; break;
        case 'col.comment': col.comment = val; break;
        case 'uk.name': uk.name = el.value = upper(val) || uk.name; break;
        case 'idx.name': idx.name = el.value = upper(val) || idx.name; break;
        case 'idx.unique': idx.unique = val; break;
        case 'uk.columns': case 'idx.columns':
          (uk || idx).columns = [...el.selectedOptions].map(o => o.value); break;
        case 'fk.name': fk.name = el.value = upper(val) || fk.name; rerender = true; break;
        case 'fk.onDelete': fk.onDelete = val; break;
        case 'fk.mandatory': {
          const from = m.tables.find(x => x.id === fk.fromTable);
          fk.columns.forEach(p => { const cc = from.columns.find(x => x.id === p.from); if (cc && !cc.pk) cc.nullable = !val; });
          break;
        }
      }
    }, rerender ? 'change' : 'panel');
  }

  onClick(e) {
    const btn = e.target.closest('[data-a]');
    if (!btn || btn.disabled) return;
    const a = btn.dataset.a, c = this.ctx(btn), st = this.store;
    const tb = c.tableId && st.table(c.tableId);
    switch (a) {
      case 'table-del': st.deleteTable(c.tableId); break;
      case 'color': st.update(() => { tb.color = btn.dataset.color; }); break;
      case 'col-add': {
        const col = newColumn(tb.columns.length ? `COLUMN_${tb.columns.length + 1}` : 'ID', tb.columns.length ? 'VARCHAR2(100 CHAR)' : 'NUMBER');
        if (!tb.columns.length) { col.pk = true; col.identity = true; col.nullable = false; }
        st.update(() => tb.columns.push(col));
        this.el.querySelector(`[data-col="${col.id}"] input`)?.select();
        break;
      }
      case 'col-del': st.deleteColumn(tb.id, c.colId); break;
      case 'col-up': st.update(() => {
        const i = tb.columns.findIndex(x => x.id === c.colId);
        [tb.columns[i - 1], tb.columns[i]] = [tb.columns[i], tb.columns[i - 1]];
      }); break;
      case 'col-more':
        this.openCol = this.openCol === c.colId ? null : c.colId;
        this.render(); break;
      case 'uk-add': st.update(m => tb.uniques.push({ id: uid('u'), name: uniqueName(m, `${tb.name}_UN`), columns: [] })); break;
      case 'idx-add': st.update(m => tb.indexes.push({ id: uid('i'), name: uniqueName(m, `${tb.name}_IDX`), unique: false, columns: [] })); break;
      case 'uk-del': st.update(() => { tb.uniques = tb.uniques.filter(x => x.id !== c.ukId); }); break;
      case 'idx-del': st.update(() => { tb.indexes = tb.indexes.filter(x => x.id !== c.idxId); }); break;
      case 'fk-del': st.update(m => { m.fks = m.fks.filter(x => x.id !== c.fkId); }); st.select(null); break;
      case 'goto-fk': st.select({ kind: 'fk', id: btn.dataset.id }); break;
      case 'goto-table': st.select({ kind: 'table', id: btn.dataset.id }); break;
    }
  }
}
