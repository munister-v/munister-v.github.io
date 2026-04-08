/* ════════════════════════════════════════════
   ARMYBANK — app.js
   Portfolio redesign v6
════════════════════════════════════════════ */

(function () {
  'use strict';

  /* На Render / localhost — «Відкрити додаток» веде на цей же хост /app */
  if (/onrender\.com$/i.test(location.hostname) || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    document.querySelectorAll('a[href="https://army-bank.onrender.com"]').forEach(function (a) {
      a.setAttribute('href', '/app');
      a.removeAttribute('target');
      a.removeAttribute('rel');
    });
  }

  /* ════════════════════════════════════════════
     SMOOTH SCROLL
  ════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ════════════════════════════════════════════
     NAV SCROLL SHADOW
  ════════════════════════════════════════════ */
  var navbar = document.getElementById('navbar');

  function updateNav() {
    if (!navbar) return;
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ════════════════════════════════════════════
     COUNT-UP ANIMATION (IntersectionObserver)
  ════════════════════════════════════════════ */
  function animateCount(el, target, duration) {
    var start = 0;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(eased * target);
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(step);
  }

  var countEls = document.querySelectorAll('[data-count]');

  if ('IntersectionObserver' in window && countEls.length > 0) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count'), 10);
          if (!isNaN(target)) {
            animateCount(el, target, 1200);
          }
          countObserver.unobserve(el);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -20px 0px' });

    countEls.forEach(function (el) {
      countObserver.observe(el);
    });
  } else {
    // Fallback: just show the numbers immediately
    countEls.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (!isNaN(target)) el.textContent = target;
    });
  }

  /* ════════════════════════════════════════════
     COPY-TO-CLIPBOARD ON CRED VALUES
  ════════════════════════════════════════════ */
  document.querySelectorAll('.cred-copyable').forEach(function (el) {
    // Inject tooltip element
    var tooltip = document.createElement('span');
    tooltip.className = 'copy-tooltip';
    tooltip.textContent = 'Скопійовано!';
    el.style.position = 'relative';
    el.appendChild(tooltip);

    el.addEventListener('click', function () {
      var value = el.getAttribute('data-copy');
      if (!value) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () {
          showCopied(el);
        }).catch(function () {
          fallbackCopy(value);
          showCopied(el);
        });
      } else {
        fallbackCopy(value);
        showCopied(el);
      }
    });
  });

  function showCopied(el) {
    el.classList.add('copied');
    setTimeout(function () {
      el.classList.remove('copied');
    }, 1600);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  /* ════════════════════════════════════════════
     COUNT-UP: animate big numbers when visible
     (already handled above — no entrance hide)
  ════════════════════════════════════════════ */

  /* ════════ HAMBURGER MENU ════════ */
  var burger = document.querySelector('.nav-burger');
  var mobileNav = document.querySelector('.nav-mobile');
  if (burger && navbar) {
    burger.addEventListener('click', function () {
      var isOpen = navbar.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    // Close on link click
    if (mobileNav) {
      mobileNav.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          navbar.classList.remove('nav-open');
          burger.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* ════════ RENDER WARM-UP PING ════════ */
  // Silently wake up the Render backend when the landing page loads.
  // By the time the visitor clicks "Open platform" (~20-40s later), server is ready.
  setTimeout(function () {
    fetch('https://army-bank.onrender.com/api/health', {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store'
    }).catch(function () { /* silent — cold start in progress */ });
  }, 800); // slight delay so it doesn't compete with page render

  /* ════════ FAQ ACCORDION ════════ */
  document.querySelectorAll('.faq-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      if (!item) return;
      var open = !item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        if (other !== item) {
          other.classList.remove('open');
          var b = other.querySelector('.faq-trigger');
          if (b) b.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  console.log('ArmyBank v1.6.0 — portfolio project by Viacheslav Munister');
})();
