#!/usr/bin/env node
// Regenerates the auto-generated regions of writing/index.html (the piece
// cards, the JSON-LD hasPart list, and the count-dependent blurbs) AND the
// homepage's own Writing teaser section (index.html, top 5, newest first)
// from the live EPRIS Journal content API. Run on a schedule via
// .github/workflows/sync-writing.yml so new articles/reviews by Viacheslav
// Munister show up here without a manual edit — the API itself doesn't allow
// this origin to fetch it client-side (CORS is locked to eprisjournal.com),
// so the sync has to happen server-side, at build time, not in the browser.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'writing', 'index.html');
const HOME_FILE = path.join(__dirname, '..', 'index.html');
const HOME_TEASER_COUNT = 5;
const AUTHOR = 'Viacheslav Munister';
const API = 'https://api.eprisjournal.com/content?lang=EN';

// Mirrors EPRIS's own src/App.tsx generateSlug() exactly, so links land on
// the same canonical /article/<slug> and /review/<slug> URLs the journal
// itself generates - not just something that merely looks like a slug.
function generateSlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// The journal credits interviews and studio features to two names joined with
// an ampersand: "Viacheslav Munister & Abbie Downey". The filter below used to
// compare the whole byline against the author name, so every co-credited piece
// silently never reached this page - four of sixteen, including the newest
// interview. Match the parts of the byline, not the byline itself, and keep the
// other names so the card can say who the piece was written with.
function bylineNames(author) {
  return String(author || '')
    .split(/\s*[&,]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}
const isMine = (x) => bylineNames(x.author).includes(AUTHOR);
const coauthorsOf = (x) => bylineNames(x.author).filter((n) => n !== AUTHOR);
const creditLine = (co) => (co.length ? `${AUTHOR} with ${co.join(' and ')}` : AUTHOR);

function firstText(content) {
  const block = (content || []).find((c) => c && c.type === 'text' && c.content);
  return block ? block.content.trim() : '';
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

function resolveImage(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return 'https://eprisjournal.com' + (url.startsWith('/') ? url : '/' + url);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Категории в журнале набраны как попало: «Architecture», «contemporary art»,
// «ARCHITECTURE & DINING» - на странице из шестнадцати карточек эта разница
// читается как небрежность верстки, хотя она пришла из данных. Регистр
// приводится только к показу; в самом журнале ничего не меняется.
// Даты в журнале набраны в четырёх видах сразу: «Sep 7, 2026»,
// «September 8, 2026», «SEP 5, 2026», «Aug 2026». В моношрифтовой строке
// карточки это видно сразу, поэтому дата приводится к одному виду для показа.
// Но только когда в строке действительно есть день: «Aug 2026» это месяц, и
// дорисовать ему первое число значит выдумать дату, которой автор не назвал.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function displayDate(raw) {
  const str = String(raw || '').trim();
  if (!/(?:^|[^0-9])([0-9]{1,2})(?:[^0-9]|$)/.test(str)) return str;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function titleCase(s) {
  return String(s || '').split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' ');
}

// The homepage card line ("Interview · Architecture · Sardinia") used to be
// hand-written per piece - there is no field in the CMS that spells it out,
// so this derives the closest mechanical equivalent: the piece's own kind
// plus, for a review, its subject line; for an article, its first two tags
// (dropping a tag that just repeats "interview").
function homeSubline(p) {
  if (p.kind === 'review') {
    return ['Review', p.subject].filter(Boolean).join(' · ');
  }
  const isInterview = /interview/i.test(p.category);
  const kind = isInterview ? 'Interview' : 'Essay';
  const extras = p.tags.filter((t) => !/^interview$/i.test(t)).slice(0, 2).map(titleCase);
  return [kind, ...extras].join(' · ');
}

const NUM_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
function spellCount(n) {
  return NUM_WORDS[n] || String(n);
}

// Reads the calendar day the string names, not an instant in UTC - Date's own
// .toISOString() on a locally-parsed "Aug 25, 2026" rolls back to the 24th
// on any machine east of UTC, since it re-interprets local midnight in UTC.
function formatIsoDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`content API responded ${res.status}`);
  const data = await res.json();

  // ?lang=EN is the reader-facing feed, but it still hands back drafts and
  // pieces scheduled for later - a personal site pulling every byline match
  // regardless would leak unpublished work (a music-desk draft under this
  // author showed up here this way). Only what a reader could actually open
  // on eprisjournal.com right now qualifies.
  const isLive = (x) => !x.draft && (!x.publishAt || new Date(x.publishAt).getTime() <= Date.now());

  const articles = (data.articles || [])
    .filter((a) => isMine(a) && isLive(a))
    .map((a) => ({
      kind: 'article',
      id: a.id,
      title: a.title,
      coauthors: coauthorsOf(a),
      slug: generateSlug(a.title),
      date: a.date,
      sortDate: new Date(a.date).getTime() || 0,
      category: a.category || '',
      tags: Array.isArray(a.tags) ? a.tags : [],
      role: a.role || 'EPRIS Journal',
      abstract: a.excerpt || truncate(firstText(a.content), 320),
      image: resolveImage(a.imageUrl),
    }));

  const reviews = (data.reviews || [])
    .filter((r) => isMine(r) && isLive(r))
    .map((r) => ({
      kind: 'review',
      id: r.id,
      title: r.title,
      coauthors: coauthorsOf(r),
      slug: generateSlug(r.title) || String(r.id),
      date: r.date,
      sortDate: new Date(r.date).getTime() || 0,
      category: r.category || '',
      tags: [],
      subject: r.subject || '',
      role: r.role || 'EPRIS Journal',
      abstract: r.excerpt || truncate(firstText(r.content), 320),
      image: resolveImage(r.imageUrl),
    }));

  const pieces = [...articles, ...reviews].sort((a, b) => b.sortDate - a.sortDate);

  if (!pieces.length) {
    console.log('No pieces by', AUTHOR, '- leaving writing/index.html untouched.');
    return;
  }

  const html = readFileSync(FILE, 'utf8');

  // ── JSON-LD hasPart ──────────────────────────────────────────────────
  const hasPart = pieces.map((p) => ({
    '@type': p.kind === 'review' ? 'Review' : 'Article',
    headline: p.title,
    datePublished: formatIsoDate(p.date) || undefined,
    author: p.coauthors.length
      ? [{ '@type': 'Person', name: AUTHOR, url: 'https://munister.com.ua/' },
         ...p.coauthors.map((n) => ({ '@type': 'Person', name: n }))]
      : { '@type': 'Person', name: AUTHOR, url: 'https://munister.com.ua/' },
    publisher: { '@type': 'Organization', name: 'EPRIS Journal', url: 'https://eprisjournal.com/' },
    url: `https://eprisjournal.com/${p.kind === 'review' ? 'review' : 'article'}/${p.slug}`,
  }));
  const jsonLdObj = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://munister.com.ua/writing/#page',
    url: 'https://munister.com.ua/writing/',
    name: 'Writing by Viacheslav Munister',
    inLanguage: 'en',
    about: ['Architecture', 'Restoration', 'Cultural heritage', 'Design', 'Visual culture', 'EPRIS digital passport infrastructure'],
    hasPart,
  };
  const jsonLdBlock = `<script type="application/ld+json">\n${JSON.stringify(jsonLdObj, null, 2)}\n</script>`;

  // ── Piece cards ──────────────────────────────────────────────────────
  const piecesHtml = pieces.map((p) => {
    const url = `https://eprisjournal.com/${p.kind === 'review' ? 'review' : 'article'}/${p.slug}`;
    const tagsHtml = p.tags.length
      ? `<div class="tags">${p.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>`
      : '';
    const figure = p.image
      ? `      <figure>\n        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async">\n      </figure>`
      : '';
    return `    <article class="piece">
${figure}
      <div class="body">
        <p class="mono kicker">${escapeHtml(titleCase(p.category))}${p.category ? ' · ' : ''}${escapeHtml(displayDate(p.date))}</p>
        <h2>${escapeHtml(p.title)}</h2>
        <p class="abstract">${escapeHtml(p.abstract)}</p>
        ${tagsHtml}
        <div class="byline">
          <span class="mono who">By ${escapeHtml(creditLine(p.coauthors))} · ${escapeHtml(p.role)}</span>
          <a class="btn" href="${url}" target="_blank" rel="noopener">Read<i class="ext" aria-hidden="true"></i></a>
        </div>
      </div>
    </article>`;
  }).join('\n\n');

  const total = pieces.length;
  const nArticles = articles.length;
  const nReviews = reviews.length;
  const workLine = [
    nArticles ? `${nArticles} article${nArticles === 1 ? '' : 's'}` : null,
    nReviews ? `${nReviews} review${nReviews === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  let out = html;
  out = out.replace(
    /(<!-- AUTO:JSONLD:START -->)[\s\S]*?(<!-- AUTO:JSONLD:END -->)/,
    () => `<!-- AUTO:JSONLD:START -->\n${jsonLdBlock}\n<!-- AUTO:JSONLD:END -->`
  );
  out = out.replace(
    /(<!-- AUTO:INTRO:START -->)[\s\S]*?(<!-- AUTO:INTRO:END -->)/,
    `$1${spellCount(total)} pieces on architecture, restoration and design, published in EPRIS Journal, where I also built and run the editorial platform. The full texts open there.$2`
  );
  out = out.replace(
    /(<!-- AUTO:WORKCOUNT:START -->)[\s\S]*?(<!-- AUTO:WORKCOUNT:END -->)/,
    `$1${total} authored piece${total === 1 ? '' : 's'} in EPRIS Journal<br>${workLine}$2`
  );
  out = out.replace(
    /(<!-- AUTO:HEADCOUNT:START -->)[\s\S]*?(<!-- AUTO:HEADCOUNT:END -->)/,
    `$1${spellCount(total)} pieces$2`
  );
  out = out.replace(
    /(<!-- AUTO:PIECES:START -->)[\s\S]*?(<!-- AUTO:PIECES:END -->)/,
    () => `<!-- AUTO:PIECES:START -->\n\n${piecesHtml}\n\n    <!-- AUTO:PIECES:END -->`
  );

  if (out !== html) {
    writeFileSync(FILE, out);
    console.log(`Synced ${total} piece(s) (${nArticles} article(s), ${nReviews} review(s)).`);
  } else {
    console.log('Already up to date.');
  }

  // ── Homepage teaser (index.html) ────────────────────────────────────────
  // Same source, top N newest - the rest stay one click away on /writing/.
  const homePieces = pieces.slice(0, HOME_TEASER_COUNT);
  const homeCardsHtml = homePieces.map((p) => {
    const url = `https://eprisjournal.com/${p.kind === 'review' ? 'review' : 'article'}/${p.slug}`;
    const img = p.image
      ? `<span class="thumb"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" width="240" height="240" loading="lazy" decoding="async"></span>\n        `
      : '';
    return `      <a href="${url}" target="_blank" rel="noopener">
        ${img}<span class="mono when">${escapeHtml(displayDate(p.date))}</span>
        <div class="body">
          <h3>${escapeHtml(p.title)}</h3>
          <span class="sub mono">${escapeHtml(homeSubline(p))}</span>
        </div>
        <span class="go mono">Read<i class="ext" aria-hidden="true"></i></span>
      </a>`;
  }).join('\n');

  const homeHtml = readFileSync(HOME_FILE, 'utf8');
  let homeOut = homeHtml;
  homeOut = homeOut.replace(
    /(<!-- AUTO:HOME_WRITING_NOTE:START -->)[\s\S]*?(<!-- AUTO:HOME_WRITING_NOTE:END -->)/,
    `$1Essays, criticism and interviews in EPRIS Journal. ${spellCount(total)} piece${total === 1 ? '' : 's'}, newest first.$2`
  );
  homeOut = homeOut.replace(
    /(<!-- AUTO:HOME_WRITING_CARDS:START -->)[\s\S]*?(<!-- AUTO:HOME_WRITING_CARDS:END -->)/,
    () => `<!-- AUTO:HOME_WRITING_CARDS:START -->\n${homeCardsHtml}\n<!-- AUTO:HOME_WRITING_CARDS:END -->`
  );
  homeOut = homeOut.replace(
    /(<!-- AUTO:HOME_WRITING_BUTTON:START -->)[\s\S]*?(<!-- AUTO:HOME_WRITING_BUTTON:END -->)/,
    `$1All ${spellCount(total).toLowerCase()} piece${total === 1 ? '' : 's'}$2`
  );

  if (homeOut !== homeHtml) {
    writeFileSync(HOME_FILE, homeOut);
    console.log(`Synced homepage teaser (${homePieces.length} of ${total} shown).`);
  } else {
    console.log('Homepage teaser already up to date.');
  }
}

main().catch((e) => {
  console.error('[sync-writing] failed:', e.message);
  process.exit(1);
});
