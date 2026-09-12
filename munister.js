(() => {
  const year = document.getElementById('y');
  if (year) year.textContent = String(new Date().getFullYear());
})();

/* Мобільне меню.
   Кнопка й панель самі по собі описані в CSS (.menu-btn, .site-head.nav-open
   nav); тут лишається тільки перемикання класу та закриття по посиланню,
   Escape і кліку поза шапкою. На сторінках без кнопки (cv.html) блок
   тихо нічого не робить. */
(() => {
  const head = document.querySelector('.site-head');
  const btn = head && head.querySelector('.menu-btn');
  const nav = head && head.querySelector('nav');
  if (!head || !btn || !nav) return;

  const close = () => { head.classList.remove('nav-open'); btn.setAttribute('aria-expanded', 'false'); };
  const open = () => { head.classList.add('nav-open'); btn.setAttribute('aria-expanded', 'true'); };

  btn.addEventListener('click', () => {
    if (head.classList.contains('nav-open')) close(); else open();
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', (e) => {
    if (!head.classList.contains('nav-open') || head.contains(e.target)) return;
    close();
  });
  // Розширений в'юпорт (переворот, зміна розміру вікна) — панель мала лишитись
  // відкритою рівно на телефоні, а не поплисти на десктопній ширині.
  window.matchMedia('(min-width: 761px)').addEventListener('change', (e) => { if (e.matches) close(); });
})();

/* Схеми: тінь праворуч показує, що зображення ширше екрана, і зникає сама,
   коли домальовано до кінця. Ознаку «є ще» дізнаємось з реальних розмірів,
   а не гадаємо по ширині екрана — той самий контейнер на однаковому екрані
   буває і скрольовним, і ні, залежно від того, скільки вузлів у схемі. */
(() => {
  const boxes = [...document.querySelectorAll('.flow-scroll')];
  if (!boxes.length) return;
  const sync = (el) => {
    const can = el.scrollWidth > el.clientWidth + 2;
    el.classList.toggle('can-scroll', can);
    el.classList.toggle('at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };
  boxes.forEach((el) => {
    sync(el);
    el.addEventListener('scroll', () => sync(el), { passive: true });
  });
  window.addEventListener('resize', () => boxes.forEach(sync));
})();

/* Колода работ на первом экране. Порядок карт живёт в data-pos, а не в DOM:
   переставлять узлы на каждой сдаче значило бы терять фокус на карте-ссылке
   и ломать переход по ней. Автосдача идёт только когда первый экран виден и
   вкладка активна (IntersectionObserver + visibilitychange): иначе таймер
   тикает в фоне и читатель возвращается к случайной карте. */
(() => {
  const deck = document.querySelector('[data-deck]');
  if (!deck) return;
  const cards = [...deck.querySelectorAll('.deck-card')];
  if (cards.length < 2) return;
  const counter = document.querySelector('[data-deck-count]');
  const now = document.querySelector('[data-deck-now]');
  const next = deck.querySelector('[data-deck-next]');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad = (n) => String(n).padStart(2, '0');
  let top = 0, timer = 0, visible = true, hovered = false;

  const paint = () => {
    cards.forEach((card, i) => {
      const pos = (i - top + cards.length) % cards.length;
      card.dataset.pos = String(pos);
      // Из стопки читаемой ссылкой остаётся только верхняя карта: остальные
      // лежат под ней и по табу их пропускаем.
      card.tabIndex = pos === 0 ? 0 : -1;
      card.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
    });
    if (counter) counter.textContent = pad(top + 1) + ' / ' + pad(cards.length);
    if (now) now.textContent = cards[top].dataset.title || '';
  };

  const deal = () => {
    const card = cards[top];
    if (calm.matches) { top = (top + 1) % cards.length; paint(); return; }
    card.classList.add('is-dealt');
    // Карта уходит вправо и возвращается в хвост только после анимации,
    // иначе она телепортируется вниз стопки на глазах.
    window.setTimeout(() => {
      top = (top + 1) % cards.length;
      paint();
      card.classList.remove('is-dealt');
    }, 340);
  };

  const stop = () => { if (timer) { window.clearInterval(timer); timer = 0; } };
  const start = () => {
    stop();
    if (calm.matches || !visible || hovered) return;
    timer = window.setInterval(deal, 4200);
  };

  next?.addEventListener('click', () => { deal(); start(); });
  deck.addEventListener('pointerenter', () => { hovered = true; stop(); });
  deck.addEventListener('pointerleave', () => { hovered = false; start(); });
  deck.addEventListener('focusin', () => { hovered = true; stop(); });
  deck.addEventListener('focusout', () => { hovered = false; start(); });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting && !document.hidden;
      start();
    }, { threshold: 0.25 }).observe(deck);
  }
  calm.addEventListener('change', start);

  paint();
  start();
})();

/* Шапка: сжатие при прокрутке, бегущая черта под разделами и подсветка того
   раздела, который сейчас на экране. Черту двигаем трансформом одной
   полоски, а не подчёркиванием у каждой ссылки: так переход между
   разделами читается как движение и не дёргает раскладку текста. */
(() => {
  const head = document.querySelector('.site-head');
  const nav = head?.querySelector('nav');
  if (!head || !nav) return;
  const links = [...nav.querySelectorAll('a')];
  links.forEach((a, i) => a.style.setProperty('--i', String(i)));

  const onScroll = () => head.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const phone = window.matchMedia('(max-width: 760px)');
  const mark = document.createElement('span');
  mark.className = 'nav-mark';
  nav.appendChild(mark);

  let current = null;
  const moveTo = (a) => {
    if (!a || phone.matches) { mark.classList.remove('is-on'); return; }
    const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
    mark.style.width = r.width + 'px';
    mark.style.setProperty('--x', (r.left - n.left) + 'px');
    mark.classList.add('is-on');
  };
  const rest = () => moveTo(current);

  links.forEach((a) => {
    a.addEventListener('pointerenter', () => moveTo(a));
    a.addEventListener('focus', () => moveTo(a));
  });
  nav.addEventListener('pointerleave', rest);
  nav.addEventListener('focusout', rest);
  window.addEventListener('resize', rest);

  // Подсветка раздела: наблюдаем секции, на которые ссылается само меню, а
  // не заранее выписанный список - меню и разметка расходятся первыми.
  const targets = links
    .map((a) => {
      const href = a.getAttribute('href') || '';
      const id = href.startsWith('#') ? href.slice(1) : '';
      const el = id ? document.getElementById(id) : null;
      return el ? { a, el } : null;
    })
    .filter(Boolean);
  links.forEach((a) => {
    // Ссылки на отдельные страницы подсвечиваем по адресу, а не наблюдением.
    const href = a.getAttribute('href') || '';
    if (href.length > 1 && !href.startsWith('#') && location.pathname.startsWith(href)) {
      a.setAttribute('aria-current', 'true');
      current = a;
    }
  });
  if (targets.length && 'IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.intersectionRatio));
      let best = null, top = 0;
      targets.forEach(({ a, el }) => {
        const r = seen.get(el) || 0;
        if (r > top) { top = r; best = a; }
      });
      links.forEach((a) => a.removeAttribute('aria-current'));
      current = best;
      if (best) best.setAttribute('aria-current', 'true');
      rest();
    }, { threshold: [0, .25, .5, .75], rootMargin: '-20% 0px -45% 0px' });
    targets.forEach(({ el }) => io.observe(el));
  }
  rest();
})();

/* Появление блоков при прокрутке. Прятать элементы имеет право только
   скрипт: класс js-reveal ставится здесь, поэтому без JS и в поиске
   страница остаётся полностью видимой, чем бы ни кончилось наблюдение. */
(() => {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...document.querySelectorAll('.feat, .ledger .row, .writing a, .sec-head')];
  if (!items.length) return;
  document.documentElement.classList.add('js-reveal');
  items.forEach((el) => el.classList.add('reveal'));
  // Порядок внутри одной группы даёт лесенку: соседи по родителю получают
  // растущую задержку, но не больше пяти шагов, иначе низ списка заметно
  // отстаёт от прокрутки.
  const seenParents = new Map();
  items.forEach((el) => {
    const k = el.parentElement;
    const n = (seenParents.get(k) || 0);
    seenParents.set(k, n + 1);
    el.style.setProperty('--i', String(Math.min(n, 5)));
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
  // Страховка: то, что уже в кадре при загрузке, показываем сразу, не
  // дожидаясь первой прокрутки.
  requestAnimationFrame(() => {
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) { el.classList.add('is-in'); io.unobserve(el); }
    });
  });
})();
