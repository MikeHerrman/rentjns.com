// js/nav.js
export function initNav() {
  const cb = document.getElementById('navcheck');
  const btn = document.querySelector('label[for="navcheck"].nav-toggle');
  const drawer = document.getElementById('nav-drawer');
  const overlay = document.querySelector('.nav-overlay');
  const nav = document.querySelector('.nav');
  const navInner = document.querySelector('.nav-inner');
  const links = drawer ? drawer.querySelectorAll('a') : [];

  if (!cb || !btn || !drawer || !overlay || !nav || !navInner) return;

  const sync = () => {
    const open = cb.checked;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.toggleAttribute('aria-hidden', !open);

    // Body scroll lock while menu open
    document.body.style.overflow = open ? 'hidden' : '';

    // Fallback classes (so we don't rely solely on :has())
    nav.classList.toggle('is-open', open);
    navInner.classList.toggle('is-open', open);
  };

  const close = () => {
    if (cb.checked) {
      cb.checked = false;
      sync();
    }
  };

  cb.addEventListener('change', sync);
  overlay.addEventListener('click', close);
  links.forEach((a) => a.addEventListener('click', close));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cb.checked) {
      e.preventDefault();
      close();
    }
  });

  sync();
}
