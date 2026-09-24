// Canvas Quick Search: floating search overlay for tables and columns on diagram (⌘F)
import { t } from './i18n.js?v=202609241331';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export class CanvasSearch {
  constructor(stageEl, store, diagram) {
    this.stageEl = stageEl;
    this.store = store;
    this.diagram = diagram;
    this.matches = [];
    this.currentIndex = -1;

    this.el = document.createElement('div');
    this.el.className = 'canvas-search';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="cs-box" role="search">
        <svg viewBox="0 0 16 16" class="cs-icon"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
        <input type="text" class="cs-input" spellcheck="false" autocomplete="off" placeholder="${esc(t('cs.placeholder'))}">
        <span class="cs-count" aria-live="polite">0/0</span>
        <button type="button" class="cs-btn cs-prev" title="Previous (Shift+Enter, ↑)" aria-label="Previous match">
          <svg viewBox="0 0 16 16"><path d="M4 10l4-4 4 4"/></svg>
        </button>
        <button type="button" class="cs-btn cs-next" title="Next (Enter, ↓)" aria-label="Next match">
          <svg viewBox="0 0 16 16"><path d="M4 6l4 4 4-4"/></svg>
        </button>
        <button type="button" class="cs-btn cs-close" title="Close (Esc)" aria-label="Close search">
          <svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg>
        </button>
      </div>`;
    this.stageEl.appendChild(this.el);

    this.input = this.el.querySelector('.cs-input');
    this.countEl = this.el.querySelector('.cs-count');
    this.prevBtn = this.el.querySelector('.cs-prev');
    this.nextBtn = this.el.querySelector('.cs-next');
    this.closeBtn = this.el.querySelector('.cs-close');

    this.bindEvents();
  }

  get isOpen() {
    return !this.el.hidden;
  }

  open(initialQuery = '') {
    this.el.hidden = false;
    this.input.placeholder = t('cs.placeholder');
    if (initialQuery) this.input.value = initialQuery;
    this.input.focus();
    this.input.select();
    this.search();
  }

  close() {
    this.el.hidden = true;
    this.matches = [];
    this.currentIndex = -1;
    this.diagram.setSearchHighlight?.(null, new Set());
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  bindEvents() {
    this.input.addEventListener('input', () => this.search());

    this.input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) this.prev();
        else this.next();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.prev();
      }
    });

    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.closeBtn.addEventListener('click', () => this.close());
  }

  search() {
    const q = this.input.value.trim().toLowerCase();
    if (!q) {
      this.matches = [];
      this.currentIndex = -1;
      this.countEl.textContent = '0/0';
      this.diagram.setSearchHighlight?.(null, new Set());
      return;
    }

    const { model } = this.store;
    const visibleTables = model.tables.filter(t => this.store.isItemOnActiveDiagram(t.id));
    const visibleViews = (model.views || []).filter(v => this.store.isItemOnActiveDiagram(v.id));

    const matches = [];

    // Search tables
    for (const t of visibleTables) {
      let score = 0;
      const tName = t.name.toLowerCase();
      const sName = (t.schema || '').toLowerCase();
      const fullName = sName ? `${sName}.${tName}` : tName;

      if (tName === q || fullName === q) score = 100;
      else if (tName.startsWith(q)) score = 80;
      else if (tName.includes(q) || fullName.includes(q)) score = 60;

      // Match columns
      const matchingCols = (t.columns || []).filter(c => c.name.toLowerCase().includes(q));
      if (matchingCols.length > 0) score = Math.max(score, 40);

      // Match comment
      if ((t.comment || '').toLowerCase().includes(q)) score = Math.max(score, 20);

      if (score > 0) {
        matches.push({ kind: 'table', id: t.id, name: t.name, score });
      }
    }

    // Search views
    for (const v of visibleViews) {
      let score = 0;
      const vName = v.name.toLowerCase();
      if (vName === q) score = 100;
      else if (vName.startsWith(q)) score = 80;
      else if (vName.includes(q)) score = 60;
      else if ((v.sql || '').toLowerCase().includes(q)) score = 30;

      if (score > 0) {
        matches.push({ kind: 'view', id: v.id, name: v.name, score });
      }
    }

    // Sort by highest score first, then alphabetically
    matches.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    this.matches = matches;
    this.currentIndex = matches.length > 0 ? 0 : -1;
    this.updateUI();
  }

  next() {
    if (!this.matches.length) return;
    this.currentIndex = (this.currentIndex + 1) % this.matches.length;
    this.updateUI();
  }

  prev() {
    if (!this.matches.length) return;
    this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
    this.updateUI();
  }

  updateUI() {
    const total = this.matches.length;
    if (total === 0) {
      this.countEl.textContent = '0/0';
      this.diagram.setSearchHighlight?.(null, new Set());
      return;
    }

    const current = this.currentIndex + 1;
    this.countEl.textContent = t('cs.matchCount', { i: current, n: total });

    const activeMatch = this.matches[this.currentIndex];
    const matchIds = new Set(this.matches.map(m => m.id));

    this.diagram.setSearchHighlight?.(activeMatch.id, matchIds);
    this.store.select({ kind: activeMatch.kind, id: activeMatch.id });
    this.diagram.centerOn(activeMatch.id);
  }
}
