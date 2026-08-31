/* СХЕМА КАК ДАННЫЕ, А НЕ КАК РИСУНОК.
 *
 * Схемы на этих страницах устроены как рабочее полотно автоматизации: узлы
 * стоят на сетке, связи идут слева направо, вспомогательные инструменты висят
 * под своим узлом на пунктире. Такую картинку можно нарисовать руками в
 * редакторе и вставить картинкой — и через месяц не поправить в ней ни одной
 * подписи, потому что исходник останется в чужом формате, а на странице будет
 * растр.
 *
 * Поэтому схема здесь — это JSON: узлы с координатами в клетках, рёбра между
 * ними, группы, пунктирные инструменты. Отсюда родятся статические SVG прямо
 * в разметку страницы. Не картинка и не рантайм-скрипт, а именно разметка:
 *
 *   — поисковик и читалка видят подписи узлов текстом, а не пикселями;
 *   — схема печатается и масштабируется без второго файла;
 *   — на странице не появляется ни килобайта JavaScript ради картинки;
 *   — правка подписи — это правка строки в JSON и пересборка.
 *
 * Раскладка ручная (клетка узла задаётся автором), а не автоматическая. Это
 * сознательно: автоматический укладчик графа расставляет узлы «правильно» и
 * нечитаемо, а смысл этих схем в том, что порядок слева направо совпадает с
 * порядком рассказа в статье рядом.
 */
import { ICONS, FALLBACK } from './flow-icons.mjs';

/* Шаг сетки и размер плитки. Подобраны так, чтобы между двумя соседними
   узлами оставалось место для стрелки с подписью, а подпись под узлом умещала
   два слова без переноса на середине слова. */
const COL = 160;      // шаг по горизонтали
const ROW = 168;      // шаг по вертикали
const TW = 108;       // ширина плитки
const TH = 76;        // высота плитки
const PAD = 26;       // поле вокруг всей схемы
const LABEL_GAP = 13; // от низа плитки до первой строки подписи
const LINE = 13.5;    // межстрочный шаг подписи
const TOOL_R = 21;    // радиус кружка инструмента
const TOOL_DROP = 116; // от низа плитки до центра кружка инструмента

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* Перенос подписи по словам.
 *
 * Ширина считается не в символах, а в приблизительных единицах ширины буквы:
 * «Wikipedia» и «Illinois» — одинаковые девять символов и очень разная
 * ширина, и на плитке в 116 пикселей эта разница решает, будет перенос или
 * нет. Точные метрики шрифта здесь недоступны и не нужны — достаточно знать,
 * что прописные и «широкие» строчные занимают больше места. */
const WIDE = new Set([...'mwMW@%']);
const NARROW = new Set([...'ilfjt.,:;\'!|()[] ']);
function textWidth(s, size) {
  let u = 0;
  for (const ch of String(s)) {
    if (WIDE.has(ch)) u += 0.92;
    else if (NARROW.has(ch)) u += 0.34;
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) u += 0.68;
    else u += 0.55;
  }
  return u * size;
}
function wrap(text, maxWidth, size, maxLines = 3) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(next, size) > maxWidth) { lines.push(cur); cur = w; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[.,;:]$/, '')}…`;
    return kept;
  }
  return lines;
}

const nodeX = (n) => PAD + n.col * COL;
const nodeY = (n) => PAD + n.row * ROW;
const cx = (n) => nodeX(n) + TW / 2;
const cy = (n) => nodeY(n) + TH / 2;

/* Плитка узла.
 *
 * У запускающего узла левый край скруглён во всю высоту — тот же приём, каким
 * рабочие полотна отличают «отсюда всё начинается» от «сюда пришло по связи».
 * Форма несёт смысл, поэтому её видно и без подписи, и в чёрно-белой печати. */
function tilePath(x, y, kind) {
  const r = 12;
  if (kind === 'trigger') {
    const R = TH / 2;
    return `M ${x + R} ${y} H ${x + TW - r} a ${r} ${r} 0 0 1 ${r} ${r}`
      + ` V ${y + TH - r} a ${r} ${r} 0 0 1 ${-r} ${r} H ${x + R}`
      + ` a ${R} ${R} 0 0 1 0 ${-TH} Z`;
  }
  return `M ${x + r} ${y} H ${x + TW - r} a ${r} ${r} 0 0 1 ${r} ${r}`
    + ` V ${y + TH - r} a ${r} ${r} 0 0 1 ${-r} ${r} H ${x + r}`
    + ` a ${r} ${r} 0 0 1 ${-r} ${-r} V ${y + r} a ${r} ${r} 0 0 1 ${r} ${-r} Z`;
}

function renderIcon(name, x, y, size = 26) {
  const key = ICONS[name] ? name : FALLBACK;
  if (!ICONS[name]) console.warn(`  ! неизвестный значок «${name}» — поставлен квадрат`);
  const s = size / 24;
  return `<g class="fl-ic" fill="none" stroke="#121212" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(${round(x - size / 2)} ${round(y - size / 2)}) scale(${round(s, 4)})">${ICONS[key]}</g>`;
}

const round = (n, p = 2) => Number(n.toFixed(p));

/* ─── связи ────────────────────────────────────────────────────────────────
   Связь выходит из правой грани и входит в левую — направление чтения задаёт
   само полотно, и стрелка нужна только чтобы подтвердить его на развилке.

   Три случая, и все три встречаются в этих схемах:
   1. один ряд — прямая;
   2. разные ряды, цель правее — «ступенька» с двумя скруглениями посередине
      промежутка (ломаная читается как маршрут, кривая Безье — как связь
      «вообще»; здесь важнее маршрут);
   3. цель левее источника — возврат. Он уходит на свободную дорожку под
      схемой и подписывается: в конвейере возврат почти всегда значит повтор,
      и прятать его в клубок линий нельзя. */
function edgePath(a, b, lane) {
  const x1 = nodeX(a) + TW, y1 = cy(a);
  const x2 = nodeX(b), y2 = cy(b);
  const r = 12;

  if (Math.abs(y1 - y2) < 1) return `M ${round(x1)} ${round(y1)} H ${round(x2)}`;

  if (x2 > x1 + 40) {
    const mx = round(x1 + (x2 - x1) / 2);
    const dir = y2 > y1 ? 1 : -1;
    return `M ${round(x1)} ${round(y1)} H ${mx - r}`
      + ` Q ${mx} ${round(y1)} ${mx} ${round(y1 + dir * r)}`
      + ` V ${round(y2 - dir * r)}`
      + ` Q ${mx} ${round(y2)} ${mx + r} ${round(y2)}`
      + ` H ${round(x2)}`;
  }

  // возврат: вниз из источника, по дорожке влево, вверх в левую грань цели
  const outX = round(x1 + 26);
  const inX = round(x2 - 26);
  const ly = round(lane);
  return `M ${round(x1)} ${round(y1)} H ${outX - r}`
    + ` Q ${outX} ${round(y1)} ${outX} ${round(y1 + r)}`
    + ` V ${ly - r} Q ${outX} ${ly} ${outX - r} ${ly}`
    + ` H ${inX + r} Q ${inX} ${ly} ${inX} ${ly - r}`
    + ` V ${round(y2 + r)} Q ${inX} ${round(y2)} ${inX + r} ${round(y2)}`
    + ` H ${round(x2)}`;
}

/* Где поставить подпись ребра. Для прямой — над серединой; для ступеньки —
   над горизонтальным входом в цель, потому что подпись там не наезжает на
   вертикальный участок соседнего ребра. */
/* Где подписать ветку.
 *
 * Подпись принадлежит РАЗВИЛКЕ, а не тому, куда она ведёт: у цели она
 * читается как «что это за узел», а нужно «по какому условию мы сюда
 * свернули». Но все ветки выходят из одной точки, поэтому «рядом с
 * источником» — это одно и то же место для всех, и при трёх ветках подписи
 * складываются в кашу («unchanged», «behind» и «hand-edited» наложились
 * ровно так).
 *
 * Общее у веток — точка выхода; РАЗНОЕ — вертикальный участок, по которому
 * каждая уходит на свой ряд. Подпись ставится вдоль него: у каждой ветки он
 * свой, и столкнуться они не могут по построению. Прямая ветка (тот же ряд)
 * вертикального участка не имеет и подписывается над линией. */
function edgeLabelPos(a, b, lane) {
  const x1 = nodeX(a) + TW, y1 = cy(a);
  const x2 = nodeX(b), y2 = cy(b);
  if (Math.abs(y1 - y2) < 1) return { x: (x1 + x2) / 2, y: y1 - 9, anchor: 'middle' };
  if (x2 > x1 + 40) {
    const mx = x1 + (x2 - x1) / 2;
    return { x: mx + 7, y: (y1 + y2) / 2 + 3, anchor: 'start' };
  }
  return { x: (x1 + x2) / 2, y: lane - 8, anchor: 'middle' };
}

export function renderFlow(flow) {
  const nodes = flow.nodes || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const missing = [];

  const maxCol = Math.max(0, ...nodes.map((n) => n.col));
  const maxRow = Math.max(0, ...nodes.map((n) => n.row));
  const hasTools = nodes.some((n) => Array.isArray(n.tools) && n.tools.length);

  const width = PAD * 2 + maxCol * COL + TW;
  /* Высота: последний ряд плюс место под подписи, а если есть инструменты —
     ещё и под их кружки с подписями. Дорожка возвратов идёт ниже всего. */
  const backEdges = (flow.edges || []).filter((e) => {
    const a = byId.get(e.from), b = byId.get(e.to);
    return a && b && nodeX(b) <= nodeX(a) + 40 && Math.abs(cy(a) - cy(b)) >= 1;
  });
  const contentBottom = PAD + maxRow * ROW + TH + (hasTools ? TOOL_DROP + TOOL_R + 34 : 58);
  void hasTools;
  const lane = contentBottom + 16;
  const height = backEdges.length ? lane + 34 : contentBottom + 10;

  const out = [];

  // ── группы: рамка вокруг набора узлов, подпись на верхней грани ──────────
  for (const g of flow.groups || []) {
    const members = (g.nodes || []).map((id) => byId.get(id)).filter(Boolean);
    if (!members.length) continue;
    const pad = g.pad ?? 20;
    const x = Math.min(...members.map(nodeX)) - pad;
    const y = Math.min(...members.map(nodeY)) - pad - 12;
    const w = Math.max(...members.map((n) => nodeX(n) + TW)) + pad - x;
    const h = Math.max(...members.map((n) => nodeY(n) + TH)) + pad - y;
    out.push(`<g class="fl-group"><rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="14" fill="none" stroke="#c9c7c4" stroke-width="1" stroke-dasharray="3 4"/>`
      + `<text class="fl-group-t" x="${round(x + 14)}" y="${round(y + 15)}">${esc(g.label)}</text></g>`);
  }

  /* Порядок слоёв: линии → плитки → подписи линий.
     Подписи рисуются последними намеренно. Пока они шли вместе с линиями,
     плитка узла закрашивала их собой, и «recognised» на схеме читалось как
     «cognised» — обрезанное ровно по краю соседнего узла. Halo под текстом
     (paint-order: stroke) эту беду не лечит: он спасает от линии под буквой,
     но не от непрозрачного прямоугольника поверх. */
  const edgeLabels = [];
  for (const e of flow.edges || []) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) { missing.push(`${e.from} → ${e.to}`); continue; }
    const cls = ['fl-edge', e.kind ? `fl-edge--${e.kind}` : ''].filter(Boolean).join(' ');
    const marker = e.kind === 'fail' ? 'fl-arrow-fail' : 'fl-arrow';
    out.push(`<path class="${cls}" fill="none" stroke="#6e6e6e" stroke-width="1.25" d="${edgePath(a, b, lane)}" marker-end="url(#${marker})"/>`);
    if (e.label) {
      const p = edgeLabelPos(a, b, lane);
      edgeLabels.push(`<text class="fl-elb" x="${round(p.x)}" y="${round(p.y)}" text-anchor="${p.anchor}">${esc(e.label)}</text>`);
    }
  }

  /* Инструменты вешаются под узлом — но «под» здесь значит «ниже всего, что
     стоит в тех же колонках», а не «на TOOL_DROP ниже своей плитки».
     Четыре кружка под узлом шире одной клетки и заезжали на соседний узел
     ряда ниже: первый кружок оказался ровно за плиткой и пропал. */
  const rowsInColumnSpan = (n, halfWidth) => {
    const left = cx(n) - halfWidth, right = cx(n) + halfWidth;
    let maxRow = n.row;
    for (const other of nodes) {
      if (other === n) continue;
      if (nodeX(other) + TW < left || nodeX(other) > right) continue;
      if (other.row > maxRow) maxRow = other.row;
    }
    return maxRow;
  };

  // ── инструменты: пунктир вниз к кружку, как на рабочем полотне ───────────
  for (const n of nodes) {
    const tools = n.tools || [];
    if (!tools.length) continue;
    const span = (tools.length - 1) * 74;
    const startX = cx(n) - span / 2;
    const clearRow = rowsInColumnSpan(n, span / 2 + TOOL_R + 12);
    const ty = PAD + clearRow * ROW + TH + TOOL_DROP;
    tools.forEach((t, i) => {
      const tx = startX + i * 74;
      out.push(`<path class="fl-tool-link" fill="none" stroke="#9a9a9a" stroke-width="1.1" stroke-dasharray="4 4" d="M ${round(cx(n))} ${round(nodeY(n) + TH)} `
        + `C ${round(cx(n))} ${round(ty - 40)} ${round(tx)} ${round(ty - 46)} ${round(tx)} ${round(ty - TOOL_R)}"/>`);
      out.push(`<g class="fl-tool"><circle cx="${round(tx)}" cy="${round(ty)}" r="${TOOL_R}" fill="#ffffff" stroke="#6e6e6e" stroke-width="1.1"/>`
        + renderIcon(t.icon, tx, ty, 19) + `</g>`);
      wrap(t.label, 88, 9.5, 2).forEach((ln, li) => {
        out.push(`<text class="fl-tool-lb" x="${round(tx)}" y="${round(ty + TOOL_R + 13 + li * 11)}">${esc(ln)}</text>`);
      });
    });
  }

  // ── узлы ────────────────────────────────────────────────────────────────
  for (const n of nodes) {
    const x = nodeX(n), y = nodeY(n);
    const cls = ['fl-node', n.kind ? `fl-node--${n.kind}` : ''].filter(Boolean).join(' ');
    out.push(`<g class="${cls}">`);
    /* fill и stroke продублированы атрибутами, хотя всё то же самое есть в CSS.
       Это не избыточность: у SVG заливка по умолчанию — ЧЁРНАЯ, и стоит стилям
       не доехать ((другой домен, выдёргивание схемы в письмо, читалка,
       сохранение страницы одним файлом), как схема превращается в ряд чёрных
       брусков. Класс остаётся и перебивает атрибут там, где стили есть. */
    out.push(`<path class="fl-tile" fill="#ffffff" stroke="#121212" stroke-width="1.25" d="${tilePath(x, y, n.kind)}"/>`);
    out.push(renderIcon(n.icon, cx(n) + (n.kind === 'trigger' ? 8 : 0), cy(n), 26));
    let ly = y + TH + LABEL_GAP;
    for (const ln of wrap(n.label, TW + 34, 11.5, 2)) {
      out.push(`<text class="fl-lb" x="${round(cx(n))}" y="${round(ly)}">${esc(ln)}</text>`);
      ly += LINE;
    }
    if (n.sub) {
      for (const ln of wrap(n.sub, TW + 30, 9.5, 2)) {
        out.push(`<text class="fl-sb" x="${round(cx(n))}" y="${round(ly + 1)}">${esc(ln)}</text>`);
        ly += 11;
      }
    }
    out.push('</g>');
  }

  out.push(...edgeLabels);

  if (missing.length) console.warn(`  ! связи в никуда: ${missing.join(', ')}`);
  /* Полоса набора на сайте — 1240. Схема шире неё не помещается на экран и
     уезжает в горизонтальный скролл, то есть читатель видит её кусками и
     теряет ровно то, ради чего она нарисована, — целое. Ширину лечат не
     масштабом, а раскладкой: перенести хвост на следующий ряд. */
  if (width > 1130) console.warn(`  ! ${round(width)}px в ширину (> 1130): перенеси хвост на следующий ряд`);

  const title = flow.title ? `<title>${esc(flow.title)}</title>` : '';
  const desc = flow.alt ? `<desc>${esc(flow.alt)}</desc>` : '';

  return `<svg class="flow" viewBox="0 0 ${round(width)} ${round(height)}" width="${round(width)}" height="${round(height)}" role="img" xmlns="http://www.w3.org/2000/svg">`
    + title + desc
    + `<defs><marker id="fl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`
    + `<path d="M 0 1.4 L 9 5 L 0 8.6 z"/></marker>`
    + `<marker id="fl-arrow-fail" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`
    + `<path d="M 0 1.4 L 9 5 L 0 8.6 z" fill="#b3261e"/></marker></defs>`
    + out.join('')
    + `</svg>`;
}
