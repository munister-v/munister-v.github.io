// Properties panel: model, table (columns, keys, indexes) or foreign key
import { ORACLE_TYPES, TABLE_COLORS, newColumn, uid, uniqueName } from './model.js?v=202609241331';
import { sequenceDDL } from './ddl-gen.js?v=202609241331';
import { t, getLang, onLang } from './i18n.js?v=202609241331';
import { COLUMN_PRESETS } from './templates.js?v=202609241331';
import { physName, isLogical, cascadeTableRename } from './autodef.js?v=202609241331';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const CHECK_TEMPLATES = [
  { id: 'in', label: 'ck.in', expr: c => `${c} IN ('A', 'B', 'C')` },
  { id: 'pos', label: 'ck.pos', expr: c => `${c} > 0` },
  { id: 'between', label: 'ck.between', expr: c => `${c} BETWEEN 0 AND 100` },
  { id: 'yn', label: 'ck.yn', expr: c => `${c} IN ('Y', 'N')` },
  { id: 'email', label: 'ck.email', expr: c => `REGEXP_LIKE(${c}, '^[^@ ]+@[^@ ]+\\.[a-z]{2,}$', 'i')` },
  { id: 'dates', label: 'ck.dates', expr: () => 'END_DATE >= START_DATE' },
  { id: 'len', label: 'ck.len', expr: c => `LENGTH(TRIM(${c})) > 0` },
  { id: 'custom', label: 'ck.custom', expr: () => '' },
];
const upper = v => v.trim().toUpperCase().replace(/\s+/g, '_');
const ICON = {
  more: '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>',
  up: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 13V3M4 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  del: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  plus: '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
};

export class Panel {
  constructor(el, store, hooks = {}) {
    this.el = el; this.store = store; this.hooks = hooks;
    store.subscribe(r => { if (r !== 'panel' && r !== 'move') this.render(); });
    onLang(() => this.render());
    el.addEventListener('change', e => this.onChange(e));
    el.addEventListener('click', e => this.onClick(e));
    document.body.insertAdjacentHTML('beforeend',
      `<datalist id="oracle-types">${ORACLE_TYPES.map(x => `<option value="${x}">`).join('')}</datalist>`);
  }

  render() {
    const s = this.store.selection;
    // Панель существует ради выбранного объекта. Выбора нет — она сворачивается,
    // и холст занимает её колонку (см. body.no-panel в style.css).
    document.body.classList.toggle('no-panel', !s);
    if (!s) { this.el.innerHTML = ''; return; }
    if (s.kind === 'fk') return this.renderFk(this.store.model.fks.find(f => f.id === s.id));
    if (s.kind === 'view') return this.renderView(this.store.view(s.id));
    if (s.kind === 'seq') return this.renderSeq(this.store.sequence(s.id));
    if (s.kind === 'zone') return this.renderZone(this.store.zone(s.id));
    if (s.kind === 'multi') return this.renderMulti(s.ids);
    this.renderTable(this.store.table(s.id));
  }

  renderZone(z) {
    if (!z) return this.render();
    const colors = TABLE_COLORS.map(c =>
      `<button class="sw${c ? ` c-${c}` : ''}${(z.color || '') === c ? ' on' : ''}" data-a="zone-color" data-c="${c}" type="button" aria-label="${c || 'none'}"></button>`
    ).join('');
    this.el.innerHTML = `
      ${this.head(t('p.zone'), z.name, 'zone-del')}
      <label class="field">${t('zone.name')}<input data-f="zone.name" value="${esc(z.name)}"></label>
      <div class="field">${t('zone.color')}
        <div class="swatches">${colors}</div>
      </div>
      <div class="grid2">
        <label class="field">${t('zone.size')} W<input type="number" step="10" data-f="zone.w" value="${z.w}"></label>
        <label class="field">H<input type="number" step="10" data-f="zone.h" value="${z.h}"></label>
      </div>
      <div style="margin-top: 16px"><button class="pill danger" data-a="zone-del">${t('zone.delete')}</button></div>
    `;
  }

  renderMulti(ids) {
    const count = ids?.length || 0;
    this.el.innerHTML = `
      <header class="p-head">
        <div><span class="eyebrow">${t('p.model')}</span><h2>${t('multi.selected', { n: count })}</h2></div>
        <button class="pill danger" data-a="multi-del">${t('p.delete')}</button>
      </header>
      <div style="padding: 16px 0; color: var(--muted); font-size: 13px;">
        <p>${t('ws.keyArrows')}</p>
      </div>
      <div>
        <button class="pill danger" data-a="multi-del">${t('multi.delete')}</button>
      </div>
    `;
  }

  head(eyebrow, title, del) {
    return `<header class="p-head">
      <div><span class="eyebrow">${eyebrow}</span><h2>${esc(title)}</h2></div>
      ${del ? `<button class="pill danger" data-a="${del}">${t('p.delete')}</button>` : ''}
    </header>`;
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
          ${m.sequences?.length ? `<label class="field">${t('p.seqDefault')}<select data-f="col.seq"><option value="">—</option>${m.sequences.map(q => `<option value="${esc(q.name)}" ${new RegExp(`^${q.name}\\.NEXTVAL$`, 'i').test(c.default || '') ? 'selected' : ''}>${esc(q.name)}.NEXTVAL</option>`).join('')}</select></label>` : ''}
          <label class="field">${t('p.virtual')}<input class="mono" data-f="col.virtual" value="${esc(c.virtual)}" placeholder="${t('p.virtual.ph')}"></label>
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
      <div class="presets">
        <span class="presets-label">${t('p.presets')}</span>
        ${COLUMN_PRESETS.map(p => `<button class="chip" data-a="preset" data-preset="${p.id}">+ ${esc(p.label[getLang()] || p.label.en)}</button>`).join('')}
      </div>
      <details class="bulk"${this.bulkOpen ? ' open' : ''}>
        <summary>${t('p.bulk')}</summary>
        <textarea class="mono" rows="4" placeholder="${esc(t('p.bulk.ph').replace(/\\n/g, '\n'))}" spellcheck="false"></textarea>
        <button class="pill small" data-a="bulk-add">${ICON.plus} ${t('p.bulk.add')}</button>
      </details>

      <h3>${t('p.uniques')} <span class="count">${tb.uniques.length}</span><button class="pill small" data-a="uk-add">${ICON.plus}</button></h3>
      ${keyList(tb.uniques, 'uk') || none}

      <h3>${t('p.indexes')} <span class="count">${tb.indexes.length}</span><button class="pill small" data-a="idx-add">${ICON.plus}</button></h3>
      ${keyList(tb.indexes, 'idx') || none}

      <h3>${t('p.checks')} <span class="count">${(tb.checks || []).length}</span>
        <select class="ck-add" data-a-change="ck-add" title="${t('p.ck.add')}">
          <option value="">+ ${t('p.ck.add')}</option>
          ${CHECK_TEMPLATES.map(x => `<option value="${x.id}">${esc(t(x.label))}</option>`).join('')}
        </select></h3>
      ${(tb.checks || []).map(k => `
        <div class="key-card" data-ck="${k.id}">
          <div class="key-top"><input class="mono" data-f="ck.name" value="${esc(k.name)}" spellcheck="false">
            <button class="ic" data-a="ck-del" title="${t('p.del.t')}">${ICON.del}</button></div>
          <textarea class="mono ck-expr" data-f="ck.expr" rows="2" spellcheck="false" placeholder="STATUS IN ('NEW', 'DONE')">${esc(k.expr)}</textarea>
        </div>`).join('') || none}

      <h3>${t('p.relations')}</h3>
      ${fks ? `<ul class="fklist">${fks}</ul>` : none}

      <details class="phys"${tb.tablespace || tb.partition?.type ? ' open' : ''}>
        <summary>${t('p.physical')}${tb.partition?.type ? ` <span class="count">${tb.partition.type}</span>` : ''}</summary>
        <label class="field">TABLESPACE<input class="mono" data-f="table.tablespace" value="${esc(tb.tablespace)}" placeholder="USERS" spellcheck="false"></label>
        <div class="grid2">
          <label class="field">${t('p.partition')}<select data-f="part.type">
            ${['', 'RANGE', 'LIST', 'HASH'].map(v => `<option value="${v}" ${(tb.partition?.type || '') === v ? 'selected' : ''}>${v || t('p.partNone')}</option>`).join('')}
          </select></label>
          <label class="field">${t('p.partKey')}<input class="mono" data-f="part.columns" value="${esc(tb.partition?.columns)}" list="cols-${tb.id}" ${tb.partition?.type ? '' : 'disabled'} spellcheck="false"></label>
        </div>
        <datalist id="cols-${tb.id}">${tb.columns.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>
        ${tb.partition?.type === 'RANGE' ? `<label class="field">INTERVAL<input class="mono" data-f="part.interval" value="${esc(tb.partition.interval)}" placeholder="NUMTOYMINTERVAL(1, 'MONTH')" spellcheck="false"></label>` : ''}
        ${tb.partition?.type === 'HASH' ? `<label class="field">PARTITIONS<input class="mono" type="number" min="1" data-f="part.count" value="${esc(tb.partition.count)}" placeholder="8"></label>` : ''}
        ${tb.partition?.type && tb.partition.type !== 'HASH' ? `<label class="field">${t('p.partDefs')}<textarea class="mono" rows="3" data-f="part.definitions" spellcheck="false" placeholder="${tb.partition.type === 'RANGE' ? "PARTITION p0 VALUES LESS THAN (DATE '2025-01-01')" : "PARTITION p_ua VALUES ('UA'), PARTITION p_other VALUES (DEFAULT)"}">${esc(tb.partition.definitions)}</textarea></label>` : ''}
      </details>

      <h3>${t('p.tableDDL')}<button class="pill small" data-a="table-ddl">${t('cm.ddl')}</button></h3>`;
  }

  renderView(v) {
    const sources = this.store.viewSources(v);
    this.el.innerHTML = `
      ${this.head('VIEW', v.name, 'view-del')}
      <label class="field">${t('p.name')}<input class="mono" data-f="view.name" value="${esc(v.name)}" spellcheck="false"></label>
      <label class="field">${t('p.comment')}<textarea data-f="view.comment" rows="2">${esc(v.comment)}</textarea></label>
      <div class="field">${t('p.color')}
        <div class="swatches">${TABLE_COLORS.map(c => `<button class="sw${c ? ` c-${c}` : ''}${(v.color || '') === c ? ' on' : ''}" data-a="view-color" data-color="${c}" aria-label="${c || 'none'}"></button>`).join('')}</div>
      </div>
      <h3>SQL</h3>
      <textarea class="mono sql-edit" data-f="view.sql" rows="12" spellcheck="false">${esc(v.sql)}</textarea>
      <h3>${t('p.viewSources')} <span class="count">${sources.length}</span></h3>
      ${sources.length ? `<ul class="fklist">${sources.map(x => `<li><a data-a="goto-table" data-id="${x.id}">${esc(x.name)}</a><span>${x.columns.length} ${t('tb.cols')}</span></li>`).join('')}</ul>` : `<p class="none">${t('p.none')}</p>`}`;
  }

  renderSeq(q) {
    const users = this.store.sequenceUsers(q);
    const num = (f, label, ph = '') => `<label class="field">${label}<input class="mono" data-f="seq.${f}" value="${esc(q[f])}" placeholder="${ph}" inputmode="numeric"></label>`;
    this.el.innerHTML = `
      ${this.head('SEQUENCE', q.name, 'seq-del')}
      <label class="field">${t('p.name')}<input class="mono" data-f="seq.name" value="${esc(q.name)}" spellcheck="false"></label>
      <div class="grid2">${num('start', 'START WITH', '1')}${num('increment', 'INCREMENT BY', '1')}</div>
      <div class="grid2">${num('minvalue', 'MINVALUE', '—')}${num('maxvalue', 'MAXVALUE', '—')}</div>
      <div class="grid2">${num('cache', 'CACHE', '20')}<div class="field">&nbsp;
        <label class="check"><input type="checkbox" data-f="seq.cycle" ${q.cycle ? 'checked' : ''}> CYCLE</label>
        <label class="check"><input type="checkbox" data-f="seq.order" ${q.order ? 'checked' : ''}> ORDER</label></div></div>
      <label class="field">${t('p.comment')}<textarea data-f="seq.comment" rows="2">${esc(q.comment)}</textarea></label>
      <h3>${t('p.seqUsers')} <span class="count">${users.length}</span></h3>
      ${users.length ? `<ul class="fklist">${users.map(u => `<li><a data-a="goto-table" data-id="${u.table.id}">${esc(u.table.name)}.${esc(u.column.name)}</a><span>DEFAULT</span></li>`).join('')}</ul>` : `<p class="none">${t('p.seqUnused')}</p>`}
      <pre class="code mini">${esc(sequenceDDL(q))}</pre>`;
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
      viewId: s?.kind === 'view' ? s.id : null,
      seqId: s?.kind === 'seq' ? s.id : null,
      ckId: target.closest('[data-ck]')?.dataset.ck,
    };
  }

  onChange(e) {
    const el = e.target, f = el.dataset.f;
    if (el.dataset.aChange === 'ck-add') {
      const tpl = CHECK_TEMPLATES.find(x => x.id === el.value);
      const tb = this.store.table(this.store.selection.id);
      if (!tpl || !tb) return;
      const col = tb.columns.find(x => !x.pk && !x.virtual) || tb.columns[0];
      this.store.update(m => { tb.checks ||= []; tb.checks.push({ id: uid('k'), name: uniqueName(m, `${tb.name}_CK`), expr: tpl.expr(col?.name || 'COL') }); });
      return;
    }
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
      const view = c.viewId && m.views.find(x => x.id === c.viewId);
      const seq = c.seqId && m.sequences.find(x => x.id === c.seqId);
      const ck = tb && c.ckId && tb.checks.find(x => x.id === c.ckId);
      const part = () => (tb.partition ||= { type: '', columns: '', interval: '', count: '', definitions: '' });
      switch (f) {
        case 'col.virtual': col.virtual = val.trim(); if (col.virtual) { col.identity = false; col.default = ''; col.pk = false; } rerender = true; break;
        case 'col.seq': col.default = val ? `${val}.NEXTVAL` : ''; if (val) col.identity = false; rerender = true; break;
        case 'ck.name': ck.name = el.value = upper(val) || ck.name; break;
        case 'ck.expr': ck.expr = val.trim(); rerender = true; break;
        case 'table.tablespace': tb.tablespace = el.value = val.trim().toUpperCase(); rerender = true; break;
        case 'part.type': part().type = val; if (val && !tb.partition.columns) tb.partition.columns = tb.columns.find(x => x.pk)?.name || ''; if (!val) tb.partition = null; rerender = true; break;
        case 'part.columns': part().columns = el.value = val.toUpperCase().replace(/\s*,\s*/g, ', ').trim(); break;
        case 'part.interval': part().interval = val.trim(); break;
        case 'part.count': part().count = val.trim(); break;
        case 'part.definitions': part().definitions = val.trim(); break;
        case 'view.name': view.name = el.value = upper(val) || view.name; rerender = true; break;
        case 'view.comment': view.comment = val; break;
        case 'view.sql': view.sql = val; rerender = true; break;
        case 'seq.name': seq.name = el.value = upper(val) || seq.name; rerender = true; break;
        case 'seq.start': case 'seq.increment': case 'seq.minvalue': case 'seq.maxvalue': case 'seq.cache':
          seq[f.slice(4)] = el.value = val.trim().replace(/[^0-9-]/g, ''); rerender = true; break;
        case 'seq.cycle': seq.cycle = val; rerender = true; break;
        case 'seq.order': seq.order = val; rerender = true; break;
        case 'seq.comment': seq.comment = val; break;
        case 'model.name': m.name = val; rerender = true; break;
        case 'table.name': { const was = tb.name; tb.name = el.value = physName(val) || tb.name; cascadeTableRename(m, tb, was); if (isLogical(val) && !tb.comment) tb.comment = val.trim(); rerender = true; break; }
        case 'table.schema': tb.schema = el.value = upper(val); break;
        case 'table.comment': tb.comment = val; break;
        case 'col.name': col.name = el.value = physName(val) || col.name; if (isLogical(val) && !col.comment) { col.comment = val.trim(); rerender = true; } break;
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
        case 'zone.name': { const z = st.zone(st.selection?.id); if (z) { z.name = val.trim() || z.name; rerender = true; } break; }
        case 'zone.w': { const z = st.zone(st.selection?.id); if (z) { z.w = Math.max(160, parseInt(val, 10) || z.w); rerender = true; } break; }
        case 'zone.h': { const z = st.zone(st.selection?.id); if (z) { z.h = Math.max(100, parseInt(val, 10) || z.h); rerender = true; } break; }
        case 'fk.mandatory': {
          const from = m.tables.find(x => x.id === fk.fromTable);
          fk.columns.forEach(p => { const cc = from.columns.find(x => x.id === p.from); if (cc && !cc.pk) cc.nullable = !val; });
          break;
        }
      }
    }, 'panel');
    // the reason is known only after the edit ran
    if (rerender) this.render();
  }

  onClick(e) {
    const btn = e.target.closest('[data-a]');
    if (!btn || btn.disabled) return;
    const a = btn.dataset.a, c = this.ctx(btn), st = this.store;
    const tb = c.tableId && st.table(c.tableId);
    switch (a) {
      case 'zone-color': st.update(() => { const z = st.zone(st.selection?.id); if (z) z.color = btn.dataset.c; }); this.render(); break;
      case 'zone-del': st.deleteZone(st.selection?.id); break;
      case 'multi-del': {
        const ids = [...(st.selection?.ids || [])];
        st.update(m => {
          ids.forEach(id => {
            m.tables = m.tables.filter(t => t.id !== id);
            m.views = (m.views || []).filter(v => v.id !== id);
            m.fks = m.fks.filter(f => f.fromTable !== id && f.toTable !== id);
            (m.diagrams || []).forEach(d => {
              d.tableIds = (d.tableIds || []).filter(tid => tid !== id);
              d.viewIds = (d.viewIds || []).filter(vid => vid !== id);
              if (d.positions) delete d.positions[id];
            });
          });
        });
        st.select(null);
        break;
      }
      case 'table-del': st.deleteTable(c.tableId); break;
      case 'color': st.update(() => { tb.color = btn.dataset.color; }); break;
      case 'preset': {
        const preset = COLUMN_PRESETS.find(p => p.id === btn.dataset.preset);
        const taken = new Set(tb.columns.map(x => x.name));
        const add = preset.cols.filter(x => !taken.has(x.name) && !(x.pk && tb.columns.some(y => y.pk)));
        if (!add.length) break;
        st.update(() => add.forEach(x => tb.columns.push({ ...newColumn(x.name, x.type), ...x, nullable: x.nullable ?? true, default: x.default || '' })));
        this.hooks?.toast?.(t('t.colsAdded', { n: add.length }));
        break;
      }
      case 'bulk-add': {
        const ta = this.el.querySelector('.bulk textarea');
        const cols = parseColumnLines(ta.value, tb.columns.map(x => x.name));
        this.bulkOpen = true;
        if (!cols.length) break;
        st.update(() => tb.columns.push(...cols));
        this.hooks?.toast?.(t('t.colsAdded', { n: cols.length }));
        break;
      }
      case 'table-ddl': this.hooks?.copyTableDDL?.(tb.id); break;
      case 'ck-del': st.update(() => { tb.checks = tb.checks.filter(x => x.id !== c.ckId); }); break;
      case 'view-del': st.deleteView(c.viewId); break;
      case 'seq-del': st.deleteSequence(c.seqId); break;
      case 'view-color': st.update(m => { m.views.find(x => x.id === c.viewId).color = btn.dataset.color; }); break;
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
      // select(null) до update(): та же причина, что в Store.deleteTable/View/Sequence
      // (см. model.js) — update() эмитит 'change' сразу после мутации, и рендер не должен
      // в этот момент ещё указывать на только что удалённый FK.
      case 'fk-del': st.select(null); st.update(m => { m.fks = m.fks.filter(x => x.id !== c.fkId); }); break;
      case 'goto-fk': st.select({ kind: 'fk', id: btn.dataset.id }); break;
      case 'goto-table': st.select({ kind: 'table', id: btn.dataset.id }); break;
    }
  }
}

// "NAME TYPE [NOT NULL] [DEFAULT expr] [PK]" per line; commas and trailing punctuation are tolerated
export function parseColumnLines(text, existing = []) {
  const taken = new Set(existing.map(x => x.toUpperCase()));
  const cols = [];
  for (let line of text.split(/\n/)) {
    line = line.trim().replace(/,$/, '');
    if (!line || line.startsWith('--')) continue;
    const m = line.match(/^"?([\p{L}_][\p{L}\p{N}_$#]*)"?\s*(.*)$/u);
    if (!m) continue;
    const name = m[1].toUpperCase();
    if (taken.has(name)) continue;
    let rest = m[2];
    const col = newColumn(name, '');
    if (/\bPRIMARY\s+KEY\b|\bPK\b/i.test(rest)) { col.pk = true; col.nullable = false; rest = rest.replace(/\bPRIMARY\s+KEY\b|\bPK\b/ig, ''); }
    if (/\bNOT\s+NULL\b/i.test(rest)) { col.nullable = false; rest = rest.replace(/\bNOT\s+NULL\b/ig, ''); }
    const def = rest.match(/\bDEFAULT\s+(.+)$/i);
    if (def) { col.default = def[1].trim(); rest = rest.slice(0, def.index); }
    col.type = rest.trim().replace(/\s+/g, ' ').toUpperCase() || 'VARCHAR2(100 CHAR)';
    taken.add(name);
    cols.push(col);
  }
  return cols;
}
