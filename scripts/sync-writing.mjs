#!/usr/bin/env node
// Regenerates the auto-generated regions of writing/index.html (the piece
// cards, the JSON-LD hasPart list, and the count-dependent blurbs) from the
// live EPRIS Journal content API. Run on a schedule via
// .github/workflows/sync-writing.yml so new articles/reviews by Viacheslav
// Munister show up here without a manual edit — the API itself doesn't allow
// this origin to fetch it client-side (CORS is locked to eprisjournal.com),
// so the sync has to happen server-side, at build time, not in the browser.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'writing', 'index.html');
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

  const articles = (data.articles || [])
    .filter((a) => a.author === AUTHOR)
    .map((a) => ({
      kind: 'article',
      id: a.id,
      title: a.title,
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
    .filter((r) => r.author === AUTHOR)
    .map((r) => ({
      kind: 'review',
      id: r.id,
      title: r.title,
      slug: generateSlug(r.title) || String(r.id),
      date: r.date,
      sortDate: new Date(r.date).getTime() || 0,
      category: r.category || '',
      tags: [],
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
    author: { '@type': 'Person', name: AUTHOR, url: 'https://munister.com.ua/' },
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
        <p class="mono kicker">${escapeHtml(p.category)}${p.category ? ' · ' : ''}${escapeHtml(p.date)}</p>
        <h2>${escapeHtml(p.title)}</h2>
        <p class="abstract">${escapeHtml(p.abstract)}</p>
        ${tagsHtml}
        <div class="byline">
          <span class="mono who">By ${AUTHOR} · ${escapeHtml(p.role)}</span>
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
}

main().catch((e) => {
  console.error('[sync-writing] failed:', e.message);
  process.exit(1);
});
