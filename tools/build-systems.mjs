#!/usr/bin/env node
/* Сборка раздела Systems.
 *
 * Источник статьи — content/systems/<slug>.html: блок метаданных в начале и
 * дальше чистая проза. Всё служебное (голова документа, разметка для
 * поисковиков, шапка, подвал, индекс раздела) собирается здесь.
 *
 * Почему сборщик, а не десять самостоятельных страниц. Шапка сайта, набор
 * ссылок og:, схема JSON-LD и подвал — это сорок пять строк, одинаковых во
 * всех статьях. Скопированные десять раз, они расходятся при первой же правке:
 * появится новый раздел в навигации — и он будет в шести статьях из десяти.
 * Расхождение при этом невидимое, потому что каждая страница по отдельности
 * выглядит правильной.
 *
 * Сгенерированные страницы коммитятся: сайт остаётся статикой, и Pages
 * по-прежнему нечего собирать.
 *
 *   node tools/build-systems.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';
import { SITE, esc, head, foot } from './page-shell.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'content', 'systems');
const OUT = path.join(ROOT, 'systems');
/* Дата фактичної першої публікації розділу — 31.08.2026. Поле modified
   в конкретній статті переб'є цю дату, коли стаття справді буде правитись. */
const PUBLISHED_FALLBACK = '2026-08-31';

/* Метаданные лежат в начале файла одним JSON-блоком в комментарии. Не YAML:
   в проекте нет ни одной зависимости, и заводить парсер ради восьми полей
   ради красоты синтаксиса — плохая сделка. */
function parseSource(text, file) {
  const m = text.match(/^\s*<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file}: нет блока <!--meta … -->`);
  let meta;
  try { meta = JSON.parse(m[1]); }
  catch (e) { throw new Error(`${file}: метаданные не разобраны — ${e.message}`); }
  /* Необов'язкове поле `mark` — знак работы: готовый инлайновый SVG, который
     встаёт над надзаголовком. Знак есть не у каждой работы и не должен
     появляться там, где его нет: сюда попадает ровно то, что написано в
     источнике, без запасного варианта. Подпись рядом берётся из `markLabel`,
     а если его нет — из title. */
  for (const field of ['slug', 'title', 'headline', 'standfirst', 'kicker', 'summary', 'facts']) {
    if (!meta[field]) throw new Error(`${file}: не хватает поля «${field}»`);
  }
  return { meta, body: text.slice(m[0].length).trimEnd() };
}

/* РАЗДЕЛЫ СТАТЬИ — ОТДЕЛЬНЫЕ БЛОКИ, А НЕ ОДНА ПЛОСКАЯ РЕШЁТКА.
 *
 * Раньше вся статья была одной grid-раскладкой: подписи разделов в первой
 * колонке, текст во второй, и подпись держалась на `position: sticky`.
 * Работало это по-разному и оба раза неправильно.
 *
 * Для липкого элемента опорным блоком считается его ячейка сетки — но
 * согласия между браузерами здесь нет. Chrome ограничивает подпись её
 * собственной строкой, и она не прилипает вовсе (проверено: уезжает за
 * верх кадра вместе с текстом). Safari берёт за опору весь контейнер, и
 * тогда прилипают ВСЕ подписи сразу, в одну и ту же точку, — «Why placement
 * is the design» ложится поверх соседней, и читается каша из букв. Именно
 * это и было на присланном скриншоте.
 *
 * Лечится не подбором свойств, а структурой: каждый раздел получает свою
 * обёртку, и опорный блок подписи становится однозначным — её собственный
 * раздел. Подпись едет вместе с текстом раздела и останавливается на его
 * границе, одинаково везде. */
function wrapSections(body) {
  const parts = body.split(/(?=^\s*<h2>)/m).filter((chunk) => chunk.trim());
  return parts
    .map((chunk) => `    <section class="sys-sec">\n${chunk.trimEnd()}\n    </section>`)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(SRC)) { console.error('нет content/systems'); process.exit(1); }
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.html')).sort();
const articles = [];

for (const file of files) {
  const { meta, body } = parseSource(fs.readFileSync(path.join(SRC, file), 'utf8'), file);
  const canonical = `${SITE}/systems/${meta.slug}/`;
  const facts = meta.facts.map(([k, v]) =>
    `      <div><span class="mono">${esc(k)}</span><b>${v}</b></div>`).join('\n');

  const page = head({
    title: `${meta.title} · Viacheslav Munister`,
    description: meta.description || meta.summary,
    canonical,
    image: meta.image || '/images/og-en.jpg',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: meta.title,
      description: meta.description || meta.summary,
      author: { '@type': 'Person', name: 'Viacheslav Munister', url: `${SITE}/` },
      publisher: { '@type': 'Person', name: 'Viacheslav Munister' },
      inLanguage: 'en',
      url: canonical,
      datePublished: meta.published || PUBLISHED_FALLBACK,
      dateModified: meta.modified || meta.published || PUBLISHED_FALLBACK,
      isPartOf: { '@type': 'CollectionPage', name: 'Systems', url: `${SITE}/systems/` },
      about: meta.about || [],
    },
    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Munister', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Systems', item: `${SITE}/systems/` },
        { '@type': 'ListItem', position: 3, name: meta.title, item: canonical },
      ],
    },
  })
    + `
  <div class="sys-head">
    <a class="back mono" href="/systems/">← Systems</a>
${meta.mark ? `    <div class="sys-mark">${meta.mark}<span class="sys-mark-t">${esc(meta.markLabel || meta.title)}</span></div>
` : ''}    <span class="mono">${esc(meta.kicker)}</span>
    <h1>${meta.headline}</h1>
    <p class="standfirst">${meta.standfirst}</p>
${meta.companion ? `    <a class="sys-companion" href="${meta.companion[1]}"><span>${esc(meta.companion[0])}</span><i aria-hidden="true">→</i></a>
` : ''}    <div class="sys-facts">
${facts}
    </div>
  </div>

  <div class="sys-body">
${wrapSections(body)}
  </div>

  <div class="sys-foot">
    <a class="mono" href="/systems/">← All systems</a>
${meta.companion ? `    <a class="btn" href="${meta.companion[1]}">${esc(meta.companion[0])}</a>
` : ''}${meta.visit ? `    <a class="btn btn--solid" href="${meta.visit[1]}" target="_blank" rel="noopener">${esc(meta.visit[0])}<i class="ext" aria-hidden="true"></i></a>` : ''}
  </div>
` + foot;

  const dir = path.join(OUT, meta.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page);
  articles.push(meta);
  console.log(`· systems/${meta.slug}/`);
}

/* Индекс раздела. Порядок задаётся полем order, а не именем файла: список
   читается сверху вниз, и первым должно стоять то, что стоит показать первым. */
articles.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

const rows = articles.map((a) => `      <a href="/systems/${a.slug}/">
        <span class="n">${a.title}</span>
        <span class="r mono">${esc(a.kicker)}</span>
        <span class="w">${a.summary}</span>
        <span class="a mono">→</span>
      </a>`).join('\n');

const index = head({
  title: 'Systems · Viacheslav Munister',
  description: 'Working notes on how each of these systems actually runs: the data model, the pipeline, the failure it was built around, and what it cost to learn.',
  canonical: `${SITE}/systems/`,
  image: '/images/og-en.jpg',
  jsonld: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Systems',
    url: `${SITE}/systems/`,
    description: 'Algorithmic walkthroughs of live systems: data models, pipelines and the failures they were designed around.',
    inLanguage: 'en',
    hasPart: articles.map((a) => ({
      '@type': 'TechArticle', headline: a.title, url: `${SITE}/systems/${a.slug}/`, description: a.summary,
    })),
  },
  breadcrumb: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Munister', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Systems', item: `${SITE}/systems/` },
    ],
  },
}) + `
  <div class="page-head">
    <span class="mono">Munister / Systems</span>
    <h1>Systems</h1>
    <p>Each of these is live, and each is written up the same way: what it is actually for, the shape of the data underneath it, the pipeline drawn step by step, and the thing that went wrong badly enough to change the design. The diagrams are the argument; the prose explains why the arrows go that way.</p>
  </div>

  <div class="sys-list">
${rows}
  </div>
` + foot;

fs.writeFileSync(path.join(OUT, 'index.html'), index);
console.log(`· systems/  (${articles.length} статей)`);

/* Ця збірка пише сторінки статей ЗАНОВО з content/systems/*.html — а джерело
   несе тільки порожні мітки <!-- flow:id --><!-- /flow -->, самі SVG в ньому
   свідомо не лежать (див. build-flows.mjs). Тому одноразово забутий другий
   виклик тут стирав усі схеми з сайту мовчки: сторінка збиралася без жодної
   помилки, просто з порожнім місцем замість кожної діаграми. Викликаємо
   build-flows.mjs самі, останнім кроком, — одна команда лишає репозиторій
   цілим, а не дві команди в правильному порядку, які легко переплутати. */
console.log('');
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-flows.mjs')], { stdio: 'inherit' });
