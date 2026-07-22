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

  function labelInterface() {
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
  labelInterface();
  window.addEventListener('scroll', updateNav, { passive: true });

  const observer = new MutationObserver(labelInterface);
  observer.observe(document.body, { childList: true, subtree: true });
})();
