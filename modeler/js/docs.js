// Data dictionary: a standalone HTML document and a Markdown file
import { t as tr, getLang } from './i18n.js?v=202609210927';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const anchor = name => `t-${name.toLowerCase().replace(/[^a-z0-9_]+/g, '-')}`;

function describe(model) {
  const byId = Object.fromEntries(model.tables.map(x => [x.id, x]));
  const colName = (tb, id) => tb.columns.find(c => c.id === id)?.name;
  return [...model.tables].sort((a, b) => a.name.localeCompare(b.name)).map(tb => {
    const outFks = model.fks.filter(f => f.fromTable === tb.id);
    const inFks = model.fks.filter(f => f.toTable === tb.id && f.fromTable !== tb.id);
    const fkOf = colId => outFks.find(f => f.columns.some(p => p.from === colId));
    return {
      tb,
      columns: tb.columns.map((c, i) => {
        const fk = fkOf(c.id);
        const keys = [c.pk && 'PK', fk && 'FK', tb.uniques.some(u => u.columns.includes(c.id)) && 'UK'].filter(Boolean);
        return { n: i + 1, c, keys, ref: fk ? byId[fk.toTable]?.name : null };
      }),
      uniques: tb.uniques.map(u => ({ name: u.name, cols: u.columns.map(id => colName(tb, id)).filter(Boolean) })),
      indexes: tb.indexes.map(ix => ({ name: ix.name, unique: ix.unique, cols: ix.columns.map(id => colName(tb, id)).filter(Boolean) })),
      outFks: outFks.map(f => ({ name: f.name, cols: f.columns.map(p => colName(tb, p.from)), parent: byId[f.toTable]?.name, pcols: f.columns.map(p => colName(byId[f.toTable], p.to)), onDelete: f.onDelete })),
      inFks: inFks.map(f => ({ name: f.name, child: byId[f.fromTable]?.name })),
    };
  });
}

export function dictionaryHTML(model) {
  const lang = getLang();
  const items = describe(model);
  const date = new Date().toLocaleString(lang === 'uk' ? 'uk-UA' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' });
  const cols = model.tables.reduce((n, x) => n + x.columns.length, 0);
  const section = ({ tb, columns, uniques, indexes, outFks, inFks }) => `
  <section id="${anchor(tb.name)}">
    <h2>${tb.schema ? `<small>${esc(tb.schema)}.</small>` : ''}${esc(tb.name)}</h2>
    ${tb.comment ? `<p class="lead">${esc(tb.comment)}</p>` : ''}
    <table>
      <thead><tr><th>#</th><th>${tr('doc.column')}</th><th>${tr('doc.type')}</th><th>${tr('doc.null')}</th><th>${tr('doc.default')}</th><th>${tr('doc.keys')}</th><th>${tr('doc.comment')}</th></tr></thead>
      <tbody>${columns.map(({ n, c, keys, ref }) => `
        <tr><td class="n">${n}</td><td class="code${c.pk ? ' pk' : ''}">${esc(c.name)}</td><td class="code">${c.virtual ? `${esc(c.type)} = ${esc(c.virtual)}` : esc(c.type)}</td>
        <td>${c.pk || !c.nullable ? 'NOT NULL' : ''}</td><td class="code">${c.identity ? 'IDENTITY' : esc(c.default)}</td>
        <td>${keys.map(k => `<span class="k ${k.toLowerCase()}">${k}</span>`).join(' ')}${ref ? ` → <a href="#${anchor(ref)}">${esc(ref)}</a>` : ''}</td>
        <td>${esc(c.comment)}</td></tr>`).join('')}
      </tbody>
    </table>
    ${uniques.length || indexes.length || outFks.length || inFks.length || tb.checks?.length || tb.tablespace || tb.partition?.type ? `<dl>
      ${tb.checks?.length ? `<dt>CHECK</dt><dd>${tb.checks.map(k => `<code>${esc(k.name)}</code>: <code>${esc(k.expr)}</code>`).join('<br>')}</dd>` : ''}
      ${tb.tablespace ? `<dt>TABLESPACE</dt><dd><code>${esc(tb.tablespace)}</code></dd>` : ''}
      ${tb.partition?.type ? `<dt>PARTITION BY</dt><dd><code>${esc(tb.partition.type)} (${esc(tb.partition.columns)})${tb.partition.interval ? ` INTERVAL (${esc(tb.partition.interval)})` : ''}${tb.partition.count ? ` PARTITIONS ${esc(tb.partition.count)}` : ''}</code></dd>` : ''}
      ${uniques.length ? `<dt>${tr('p.uniques')}</dt><dd>${uniques.map(u => `<code>${esc(u.name)}</code> (${u.cols.map(esc).join(', ')})`).join('<br>')}</dd>` : ''}
      ${indexes.length ? `<dt>${tr('p.indexes')}</dt><dd>${indexes.map(ix => `<code>${esc(ix.name)}</code>${ix.unique ? ' UNIQUE' : ''} (${ix.cols.map(esc).join(', ')})`).join('<br>')}</dd>` : ''}
      ${outFks.length ? `<dt>${tr('doc.refs')}</dt><dd>${outFks.map(f => `<code>${esc(f.name)}</code>: ${f.cols.map(esc).join(', ')} → <a href="#${anchor(f.parent)}">${esc(f.parent)}</a> (${f.pcols.map(esc).join(', ')})${f.onDelete ? ` ON DELETE ${f.onDelete}` : ''}`).join('<br>')}</dd>` : ''}
      ${inFks.length ? `<dt>${tr('doc.refBy')}</dt><dd>${inFks.map(f => `<a href="#${anchor(f.child)}">${esc(f.child)}</a> <span class="muted">(${esc(f.name)})</span>`).join(', ')}</dd>` : ''}
    </dl>` : ''}
  </section>`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(model.name)} — ${tr('doc.title')}</title>
<style>
  :root { --ink:#1c1917; --muted:#78716c; --rule:#e7e5e4; --accent:#0f766e; --soft:#f5f5f4; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.55 Inter, -apple-system, 'Segoe UI', sans-serif; color: var(--ink); background: #fff; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 48px 32px 80px; }
  header { border-bottom: 2px solid var(--ink); padding-bottom: 20px; margin-bottom: 28px; }
  header p { margin: 0; color: var(--muted); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
  h1 { font-size: 34px; margin: 6px 0 10px; letter-spacing: -.02em; }
  .stats { display: flex; gap: 24px; color: var(--muted); }
  .stats b { color: var(--ink); font-size: 18px; margin-right: 4px; }
  nav { columns: 3 200px; background: var(--soft); border-radius: 10px; padding: 16px 20px; margin-bottom: 36px; font: 12.5px ui-monospace, Menlo, monospace; }
  nav a { display: block; padding: 2px 0; color: var(--ink); text-decoration: none; }
  nav a:hover { color: var(--accent); }
  section { margin-bottom: 44px; break-inside: avoid-page; }
  h2 { font: 600 20px ui-monospace, Menlo, monospace; margin: 0 0 4px; padding-top: 8px; border-top: 1px solid var(--rule); }
  h2 small { color: var(--muted); font-weight: 400; }
  .lead { margin: 4px 0 12px; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--ink); padding: 6px 8px; }
  td { border-bottom: 1px solid var(--rule); padding: 6px 8px; vertical-align: top; }
  td.n { color: var(--muted); width: 28px; }
  .code { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; white-space: nowrap; }
  .pk { font-weight: 700; }
  .k { display: inline-block; font: 700 10px ui-monospace, monospace; padding: 1px 5px; border-radius: 4px; }
  .k.pk { background: #fff4d6; color: #92400e; } .k.fk { background: #e0f1ee; color: #0f766e; } .k.uk { background: #f3e8ff; color: #6b21a8; }
  dl { display: grid; grid-template-columns: 170px 1fr; gap: 6px 16px; margin: 12px 0 0; font-size: 13px; }
  dt { color: var(--muted); } dd { margin: 0; } code { font-size: 12.5px; }
  a { color: var(--accent); } .muted { color: var(--muted); }
  pre { background: var(--soft); border-radius: 8px; padding: 12px 14px; font: 12.5px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; }
  h3.obj { font: 600 15px ui-monospace, Menlo, monospace; margin: 18px 0 4px; }
  footer { margin-top: 48px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--rule); padding-top: 12px; }
  @media print { .wrap { padding: 0; } nav { display: none; } a { color: inherit; text-decoration: none; } }
</style>
</head>
<body><div class="wrap">
  <header>
    <p>${tr('doc.title')} · Oracle Database</p>
    <h1>${esc(model.name)}</h1>
    <div class="stats"><span><b>${model.tables.length}</b>${tr('p.stat.tables')}</span><span><b>${cols}</b>${tr('p.stat.cols')}</span><span><b>${model.fks.length}</b>${tr('p.stat.fks')}</span></div>
  </header>
  <nav>${items.map(({ tb }) => `<a href="#${anchor(tb.name)}">${esc(tb.name)}</a>`).join('')}</nav>
  ${items.map(section).join('')}
  ${(model.views || []).length ? `<section><h2>VIEWS</h2>${model.views.map(v => `<h3 id="${anchor(v.name)}" class="obj">${esc(v.name)}</h3>${v.comment ? `<p class="lead">${esc(v.comment)}</p>` : ''}<pre>${esc(v.sql)}</pre>`).join('')}</section>` : ''}
  ${(model.sequences || []).length ? `<section><h2>SEQUENCES</h2><table><thead><tr><th>${tr('p.name')}</th><th>START</th><th>INCREMENT</th><th>MIN / MAX</th><th>CACHE</th><th>CYCLE</th></tr></thead><tbody>${model.sequences.map(q => `<tr><td class="code">${esc(q.name)}</td><td>${esc(q.start)}</td><td>${esc(q.increment)}</td><td>${esc(q.minvalue || '—')} / ${esc(q.maxvalue || '—')}</td><td>${+q.cache > 1 ? esc(q.cache) : 'NOCACHE'}</td><td>${q.cycle ? 'CYCLE' : ''}</td></tr>`).join('')}</tbody></table></section>` : ''}
  <footer>${tr('ddl.header')} · ${date}</footer>
</div></body>
</html>`;
}

export function dictionaryMarkdown(model) {
  const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines = [`# ${model.name}`, '', `${tr('doc.title')} · ${model.tables.length} ${tr('p.stat.tables')} · ${model.fks.length} ${tr('p.stat.fks')}`, ''];
  for (const { tb, columns, uniques, indexes, outFks, inFks } of describe(model)) {
    lines.push(`## ${tb.schema ? `${tb.schema}.` : ''}${tb.name}`, '');
    if (tb.comment) lines.push(tb.comment, '');
    lines.push(`| # | ${tr('doc.column')} | ${tr('doc.type')} | ${tr('doc.null')} | ${tr('doc.default')} | ${tr('doc.keys')} | ${tr('doc.comment')} |`, '|---|---|---|---|---|---|---|');
    for (const { n, c, keys, ref } of columns) {
      lines.push(`| ${n} | \`${cell(c.name)}\` | \`${cell(c.type)}\` | ${c.pk || !c.nullable ? 'NOT NULL' : ''} | ${c.identity ? 'IDENTITY' : cell(c.default)} | ${keys.join(', ')}${ref ? ` → ${ref}` : ''} | ${cell(c.comment)} |`);
    }
    lines.push('');
    uniques.forEach(u => lines.push(`- ${tr('p.uniques')}: \`${u.name}\` (${u.cols.join(', ')})`));
    indexes.forEach(ix => lines.push(`- ${tr('p.indexes')}: \`${ix.name}\`${ix.unique ? ' UNIQUE' : ''} (${ix.cols.join(', ')})`));
    (tb.checks || []).forEach(k => lines.push(`- CHECK \`${k.name}\`: \`${k.expr}\``));
    if (tb.partition?.type) lines.push(`- PARTITION BY ${tb.partition.type} (${tb.partition.columns})`);
    outFks.forEach(f => lines.push(`- ${tr('doc.refs')}: \`${f.name}\` ${f.cols.join(', ')} → ${f.parent} (${f.pcols.join(', ')})${f.onDelete ? ` ON DELETE ${f.onDelete}` : ''}`));
    if (inFks.length) lines.push(`- ${tr('doc.refBy')}: ${inFks.map(f => f.child).join(', ')}`);
    lines.push('');
  }
  if ((model.views || []).length) {
    lines.push('## Views', '');
    model.views.forEach(v => lines.push(`### ${v.name}`, '', ...(v.comment ? [v.comment, ''] : []), '```sql', v.sql, '```', ''));
  }
  if ((model.sequences || []).length) {
    lines.push('## Sequences', '', '| Name | Start | Increment | Cache | Cycle |', '|---|---|---|---|---|');
    model.sequences.forEach(q => lines.push(`| \`${q.name}\` | ${q.start} | ${q.increment} | ${+q.cache > 1 ? q.cache : 'NOCACHE'} | ${q.cycle ? 'CYCLE' : ''} |`));
    lines.push('');
  }
  return lines.join('\n');
}
