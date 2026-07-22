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
    ['army-bank-mvp', 'italy-showcase', 'experience'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.remove();
    });
  }

  function positionSkillsSection() {
    const skills = document.getElementById('skills-block');
    const hero = document.querySelector('main > section:first-child');
    if (skills && hero && skills !== hero.nextElementSibling) {
      hero.after(skills);
    }

    const skillsLink = document.querySelector('nav a[href="#experience"]');
    if (skillsLink) {
      skillsLink.href = '#skills-block';
      skillsLink.textContent = 'Skills';
    }
  }

  function labelInterface() {
    removeSecondaryShowcases();
    positionSkillsSection();
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
      const isOpen = Boolean(currentNav.querySelector(':scope > div + div'));
      menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('personal-menu-open', isOpen);
    }

    document.querySelectorAll('section').forEach((section, index) => {
      section.dataset.sectionIndex = String(index + 1).padStart(2, '0');
    });
  }

  updateNav();
  removeSecondaryShowcases();
  positionSkillsSection();
  labelInterface();
  window.addEventListener('scroll', updateNav, { passive: true });

  const observer = new MutationObserver(labelInterface);
  observer.observe(document.body, { childList: true, subtree: true });
})();
