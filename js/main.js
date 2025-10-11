// js/main.js
import { initNav } from './nav.js';

function normalizePath(pathname) {
  // Trim trailing slashes
  let p = String(pathname || '').replace(/\/+$/, '');
  // Map root to /index.html
  if (p === '' || p === '/') return '/index.html';
  return p;
}

function normalizeHref(href) {
  const url = new URL(href || '', location.origin);
  return normalizePath(url.pathname);
}

// Highlight current page in both desktop nav and mobile drawer
function markActiveLinks() {
  const current = normalizePath(location.pathname);
  const links = document.querySelectorAll('.site-nav a.nav-item, .nav-drawer a.nav-item');

  links.forEach((a) => {
    const target = normalizeHref(a.getAttribute('href'));
    if (target === current) {
      a.classList.add('is-active');
      a.setAttribute('aria-current', 'page');
    }
  });
}

function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function init() {
  setYear();
  initNav();
  markActiveLinks();
}

// Run now if DOM is ready; otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
