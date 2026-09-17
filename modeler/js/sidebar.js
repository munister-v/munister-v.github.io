// Left sidebar: filterable table list
import { t, onLang } from './i18n.js?v=202609171538';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export class Sidebar {
  constructor(el, store, { onPick }) {
    this.el = el; this.store = store; this.onPick = onPick; this.query = ''; this.tab = 'tables';
    el.innerHTML = `
      <div class="sb-tabs" role="tablist">
        <button data-tab="tables" class="on"><span data-i18n="sb.tables"></span><span class="sb-count" data-count="tables"></span></button>
        <button data-tab="relations"><span data-i18n="sb.relations"></span><span class="sb-count" data-count="relations"></span></button>
      </div>
      <div class="sb-head">
        <button class="ic" data-action="table" data-i18n-title="tb.table.t"><svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg></button>
      </div>
      <label class="sb-search">
        <svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
        <input type="search" spellcheck="false" autocomplete="off">
      </label>
      <ul class="sb-list"></ul>`;
    this.list = el.querySelector('.sb-list');
    this.input = el.querySelector('input');
    this.input.addEventListener('input', () => { this.query = this.input.value.trim().toUpperCase(); this.render(); });
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const first = this.list.querySelector('[data-id]'); if (first) this.onPick(first.dataset.id); }
      if (e.key === 'Escape') { this.input.value = ''; this.query = ''; this.render(); this.input.blur(); }
    });
    this.list.addEventListener('click', e => {
      const fk = e.target.closest('[data-fk]');
      if (fk) { this.onPickFk?.(fk.dataset.fk); return; }
      const li = e.target.closest('[data-id]');
      if (li) this.onPick(li.dataset.id);
    });
    el.querySelector('.sb-tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      this.tab = b.dataset.tab;
      el.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
      this.render();
    });
    store.subscribe(r => { if (r !== 'move' && r !== 'panel') this.render(); });
    onLang(() => this.render());
  }

  renderRelations() {
    const { model, selection } = this.store;
    const byId = Object.fromEntries(model.tables.map(x => [x.id, x]));
    const q = this.query;
    const items = model.fks
      .map(f => ({ f, a: byId[f.fromTable], b: byId[f.toTable], k: this.store.relationKind(f) }))
      .filter(x => x.a && x.b && (!q || x.a.name.includes(q) || x.b.name.includes(q) || x.f.name.includes(q)))
      .sort((x, y) => x.a.name.localeCompare(y.a.name));
    if (!items.length) { this.list.innerHTML = `<li class="sb-empty">${model.fks.length ? t('sb.noMatch') : t('sb.noRels')}</li>`; return; }
    this.list.innerHTML = items.map(({ f, a, b, k }) => {
      const on = selection?.kind === 'fk' && selection.id === f.id ? ' on' : '';
      const badge = k.identifying ? 'ID' : k.oneToOne ? '1:1' : '1:N';
      return `<li data-fk="${f.id}" class="rel-item${on}">
        <span class="rel-names"><b>${esc(a.name)}</b><i>→</i><b>${esc(b.name)}</b></span>
        <span class="rel-badge${k.mandatory ? ' m' : ''}" title="${esc(f.name)}">${badge}</span>
      </li>`;
    }).join('');
  }

  focus() { this.input.focus(); this.input.select(); }

  render() {
    const { model, selection } = this.store;
    this.input.placeholder = t('sb.search');
    this.el.querySelector('[data-count="tables"]').textContent = model.tables.length;
    this.el.querySelector('[data-count="relations"]').textContent = model.fks.length;
    if (this.tab === 'relations') return this.renderRelations();
    const fkCount = id => model.fks.filter(f => f.fromTable === id || f.toTable === id).length;
    const items = model.tables
      .filter(x => !this.query || x.name.includes(this.query) || x.columns.some(c => c.name.includes(this.query)))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!items.length) {
      this.list.innerHTML = `<li class="sb-empty">${model.tables.length ? t('sb.noMatch') : t('sb.empty')}</li>`;
      return;
    }
    const hi = s => this.query ? esc(s).replace(this.query, m => `<mark>${m}</mark>`) : esc(s);
    this.list.innerHTML = items.map(x => {
      const on = (selection?.kind === 'table' && selection.id === x.id) ? ' on' : '';
      return `<li data-id="${x.id}" class="${on}">
        <span class="dot${x.color ? ` c-${x.color}` : ''}"></span>
        <span class="nm">${x.schema ? `<small>${esc(x.schema)}.</small>` : ''}${hi(x.name)}</span>
        <span class="meta">${fkCount(x.id) ? `<i title="FK">⇄ ${fkCount(x.id)}</i>` : ''}${x.columns.length}</span>
      </li>`;
    }).join('');
    this.list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  }
}
