// Run explicitly after editing public editorial pages. Not a runtime rewrite.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { formatHtml } from './typography.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const pages = [
  'index.html', 'uk/index.html', 'research/index.html', 'uk/research/index.html',
  'writing/index.html', 'cv.html', 'uk/cv.html', '404.html',
  'course/index.html', 'course/databases/index.html', 'course/databases/reference/index.html',
  'architectura/index.html', 'architectura/uk/index.html', 'italy/index.html',
  'irpin/index.html', 'irpin/uk/index.html',
  ...['privacy', 'terms', 'licenses', 'support'].flatMap(section => [
    `irpin/${section}/index.html`, `irpin/uk/${section}/index.html`,
  ]),
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let count = 0;
  for (const page of pages) {
    const path = resolve(root, page);
    const before = readFileSync(path, 'utf8');
    const after = formatHtml(before)
      .replace(/munister\.css\?v=52/g, 'munister.css?v=53')
      .replace(/systems\.css\?v=11/g, 'systems.css?v=12')
      .replace(/irpin\.css\?v=9/g, 'irpin.css?v=10')
      .replace(/italy\.css\?v=2/g, 'italy.css?v=3');
    if (after !== before) { writeFileSync(path, after); count++; }
  }
  console.log(`Updated typography and stylesheet versions on ${count} public pages.`);
}
