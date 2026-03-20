/* ════════════════════════════════════════════
   ARMYBANK — Minimal Interactive Features
   Clean & Simple
════════════════════════════════════════════ */

(function() {
  'use strict';

  /* ════════════════════════════════════════════
     SMOOTH SCROLL ANCHOR LINKS
  ════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ════════════════════════════════════════════
     ACTIVE NAV LINK ON SCROLL
  ════════════════════════════════════════════ */
  const observerOptions = {
    threshold: 0.3,
    rootMargin: '-80px 0px -66%'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.nav-links a').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }, observerOptions);

  document.querySelectorAll('section[id]').forEach(section => {
    observer.observe(section);
  });

  /* ════════════════════════════════════════════
     BUTTON INTERACTIONS
  ════════════════════════════════════════════ */
  document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
    btn.addEventListener('click', function(e) {
      // Simple ripple effect
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.className = 'ripple';
      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  });

  /* ════════════════════════════════════════════
     NAVBAR SCROLL EFFECT
  ════════════════════════════════════════════ */
  let lastScrollY = 0;
  const navbar = document.querySelector('.navbar');

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    if (navbar) {
      if (currentScroll > 50) {
        navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
      } else {
        navbar.style.boxShadow = 'none';
      }
    }

    lastScrollY = currentScroll;
  });

  /* ════════════════════════════════════════════
     FAQ ACCORDION
  ════════════════════════════════════════════ */
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', function() {
      // Close other items
      document.querySelectorAll('.faq-item[open]').forEach(openItem => {
        if (openItem !== this) {
          openItem.removeAttribute('open');
        }
      });
    });
  });

  /* ════════════════════════════════════════════
     PAGE LOAD ANIMATION
  ════════════════════════════════════════════ */
  window.addEventListener('load', () => {
    document.body.classList.add('loaded');
  });

  console.log('ArmyBank — Modern financial platform for military');
})();

/* ════════════════════════════════════════════
   STYLES FOR RIPPLE EFFECT
════════════════════════════════════════════ */
const style = document.createElement('style');
style.textContent = `
  .btn-primary,
  .btn-secondary {
    position: relative;
    overflow: hidden;
  }

  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    width: 20px;
    height: 20px;
    margin-top: -10px;
    margin-left: -10px;
    animation: ripple-animation 0.6s ease-out;
    pointer-events: none;
  }

  @keyframes ripple-animation {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(4);
    }
  }

  .nav-links a.active {
    color: white;
  }
`;
document.head.appendChild(style);
