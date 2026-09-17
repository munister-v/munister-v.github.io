// SVG-диаграмма: таблицы, связи, pan/zoom, drag, режим создания связи
const NS = 'http://www.w3.org/2000/svg';
const HEADER = 30, ROW = 20, PAD = 8, CH = 7.3;
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function tableSize(t) {
  const nameW = Math.max(...t.columns.map(c => c.name.length), 4) * CH;
  const typeW = Math.max(...t.columns.map(c => (c.type || '').length), 4) * CH;
  const titleW = (t.name.length + (t.schema ? t.schema.length + 1 : 0)) * 8 + 24;
  return { w: Math.round(Math.max(180, 26 + nameW + 18 + typeW + PAD, titleW)), h: HEADER + Math.max(1, t.columns.length) * ROW + 6 };
}

export class Diagram {
  constructor(svg, store, hooks) {
    this.svg = svg; this.store = store; this.hooks = hooks;
    this.view = { x: 0, y: 0, k: 1 };
    this.mode = 'select'; // 'select' | 'relation'
    this.relFrom = null;
    svg.innerHTML = `
      <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" class="grid-dot"/></pattern></defs>
      <rect class="bg" width="100%" height="100%" fill="url(#grid)"/>
      <g class="viewport"><g class="rels"></g><g class="tables"></g></g>`;
    this.vp = svg.querySelector('.viewport');
    this.gRels = svg.querySelector('.rels');
    this.gTables = svg.querySelector('.tables');
    this.bindEvents();
    store.subscribe(r => r === 'move' ? this.renderRelations() : this.render());
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
  }

  render() {
    const { model, selection } = this.store;
    this.gTables.innerHTML = model.tables.map(t => this.tableSVG(t, selection)).join('');
    this.renderRelations();
    this.applyView();
  }

  tableSVG(t, sel) {
    const { w, h } = tableSize(t);
    const selected = sel?.kind === 'table' && sel.id === t.id;
    const relSrc = this.relFrom === t.id;
    const rows = t.columns.map((c, i) => {
      const y = HEADER + i * ROW + 14;
      const fk = this.store.isFkColumn(t.id, c.id);
      const icon = c.pk ? `<text x="10" y="${y}" class="ico pk">PK</text>` : fk ? `<text x="10" y="${y}" class="ico fk">FK</text>` : '';
      const nn = !c.nullable || c.pk ? ' nn' : '';
      return `${icon}<text x="30" y="${y}" class="col${nn}">${esc(c.name)}${!c.nullable || c.pk ? '' : ''}</text>
        <text x="${w - PAD}" y="${y}" class="type" text-anchor="end">${esc(c.type)}</text>`;
    }).join('');
    const title = (t.schema ? `<tspan class="schema">${esc(t.schema)}.</tspan>` : '') + esc(t.name);
    return `<g class="table${selected ? ' selected' : ''}${relSrc ? ' rel-src' : ''}" data-id="${t.id}" transform="translate(${t.x},${t.y})">
      <rect class="body" width="${w}" height="${h}" rx="6"/>
      <path class="head" d="M0 6a6 6 0 0 1 6-6h${w - 12}a6 6 0 0 1 6 6v${HEADER - 6}h-${w}z"/>
      <text x="10" y="20" class="title">${title}</text>
      ${t.columns.length ? rows : `<text x="10" y="${HEADER + 14}" class="empty">нет колонок</text>`}
      ${t.comment ? `<title>${esc(t.comment)}</title>` : ''}
    </g>`;
  }

  renderRelations() {
    const { model, selection } = this.store;
    const byId = Object.fromEntries(model.tables.map(t => [t.id, t]));
    this.gRels.innerHTML = model.fks.map(f => {
      const a = byId[f.fromTable], b = byId[f.toTable];
      if (!a || !b) return '';
      const d = relationPath(a, b, f);
      const sel = selection?.kind === 'fk' && selection.id === f.id;
      const mandatory = f.columns.every(p => a.columns.find(c => c.id === p.from)?.nullable === false);
      return `<g class="rel${sel ? ' selected' : ''}${mandatory ? '' : ' optional'}" data-id="${f.id}">
        <path class="hit" d="${d.path}"/><path class="line" d="${d.path}"/>
        <path class="mark" d="${d.many}"/><path class="mark" d="${d.one}"/>
        <title>${esc(f.name)}</title></g>`;
    }).join('');
    // Обновить позицию таблиц, если это drag
    for (const g of this.gTables.children) {
      const t = byId[g.dataset.id];
      if (t) g.setAttribute('transform', `translate(${t.x},${t.y})`);
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
      const tg = e.target.closest('.table');
      const rg = e.target.closest('.rel');
      if (tg) {
        const id = tg.dataset.id;
        if (this.mode === 'relation') {
          if (!this.relFrom) { this.relFrom = id; this.render(); }
          else { this.hooks.onRelation(this.relFrom, id); this.relFrom = null; }
          return;
        }
        this.store.select({ kind: 'table', id });
        const t = this.store.table(id), p = this.toWorld(e);
        drag = { kind: 'table', t, dx: p.x - t.x, dy: p.y - t.y, moved: false };
      } else if (rg) {
        this.store.select({ kind: 'fk', id: rg.dataset.id });
      } else {
        if (this.relFrom) { this.relFrom = null; this.render(); }
        if (this.store.selection) this.store.select(null);
        drag = { kind: 'pan', sx: e.clientX - this.view.x, sy: e.clientY - this.view.y };
        svg.classList.add('panning');
      }
      svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      if (drag.kind === 'pan') {
        this.view.x = e.clientX - drag.sx; this.view.y = e.clientY - drag.sy; this.applyView();
      } else {
        const p = this.toWorld(e);
        const nx = Math.round((p.x - drag.dx) / 10) * 10, ny = Math.round((p.y - drag.dy) / 10) * 10;
        if (nx === drag.t.x && ny === drag.t.y) return;
        if (!drag.moved) { this.store.checkpoint(); drag.moved = true; }
        const t = drag.t;
        this.store.silent(() => { t.x = nx; t.y = ny; });
      }
    });

    const end = () => { if (drag?.moved) this.store.persist(); drag = null; svg.classList.remove('panning'); };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('dblclick', e => {
      if (e.target.closest('.table') || e.target.closest('.rel')) return;
      this.hooks.onAddTable(this.toWorld(e));
    });

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || !e.deltaX && Math.abs(e.deltaY) >= 50) {
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
  zoomBy(f) { const r = this.svg.getBoundingClientRect(); this.zoomAt(r.width / 2, r.height / 2, f); }

  fit() {
    const ts = this.store.model.tables;
    if (!ts.length) { this.view = { x: 0, y: 0, k: 1 }; return this.applyView(); }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    ts.forEach(t => { const s = tableSize(t); x1 = Math.min(x1, t.x); y1 = Math.min(y1, t.y); x2 = Math.max(x2, t.x + s.w); y2 = Math.max(y2, t.y + s.h); });
    const r = this.svg.getBoundingClientRect();
    const k = Math.min(1.2, Math.max(0.15, Math.min((r.width - 80) / (x2 - x1), (r.height - 80) / (y2 - y1))));
    this.view = { k, x: (r.width - (x2 - x1) * k) / 2 - x1 * k, y: (r.height - (y2 - y1) * k) / 2 - y1 * k };
    this.applyView();
  }

  center() {
    const r = this.svg.getBoundingClientRect();
    return { x: (r.width / 2 - this.view.x) / this.view.k, y: (r.height / 2 - this.view.y) / this.view.k };
  }

  exportSVG() {
    const ts = this.store.model.tables;
    let x1 = 0, y1 = 0, x2 = 400, y2 = 300;
    if (ts.length) {
      x1 = Math.min(...ts.map(t => t.x)) - 20; y1 = Math.min(...ts.map(t => t.y)) - 20;
      x2 = Math.max(...ts.map(t => t.x + tableSize(t).w)) + 20; y2 = Math.max(...ts.map(t => t.y + tableSize(t).h)) + 20;
    }
    const css = getComputedStyle(document.documentElement);
    const v = n => css.getPropertyValue(n).trim();
    const style = `
      .body{fill:${v('--tbl-bg')};stroke:${v('--tbl-border')}} .head{fill:${v('--tbl-head')}}
      text{font:12px ui-monospace,Menlo,Consolas,monospace;fill:${v('--text')}} .title{font-weight:700;font-size:13px;fill:${v('--tbl-head-text')}}
      .schema{opacity:.7} .type{fill:${v('--muted')}} .ico{font-size:9px;font-weight:700} .pk{fill:${v('--pk')}} .fk{fill:${v('--fk')}}
      .col.nn{font-weight:700} .line,.mark{fill:none;stroke:${v('--rel')};stroke-width:1.4} .optional .line{stroke-dasharray:5 4} .hit,.empty{display:none}`;
    return `<svg xmlns="${NS}" viewBox="${x1} ${y1} ${x2 - x1} ${y2 - y1}" width="${x2 - x1}" height="${y2 - y1}">
      <style>${style}</style><rect x="${x1}" y="${y1}" width="100%" height="100%" fill="${v('--canvas')}"/>
      ${this.gRels.outerHTML}${this.gTables.outerHTML}</svg>`;
  }
}

// Линия связи: от стороны дочерней таблицы к стороне родительской, с «вороньей лапкой» у дочерней
function relationPath(child, parent, f) {
  const a = tableSize(child), b = tableSize(parent);
  const rowY = (t, colId) => {
    const i = t.columns.findIndex(c => c.id === colId);
    return t.y + (i < 0 ? HEADER / 2 : HEADER + i * ROW + ROW / 2);
  };
  const ay = rowY(child, f.columns[0]?.from), by = rowY(parent, f.columns[0]?.to);

  if (child === parent) {
    const x = child.x + a.w;
    return {
      path: `M${x} ${ay} h30 V${child.y - 20} H${child.x + a.w / 2} V${child.y}`,
      many: crow(x, ay, 1), one: bar(child.x + a.w / 2, child.y, 0, -1),
    };
  }
  const aCx = child.x + a.w / 2, bCx = parent.x + b.w / 2;
  let ax, bx, adir, bdir;
  if (child.x + a.w + 40 < parent.x) { ax = child.x + a.w; bx = parent.x; adir = 1; bdir = -1; }
  else if (parent.x + b.w + 40 < child.x) { ax = child.x; bx = parent.x + b.w; adir = -1; bdir = 1; }
  else if (aCx <= bCx) { ax = child.x; bx = parent.x; adir = -1; bdir = -1; }
  else { ax = child.x + a.w; bx = parent.x + b.w; adir = 1; bdir = 1; }

  const off = Math.max(40, Math.abs(bx - ax) / 2);
  const c1 = ax + adir * off, c2 = bx + bdir * off;
  const s1 = ax + adir * 14, s2 = bx + bdir * 10;
  return {
    path: `M${ax} ${ay} H${s1} C${c1} ${ay} ${c2} ${by} ${s2} ${by} H${bx}`,
    many: crow(ax, ay, adir),
    one: `M${bx + bdir * 6} ${by - 6} v12`,
  };
}
const crow = (x, y, dir) => `M${x} ${y - 6} L${x + dir * 12} ${y} L${x} ${y + 6} M${x + dir * 14} ${y - 6} v12`;
const bar = (x, y) => `M${x - 6} ${y - 6} h12`;
