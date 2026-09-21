// SVG diagram: tables, relations, pan/zoom, drag, relation mode, zones, marquee selection
import { t as tr } from './i18n.js?v=202609210937';

const NS = 'http://www.w3.org/2000/svg';
const HEADER = 38, ROW = 24, PAD = 14;
const FONT = {
  relLabel: "600 10.5px ui-monospace,'SF Mono',Menlo,Consolas,monospace",
  title: "600 13px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  col: "12.5px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  colNN: "500 12.5px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  type: "11px ui-monospace,'SF Mono',Menlo,Consolas,monospace",
  schema: "10px ui-monospace,'SF Mono',Menlo,Consolas,monospace",
};
// display options (set from settings)
const OPTS = { showTypes: true, compact: false, zebra: true, snap: true, orthoLinks: true };
let STORE = null;
export const setDiagramOptions = o => Object.assign(OPTS, o);
// compact mode keeps only key columns
export const visibleColumns = t => OPTS.compact && STORE ? t.columns.filter(c => c.pk || STORE.isFkColumn(t.id, c.id)) : t.columns;

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// Ширина тексту через canvas, з кешем
const measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
const measureCache = new Map();
function textW(str, font) {
  const key = font + '|' + str;
  let w = measureCache.get(key);
  if (w === undefined) {
    if (measureCtx) { measureCtx.font = font; w = measureCtx.measureText(str).width; } else w = str.length * 7.5;
    measureCache.set(key, w);
  }
  return w;
}

export function tableSize(t) {
  const cols = visibleColumns(t);
  const nameW = Math.max(0, ...cols.map(c => textW(c.name, c.pk || !c.nullable ? FONT.colNN : FONT.col)));
  const typeW = OPTS.showTypes ? Math.max(0, ...cols.map(c => textW(c.virtual ? `= ${c.virtual.slice(0, 22)}` : c.type || '', FONT.type))) : 0;
  const badges = [t.schema, t.partition?.type && `⧉ ${t.partition.type}`, t.checks?.length && `✓${t.checks.length}`].filter(Boolean).join(' · ');
  const titleW = textW(t.name, FONT.title) + (badges ? textW(badges.toUpperCase(), FONT.schema) * 1.15 + 20 : 0);
  return {
    w: Math.ceil(Math.max(210, PAD + 28 + nameW + 28 + typeW + PAD, PAD * 2 + titleW + 30)),
    h: HEADER + Math.max(1, cols.length) * ROW + 8,
  };
}

const VIEW_LINES = 7;
const viewLines = v => (v.sql || '').replace(/\t/g, '  ').split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim()).slice(0, VIEW_LINES)
  .map(l => l.length > 48 ? `${l.slice(0, 47)}…` : l);
export function viewSize(v) {
  const lines = viewLines(v);
  const w = Math.max(220, PAD * 2 + textW(v.name, FONT.title) + 70, PAD * 2 + Math.max(0, ...lines.map(l => textW(l, FONT.type))));
  return { w: Math.ceil(w), h: HEADER + Math.max(1, lines.length) * 16 + 14 };
}

export class Diagram {
  constructor(svg, store, hooks) {
    this.svg = svg; this.store = store; this.hooks = hooks;
    STORE = store;
    this.view = { x: 0, y: 0, k: 1 };
    this.mode = 'select'; // 'select' | 'relation'
    this.relFrom = null;
    this.mmAnim = null;
    svg.innerHTML = `
      <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".9" class="grid-dot"/></pattern></defs>
      <rect class="bg" width="100%" height="100%" fill="url(#grid)"/>
      <g class="viewport">
        <g class="zones"></g>
        <g class="rels"></g>
        <g class="tables"></g>
        <g class="overlay"></g>
      </g>`;
    this.vp = svg.querySelector('.viewport');
    this.gZones = svg.querySelector('.zones');
    this.gRels = svg.querySelector('.rels');
    this.gTables = svg.querySelector('.tables');
    this.gOverlay = svg.querySelector('.overlay');
    this.bindEvents();
    store.subscribe(r => {
      if (r === 'move') {
        this.renderRelations();
        this.scheduleMinimap();
      } else {
        this.render();
      }
    });
    this.bindMinimap();
  }

  setMode(mode) {
    this.mode = mode; this.relFrom = null;
    this.svg.classList.toggle('mode-relation', mode === 'relation');
    this.render();
  }

  applyView() {
    const { x, y, k } = this.view;
    this.vp.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
    const p = this.svg.querySelector('#grid');
    p.setAttribute('patternTransform', `translate(${x},${y}) scale(${k})`);
    this.hooks.onZoom?.(k);
    this.scheduleMinimap();

    // LoD toggle based on zoom level with hysteresis
    const visibleTablesCount = this.store.model.tables.length;
    if (visibleTablesCount > 20) {
      const nextLod = this._isLod ? k < 0.48 : k < 0.40;
      if (this._isLod !== nextLod) {
        this._isLod = nextLod;
        this.render();
      }
    }
  }

  setSearchHighlight(activeId, matchIds = new Set()) {
    this.searchActiveId = activeId;
    this.searchMatchIds = matchIds;
    if (!this.gTables) return;
    for (const g of this.gTables.children) {
      const id = g.dataset.id || g.dataset.view;
      if (id) {
        g.classList.toggle('search-match', matchIds.has(id));
        g.classList.toggle('search-active', id === activeId);
      }
    }
  }

  scheduleMinimap() {
    if (this.mmAnim) return;
    this.mmAnim = requestAnimationFrame(() => {
      this.mmAnim = null;
      this.renderMinimap();
    });
  }

  render() {
    const { model, selection } = this.store;
    const visibleTables = model.tables.filter(t => this.store.isItemOnActiveDiagram(t.id));
    const visibleViews = (model.views || []).filter(v => this.store.isItemOnActiveDiagram(v.id));
    const visibleTableIds = new Set(visibleTables.map(t => t.id));

    this.related = null;
    if (selection?.kind === 'table') {
      this.related = new Set([selection.id]);
      model.fks.forEach(f => {
        if (visibleTableIds.has(f.fromTable) && visibleTableIds.has(f.toTable)) {
          if (f.fromTable === selection.id) this.related.add(f.toTable);
          if (f.toTable === selection.id) this.related.add(f.fromTable);
        }
      });
    } else if (selection?.kind === 'fk') {
      const f = model.fks.find(x => x.id === selection.id);
      if (f) this.related = new Set([f.fromTable, f.toTable]);
    } else if (selection?.kind === 'view') {
      const v = this.store.view(selection.id);
      if (v) this.related = new Set([v.id, ...this.store.viewSources(v).map(x => x.id)]);
    } else if (selection?.kind === 'multi') {
      this.related = new Set(selection.ids);
    }

    this.svg.classList.toggle('focus', !!this.related);
    this.renderZones();

    // Viewport bounds for culling in large schemas (>35 tables)
    const isGlobalLod = !!this._isLod || (this.view.k < 0.42 && visibleTables.length > 20);
    const r = this.svg.getBoundingClientRect();
    const vpW = r.width || 1200, vpH = r.height || 800;
    const minX = -this.view.x / this.view.k - 250;
    const maxX = (-this.view.x + vpW) / this.view.k + 250;
    const minY = -this.view.y / this.view.k - 250;
    const maxY = (-this.view.y + vpH) / this.view.k + 250;
    const shouldCull = visibleTables.length > 35;

    this.gTables.innerHTML = visibleTables.map(t => {
      let lod = isGlobalLod;
      if (!lod && shouldCull) {
        const p = this.store.posOf(t.id);
        const s = tableSize(t);
        const isOffscreen = (p.x + s.w < minX || p.x > maxX || p.y + s.h < minY || p.y > maxY);
        if (isOffscreen && selection?.id !== t.id && !this.related?.has(t.id) && this.searchActiveId !== t.id) {
          lod = true;
        }
      }
      return this.tableSVG(t, selection, lod);
    }).join('')
      + visibleViews.map(v => this.viewSVG(v, selection)).join('');
    this.renderRelations();
    this.applyView();
  }

  renderZones() {
    const diag = this.store.activeDiagram;
    const zones = diag?.zones || [];
    const sel = this.store.selection;
    this.gZones.innerHTML = zones.map(z => {
      const isSel = sel?.kind === 'zone' && sel.id === z.id;
      const cls = ['zone', isSel && 'selected', z.color && `c-${z.color}`].filter(Boolean).join(' ');
      return `<g class="${cls}" data-zone="${z.id}" transform="translate(${z.x},${z.y})">
        <rect class="zone-bg" width="${z.w}" height="${z.h}" rx="12"/>
        <rect class="zone-head" width="${z.w}" height="32" rx="12"/>
        <rect class="zone-bar" x="0" y="30" width="${z.w}" height="2"/>
        <text class="zone-title" x="14" y="21">${esc(z.name)}</text>
        <circle class="zone-handle" data-zone-resize="${z.id}" cx="${z.w}" cy="${z.h}" r="8"/>
      </g>`;
    }).join('');
  }

  tableSVG(t, sel, lod = false) {
    const { w, h } = tableSize(t);
    const selected = (sel?.kind === 'table' && sel.id === t.id) || (sel?.kind === 'multi' && sel.ids?.includes(t.id));
    const relSrc = this.relFrom === t.id;
    const pos = this.store.posOf(t.id);
    const cols = visibleColumns(t);
    const isSearchMatch = this.searchMatchIds?.has(t.id);
    const isSearchActive = this.searchActiveId === t.id;

    let bodyRows = '';
    if (lod && !selected && !this.related?.has(t.id) && !isSearchActive) {
      const pkCount = cols.filter(c => c.pk).length;
      const fkCount = cols.filter(c => this.store.isFkColumn(t.id, c.id)).length;
      const summaryText = `${cols.length} ${cols.length === 1 ? 'col' : 'cols'}${pkCount ? ` · ${pkCount} PK` : ''}${fkCount ? ` · ${fkCount} FK` : ''}`;
      bodyRows = `<g class="lod-summary">
        <rect class="lod-bar" x="${PAD}" y="${HEADER + 12}" width="${w - PAD * 2}" height="5" rx="2.5"/>
        <rect class="lod-bar" x="${PAD}" y="${HEADER + 23}" width="${Math.round((w - PAD * 2) * 0.65)}" height="5" rx="2.5"/>
        <text x="${w / 2}" y="${HEADER + 46}" class="lod-text" text-anchor="middle">${esc(summaryText)}</text>
      </g>`;
    } else {
      const rows = cols.map((c, i) => {
        const top = HEADER + 4 + i * ROW, y = top + 16;
        const fk = this.store.isFkColumn(t.id, c.id);
        const key = c.pk && fk ? `<rect class="kbg pk" x="${PAD - 3}" y="${top + 5}" width="22" height="12" rx="3"/><text x="${PAD + 8}" y="${y - 1}" class="key pk" text-anchor="middle">PF</text>`
          : c.pk ? `<rect class="kbg pk" x="${PAD - 3}" y="${top + 5}" width="22" height="12" rx="3"/><text x="${PAD + 8}" y="${y - 1}" class="key pk" text-anchor="middle">PK</text>`
          : fk ? `<rect class="kbg fk" x="${PAD - 3}" y="${top + 5}" width="22" height="12" rx="3"/><text x="${PAD + 8}" y="${y - 1}" class="key fk" text-anchor="middle">FK</text>` : '';
        const nn = !c.nullable || c.pk ? ' nn' : '';
        return `${i % 2 && OPTS.zebra ? `<rect class="zebra" x="1" y="${top}" width="${w - 2}" height="${ROW}"/>` : ''}<rect class="row-hit" data-col="${c.id}" x="1" y="${top}" width="${w - 2}" height="${ROW}"/>${key}
          <text x="${PAD + 28}" y="${y}" class="col${nn}${c.virtual ? ' virtual' : ''}">${esc(c.name)}</text>
          ${OPTS.showTypes ? `<text x="${w - PAD}" y="${y}" class="type${c.virtual ? ' virtual' : ''}" text-anchor="end">${c.virtual ? `= ${esc(c.virtual.length > 22 ? `${c.virtual.slice(0, 21)}…` : c.virtual)}` : esc(c.type)}</text>` : ''}`;
      }).join('');
      bodyRows = cols.length ? rows : `<text x="${PAD}" y="${HEADER + 19}" class="empty">${tr('d.noColumns')}</text>`;
    }

    const cls = ['table', selected && 'selected', relSrc && 'rel-src', this.related?.has(t.id) && 'related', isSearchMatch && 'search-match', isSearchActive && 'search-active', t.color && `c-${t.color}`].filter(Boolean).join(' ');
    return `<g class="${cls}" data-id="${t.id}" transform="translate(${pos.x},${pos.y})">
      <rect class="shadow" y="2" width="${w}" height="${h}" rx="10"/>
      <rect class="body" width="${w}" height="${h}" rx="10"/>
      <path class="head" d="M0 10a10 10 0 0 1 10-10h${w - 20}a10 10 0 0 1 10 10v${HEADER - 10}h-${w}z"/>
      <rect class="accent" x="0" y="${HEADER - 2}" width="${w}" height="2"/>
      <text x="${PAD}" y="25" class="title">${esc(t.name)}</text>
      <text x="${w - PAD}" y="24" class="schema" text-anchor="end">${[t.schema && esc(t.schema.toUpperCase()), t.partition?.type && `⧉ ${t.partition.type}`, t.checks?.length && `✓${t.checks.length}`].filter(Boolean).join(' · ') || t.columns.length}</text>
      ${bodyRows}
      <rect class="head-hit" data-head="1" width="${w}" height="${lod ? h : HEADER}"/>
      <rect class="outline" x="-3" y="-3" width="${w + 6}" height="${h + 6}" rx="13"/>
      ${selected && sel?.kind === 'table' ? `<g class="add-field" data-add="1" transform="translate(0,${h + 8})"><rect width="${w}" height="26" rx="8"/><text x="${w / 2}" y="17" text-anchor="middle">+ ${tr('d.addField')}</text></g>` : ''}
      ${t.comment ? `<title>${esc(t.comment)}</title>` : ''}
    </g>`;
  }

  viewSVG(v, sel) {
    const { w, h } = viewSize(v);
    const selected = (sel?.kind === 'view' && sel.id === v.id) || (sel?.kind === 'multi' && sel.ids?.includes(v.id));
    const pos = this.store.posOf(v.id);
    const lines = viewLines(v);
    const isSearchMatch = this.searchMatchIds?.has(v.id);
    const isSearchActive = this.searchActiveId === v.id;
    const cls = ['view', selected && 'selected', this.related?.has(v.id) && 'related', isSearchMatch && 'search-match', isSearchActive && 'search-active', v.color && `c-${v.color}`].filter(Boolean).join(' ');
    return `<g class="${cls}" data-view="${v.id}" transform="translate(${pos.x},${pos.y})">
      <rect class="shadow" y="2" width="${w}" height="${h}" rx="10"/>
      <rect class="body" width="${w}" height="${h}" rx="10"/>
      <rect class="vbadge" x="${w - PAD - 36}" y="12" width="36" height="16" rx="4"/><text x="${w - PAD - 18}" y="24" class="vbadge-t" text-anchor="middle">VIEW</text>
      <text x="${PAD}" y="25" class="title">${esc(v.name)}</text>
      <line class="rule" x1="${PAD}" y1="${HEADER}" x2="${w - PAD}" y2="${HEADER}"/>
      ${lines.map((l, i) => `<text x="${PAD}" y="${HEADER + 18 + i * 16}" class="sql">${esc(l)}</text>`).join('') || `<text x="${PAD}" y="${HEADER + 18}" class="empty">SELECT …</text>`}
      <rect class="head-hit" data-head="1" width="${w}" height="${h}" fill="transparent"/>
      <rect class="outline" x="-3" y="-3" width="${w + 6}" height="${h + 6}" rx="13"/>
      ${v.comment ? `<title>${esc(v.comment)}</title>` : ''}
    </g>`;
  }

  renderRelations() {
    const { model, selection } = this.store;
    const visibleTables = model.tables.filter(t => this.store.isItemOnActiveDiagram(t.id));
    const byId = Object.fromEntries(visibleTables.map(t => [t.id, t]));
    const visibleViews = (model.views || []).filter(v => this.store.isItemOnActiveDiagram(v.id));

    this.gRels.innerHTML = model.fks.filter(f => byId[f.fromTable] && byId[f.toTable]).map(f => {
      const a = byId[f.fromTable], b = byId[f.toTable];
      const pa = this.store.posOf(a.id), pb = this.store.posOf(b.id);
      const d = relationPath(a, b, f, pa, pb);
      const kind = this.store.relationKind(f);
      // Множественность как текст на каждом конце вместо «вороньей лапки»/штрихов/колец:
      // "N" или "1" (потолок задаёт oneToOne), с "0.." спереди, если связь необязательна
      // (kind.mandatory лжёт). Это то же, что раньше кодировалось значками, — просто
      // читается сразу, без подсказки по наведению.
      const childLabel = (kind.mandatory ? '' : '0..') + (kind.oneToOne ? '1' : 'N');
      const parentLabel = '1';
      const labels = relLabel(d.ax, d.ay, d.adir, childLabel) + relLabel(d.bx, d.by, d.bdir, parentLabel);
      const sel = selection?.kind === 'fk' && selection.id === f.id
        || (selection?.kind === 'table' && (f.fromTable === selection.id || f.toTable === selection.id))
        || (selection?.kind === 'multi' && (selection.ids?.includes(f.fromTable) || selection.ids?.includes(f.toTable)));
      return `<g class="rel${sel ? ' selected' : ''}${kind.mandatory ? '' : ' optional'}${kind.identifying ? ' ident' : ''}" data-id="${f.id}">
        <path class="hit" d="${d.path}"/><path class="line" d="${d.path}"/>
        <circle class="node" cx="${d.ax}" cy="${d.ay}" r="3"/><circle class="node" cx="${d.bx}" cy="${d.by}" r="3"/>
        ${labels}
        <title>${esc(f.name)}</title></g>`;
    }).join('');

    // view dependencies: dashed lines from source tables
    this.gRels.innerHTML += visibleViews.map(v => {
      const vs = viewSize(v);
      const pv = this.store.posOf(v.id);
      const on = (selection?.kind === 'view' && selection.id === v.id) || (selection?.kind === 'multi' && selection.ids?.includes(v.id));
      return this.store.viewSources(v).filter(t => byId[t.id]).map(t => {
        const ts = tableSize(t);
        const pt = this.store.posOf(t.id);
        const right = pt.x + ts.w < pv.x;
        const x1 = right ? pt.x + ts.w : pt.x, y1 = pt.y + 19;
        const x2 = right ? pv.x : pv.x + vs.w, y2 = pv.y + 19;
        const dx = Math.max(40, Math.abs(x2 - x1) / 2) * (right ? 1 : -1);
        return `<path class="dep${on ? ' on' : ''}" d="M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}"/>`;
      }).join('');
    }).join('');

    // keep positions in sync while dragging
    for (const g of this.gTables.children) {
      const id = g.dataset.id || g.dataset.view;
      if (id) {
        const p = this.store.posOf(id);
        g.setAttribute('transform', `translate(${p.x},${p.y})`);
      }
    }
  }

  toWorld(e) {
    const r = this.svg.getBoundingClientRect();
    return { x: (e.clientX - r.left - this.view.x) / this.view.k, y: (e.clientY - r.top - this.view.y) / this.view.k };
  }

  bindEvents() {
    const svg = this.svg;
    let drag = null;

    svg.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const rz = e.target.closest('[data-zone-resize]');
      const zg = e.target.closest('.zone');
      const tg = e.target.closest('.table');
      const rg = e.target.closest('.rel');
      const vg = e.target.closest('.view');
      const p = this.toWorld(e);

      // 1. Zone resize handle
      if (rz) {
        const zoneId = rz.dataset.zoneResize;
        const z = this.store.zone(zoneId);
        if (z) {
          drag = { kind: 'zone-resize', z, startW: z.w, startH: z.h, sx: p.x, sy: p.y, moved: false };
          svg.setPointerCapture(e.pointerId);
          return;
        }
      }

      // 2. View interaction
      if (vg) {
        if (this.mode === 'relation') return;
        const id = vg.dataset.view;
        if (e.shiftKey) {
          const sel = this.store.selection;
          const ids = sel?.kind === 'multi' ? [...sel.ids] : sel?.id ? [sel.id] : [];
          const idx = ids.indexOf(id);
          if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
          this.store.select(ids.length > 1 ? { kind: 'multi', ids } : ids.length === 1 ? { kind: 'view', id: ids[0] } : null);
          return;
        }
        this.store.select({ kind: 'view', id });
        const pos = this.store.posOf(id);
        drag = { kind: 'table', id, dx: p.x - pos.x, dy: p.y - pos.y, moved: false };
        svg.setPointerCapture(e.pointerId);
        return;
      }

      // 3. Table add field button
      if (tg && e.target.closest('[data-add]')) {
        this.hooks.onAddField?.(tg.dataset.id);
        return;
      }

      // 4. Table interaction
      if (tg) {
        const id = tg.dataset.id;
        if (this.mode === 'relation') {
          if (!this.relFrom) { this.relFrom = id; this.render(); }
          else { const from = this.relFrom; this.relFrom = null; this.render(); this.hooks.onRelation(from, id, e); }
          return;
        }

        // Shift+click for multi-selection
        if (e.shiftKey) {
          const sel = this.store.selection;
          const ids = sel?.kind === 'multi' ? [...sel.ids] : sel?.id ? [sel.id] : [];
          const idx = ids.indexOf(id);
          if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
          this.store.select(ids.length > 1 ? { kind: 'multi', ids } : ids.length === 1 ? { kind: 'table', id: ids[0] } : null);
          return;
        }

        // If part of existing multi-selection, drag all together
        const sel = this.store.selection;
        if (sel?.kind === 'multi' && sel.ids?.includes(id)) {
          const items = sel.ids.map(itemId => {
            const curPos = this.store.posOf(itemId);
            return { id: itemId, startX: curPos.x, startY: curPos.y };
          });
          drag = { kind: 'multi-table', items, startPx: p.x, startPy: p.y, moved: false };
        } else {
          this.store.select({ kind: 'table', id });
          const pos = this.store.posOf(id);
          drag = { kind: 'table', id, dx: p.x - pos.x, dy: p.y - pos.y, moved: false };
        }
        svg.setPointerCapture(e.pointerId);
        return;
      }

      // 5. Foreign key click
      if (rg) {
        this.store.select({ kind: 'fk', id: rg.dataset.id });
        svg.setPointerCapture(e.pointerId);
        return;
      }

      // 6. Zone drag
      if (zg) {
        const id = zg.dataset.zone;
        this.store.select({ kind: 'zone', id });
        const z = this.store.zone(id);
        if (z) drag = { kind: 'zone', z, dx: p.x - z.x, dy: p.y - z.y, moved: false };
        svg.setPointerCapture(e.pointerId);
        return;
      }

      // 7. Background click: marquee selection (with Shift or Select mode drag) or pan
      if (this.relFrom) { this.relFrom = null; this.render(); }
      if (this.store.selection && !e.shiftKey) this.store.select(null);
      cancelAnimationFrame(this.anim);

      if (e.shiftKey) {
        drag = { kind: 'marquee', startX: p.x, startY: p.y, curX: p.x, curY: p.y };
      } else {
        drag = { kind: 'pan', sx: e.clientX - this.view.x, sy: e.clientY - this.view.y };
        svg.classList.add('panning');
      }
      svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const g = OPTS.snap ? 10 : 1;

      if (drag.kind === 'pan') {
        this.view.x = e.clientX - drag.sx;
        this.view.y = e.clientY - drag.sy;
        this.applyView();
      } else if (drag.kind === 'marquee') {
        const p = this.toWorld(e);
        drag.curX = p.x; drag.curY = p.y;
        const x = Math.min(drag.startX, p.x), y = Math.min(drag.startY, p.y);
        const w = Math.abs(p.x - drag.startX), h = Math.abs(p.y - drag.startY);
        this.gOverlay.innerHTML = `<rect class="selection-marquee" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
      } else if (drag.kind === 'table') {
        const p = this.toWorld(e);
        const nx = Math.round((p.x - drag.dx) / g) * g, ny = Math.round((p.y - drag.dy) / g) * g;
        const cur = this.store.posOf(drag.id);
        if (nx === cur.x && ny === cur.y) return;
        if (!drag.moved) { this.store.checkpoint(); drag.moved = true; }
        this.store.silent(() => this.store.setPos(drag.id, nx, ny));
      } else if (drag.kind === 'multi-table') {
        const p = this.toWorld(e);
        const deltaX = Math.round((p.x - drag.startPx) / g) * g;
        const deltaY = Math.round((p.y - drag.startPy) / g) * g;
        if (!drag.moved) { this.store.checkpoint(); drag.moved = true; }
        this.store.silent(() => {
          drag.items.forEach(it => {
            this.store.setPos(it.id, it.startX + deltaX, it.startY + deltaY);
          });
        });
      } else if (drag.kind === 'zone') {
        const p = this.toWorld(e);
        const nx = Math.round((p.x - drag.dx) / g) * g, ny = Math.round((p.y - drag.dy) / g) * g;
        if (nx === drag.z.x && ny === drag.z.y) return;
        if (!drag.moved) { this.store.checkpoint(); drag.moved = true; }
        this.store.silent(() => { drag.z.x = nx; drag.z.y = ny; });
        const el = this.gZones.querySelector(`[data-zone="${drag.z.id}"]`);
        if (el) el.setAttribute('transform', `translate(${nx},${ny})`);
      } else if (drag.kind === 'zone-resize') {
        const p = this.toWorld(e);
        const nw = Math.max(160, Math.round((drag.startW + (p.x - drag.sx)) / g) * g);
        const nh = Math.max(100, Math.round((drag.startH + (p.y - drag.sy)) / g) * g);
        if (!drag.moved) { this.store.checkpoint(); drag.moved = true; }
        this.store.silent(() => { drag.z.w = nw; drag.z.h = nh; });
        this.renderZones();
      }
    });

    const end = e => {
      if (!drag) return;
      if (drag.kind === 'marquee') {
        this.gOverlay.innerHTML = '';
        const x1 = Math.min(drag.startX, drag.curX), y1 = Math.min(drag.startY, drag.curY);
        const x2 = Math.max(drag.startX, drag.curX), y2 = Math.max(drag.startY, drag.curY);
        // Match tables and views
        const matched = [];
        const model = this.store.model;
        const visibleTables = model.tables.filter(t => this.store.isItemOnActiveDiagram(t.id));
        const visibleViews = (model.views || []).filter(v => this.store.isItemOnActiveDiagram(v.id));

        visibleTables.forEach(t => {
          const s = tableSize(t);
          const p = this.store.posOf(t.id);
          if (p.x + s.w >= x1 && p.x <= x2 && p.y + s.h >= y1 && p.y <= y2) {
            matched.push(t.id);
          }
        });
        visibleViews.forEach(v => {
          const s = viewSize(v);
          const p = this.store.posOf(v.id);
          if (p.x + s.w >= x1 && p.x <= x2 && p.y + s.h >= y1 && p.y <= y2) {
            matched.push(v.id);
          }
        });

        if (matched.length > 1) {
          this.store.select({ kind: 'multi', ids: matched });
        } else if (matched.length === 1) {
          const isTable = model.tables.some(t => t.id === matched[0]);
          this.store.select({ kind: isTable ? 'table' : 'view', id: matched[0] });
        }
      } else if (drag.moved) {
        this.store.persist();
        this.store.emit('moved');
      }
      drag = null;
      svg.classList.remove('panning');
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('dblclick', e => {
      const zg = e.target.closest('.zone');
      if (zg) {
        const z = this.store.zone(zg.dataset.zone);
        if (z) {
          const name = prompt(t('zone.name'), z.name)?.trim();
          if (name && name !== z.name) {
            this.store.update(() => { z.name = name; });
          }
        }
        return;
      }
      const vg = e.target.closest('.view');
      if (vg) { this.hooks.onEditView?.(vg.dataset.view); return; }
      const tg = e.target.closest('.table');
      if (tg) {
        const row = e.target.closest('[data-col]');
        if (row) this.hooks.onEditColumn?.(tg.dataset.id, row.dataset.col);
        else if (e.target.closest('[data-head]')) this.hooks.onRenameTable?.(tg.dataset.id);
        else this.hooks.onAddField?.(tg.dataset.id);
        return;
      }
      if (e.target.closest('.rel')) return;
      this.hooks.onAddTable(this.toWorld(e));
    });

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      cancelAnimationFrame(this.anim);
      if (e.ctrlKey || e.metaKey || (!e.deltaX && Math.abs(e.deltaY) >= 50)) {
        const r = svg.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
        this.zoomAt(e.clientX - r.left, e.clientY - r.top, factor);
      } else {
        this.view.x -= e.deltaX; this.view.y -= e.deltaY; this.applyView();
      }
    }, { passive: false });
  }

  zoomAt(sx, sy, factor) {
    const k = Math.min(3, Math.max(0.15, this.view.k * factor));
    this.view.x = sx - (sx - this.view.x) * (k / this.view.k);
    this.view.y = sy - (sy - this.view.y) * (k / this.view.k);
    this.view.k = k; this.applyView();
  }
  zoomBy(f) {
    const r = this.svg.getBoundingClientRect();
    const k = Math.min(3, Math.max(0.15, this.view.k * f));
    const cx = r.width / 2, cy = r.height / 2;
    this.animateTo({ k, x: cx - (cx - this.view.x) * (k / this.view.k), y: cy - (cy - this.view.y) * (k / this.view.k) }, 200);
  }

  // ---- minimap ----
  renderMinimap() {
    const mm = this.hooks.minimap;
    if (!mm) return;
    const b = this.bounds();
    const r = this.svg.getBoundingClientRect();
    const W = mm.clientWidth || 200, H = mm.clientHeight || 130;
    const vx1 = -this.view.x / this.view.k, vy1 = -this.view.y / this.view.k;
    const vx2 = vx1 + r.width / this.view.k, vy2 = vy1 + r.height / this.view.k;
    const x1 = Math.min(b?.x1 ?? vx1, vx1) - 40, y1 = Math.min(b?.y1 ?? vy1, vy1) - 40;
    const x2 = Math.max(b?.x2 ?? vx2, vx2) + 40, y2 = Math.max(b?.y2 ?? vy2, vy2) + 40;
    const k = Math.min(W / (x2 - x1), H / (y2 - y1));
    const ox = (W - (x2 - x1) * k) / 2 - x1 * k, oy = (H - (y2 - y1) * k) / 2 - y1 * k;
    this.mm = { k, ox, oy };
    const sel = this.store.selection;

    const visibleTables = this.store.model.tables.filter(t => this.store.isItemOnActiveDiagram(t.id));
    const visibleViews = (this.store.model.views || []).filter(v => this.store.isItemOnActiveDiagram(v.id));
    const zones = this.store.activeDiagram?.zones || [];

    const zrects = zones.map(z => {
      return `<rect class="mm-z${z.color ? ` c-${z.color}` : ''}" x="${(z.x * k + ox).toFixed(1)}" y="${(z.y * k + oy).toFixed(1)}" width="${Math.max(4, z.w * k).toFixed(1)}" height="${Math.max(4, z.h * k).toFixed(1)}" rx="2"/>`;
    }).join('');

    const rects = visibleTables.map(t => {
      const s = tableSize(t);
      const pos = this.store.posOf(t.id);
      const on = (sel?.kind === 'table' && sel.id === t.id) || (sel?.kind === 'multi' && sel.ids?.includes(t.id));
      return `<rect class="mm-t${t.color ? ` c-${t.color}` : ''}${on ? ' on' : ''}" x="${(pos.x * k + ox).toFixed(1)}" y="${(pos.y * k + oy).toFixed(1)}" width="${Math.max(2, s.w * k).toFixed(1)}" height="${Math.max(2, s.h * k).toFixed(1)}" rx="1.5"/>`;
    }).join('');

    const vrects = visibleViews.map(v => {
      const s = viewSize(v);
      const pos = this.store.posOf(v.id);
      return `<rect class="mm-v" x="${(pos.x * k + ox).toFixed(1)}" y="${(pos.y * k + oy).toFixed(1)}" width="${Math.max(2, s.w * k).toFixed(1)}" height="${Math.max(2, s.h * k).toFixed(1)}" rx="1.5"/>`;
    }).join('');

    mm.innerHTML = `${zrects}${rects}${vrects}<rect class="mm-view" x="${(vx1 * k + ox).toFixed(1)}" y="${(vy1 * k + oy).toFixed(1)}" width="${((vx2 - vx1) * k).toFixed(1)}" height="${((vy2 - vy1) * k).toFixed(1)}" rx="3"/>`;
  }

  bindMinimap() {
    const mm = this.hooks.minimap;
    if (!mm) return;
    const move = e => {
      if (!this.mm) return;
      const b = mm.getBoundingClientRect(), r = this.svg.getBoundingClientRect();
      const wx = (e.clientX - b.left - this.mm.ox) / this.mm.k, wy = (e.clientY - b.top - this.mm.oy) / this.mm.k;
      cancelAnimationFrame(this.anim);
      this.view.x = r.width / 2 - wx * this.view.k; this.view.y = r.height / 2 - wy * this.view.k;
      this.applyView();
    };
    mm.addEventListener('pointerdown', e => { mm.setPointerCapture(e.pointerId); move(e); mm.onpointermove = move; });
    mm.addEventListener('pointerup', () => { mm.onpointermove = null; });
  }

  animateTo(target, ms = 380) {
    cancelAnimationFrame(this.anim);
    const from = { ...this.view }, t0 = performance.now();
    const ease = x => 1 - Math.pow(1 - x, 3);
    const step = now => {
      const p = Math.min(1, (now - t0) / ms), e = ease(p);
      this.view = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k: from.k + (target.k - from.k) * e };
      this.applyView();
      if (p < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }

  centerOn(id) {
    const t = this.store.table(id) || this.store.view(id);
    if (!t) return;
    const s = t.sql !== undefined ? viewSize(t) : tableSize(t), r = this.svg.getBoundingClientRect();
    const pos = this.store.posOf(id);
    const k = Math.max(this.view.k, 0.8);
    this.animateTo({ k, x: r.width / 2 - (pos.x + s.w / 2) * k, y: r.height / 2 - (pos.y + s.h / 2) * k });
  }

  bounds() {
    const model = this.store.model;
    const visibleTables = model.tables.filter(t => this.store.isItemOnActiveDiagram(t.id));
    const visibleViews = (model.views || []).filter(v => this.store.isItemOnActiveDiagram(v.id));
    const zones = this.store.activeDiagram?.zones || [];
    if (!visibleTables.length && !visibleViews.length && !zones.length) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    visibleTables.forEach(t => {
      const s = tableSize(t);
      const p = this.store.posOf(t.id);
      x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
      x2 = Math.max(x2, p.x + s.w); y2 = Math.max(y2, p.y + s.h);
    });
    visibleViews.forEach(v => {
      const s = viewSize(v);
      const p = this.store.posOf(v.id);
      x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
      x2 = Math.max(x2, p.x + s.w); y2 = Math.max(y2, p.y + s.h);
    });
    zones.forEach(z => {
      x1 = Math.min(x1, z.x); y1 = Math.min(y1, z.y);
      x2 = Math.max(x2, z.x + z.w); y2 = Math.max(y2, z.y + z.h);
    });
    return { x1, y1, x2, y2 };
  }

  fit(animate = true) {
    const visibleTables = this.store.model.tables.filter(t => this.store.isItemOnActiveDiagram(t.id));
    if (!visibleTables.length) { this.view = { x: 0, y: 0, k: 1 }; return this.applyView(); }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    visibleTables.forEach(t => {
      const s = tableSize(t);
      const p = this.store.posOf(t.id);
      x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
      x2 = Math.max(x2, p.x + s.w); y2 = Math.max(y2, p.y + s.h);
    });
    const r = this.svg.getBoundingClientRect();
    if (!r.width) return;
    // A flat 160px margin is fine against a desktop canvas but eats nearly
    // half a phone's width, forcing the diagram down to the 0.15 floor and
    // rendering it as an unreadable, untappable smear. Below the width
    // where that starts to bite, scale the margin down with it instead.
    const margin = r.width < 600 ? Math.max(32, r.width * 0.2) : 160;
    const k = Math.min(1.1, Math.max(0.15, Math.min((r.width - margin) / (x2 - x1), (r.height - margin) / (y2 - y1))));
    const target = { k, x: (r.width - (x2 - x1) * k) / 2 - x1 * k, y: (r.height - (y2 - y1) * k) / 2 - y1 * k };
    if (animate) this.animateTo(target); else { this.view = target; this.applyView(); }
  }

  center() {
    const r = this.svg.getBoundingClientRect();
    return { x: (r.width / 2 - this.view.x) / this.view.k, y: (r.height / 2 - this.view.y) / this.view.k };
  }

  exportSVG() {
    const visibleTables = this.store.model.tables.filter(t => this.store.isItemOnActiveDiagram(t.id));
    let x1 = 0, y1 = 0, x2 = 400, y2 = 300;
    if (visibleTables.length) {
      x1 = Math.min(...visibleTables.map(t => this.store.posOf(t.id).x)) - 20;
      y1 = Math.min(...visibleTables.map(t => this.store.posOf(t.id).y)) - 20;
      x2 = Math.max(...visibleTables.map(t => this.store.posOf(t.id).x + tableSize(t).w)) + 20;
      y2 = Math.max(...visibleTables.map(t => this.store.posOf(t.id).y + tableSize(t).h)) + 20;
    }
    const style = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch { return []; } })
      .map(r => r.cssText).filter(c => /\.(table|rel|key|col|type|title|schema|rule|zebra|shadow|body|line|mark|hit|empty|zone)\b/.test(c) || c.startsWith(':root')).join('\n');
    return `<svg xmlns="${NS}" viewBox="${x1} ${y1} ${x2 - x1} ${y2 - y1}" width="${x2 - x1}" height="${y2 - y1}">
      <style>${style}</style><rect x="${x1}" y="${y1}" width="100%" height="100%" fill="#ffffff"/>
      ${this.gZones.outerHTML}${this.gRels.outerHTML}${this.gTables.outerHTML}</svg>`;
  }
}

// Collision resolution layout (without overlaps)
export function resolveOverlaps(tables, getPos, setPos, padding = 30) {
  const n = tables.length;
  if (n <= 1) return;
  const items = tables.map(t => {
    const s = tableSize(t);
    const p = getPos(t.id);
    return { id: t.id, x: p.x, y: p.y, w: s.w, h: s.h };
  });

  const MAX_ITER = 40;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = items[i], b = items[j];
        const ox = (a.w / 2 + b.w / 2 + padding) - Math.abs((a.x + a.w / 2) - (b.x + b.w / 2));
        const oy = (a.h / 2 + b.h / 2 + padding) - Math.abs((a.y + a.h / 2) - (b.y + b.h / 2));
        if (ox > 0 && oy > 0) {
          moved = true;
          if (ox < oy) {
            const dir = (a.x + a.w / 2) < (b.x + b.w / 2) ? -1 : 1;
            const shift = Math.ceil(ox / 2);
            a.x += dir * shift;
            b.x -= dir * shift;
          } else {
            const dir = (a.y + a.h / 2) < (b.y + b.h / 2) ? -1 : 1;
            const shift = Math.ceil(oy / 2);
            a.y += dir * shift;
            b.y -= dir * shift;
          }
        }
      }
    }
    if (!moved) break;
  }
  items.forEach(it => {
    const x = Math.max(20, Math.round(it.x / 10) * 10);
    const y = Math.max(20, Math.round(it.y / 10) * 10);
    setPos(it.id, x, y);
  });
}

// Линия связи: от стороны дочерней таблицы к стороне родительской, с «вороньей лапкой» у дочерней
function relationPath(child, parent, f, pa, pb) {
  const a = tableSize(child), b = tableSize(parent);
  const cPos = pa || { x: child.x, y: child.y };
  const pPos = pb || { x: parent.x, y: parent.y };
  const rowY = (t, colId, pos) => {
    const i = visibleColumns(t).findIndex(c => c.id === colId);
    return pos.y + (i < 0 ? HEADER / 2 : HEADER + 4 + i * ROW + ROW / 2);
  };
  const ay = rowY(child, f.columns[0]?.from, cPos), by = rowY(parent, f.columns[0]?.to, pPos);

  if (child === parent) {
    const x = cPos.x + a.w;
    return {
      path: OPTS.orthoLinks
        ? roundedOrthoPath([{ x, y: ay }, { x: x + 30, y: ay }, { x: x + 30, y: cPos.y - 20 }, { x: cPos.x + a.w / 2, y: cPos.y - 20 }, { x: cPos.x + a.w / 2, y: cPos.y }])
        : `M${x} ${ay} h30 V${cPos.y - 20} H${cPos.x + a.w / 2} V${cPos.y}`,
      ax: x, ay, adir: 1, bx: cPos.x + a.w / 2, by: cPos.y, bdir: 0,
    };
  }
  const aCx = cPos.x + a.w / 2, bCx = pPos.x + b.w / 2;
  let ax, bx, adir, bdir;
  if (cPos.x + a.w + 40 < pPos.x) { ax = cPos.x + a.w; bx = pPos.x; adir = 1; bdir = -1; }
  else if (pPos.x + b.w + 40 < cPos.x) { ax = cPos.x; bx = pPos.x + b.w; adir = -1; bdir = 1; }
  else if (aCx <= bCx) { ax = cPos.x; bx = pPos.x; adir = -1; bdir = -1; }
  else { ax = cPos.x + a.w; bx = pPos.x + b.w; adir = 1; bdir = 1; }

  if (OPTS.orthoLinks) {
    return {
      path: orthoRelationPath(ax, ay, adir, bx, by, bdir, cPos, a, pPos, b),
      ax, ay, adir, bx, by, bdir,
    };
  }

  const off = Math.max(40, Math.abs(bx - ax) / 2);
  const c1 = ax + adir * off, c2 = bx + bdir * off;
  const s1 = ax + adir * 26, s2 = bx + bdir * 22;
  return {
    path: `M${ax} ${ay} H${s1} C${c1} ${ay} ${c2} ${by} ${s2} ${by} H${bx}`,
    ax, ay, adir, bx, by, bdir,
  };
}

// Rounded orthogonal path builder using quadratic bezier curves for corners
function roundedOrthoPath(points, r = 8) {
  if (points.length < 2) return '';
  if (points.length === 2) return `M${points[0].x} ${points[0].y} L${points[1].x} ${points[1].y}`;
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1], pCur = points[i], pNext = points[i + 1];
    const d1x = pCur.x - pPrev.x, d1y = pCur.y - pPrev.y;
    const len1 = Math.hypot(d1x, d1y);
    const d2x = pNext.x - pCur.x, d2y = pNext.y - pCur.y;
    const len2 = Math.hypot(d2x, d2y);
    const curR = Math.min(r, len1 / 2, len2 / 2);
    if (curR <= 1) {
      d += ` L${pCur.x} ${pCur.y}`;
      continue;
    }
    const ux1 = d1x / len1, uy1 = d1y / len1;
    const ux2 = d2x / len2, uy2 = d2y / len2;
    const sx = pCur.x - ux1 * curR, sy = pCur.y - uy1 * curR;
    const ex = pCur.x + ux2 * curR, ey = pCur.y + uy2 * curR;
    d += ` L${sx} ${sy} Q${pCur.x} ${pCur.y} ${ex} ${ey}`;
  }
  const last = points[points.length - 1];
  d += ` L${last.x} ${last.y}`;
  return d;
}

function orthoRelationPath(ax, ay, adir, bx, by, bdir, cPos, a, pPos, b) {
  const stub = 20;
  const points = [{ x: ax, y: ay }];

  // Case 1: Simple horizontal opposing directions
  if (adir === 1 && bdir === -1 && ax + 2 * stub <= bx) {
    const midX = Math.round((ax + bx) / 2);
    points.push({ x: midX, y: ay }, { x: midX, y: by }, { x: bx, y: by });
    return roundedOrthoPath(points);
  }
  if (adir === -1 && bdir === 1 && bx + 2 * stub <= ax) {
    const midX = Math.round((ax + bx) / 2);
    points.push({ x: midX, y: ay }, { x: midX, y: by }, { x: bx, y: by });
    return roundedOrthoPath(points);
  }

  // Case 2: Same side exits (both right or both left)
  if (adir === 1 && bdir === 1) {
    const maxX = Math.max(ax, bx) + 24;
    points.push({ x: maxX, y: ay }, { x: maxX, y: by }, { x: bx, y: by });
    return roundedOrthoPath(points);
  }
  if (adir === -1 && bdir === -1) {
    const minX = Math.min(ax, bx) - 24;
    points.push({ x: minX, y: ay }, { x: minX, y: by }, { x: bx, y: by });
    return roundedOrthoPath(points);
  }

  // Case 3: Overlapping or inverted horizontal tables facing each other
  const x1 = ax + adir * stub;
  const x2 = bx + bdir * stub;
  let midY;
  if (ay <= by) {
    const topY = Math.min(cPos.y, pPos.y) - 20;
    const botY = Math.max(cPos.y + a.h, pPos.y + b.h) + 20;
    midY = Math.abs(ay - topY) < Math.abs(by - botY) ? topY : botY;
  } else {
    const topY = Math.min(cPos.y, pPos.y) - 20;
    const botY = Math.max(cPos.y + a.h, pPos.y + b.h) + 20;
    midY = Math.abs(by - topY) < Math.abs(ay - botY) ? topY : botY;
  }
  points.push({ x: x1, y: ay }, { x: x1, y: midY }, { x: x2, y: midY }, { x: x2, y: by }, { x: bx, y: by });
  return roundedOrthoPath(points);
}
// Текстовая метка множественности у конца связи: маленькая таблетка чуть в
// стороне от линии, а не значок прямо на ней — читается без прищура и не
// путается со штрихами соседних связей, когда их сходится несколько.
// dir указывает, в какую сторону от таблицы уходит линия (0 — самоссылка,
// подход сверху).
function relLabel(x, y, dir, text) {
  const w = Math.ceil(textW(text, FONT.relLabel)) + 8, h = 13;
  const cx = dir ? x + dir * 16 : x;
  const cy = dir ? y - 12 : y - 20;
  return `<g class="rel-badge"><rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="4"/>` +
    `<text x="${cx}" y="${cy + 3.5}" text-anchor="middle">${text}</text></g>`;
}
