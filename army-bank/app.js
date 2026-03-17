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
const sectionIds = ['#top', '#products', '#benefits', '#modules', '#how', '#security', '#architecture', '#faq'];
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

// Лічильники в hero (легка "продакшн" динаміка)
function formatUA(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(0) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

function animateCount(el, target) {
  const start = performance.now();
  const from = 0;
  const dur = 900;
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.floor(from + (target - from) * eased);
    el.textContent = formatUA(val);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterEls = Array.from(document.querySelectorAll('[data-count]'));
if ('IntersectionObserver' in window && counterEls.length) {
  const seen = new WeakSet();
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      if (seen.has(e.target)) return;
      seen.add(e.target);
      const target = Number(e.target.getAttribute('data-count') || '0');
      animateCount(e.target, target);
    });
  }, { threshold: 0.35 });
  counterEls.forEach((el) => cio.observe(el));
} else {
  counterEls.forEach((el) => {
    const target = Number(el.getAttribute('data-count') || '0');
    el.textContent = formatUA(target);
  });
}

