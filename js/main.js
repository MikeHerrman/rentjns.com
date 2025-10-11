// js/main.js
import { initNav } from './nav.js';

// mark the current page in both the desktop nav and the mobile drawer
function markActiveLinks() {
  // normalize current path: '/' -> '/index.html'
  const current = (() => {
    const p = location.pathname.replace(/\/+$/, '');
    return p === '' || p === '/' ? '/index.html' : p;
  })();

  const normalize = (href) =>
    new URL(href, location.origin).pathname.replace(/\/+$/, '') || '/index.html';

  const links = document.querySelectorAll('.site-nav a.nav-item, .nav-drawer a.nav-item');

  links.forEach((a) => {
    const target = normalize(a.getAttribute('href') || '');
    if (target === current) a.classList.add('is-active');
  });
}

function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  initNav();
  markActiveLinks();
});
