// Лендінг Цифрового Армійського Банку: взаємодії
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

// Підсвітка активної секції при скролі (коли є nav)
const sectionIds = ['#top', '#benefits', '#modules', '#security', '#architecture', '#faq'];
const sections = sectionIds
  .map((id) => document.querySelector(id))
  .filter(Boolean);

if ('IntersectionObserver' in window && sections.length) {
  const io = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible?.target?.id) return;
    history.replaceState(null, '', `#${visible.target.id}`);
    setActiveNav();
  }, { rootMargin: '-25% 0px -65% 0px', threshold: [0.05, 0.2, 0.35] });

  sections.forEach((s) => io.observe(s));
}

