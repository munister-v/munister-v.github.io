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
