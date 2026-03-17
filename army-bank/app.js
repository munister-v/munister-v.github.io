// Digital Army Bank landing interactions
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const $ = (sel) => document.querySelector(sel);

// Active nav highlight
function setActiveNav() {
  const hash = window.location.hash || '#top';
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === hash));
}
window.addEventListener('hashchange', setActiveNav);
setActiveNav();

// Smooth scroll for nav links
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

// Auth form: redirect to /bank (Render app via redirect)
$('#authForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  // GitHub Pages can't proxy API; /bank redirects to Render app where login happens.
  window.location.href = '/bank/';
});

