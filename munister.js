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
