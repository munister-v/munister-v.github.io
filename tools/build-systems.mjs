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

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'content', 'systems');
const OUT = path.join(ROOT, 'systems');
const SITE = 'https://munister.com.ua';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Метаданные лежат в начале файла одним JSON-блоком в комментарии. Не YAML:
   в проекте нет ни одной зависимости, и заводить парсер ради восьми полей
   ради красоты синтаксиса — плохая сделка. */
function parseSource(text, file) {
  const m = text.match(/^\s*<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file}: нет блока <!--meta … -->`);
  let meta;
  try { meta = JSON.parse(m[1]); }
  catch (e) { throw new Error(`${file}: метаданные не разобраны — ${e.message}`); }
  for (const field of ['slug', 'title', 'headline', 'standfirst', 'kicker', 'summary', 'facts']) {
    if (!meta[field]) throw new Error(`${file}: не хватает поля «${field}»`);
  }
  return { meta, body: text.slice(m[0].length).trimEnd() };
}

const nav = (here) => ['/#work:Work', '/systems/:Systems', '/research/:Research', '/writing/:Writing', '/#contact:Contact']
  .map((pair) => {
    const i = pair.indexOf(':');
    const href = pair.slice(0, i), label = pair.slice(i + 1);
    return `    <a href="${href}"${href === here ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('\n');

const head = ({ title, description, canonical, image, jsonld }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${canonical}">
<link rel="alternate" hreflang="x-default" href="${canonical}">
<meta name="robots" content="index, follow, max-image-preview:large">

<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#ffffff">

<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="Viacheslav Munister">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}${image}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}${image}">

<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>

<link rel="stylesheet" href="/munister.css?v=14">
<link rel="stylesheet" href="/systems.css?v=2">
</head>
<body>

<a class="skip" href="#main">Skip to content</a>

<header class="site-head">
  <a class="wordmark" href="/">Munister</a>
  <nav aria-label="Main">
${nav('/systems/')}
  </nav>
  <div class="head-right">
    <a href="/cv.html">CV</a>
  </div>
</header>

<main class="site-main" id="main">
<div class="shell">
`;

const foot = `
  <footer class="foot mono">
    <span>© Viacheslav Munister</span>
    <a href="mailto:munister@outlook.com">munister@outlook.com</a>
  </footer>

</div>
</main>

</body>
</html>
`;

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
    description: meta.summary,
    canonical,
    image: meta.image || '/images/og-en.jpg',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: meta.title,
      description: meta.summary,
      author: { '@type': 'Person', name: 'Viacheslav Munister', url: `${SITE}/` },
      publisher: { '@type': 'Person', name: 'Viacheslav Munister' },
      inLanguage: 'en',
      url: canonical,
      isPartOf: { '@type': 'CollectionPage', name: 'Systems', url: `${SITE}/systems/` },
      about: meta.about || [],
    },
  })
    + `
  <div class="sys-head">
    <a class="back mono" href="/systems/">← Systems</a>
    <span class="mono">${esc(meta.kicker)}</span>
    <h1>${meta.headline}</h1>
    <p class="standfirst">${meta.standfirst}</p>
    <div class="sys-facts">
${facts}
    </div>
  </div>

  <div class="sys-body">
${body}
  </div>

  <div class="sys-foot">
    <a class="mono" href="/systems/">← All systems</a>
${meta.visit ? `    <a class="btn btn--solid" href="${meta.visit[1]}" target="_blank" rel="noopener">${esc(meta.visit[0])} ↗</a>` : ''}
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
