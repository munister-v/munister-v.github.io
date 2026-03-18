/* Army Bank — Landing v3 */

// ── Cursor Glow ──
const glow = document.getElementById('cursorGlow');
if (glow && window.matchMedia('(pointer:fine)').matches) {
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  }, { passive: true });
}

// ── Scroll Reveal ──
const rvEls = document.querySelectorAll('.rv');
const rvObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('vis'); rvObs.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
rvEls.forEach(el => rvObs.observe(el));

// ── Nav scroll ──
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 30);
}, { passive: true });

// ── Mobile menu ──
const burger = document.getElementById('burger');
const mob = document.getElementById('mobMenu');
if (burger && mob) {
  burger.onclick = () => {
    burger.classList.toggle('open');
    mob.classList.toggle('open');
    document.body.style.overflow = mob.classList.contains('open') ? 'hidden' : '';
  };
  mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('open'); mob.classList.remove('open');
    document.body.style.overflow = '';
  }));
}

// ── Smooth scroll ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.pushState(null, '', id);
  });
});

// ── Stat counters ──
const statEls = document.querySelectorAll('.stat-val[data-to]');
const statObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const to = +el.dataset.to;
    const suffix = el.dataset.suffix || '';
    if (to === 0) { el.textContent = '0' + suffix; statObs.unobserve(el); return; }
    let cur = 0;
    const step = Math.max(1, Math.ceil(to / 25));
    const iv = setInterval(() => {
      cur += step;
      if (cur >= to) { cur = to; clearInterval(iv); }
      el.textContent = cur + suffix;
    }, 35);
    statObs.unobserve(el);
  });
}, { threshold: 0.5 });
statEls.forEach(el => statObs.observe(el));

// ── Phone parallax on mouse ──
const phone = document.querySelector('.phone');
if (phone && window.matchMedia('(min-width:1080px) and (pointer:fine)').matches) {
  document.addEventListener('mousemove', e => {
    const x = (e.clientX / innerWidth - .5) * 10;
    const y = (e.clientY / innerHeight - .5) * 10;
    phone.style.transform = `translateY(-12px) rotate(2deg) perspective(800px) rotateY(${x}deg) rotateX(${-y}deg)`;
  }, { passive: true });
}
