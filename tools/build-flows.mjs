#!/usr/bin/env node
/* Сборка схем: data/flows/<id>.json → готовый SVG внутри страницы.
 *
 * Страница держит только метку места:
 *
 *   <!-- flow:maniagroup-import -->…<!-- /flow -->
 *
 * Между метками лежит сгенерированная разметка, и она коммитится вместе со
 * страницей. Так сайт остаётся тем, чем был, — статикой без сборки: у кого нет
 * Node, тот всё равно откроет и отредактирует страницу, а пересборка нужна
 * только тому, кто правит схему.
 *
 *   node tools/build-flows.mjs          пересобрать всё
 *   node tools/build-flows.mjs --check  ничего не писать, сказать, что устарело
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { renderFlow } from './flow-render.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const FLOW_DIR = path.join(ROOT, 'data', 'flows');
const CHECK = process.argv.includes('--check');

function pages(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) pages(full, found);
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

const targets = [];
for (const dir of ['systems']) {
  const full = path.join(ROOT, dir);
  if (fs.existsSync(full)) targets.push(...pages(full));
}

let written = 0, stale = 0, slots = 0;
const used = new Set();

for (const file of targets) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  after = after.replace(/<!-- flow:([a-z0-9-]+) -->[\s\S]*?<!-- \/flow -->/g, (whole, id) => {
    slots += 1;
    used.add(id);
    const src = path.join(FLOW_DIR, `${id}.json`);
    if (!fs.existsSync(src)) {
      console.warn(`! ${path.relative(ROOT, file)}: нет data/flows/${id}.json`);
      return whole;
    }
    let flow;
    try { flow = JSON.parse(fs.readFileSync(src, 'utf8')); }
    catch (e) { console.warn(`! ${id}.json не разобран: ${e.message}`); return whole; }
    console.log(`· ${id}  (${(flow.nodes || []).length} узлов, ${(flow.edges || []).length} связей)`);
    return `<!-- flow:${id} -->${renderFlow(flow)}<!-- /flow -->`;
  });

  if (after !== before) {
    stale += 1;
    if (!CHECK) { fs.writeFileSync(file, after); written += 1; }
    console.log(`${CHECK ? '≠' : '✎'} ${path.relative(ROOT, file)}`);
  }
}

/* Схема, на которую никто не ссылается, — это почти всегда переименованная и
   забытая страница, а не запас на будущее. Сказать об этом дешевле, чем потом
   искать, почему правка не появилась на сайте. */
if (fs.existsSync(FLOW_DIR)) {
  for (const f of fs.readdirSync(FLOW_DIR)) {
    if (f.endsWith('.json') && !used.has(f.replace(/\.json$/, ''))) {
      console.warn(`! data/flows/${f} не вставлен ни на одну страницу`);
    }
  }
}

console.log(`\n${slots} мест под схемы, ${CHECK ? `${stale} устарело` : `обновлено страниц: ${written}`}`);
if (CHECK && stale) process.exit(1);
