/**
 * Main JavaScript Entry Point
 * MEPIE Foundation
 */

import { initNavigation } from './components/navigation.js';
import { initForms } from './components/forms.js';

// Initialize all components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initForms();

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      e.preventDefault();
      const target = document.querySelector(href);

      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        // Update URL without jumping
        history.pushState(null, null, href);

        // Focus the target for accessibility
        target.setAttribute('tabindex', '-1');
        target.focus();
      }
    });
  });

  // Add 'loaded' class to body for CSS animations
  document.body.classList.add('loaded');
});

// Handle external links (open in new tab)
document.addEventListener('DOMContentLoaded', () => {
  const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="mepie-foundation.org"])');
  externalLinks.forEach(link => {
    if (!link.hasAttribute('target')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
});
