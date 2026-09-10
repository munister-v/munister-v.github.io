#!/usr/bin/env node
/* Сборка интерактивной схемы модели: data/model/<slug>.json → страница
 * systems/<slug>/model/index.html.
 *
 * Зачем отдельная страница, а не ещё одна диаграмма в статье. Схемы в
 * статьях (build-flows.mjs) отвечают на вопрос «что за чем происходит» и
 * читаются подряд, вместе с текстом. Здесь вопрос другой — «из чего это
 * сделано»: шесть таблиц, у каждой свои поля, свой список тех, кому вообще
 * разрешено в неё писать, и свои инварианты. В поток статьи это не ложится:
 * читать такое подряд незачем, туда ходят за конкретной таблицей.
 *
 * Геометрия считается здесь, а не в браузере. Координаты в готовом SVG
 * означают, что страница выглядит одинаково без единой строчки скрипта, и
 * скрипт нужен ровно для одного — показать подробности выбранной таблицы.
 * Схема, которую рисует JS, на медленном соединении сначала пустая, а потом
 * прыгает; посчитанная при сборке — просто есть.
 *
 *   node tools/build-model.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { SITE, esc, head, foot } from './page-shell.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data', 'model');
const OUT = path.join(ROOT, 'systems');

/* Коробка 220 в ширину, высота — по числу полей. Ширина выбрана так, чтобы
   вся схема (четыре колонки) укладывалась в полосу текста на настольном
   экране: иначе она уезжает в горизонтальную прокрутку там, где для этого нет
   никакой причины. Подписи на связях поэтому короткие — мощность связи, как в
   любой ER-диаграмме; словами объясняет панель, а не картинка. */
const W = 220, X0 = 26, GAP = 64;
const HEAD_H = 30, SUB_H = 17, ROW_H = 20, PAD_B = 13, COL_GAP = 46, Y0 = 44;

const colX = (col) => X0 + col * (W + GAP);
const boxH = (e) => HEAD_H + SUB_H + e.fields.length * ROW_H + PAD_B;

/* Обрезка типа поля. Длинные перечисления («import | receipt | sale | …»)
   в коробку не влезают ни при каком кегле, и растягивать под них всю схему
   ради одной строки — плохая сделка: полный текст всё равно показывается в
   панели снизу. */
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function layout(model) {
  const byCol = new Map();
  for (const e of model.entities) {
    if (!byCol.has(e.col)) byCol.set(e.col, []);
    byCol.get(e.col).push(e);
  }
  const pos = new Map();
  let bottom = 0;
  for (const [col, list] of byCol) {
    list.sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
    let y = Y0;
    for (const e of list) {
      const h = boxH(e);
      pos.set(e.id, { x: colX(col), y, w: W, h, col, entity: e });
      y += h + COL_GAP;
      bottom = Math.max(bottom, y - COL_GAP);
    }
  }
  /* Обратная связь (сумма вариантов → зеркало на товаре) идёт под коробками,
     поэтому под ними резервируется полоса. */
  const baseY = bottom + 46;
  const width = X0 * 2 + Math.max(...[...byCol.keys()].map((c) => colX(c) + W)) - X0;
  return { pos, baseY, width: Math.max(width, colX(Math.max(...byCol.keys())) + W + X0), height: baseY + 34 };
}

function edgePath(from, to, kind, baseY) {
  /* Три случая, и все три ортогональные: схема читается как чертёж, а не как
     клубок кривых. */
  if (kind === 'derived') {                      // назад и под коробками
    const sx = from.x + from.w / 2, sy = from.y + from.h;
    const tx = to.x + to.w / 2, ty = to.y + to.h;
    return { d: `M ${sx} ${sy} V ${baseY} H ${tx} V ${ty + 8}`, lx: (sx + tx) / 2, ly: baseY - 9, anchor: 'middle' };
  }
  if (from.col === to.col) {                     // вниз по колонке
    const x = from.x + from.w / 2;
    const sy = from.y + from.h, ty = to.y;
    return { d: `M ${x} ${sy} V ${ty - 8}`, lx: x + 10, ly: (sy + ty) / 2 + 3, anchor: 'start' };
  }
  const sy = from.y + Math.min(from.h / 2, 52);
  const ty = to.y + Math.min(to.h / 2, 52);
  const sx = from.x + from.w, tx = to.x;

  /* Связь через колонку коленом посередине не проведёшь: и вертикаль, и
     вторая горизонталь прошли бы прямо сквозь коробку, которая стоит между
     ними (первый вариант этой схемы так и рисовал стрелку от import item
     насквозь через products). Такая связь идёт своей дорожкой на высоте
     источника и входит в цель снизу — со сдвигом от середины, потому что
     середину нижней грани занимает производная связь. */
  if (to.col - from.col > 1) {
    const lane = from.y + from.h / 2;
    const ex = to.x + to.w * 0.33;
    const below = lane > to.y + to.h;
    const ey = below ? to.y + to.h + 8 : to.y - 8;
    return { d: `M ${sx} ${lane} H ${ex} V ${ey}`, lx: (sx + ex) / 2, ly: lane - 9, anchor: 'middle' };
  }

  const mx = (sx + tx) / 2;                      // соседние колонки: колено посередине
  return { d: `M ${sx} ${sy} H ${mx} V ${ty} H ${tx - 8}`, lx: mx, ly: Math.min(sy, ty) - 10, anchor: 'middle' };
}

function renderSvg(model, L) {
  const parts = [];
  /* role="group", а НЕ role="img".
     Схемы в статьях — картинки, и там role="img" правильный. Здесь внутри
     шесть групп с role="button" и tabindex, а role="img" по спецификации
     делает всё поддерево презентационным: скринридер объявляет одну
     картинку, а шесть кнопок внутри неё либо не объявляет вовсе, либо
     объявляет без имени. Имя даётся через aria-labelledby на <title>/<desc>,
     так что подпись не теряется. */
  parts.push(`<svg class="model" viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}" role="group" aria-labelledby="mTitle mDesc" xmlns="http://www.w3.org/2000/svg">`);
  parts.push(`<title id="mTitle">${esc(model.headline)}</title><desc id="mDesc">${esc(model.alt)}</desc>`);
  parts.push('<defs><marker id="m-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1.6 L 9 5 L 0 8.4 z" fill="rgba(18,18,18,.55)"/></marker></defs>');

  for (const e of model.edges) {                 // связи под коробками
    const a = L.pos.get(e.from), b = L.pos.get(e.to);
    if (!a || !b) throw new Error(`связь ${e.from} → ${e.to}: нет такой таблицы`);
    const p = edgePath(a, b, e.kind, L.baseY);
    const cls = ['m-edge', e.kind ? `m-edge--${e.kind}` : ''].filter(Boolean).join(' ');
    parts.push(`<g class="${cls}" data-from="${e.from}" data-to="${e.to}">`);
    parts.push(`<path d="${p.d}" marker-end="url(#m-tip)"/>`);
    if (e.label) parts.push(`<text class="m-elabel" x="${p.lx}" y="${p.ly}" text-anchor="${p.anchor}">${esc(e.label)}</text>`);
    parts.push('</g>');
  }

  for (const e of model.entities) {
    const b = L.pos.get(e.id);
    parts.push(`<g class="m-ent" data-id="${e.id}" tabindex="0" role="button" aria-expanded="false" aria-controls="mPanel" aria-label="${esc(e.label)}: ${esc(e.name)}">`);
    parts.push(`<rect class="m-box" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2"/>`);
    parts.push(`<rect class="m-bar" x="${b.x}" y="${b.y}" width="${b.w}" height="${HEAD_H}"/>`);
    parts.push(`<text class="m-title" x="${b.x + 13}" y="${b.y + 20}">${esc(e.label)}</text>`);
    parts.push(`<text class="m-sub" x="${b.x + 13}" y="${b.y + HEAD_H + 12}">${esc(e.name)}</text>`);
    e.fields.forEach(([name, type, mark], i) => {
      const y = b.y + HEAD_H + SUB_H + i * ROW_H + 13;
      if (mark === 'counted') parts.push(`<rect class="m-dot m-dot--counted" x="${b.x + 13}" y="${y - 8}" width="7" height="7"/>`);
      else if (mark === 'derived') parts.push(`<rect class="m-dot m-dot--derived" x="${b.x + 13.5}" y="${y - 7.5}" width="6" height="6"/>`);
      else if (mark === 'identity') parts.push(`<circle class="m-dot m-dot--identity" cx="${b.x + 16.5}" cy="${y - 4.5}" r="3.5"/>`);
      parts.push(`<text class="m-field" x="${b.x + 27}" y="${y}">${esc(clip(name, 19))}</text>`);
      parts.push(`<text class="m-type" x="${b.x + b.w - 13}" y="${y}" text-anchor="end">${esc(clip(type, 15))}</text>`);
    });
    parts.push('</g>');
  }
  parts.push('</svg>');
  return parts.join('');
}

function renderPanel(model) {
  /* Ключ инварианта — ссылка в статью, в тот самый абзац, где он выведен.
     Схема отвечает «какая таблица его несёт», статья — «почему он вообще
     такой»; без ссылки читатель ищет это глазами по длинному тексту. */
  const inv = model.invariants.map(([k, st, by]) =>
    `<div class="m-inv-row" data-inv="${k}"><a class="k mono" href="/systems/${model.slug}/#${k.toLowerCase()}">${k}</a><span class="st">${st}</span><span class="by">${by}</span></div>`).join('\n      ');
  const legend = model.legend.map(([k, text]) =>
    `<div class="m-legend-row"><span class="m-key m-key--${k}" aria-hidden="true"></span><b>${esc(k)}</b><span>${text}</span></div>`).join('\n      ');
  return { inv, legend };
}

if (!fs.existsSync(SRC)) { console.error('нет data/model'); process.exit(1); }
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.json')).sort();

for (const file of files) {
  const model = JSON.parse(fs.readFileSync(path.join(SRC, file), 'utf8'));
  const L = layout(model);
  const svg = renderSvg(model, L);
  const { inv, legend } = renderPanel(model);
  const canonical = `${SITE}/systems/${model.slug}/model/`;
  const article = `${SITE}/systems/${model.slug}/`;

  /* Подробности таблиц уезжают в страницу данными, а не разметкой: панель
     рисуется скриптом при выборе. Разметка шести таблиц сразу — это шесть
     блоков, из которых видно один; данные — один блок, который читается
     и без скрипта, если кто-то откроет исходник. */
  const data = JSON.stringify(Object.fromEntries(model.entities.map((e) => [e.id, {
    label: e.label, name: e.name, sub: e.sub, fields: e.fields,
    writers: e.writers, invariants: e.invariants, why: e.why, reads: e.reads,
  }])));

  const page = head({
    title: `${model.title} · Viacheslav Munister`,
    description: model.description,
    canonical,
    image: `/images/works/${model.slug}-og.jpg`,
    styles: ['/model.css?v=3'],
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: model.headline,
      description: model.description,
      author: { '@type': 'Person', name: 'Viacheslav Munister', url: `${SITE}/` },
      publisher: { '@type': 'Person', name: 'Viacheslav Munister' },
      inLanguage: 'en',
      url: canonical,
      isPartOf: { '@type': 'TechArticle', url: article },
    },
    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Munister', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Systems', item: `${SITE}/systems/` },
        { '@type': 'ListItem', position: 3, name: 'Horreum', item: article },
        { '@type': 'ListItem', position: 4, name: 'The model', item: canonical },
      ],
    },
  }) + `
  <div class="sys-head sys-head--model">
    <a class="back mono" href="/systems/${model.slug}/">← ${esc(model.slug === 'horreum' ? 'Horreum' : model.slug)}</a>
    <span class="mono">${esc(model.kicker)}</span>
    <h1>${esc(model.headline)}</h1>
    <p class="standfirst">${model.standfirst}</p>
  </div>

  <div class="m-wrap">
    <figure class="flow-figure m-figure">
      <p class="flow-hint">Scroll sideways →</p>
      <div class="flow-scroll">${svg}</div>
      <figcaption>
        <p>Pick a table to read its fields, the list of everything allowed to write it, and the invariants it carries. ${esc(model.note)}</p>
        <span class="mono">The model</span>
      </figcaption>
    </figure>

    <div class="m-legend">
      ${legend}
    </div>

    <section class="m-panel" id="mPanel" aria-live="polite">
      <div class="m-panel-empty" id="mEmpty">
        <span class="mono">Nothing selected</span>
        <p>Six tables, and the whole argument of the system is in which of them owns a number. Open one: <a class="m-link" href="#variant">the variant</a> is the only quantity anybody counted, <a class="m-link" href="#movement">the movement</a> is the account of why it changed, and <a class="m-link" href="#product">the product</a> carries a total it is not allowed to type.</p>
      </div>
      <div class="m-panel-body" id="mBody" hidden></div>
    </section>

    <div class="inv m-inv">
      <div class="inv-cap"><b>Invariants</b><span class="mono">what holds, and what holds it</span></div>
      ${inv}
    </div>
  </div>

  <div class="sys-foot">
    <a class="mono" href="/systems/${model.slug}/">← Back to the write-up</a>
  </div>

<script type="application/json" id="mData">${data.replace(/</g, '\\u003c')}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('mData').textContent);
  var svg = document.querySelector('svg.model');
  var body = document.getElementById('mBody');
  var empty = document.getElementById('mEmpty');
  var current = null;

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* Подсветка ставится на сам SVG, а не на каждый элемент: одно место, где
     она включается, и одно, где выключается. */
  function paint(id) {
    svg.querySelectorAll('.is-on').forEach(function (el) { el.classList.remove('is-on'); });
    svg.classList.toggle('has-sel', !!id);
    if (!id) return;
    var g = svg.querySelector('.m-ent[data-id="' + id + '"]');
    if (g) g.classList.add('is-on');
    svg.querySelectorAll('.m-edge').forEach(function (e) {
      if (e.dataset.from === id || e.dataset.to === id) e.classList.add('is-on');
    });
    document.querySelectorAll('.m-inv-row').forEach(function (r) {
      r.classList.toggle('is-on', (data[id].invariants || []).indexOf(r.dataset.inv) > -1);
    });
  }

  function show(id) {
    var e = data[id];
    if (!e) return;
    current = id;
    var rows = e.fields.map(function (f) {
      var mark = f[2] ? ' m-f--' + f[2] : '';
      return '<div class="m-f' + mark + '"><code>' + esc(f[0]) + '</code><span class="ty">' + esc(f[1]) + '</span></div>';
    }).join('');
    var writers = e.writers.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('');
    body.innerHTML =
      '<div class="m-panel-head">' +
        '<div><span class="mono">' + esc(e.name) + '</span>' +
        '<h2 id="mHead" tabindex="-1">' + esc(e.label) + '</h2>' +
        '<p class="m-sub-t">' + esc(e.sub) + '</p></div>' +
        '<button class="m-close mono" type="button" data-close="1" aria-label="Close the table details">close</button>' +
      '</div>' +
      '<div class="m-cols">' +
        '<div class="m-col"><span class="mono">Fields</span>' + rows + '</div>' +
        '<div class="m-col"><span class="mono">Why it is shaped this way</span><p>' + e.why + '</p>' +
          '<span class="mono">Who may write it</span><ul class="m-writers">' + writers + '</ul>' +
          '<span class="mono">What reads it</span><p>' + e.reads + '</p>' +
          '<p class="m-carries mono">Carries ' + (e.invariants.join(', ') || 'no invariant of its own') + '</p>' +
        '</div>' +
      '</div>';
    empty.hidden = true;
    body.hidden = false;
    paint(id);
  }

  function clear() { current = null; body.hidden = true; empty.hidden = false; paint(null); }

  /* Выбранная таблица живёт в адресе страницы.
     Причина не в красоте ссылки: /model/#movement это то, что можно
     прислать человеку и попасть туда, где ты сам стоишь, а статья может
     сослаться прямо на нужную таблицу вместо «откройте схему и найдите».
     Поэтому переключение идёт через hash, а hashchange остаётся
     единственным местом, где панель перерисовывается: назад и вперёд
     в браузере тогда работают сами, без отдельного кода. */
  function fromHash() {
    var id = decodeURIComponent(String(location.hash || '').replace('#', ''));
    return data[id] ? id : null;
  }

  function render(id, focus) {
    if (id) show(id); else clear();
    svg.querySelectorAll('.m-ent').forEach(function (g) {
      g.setAttribute('aria-expanded', String(g.dataset.id === id));
    });
    if (id && focus) {
      var h = document.getElementById('mHead');
      if (h) h.focus({ preventScroll: true });
    }
  }

  function go(id) {
    /* replaceState, а не push: перебор шести таблиц не должен набивать
       историю так, чтобы кнопка «назад» уводила из страницы через шесть
       нажатий. Ссылки-анкоры (пустое состояние, статья) идут обычным путём
       и дают hashchange. */
    var next = id ? '#' + id : location.pathname;
    if (history.replaceState) history.replaceState(null, '', next);
    render(id, true);
  }

  svg.addEventListener('click', function (ev) {
    var g = ev.target.closest('.m-ent');
    go(g && g.dataset.id !== current ? g.dataset.id : null);
  });
  svg.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var g = ev.target.closest('.m-ent');
    if (!g) return;
    ev.preventDefault();
    go(g.dataset.id === current ? null : g.dataset.id);
  });
  document.addEventListener('click', function (ev) {
    var c = ev.target.closest('[data-close]');
    if (!c) return;
    /* Фокус возвращается на ту таблицу, которую закрыли, а не в начало
       страницы: иначе клавиатурный читатель после закрытия оказывается
       неизвестно где и проходит схему заново. Запоминаем до go(null),
       потому что оно обнуляет current. */
    var prev = current;
    go(null);
    var t = prev && svg.querySelector('.m-ent[data-id="' + prev + '"]');
    (t || svg).focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', function () { render(fromHash(), true); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && current) go(null); });

  /* Открыли по ссылке на конкретную таблицу: панель ниже схемы и легенды,
     и без прокрутки читатель увидит пустой экран там, где он ожидал ответ.
     Фокус при этом не забираем: на загрузке это уводит с начала страницы. */
  var initial = fromHash();
  render(initial, false);
  if (initial) {
    var p = document.getElementById('mPanel');
    if (p && p.scrollIntoView) p.scrollIntoView({ block: 'center' });
  }
})();
</script>
` + foot;

  const dir = path.join(OUT, model.slug, 'model');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page);
  console.log(`· systems/${model.slug}/model/  (${model.entities.length} таблиц, ${model.edges.length} связей, ${L.width}×${L.height})`);
}
