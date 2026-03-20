/* ════════════════════════════════════════════
   ARMYBANK — app.js
   Portfolio redesign v6
════════════════════════════════════════════ */

(function () {
  'use strict';

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
     FAQ ACCORDION
  ════════════════════════════════════════════ */
  var faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    var trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach(function (other) {
        other.classList.remove('open');
      });

      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

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

  console.log('ArmyBank v1.5.0 — portfolio project by Viacheslav Munister');
})();
