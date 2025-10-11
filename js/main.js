// js/main.js
import { initNav } from './nav.js';

function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  initNav();
});
