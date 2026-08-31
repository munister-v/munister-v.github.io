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
