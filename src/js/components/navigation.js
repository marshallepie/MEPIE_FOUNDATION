/**
 * Mobile Navigation Toggle
 * MEPIE Foundation
 */

export function initNavigation() {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const body = document.body;

  if (!menuToggle || !mobileNav) return;

  // Toggle mobile menu
  menuToggle.addEventListener('click', () => {
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';

    menuToggle.setAttribute('aria-expanded', !isExpanded);
    mobileNav.classList.toggle('active');

    // Prevent body scroll when menu is open
    if (!isExpanded) {
      body.style.overflow = 'hidden';
    } else {
      body.style.overflow = '';
    }
  });

  // Close mobile menu when clicking a link
  const mobileLinks = mobileNav.querySelectorAll('a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileNav.classList.remove('active');
      body.style.overflow = '';
    });
  });

  // Close mobile menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileNav.classList.remove('active');
      body.style.overflow = '';
    }
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (mobileNav.classList.contains('active') &&
        !mobileNav.contains(e.target) &&
        !menuToggle.contains(e.target)) {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileNav.classList.remove('active');
      body.style.overflow = '';
    }
  });

  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth >= 1024 && mobileNav.classList.contains('active')) {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('active');
        body.style.overflow = '';
      }
    }, 250);
  });
}
