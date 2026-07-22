(function () {
  let nav = null;

  function getNav() {
    nav = document.querySelector('nav');
    return nav;
  }

  function updateNav() {
    const currentNav = getNav();
    if (!currentNav) return;
    currentNav.classList.toggle('is-scrolled', window.scrollY > 48);
  }

  function removeSecondaryShowcases() {
    ['army-bank-mvp', 'italy-showcase', 'experience', 'skills-block'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.remove();
    });
  }

  function removeSkillsNavigation() {
    document.querySelectorAll('nav a[href="#experience"], nav a[href="#skills-block"]').forEach((link) => {
      link.remove();
    });
  }

  function removeHeroModules() {
    const hero = document.querySelector('main > section:first-child');
    const modules = hero?.querySelector('.grid.grid-cols-2');
    if (modules) modules.remove();
  }

  function labelInterface() {
    removeSecondaryShowcases();
    removeSkillsNavigation();
    removeHeroModules();
    const currentNav = getNav();
    if (!currentNav) return;

    const brand = currentNav.querySelector('a[href="#"]');
    if (brand && !brand.querySelector('.personal-brand-main')) {
      brand.dataset.personalBrand = 'true';
      brand.innerHTML = '<span class="personal-brand-main">Munister</span><span class="personal-brand-mark"><em>Personal</em></span>';
      brand.setAttribute('aria-label', 'Viacheslav Munister - home');
    }

    const menuButton = currentNav.querySelector('button.md\\:hidden');
    if (menuButton) {
      menuButton.classList.add('personal-menu-toggle');
      const isOpen = Boolean(currentNav.querySelector(':scope > div + div'));
      menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('personal-menu-open', isOpen);
    }

    currentNav.querySelectorAll('button').forEach((button) => {
      const label = (button.textContent || '').trim().toUpperCase();
      if (label === 'EN' || label === 'UA') {
        button.classList.add('personal-language-toggle');
        button.setAttribute('aria-label', label === 'EN' ? 'Switch language' : 'Змінити мову');
      }
    });

    document.querySelectorAll('#cases .agency-text-card').forEach((card) => {
      card.querySelectorAll('p').forEach((paragraph) => {
        paragraph.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && /full-stack/i.test(node.textContent || '')) {
            node.textContent = (node.textContent || '')
              .replace(/\s*\/\s*FULL-STACK/gi, '')
              .replace(/FULL-STACK\s*\/\s*/gi, '');
          }
        });
      });
    });

    document.querySelectorAll('section').forEach((section, index) => {
      section.dataset.sectionIndex = String(index + 1).padStart(2, '0');
    });
  }

  updateNav();
  removeSecondaryShowcases();
  removeSkillsNavigation();
  removeHeroModules();
  labelInterface();
  window.addEventListener('scroll', updateNav, { passive: true });

  const observer = new MutationObserver(labelInterface);
  observer.observe(document.body, { childList: true, subtree: true });
})();
