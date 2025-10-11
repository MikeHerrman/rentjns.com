// js/nav.js
export function initNav() {
  const cb = document.getElementById('navcheck');
  const btn = document.querySelector('label[for="navcheck"].nav-toggle');
  const drawer = document.getElementById('nav-drawer');
  const overlay = document.querySelector('.nav-overlay');
  const nav = document.querySelector('.nav');
  const navInner = document.querySelector('.nav-inner');

  if (!cb || !btn || !drawer || !overlay || !nav || !navInner) return;

  // Match CSS breakpoint logic (desktop starts at 801px)
  const mqlDesktop = window.matchMedia('(min-width: 801px)');

  let lastFocus = null;

  const getFocusable = () => {
    return drawer.querySelectorAll(
      [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',')
    );
  };

  const lockScroll = (lock) => {
    // Simple and reliable; your CSS has scrollbar-gutter: stable already.
    document.body.style.overflow = lock ? 'hidden' : '';
  };

  const setOpenState = (open) => {
    // Sync checkbox (source of truth for :has() CSS)
    cb.checked = !!open;

    // ARIA & visibility
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.toggleAttribute('aria-hidden', !open);

    // Fallback classes for non-:has() browsers
    nav.classList.toggle('is-open', open);
    navInner.classList.toggle('is-open', open);

    // Scroll lock
    lockScroll(open);

    // Focus management
    if (open) {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const focusables = getFocusable();
      if (focusables.length) {
        // Focus first link/control in the drawer
        focusables[0].focus();
      } else {
        drawer.setAttribute('tabindex', '-1');
        drawer.focus();
      }
    } else {
      // Restore focus to toggle button if we opened from it
      if (lastFocus && document.contains(lastFocus)) {
        lastFocus.focus();
      } else {
        btn.focus();
      }
    }
  };

  const open = () => setOpenState(true);
  const close = () => setOpenState(false);
  const toggle = () => setOpenState(!cb.checked);

  // Initial state (drawer should start hidden)
  setOpenState(false);

  // Wire interactions
  cb.addEventListener('change', () => setOpenState(cb.checked));

  // Overlay click closes
  overlay.addEventListener('click', close);

  // Close on Esc
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cb.checked) {
      e.preventDefault();
      close();
    }
  });

  // Focus trap inside drawer when open
  drawer.addEventListener('keydown', (e) => {
    if (!cb.checked || e.key !== 'Tab') return;

    const focusables = Array.from(getFocusable());
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      // Shift+Tab on first -> wrap to last
      if (active === first || !drawer.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab on last -> wrap to first
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Close drawer when any link inside it is clicked
  drawer.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (a) close();
  });

  // Auto-close if we resize to desktop layout
  const handleMqChange = () => {
    if (mqlDesktop.matches && cb.checked) close();
  };
  mqlDesktop.addEventListener('change', handleMqChange);

  // Optional: allow clicking the label to toggle (checkbox already does this)
  btn.addEventListener('click', (e) => {
    // Prevent double toggles in odd browsers; rely on checkbox change
    e.preventDefault();
    toggle();
  });
}
