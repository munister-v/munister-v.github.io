// SVG diagram: tables, relations, pan/zoom, drag, relation mode
import { t as tr } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const HEADER = 38, ROW = 24, PAD = 14;
const FONT = {
  title: "600 13px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  col: "12.5px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  colNN: "500 12.5px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  type: "11px ui-monospace,'SF Mono',Menlo,Consolas,monospace",
  schema: "10px ui-monospace,'SF Mono',Menlo,Consolas,monospace",
};
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
  const nameW = Math.max(0, ...t.columns.map(c => textW(c.name, c.pk || !c.nullable ? FONT.colNN : FONT.col)));
  const typeW = Math.max(0, ...t.columns.map(c => textW(c.type || '', FONT.type)));
  const titleW = textW(t.name, FONT.title) + (t.schema ? textW(t.schema.toUpperCase(), FONT.schema) * 1.15 + 20 : 0);
  return {
    w: Math.ceil(Math.max(210, PAD + 28 + nameW + 28 + typeW + PAD, PAD * 2 + titleW + 30)),
    h: HEADER + Math.max(1, t.columns.length) * ROW + 8,
  };
}

export class Diagram {
  constructor(svg, store, hooks) {
    this.svg = svg; this.store = store; this.hooks = hooks;
    this.view = { x: 0, y: 0, k: 1 };
    this.mode = 'select'; // 'select' | 'relation'
    this.relFrom = null;
    svg.innerHTML = `
      <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".9" class="grid-dot"/></pattern></defs>
      <rect class="bg" width="100%" height="100%" fill="url(#grid)"/>
      <g class="viewport"><g class="rels"></g><g class="tables"></g></g>`;
    this.vp = svg.querySelector('.viewport');
    this.gRels = svg.querySelector('.rels');
    this.gTables = svg.querySelector('.tables');
    this.bindEvents();
    store.subscribe(r => { if (r === 'move') { this.renderRelations(); this.renderMinimap(); } else this.render(); });
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
    this.renderMinimap();
  }

  render() {
    const { model, selection } = this.store;
    this.related = null;
    if (selection?.kind === 'table') {
      this.related = new Set([selection.id]);
      model.fks.forEach(f => { if (f.fromTable === selection.id) this.related.add(f.toTable); if (f.toTable === selection.id) this.related.add(f.fromTable); });
    } else if (selection?.kind === 'fk') {
      const f = model.fks.find(x => x.id === selection.id);
      if (f) this.related = new Set([f.fromTable, f.toTable]);
    }
    this.svg.classList.toggle('focus', !!this.related);
    this.gTables.innerHTML = model.tables.map(t => this.tableSVG(t, selection)).join('');
    this.renderRelations();
    this.applyView();
  }

  tableSVG(t, sel) {
    const { w, h } = tableSize(t);
    const selected = sel?.kind === 'table' && sel.id === t.id;
    const relSrc = this.relFrom === t.id;
    const rows = t.columns.map((c, i) => {
      const top = HEADER + 4 + i * ROW, y = top + 16;
      const fk = this.store.isFkColumn(t.id, c.id);
      const key = c.pk && fk ? `<rect class="kbg pk" x="${PAD - 3}" y="${top + 5}" width="22" height="12" rx="3"/><text x="${PAD + 8}" y="${y - 1}" class="key pk" text-anchor="middle">PF</text>`
        : c.pk ? `<rect class="kbg pk" x="${PAD - 3}" y="${top + 5}" width="22" height="12" rx="3"/><text x="${PAD + 8}" y="${y - 1}" class="key pk" text-anchor="middle">PK</text>`
        : fk ? `<rect class="kbg fk" x="${PAD - 3}" y="${top + 5}" width="22" height="12" rx="3"/><text x="${PAD + 8}" y="${y - 1}" class="key fk" text-anchor="middle">FK</text>` : '';
      const nn = !c.nullable || c.pk ? ' nn' : '';
      return `${i % 2 ? `<rect class="zebra" x="1" y="${top}" width="${w - 2}" height="${ROW}"/>` : ''}${key}
        <text x="${PAD + 28}" y="${y}" class="col${nn}">${esc(c.name)}</text>
        <text x="${w - PAD}" y="${y}" class="type" text-anchor="end">${esc(c.type)}</text>`;
    }).join('');
    const cls = ['table', selected && 'selected', relSrc && 'rel-src', this.related?.has(t.id) && 'related', t.color && `c-${t.color}`].filter(Boolean).join(' ');
    return `<g class="${cls}" data-id="${t.id}" transform="translate(${t.x},${t.y})">
      <rect class="shadow" y="2" width="${w}" height="${h}" rx="10"/>
      <rect class="body" width="${w}" height="${h}" rx="10"/>
      <path class="head" d="M0 10a10 10 0 0 1 10-10h${w - 20}a10 10 0 0 1 10 10v${HEADER - 10}h-${w}z"/>
      <rect class="accent" x="0" y="${HEADER - 2}" width="${w}" height="2"/>
      <text x="${PAD}" y="25" class="title">${esc(t.name)}</text>
      ${t.schema ? `<text x="${w - PAD}" y="24" class="schema" text-anchor="end">${esc(t.schema.toUpperCase())}</text>` : `<text x="${w - PAD}" y="24" class="schema" text-anchor="end">${t.columns.length}</text>`}
      ${t.columns.length ? rows : `<text x="${PAD}" y="${HEADER + 19}" class="empty">${tr('d.noColumns')}</text>`}
      <rect class="outline" x="-3" y="-3" width="${w + 6}" height="${h + 6}" rx="13"/>
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
      const sel = selection?.kind === 'fk' && selection.id === f.id
        || selection?.kind === 'table' && (f.fromTable === selection.id || f.toTable === selection.id);
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
        cancelAnimationFrame(this.anim);
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
      cancelAnimationFrame(this.anim);
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
    // world rect covering tables and the current viewport
    const vx1 = -this.view.x / this.view.k, vy1 = -this.view.y / this.view.k;
    const vx2 = vx1 + r.width / this.view.k, vy2 = vy1 + r.height / this.view.k;
    const x1 = Math.min(b?.x1 ?? vx1, vx1) - 40, y1 = Math.min(b?.y1 ?? vy1, vy1) - 40;
    const x2 = Math.max(b?.x2 ?? vx2, vx2) + 40, y2 = Math.max(b?.y2 ?? vy2, vy2) + 40;
    const k = Math.min(W / (x2 - x1), H / (y2 - y1));
    const ox = (W - (x2 - x1) * k) / 2 - x1 * k, oy = (H - (y2 - y1) * k) / 2 - y1 * k;
    this.mm = { k, ox, oy };
    const sel = this.store.selection;
    const rects = this.store.model.tables.map(t => {
      const s = tableSize(t);
      const on = sel?.kind === 'table' && sel.id === t.id;
      return `<rect class="mm-t${t.color ? ` c-${t.color}` : ''}${on ? ' on' : ''}" x="${(t.x * k + ox).toFixed(1)}" y="${(t.y * k + oy).toFixed(1)}" width="${Math.max(2, s.w * k).toFixed(1)}" height="${Math.max(2, s.h * k).toFixed(1)}" rx="1.5"/>`;
    }).join('');
    mm.innerHTML = `${rects}<rect class="mm-view" x="${(vx1 * k + ox).toFixed(1)}" y="${(vy1 * k + oy).toFixed(1)}" width="${((vx2 - vx1) * k).toFixed(1)}" height="${((vy2 - vy1) * k).toFixed(1)}" rx="3"/>`;
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
    const t = this.store.table(id);
    if (!t) return;
    const s = tableSize(t), r = this.svg.getBoundingClientRect();
    const k = Math.max(this.view.k, 0.8);
    this.animateTo({ k, x: r.width / 2 - (t.x + s.w / 2) * k, y: r.height / 2 - (t.y + s.h / 2) * k });
  }

  bounds() {
    const ts = this.store.model.tables;
    if (!ts.length) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    ts.forEach(t => { const s = tableSize(t); x1 = Math.min(x1, t.x); y1 = Math.min(y1, t.y); x2 = Math.max(x2, t.x + s.w); y2 = Math.max(y2, t.y + s.h); });
    return { x1, y1, x2, y2 };
  }

  fit(animate = true) {
    const ts = this.store.model.tables;
    if (!ts.length) { this.view = { x: 0, y: 0, k: 1 }; return this.applyView(); }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    ts.forEach(t => { const s = tableSize(t); x1 = Math.min(x1, t.x); y1 = Math.min(y1, t.y); x2 = Math.max(x2, t.x + s.w); y2 = Math.max(y2, t.y + s.h); });
    const r = this.svg.getBoundingClientRect();
    if (!r.width) return;
    const k = Math.min(1.1, Math.max(0.15, Math.min((r.width - 160) / (x2 - x1), (r.height - 160) / (y2 - y1))));
    const target = { k, x: (r.width - (x2 - x1) * k) / 2 - x1 * k, y: (r.height - (y2 - y1) * k) / 2 - y1 * k };
    if (animate) this.animateTo(target); else { this.view = target; this.applyView(); }
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
    const style = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch { return []; } })
      .map(r => r.cssText).filter(c => /\.(table|rel|key|col|type|title|schema|rule|zebra|shadow|body|line|mark|hit|empty)\b/.test(c) || c.startsWith(':root')).join('\n');
    return `<svg xmlns="${NS}" viewBox="${x1} ${y1} ${x2 - x1} ${y2 - y1}" width="${x2 - x1}" height="${y2 - y1}">
      <style>${style}</style><rect x="${x1}" y="${y1}" width="100%" height="100%" fill="#ffffff"/>
      ${this.gRels.outerHTML}${this.gTables.outerHTML}</svg>`;
  }
}

// Линия связи: от стороны дочерней таблицы к стороне родительской, с «вороньей лапкой» у дочерней
function relationPath(child, parent, f) {
  const a = tableSize(child), b = tableSize(parent);
  const rowY = (t, colId) => {
    const i = t.columns.findIndex(c => c.id === colId);
    return t.y + (i < 0 ? HEADER / 2 : HEADER + 4 + i * ROW + ROW / 2);
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
