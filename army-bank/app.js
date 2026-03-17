// Army Bank landing
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Active nav
function setActiveNav() {
  const hash = window.location.hash || '#top';
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === hash));
}
window.addEventListener('hashchange', setActiveNav);
setActiveNav();

// Smooth scroll
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.pushState(null, '', id);
    setActiveNav();
  });
});
