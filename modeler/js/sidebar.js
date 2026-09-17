// Left sidebar: filterable table list
import { t, onLang } from './i18n.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export class Sidebar {
  constructor(el, store, { onPick }) {
    this.el = el; this.store = store; this.onPick = onPick; this.query = '';
    el.innerHTML = `
      <div class="sb-head">
        <span class="sb-title" data-i18n="sb.tables"></span><span class="sb-count"></span>
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
      const li = e.target.closest('[data-id]');
      if (li) this.onPick(li.dataset.id);
    });
    store.subscribe(r => { if (r !== 'move' && r !== 'panel') this.render(); });
    onLang(() => this.render());
  }

  focus() { this.input.focus(); this.input.select(); }

  render() {
    const { model, selection } = this.store;
    this.input.placeholder = t('sb.search');
    this.el.querySelector('.sb-count').textContent = model.tables.length;
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
