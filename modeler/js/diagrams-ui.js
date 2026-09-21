// Diagram tabs UI: manage multiple diagrams, switch, rename, duplicate, delete
import { t } from './i18n.js?v=202609210942';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export class DiagramTabs {
  constructor(el, store, hooks = {}) {
    this.el = el;
    this.store = store;
    this.hooks = hooks;
    this.store.subscribe(r => {
      if (r === 'load' || r === 'change') this.render();
    });
    this.bindEvents();
    this.render();
  }

  render() {
    const { model } = this.store;
    if (!model.diagrams || !model.diagrams.length) return;
    const activeId = model.activeDiagram || model.diagrams[0].id;

    const tabsHtml = model.diagrams.map(d => {
      const active = d.id === activeId;
      const count = (d.tableIds || []).length;
      return `<div class="diagram-tab${active ? ' active' : ''}" data-id="${d.id}" title="${esc(d.name)}">
        <span class="diagram-tab-title">${esc(d.name)}</span>
        <span class="diagram-tab-count">${count}</span>
        <button class="diagram-tab-more ic" data-tab-action="menu" title="${t('diag.rename')} / ${t('diag.delete')}">
          <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
        </button>
      </div>`;
    }).join('');

    this.el.innerHTML = `
      <div class="diagram-tabs-list">${tabsHtml}</div>
      <button class="diagram-tab-btn" data-action="new-diagram" title="${t('diag.new')}">
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </button>
    `;
  }

  bindEvents() {
    this.el.addEventListener('click', e => {
      const newBtn = e.target.closest('[data-action="new-diagram"]');
      if (newBtn) {
        this.promptNewDiagram();
        return;
      }

      const menuBtn = e.target.closest('[data-tab-action="menu"]');
      const tab = e.target.closest('.diagram-tab');
      if (!tab) return;
      const id = tab.dataset.id;

      if (menuBtn) {
        e.stopPropagation();
        this.openTabMenu(id, menuBtn);
        return;
      }

      this.store.setActiveDiagram(id);
      this.hooks.onSwitch?.(id);
    });

    this.el.addEventListener('dblclick', e => {
      const tab = e.target.closest('.diagram-tab');
      if (!tab) return;
      this.promptRename(tab.dataset.id);
    });
  }

  promptNewDiagram() {
    const name = prompt(t('diag.newPrompt'), `${t('zone.default')} ${(this.store.model.diagrams?.length || 0) + 1}`)?.trim();
    if (!name) return;
    const diag = this.store.addDiagram(name);
    this.render();
    this.hooks.onSwitch?.(diag.id);
  }

  promptRename(id) {
    const diag = this.store.model.diagrams?.find(d => d.id === id);
    if (!diag) return;
    const name = prompt(t('diag.renamePrompt'), diag.name)?.trim();
    if (!name || name === diag.name) return;
    this.store.renameDiagram(id, name);
    this.render();
  }

  openTabMenu(id, anchorEl) {
    const diag = this.store.model.diagrams?.find(d => d.id === id);
    if (!diag) return;
    const r = anchorEl.getBoundingClientRect();
    const canDelete = (this.store.model.diagrams?.length || 0) > 1;

    const items = [
      {
        label: t('diag.rename'),
        run: () => this.promptRename(id),
      },
      {
        label: t('diag.duplicate'),
        run: () => {
          const copy = this.store.duplicateDiagram(id);
          this.render();
          this.hooks.onSwitch?.(copy.id);
        }
      },
      {
        label: t('diag.addAllTables'),
        run: () => {
          this.store.update(m => {
            const d = m.diagrams.find(x => x.id === id);
            if (!d) return;
            d.tableIds = m.tables.map(t => t.id);
            d.positions ||= {};
            m.tables.forEach(t => {
              if (!d.positions[t.id]) d.positions[t.id] = { x: t.x ?? 40, y: t.y ?? 40 };
            });
          });
          this.render();
        }
      },
      canDelete ? {
        label: t('diag.delete'),
        danger: true,
        run: () => {
          if (!confirm(t('diag.deleteConfirm', { n: diag.name }))) return;
          this.store.deleteDiagram(id);
          this.render();
          this.hooks.onSwitch?.(this.store.model.activeDiagram);
        }
      } : null
    ].filter(Boolean);

    this.hooks.openMenu?.(r.left, r.bottom + 4, items);
  }
}
