/* Общая оболочка страницы: голова документа, шапка, подвал.
 *
 * Раньше это жило внутри build-systems.mjs, и пока сборщик был один, там ему
 * и было место. Сборщиков стало два — статьи раздела и интерактивная схема
 * модели, — и оболочка немедленно стала тем, ради чего сборщик вообще
 * заводили: сорок пять строк, одинаковых во всех страницах и расходящихся
 * при первой же правке навигации.
 *
 * Поэтому она вынесена сюда целиком, вместе с esc и списком ссылок. У обоих
 * сборщиков остаётся только то, что у них разное: содержимое.
 */

export const SITE = 'https://munister.com.ua';

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* `here` подсвечивает пункт меню. Раздел Systems — общий и для статьи,
   и для схемы модели: схема живёт внутри статьи, а не рядом с ней. */
export const nav = (here) => ['/#work:Work', '/systems/:Systems', '/research/:Research', '/writing/:Writing', '/#contact:Contact']
  .map((pair) => {
    const i = pair.indexOf(':');
    const href = pair.slice(0, i), label = pair.slice(i + 1);
    return `    <a href="${href}"${href === here ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('\n');

/* `styles` — дополнительные таблицы стилей после общих. Схема модели держит
   свои правила в отдельном файле: они не нужны ни одной статье, а тащить их
   в systems.css значит грузить их девять раз из десяти впустую. */
export const head = ({ title, description, canonical, image, jsonld, breadcrumb, styles = [] }) => `<!DOCTYPE html>
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
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}${image}">

<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>
${breadcrumb ? `<script type="application/ld+json">
${JSON.stringify(breadcrumb, null, 2)}
</script>
` : ''}
<link rel="stylesheet" href="/munister.css?v=17">
<link rel="stylesheet" href="/systems.css?v=9">
${styles.map((href) => `<link rel="stylesheet" href="${href}">\n`).join('')}</head>
<body>

<a class="skip" href="#main">Skip to content</a>

<header class="site-head">
  <a class="wordmark" href="/">Munister</a>
  <nav aria-label="Main" id="siteNav">
${nav('/systems/')}
  </nav>
  <div class="head-right">
    <a href="/cv.html">CV</a>
  </div>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="siteNav" aria-label="Menu">
    <svg class="i-open" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    <svg class="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
  </button>
</header>

<main class="site-main" id="main">
<div class="shell">
`;

export const foot = `
  <footer class="foot mono">
    <span>© Viacheslav Munister</span>
    <a href="mailto:munister@outlook.com">munister@outlook.com</a>
  </footer>

</div>
</main>

<script src="/munister.js?v=3" defer></script>
</body>
</html>
`;
