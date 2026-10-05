import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatText, formatHtml } from './typography.mjs';

test('shorter dash with no dangling dash at the start of a line', () => {
  assert.equal(formatText('A room — a home'), 'A room\u00a0– a home');
  assert.equal(formatText('A room – a home'), 'A room\u00a0– a home');
  assert.equal(formatText('2021–2026 · long-form · CC BY 4.0'), '2021–2026 · long-form · CC BY 4.0');
});
test('Ukrainian prepositions and units stay with the next word', () => {
  assert.equal(formatText('У місті та вдома, 20 км', 'uk'), 'У\u00a0місті та\u00a0вдома, 20\u00a0км');
});
test('HTML excludes metadata, URLs, comments, scripts, code and diagrams', () => {
  const html = '<html lang="uk"><head><title>A — B</title></head><body><!-- x — y --><p>У місті — вдома <a href="/x — y">слово</a></p><pre><code>x — y</code></pre><script>const s="x — y";</script><svg><text>x — y</text></svg></body></html>';
  const after = formatHtml(html);
  assert(after.includes('<title>A — B</title>'));
  assert(after.includes('href="/x — y"'));
  assert(after.includes('<!-- x — y -->'));
  assert(after.includes('<pre><code>x — y</code></pre>'));
  assert(after.includes('<script>const s="x — y";</script>'));
  assert(after.includes('<svg><text>x — y</text></svg>'));
  assert(after.includes('У\u00a0місті\u00a0– вдома'));
});
test('formatting is idempotent', () => {
  const once = formatHtml('<html lang="uk"><body><p>У місті — життя та робота.</p></body></html>');
  assert.equal(formatHtml(once), once);
});
