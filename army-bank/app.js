/* ═══════════════════════════════════════════════════════════════
   ARMY BANK — Landing Page JS
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── CURSOR GLOW ─────────────────────────────────────────── */
  const glow = document.getElementById('cursorGlow');
  if (glow && window.matchMedia('(pointer:fine)').matches) {
    let glowX = 0, glowY = 0;
    let targetX = 0, targetY = 0;

    document.addEventListener('mousemove', function (e) {
      targetX = e.clientX;
      targetY = e.clientY;
    }, { passive: true });

    (function animateGlow() {
      glowX += (targetX - glowX) * 0.08;
      glowY += (targetY - glowY) * 0.08;
      glow.style.left = glowX + 'px';
      glow.style.top  = glowY + 'px';
      requestAnimationFrame(animateGlow);
    })();
  }

  /* ─── NAV SCROLL STATE ────────────────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ─── MOBILE MENU ─────────────────────────────────────────── */
  const burger  = document.getElementById('burger');
  const mobMenu = document.getElementById('mobMenu');

  if (burger && mobMenu) {
    burger.addEventListener('click', function () {
      const isOpen = burger.classList.toggle('open');
      mobMenu.classList.toggle('open', isOpen);
      mobMenu.setAttribute('aria-hidden', String(!isOpen));
      burger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu on link click
    mobMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('open');
        mobMenu.classList.remove('open');
        mobMenu.setAttribute('aria-hidden', 'true');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ─── SMOOTH SCROLL ───────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navHeight = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
      if (history.pushState) history.pushState(null, '', id);
    });
  });

  /* ─── SCROLL REVEAL ───────────────────────────────────────── */
  const revealEls = document.querySelectorAll('.rv');
  if (revealEls.length) {
    const revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('vis');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObs.observe(el); });
  }

  /* ─── STAT COUNTERS ───────────────────────────────────────── */
  function formatNumber(n, format) {
    if (format === 'space') {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    return n.toString();
  }

  const statEls = document.querySelectorAll('.stat__val[data-target]');
  if (statEls.length) {
    const statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const format = el.dataset.format || 'plain';

        statObs.unobserve(el);

        if (target === 0) {
          el.textContent = '0';
          return;
        }

        const duration = 1400; // ms
        const startTime = performance.now();

        function tick(now) {
          const elapsed  = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          el.textContent = formatNumber(current, format);
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = formatNumber(target, format);
        }

        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });

    statEls.forEach(function (el) { statObs.observe(el); });
  }

  /* ─── PHONE PARALLAX ON MOUSE ─────────────────────────────── */
  const heroPhone = document.getElementById('heroPhone');
  if (heroPhone && window.matchMedia('(min-width: 1100px) and (pointer:fine)').matches) {
    document.addEventListener('mousemove', function (e) {
      const xRatio = (e.clientX / window.innerWidth - 0.5);
      const yRatio = (e.clientY / window.innerHeight - 0.5);
      const rotY   =  xRatio * 8;
      const rotX   = -yRatio * 6;
      heroPhone.style.transform =
        'rotate(2deg) perspective(900px) rotateY(' + rotY + 'deg) rotateX(' + rotX + 'deg)';
    }, { passive: true });
  }

  /* ─── PROGRESS BAR ANIMATION ──────────────────────────────── */
  const progressFills = document.querySelectorAll('.progress__fill');
  if (progressFills.length) {
    const progressObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetW = el.style.getPropertyValue('--w') || '0%';
          // Start from 0 and animate to target
          el.style.setProperty('--w', '0%');
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              el.style.setProperty('--w', targetW);
            });
          });
          progressObs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    progressFills.forEach(function (el) {
      const w = el.style.getPropertyValue('--w') || el.style.width;
      el.dataset.targetW = w;
      progressObs.observe(el);
    });
  }

  /* ─── BENTO CARD TILT ─────────────────────────────────────── */
  if (window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.bento-card, .doc-card, .sec-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        const rect   = card.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) / (rect.width  / 2);
        const dy     = (e.clientY - cy) / (rect.height / 2);
        const rotX   = -dy * 3;
        const rotY   =  dx * 3;
        card.style.transform = 'translateY(-5px) perspective(800px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ─── NAV ACTIVE LINK ─────────────────────────────────────── */
  const sections = document.querySelectorAll('section[id], div.chapter[id]');
  const navLinks = document.querySelectorAll('.nav__link');

  if (sections.length && navLinks.length) {
    const sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(function (link) {
            const href = link.getAttribute('href').replace('#', '');
            link.style.color = href === id ? 'var(--gold)' : '';
          });
        }
      });
    }, { threshold: 0.4 });

    sections.forEach(function (s) { sectionObs.observe(s); });
  }

  /* ─── MARQUEE PAUSE ON HOVER ──────────────────────────────── */
  const marqueeTrack = document.querySelector('.marquee__track');
  if (marqueeTrack) {
    const marqueeWrap = marqueeTrack.closest('.marquee-wrap');
    if (marqueeWrap) {
      marqueeWrap.addEventListener('mouseenter', function () {
        marqueeTrack.style.animationPlayState = 'paused';
      });
      marqueeWrap.addEventListener('mouseleave', function () {
        marqueeTrack.style.animationPlayState = 'running';
      });
    }
  }

  /* ─── FLOATING BADGES PARALLAX ────────────────────────────── */
  const floatBadges = document.querySelectorAll('.float-badge');
  if (floatBadges.length && window.matchMedia('(pointer:fine)').matches) {
    document.addEventListener('mousemove', function (e) {
      const xRatio = (e.clientX / window.innerWidth  - 0.5);
      const yRatio = (e.clientY / window.innerHeight - 0.5);
      floatBadges.forEach(function (badge, i) {
        const depth = (i + 1) * 6;
        badge.style.transform = 'translate(' + (xRatio * depth) + 'px, ' + (yRatio * depth) + 'px)';
      });
    }, { passive: true });
  }

})();
