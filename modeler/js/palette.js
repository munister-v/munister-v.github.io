// ⌘K command palette: actions + jump to table
import { t } from './i18n.js?v=202609210927';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export class Palette {
  constructor(store, { actions, onPick }) {
    this.store = store; this.actions = actions; this.onPick = onPick;
    this.el = document.createElement('div');
    this.el.className = 'palette';
    this.el.hidden = true;
    this.el.innerHTML = `<div class="pal-box" role="dialog" aria-modal="true">
      <label class="pal-input"><svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg><input spellcheck="false" autocomplete="off"><kbd>esc</kbd></label>
      <ul class="pal-list" role="listbox"></ul></div>`;
    document.body.append(this.el);
    this.input = this.el.querySelector('input');
    this.list = this.el.querySelector('.pal-list');
    this.el.addEventListener('pointerdown', e => { if (e.target === this.el) this.close(); });
    this.input.addEventListener('input', () => { this.index = 0; this.render(); });
    this.input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); this.run(this.index); }
      else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    this.list.addEventListener('pointermove', e => {
      const li = e.target.closest('[data-i]');
      if (li && +li.dataset.i !== this.index) { this.index = +li.dataset.i; this.highlight(); }
    });
    this.list.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) this.run(+li.dataset.i); });
  }

  get isOpen() { return !this.el.hidden; }
  open() {
    this.el.hidden = false; this.input.value = ''; this.index = 0;
    this.input.placeholder = t('cmd.ph');
    this.render();
    requestAnimationFrame(() => { this.el.classList.add('in'); this.input.focus(); });
  }
  close() { this.el.classList.remove('in'); this.el.hidden = true; }

  entries() {
    const q = this.input.value.trim().toLowerCase();
    const match = s => !q || s.toLowerCase().includes(q);
    const acts = this.actions().filter(a => match(a.label)).map(a => ({ ...a, group: t('cmd.actions') }));
    const tables = this.store.model.tables
      .filter(x => match(x.name) || match(`${x.schema}.${x.name}`))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30)
      .map(x => ({ label: x.name, hint: `${x.columns.length} ${t('tb.cols')}`, icon: 'table', color: x.color, run: () => this.onPick(x.id), group: t('cmd.tables') }));
    // table matches first when the user is searching
    return q ? [...tables, ...acts] : [...acts, ...tables];
  }

  render() {
    this.items = this.entries();
    if (!this.items.length) { this.list.innerHTML = `<li class="pal-empty">${t('cmd.empty')}</li>`; return; }
    let group = '';
    this.list.innerHTML = this.items.map((it, i) => {
      const head = it.group !== group ? `<li class="pal-group">${esc(group = it.group)}</li>` : '';
      const icon = it.icon === 'table'
        ? `<span class="dot${it.color ? ` c-${it.color}` : ''}"></span>`
        : `<span class="pal-ic">${it.svg || ''}</span>`;
      return `${head}<li data-i="${i}" role="option">${icon}<span class="pal-label">${esc(it.label)}</span>${it.hint ? `<kbd>${esc(it.hint)}</kbd>` : ''}</li>`;
    }).join('');
    this.highlight();
  }

  highlight() {
    this.list.querySelectorAll('[data-i]').forEach(li => li.classList.toggle('on', +li.dataset.i === this.index));
    this.list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  }
  move(d) {
    if (!this.items?.length) return;
    this.index = (this.index + d + this.items.length) % this.items.length;
    this.highlight();
  }
  run(i) {
    const it = this.items?.[i];
    if (!it) return;
    this.close();
    it.run();
  }
}
