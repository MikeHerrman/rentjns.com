/* =====================================================
   local.js — JSON-driven render + accordion + filtering
   ===================================================== */

const DATA_URL = '/assets/data/local.json';

/* -----------------------------------------------------
   1) Helpers
   ----------------------------------------------------- */

function escapeHtml(str = '') {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function safeUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(String(raw), window.location.origin);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
}

function buildItemHTML(item) {
  const name = escapeHtml(item.name);
  const desc = escapeHtml(item.desc);
  const town = escapeHtml(item.town || 'Other');
  const url = safeUrl(item.url);

  const nameMarkup = url
    ? `<a href="${url}" class="local-item__name" target="_blank" rel="noreferrer">${name}</a>`
    : `<span class="local-item__name">${name}</span>`;

  return `
    <li class="local-item" data-town="${town}">
      <div class="local-item__main">
        <div class="local-item__content">
          ${nameMarkup}
          <p class="local-item__text">${desc}</p>
        </div>
      </div>
      <div class="local-item__meta">
        <span class="badge badge--town">${town}</span>
      </div>
    </li>
  `.trim();
}

function setListHTML(listEl, items = []) {
  if (!listEl) return;
  listEl.innerHTML = items.map(buildItemHTML).join('');
}

/* -----------------------------------------------------
   2) Render from JSON
   ----------------------------------------------------- */

async function renderFromJSON() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (${res.status})`);
  const data = await res.json();

  // Food (two sublists)
  setListHTML(document.getElementById('local-food-all'), data.food?.allAges || []);
  setListHTML(document.getElementById('local-food-21'), data.food?.adults21 || []);

  // Shops + Activities
  setListHTML(document.getElementById('local-shops'), data.shops || []);
  setListHTML(document.getElementById('local-activities'), data.activities || []);
}

/* -----------------------------------------------------
   3) Accordion (single open)
   ----------------------------------------------------- */

function setupAccordion() {
  const accordionRoot = document.querySelector('[data-accordion]');
  const sections = accordionRoot ? accordionRoot.querySelectorAll('.local-section') : [];

  if (!accordionRoot || !sections.length) return;

  sections.forEach((section) => {
    const header = section.querySelector('.local-section__header');
    const body = section.querySelector('.local-section__body');

    if (!header || !body) return;

    header.addEventListener('click', () => {
      const isOpen = section.classList.contains('is-open');

      sections.forEach((s) => {
        const h = s.querySelector('.local-section__header');
        const b = s.querySelector('.local-section__body');
        const c = s.querySelector('.local-section__chevron');
        if (!h || !b) return;

        s.classList.remove('is-open');
        h.setAttribute('aria-expanded', 'false');
        b.hidden = true;
        if (c) c.textContent = '▸';
      });

      if (!isOpen) {
        section.classList.add('is-open');
        header.setAttribute('aria-expanded', 'true');
        body.hidden = false;

        const c = section.querySelector('.local-section__chevron');
        if (c) c.textContent = '▾';
      }
    });
  });

  // Normalize initial state
  sections.forEach((section) => {
    const body = section.querySelector('.local-section__body');
    const header = section.querySelector('.local-section__header');
    const chevron = section.querySelector('.local-section__chevron');
    if (!body || !header) return;

    if (section.classList.contains('is-open')) {
      header.setAttribute('aria-expanded', 'true');
      body.hidden = false;
      if (chevron) chevron.textContent = '▾';
    } else {
      header.setAttribute('aria-expanded', 'false');
      body.hidden = true;
      if (chevron) chevron.textContent = '▸';
    }
  });
}

/* -----------------------------------------------------
   4) Filtering
   ----------------------------------------------------- */

function filterByTown(value) {
  const accordionRoot = document.querySelector('[data-accordion]');
  const sections = accordionRoot ? accordionRoot.querySelectorAll('.local-section') : [];
  const resetBtn = document.getElementById('reset-town-filter');

  if (!sections.length) return;

  // Reset button visibility
  if (resetBtn) resetBtn.style.display = value === 'all' ? 'none' : 'inline-flex';

  sections.forEach((section) => {
    const emptyNote = section.querySelector('.local-empty-note');
    let totalVisible = 0;

    // For every local-list inside the section (food has 2 lists)
    const lists = section.querySelectorAll('.local-list');
    lists.forEach((list) => {
      const items = list.querySelectorAll('.local-item');
      items.forEach((item) => {
        const town = (item.dataset.town || '').trim();
        const match = value === 'all' || town === value;
        item.style.display = match ? '' : 'none';
        if (match) totalVisible++;
      });
    });

    if (emptyNote) emptyNote.hidden = totalVisible !== 0;
  });
}

/* -----------------------------------------------------
   5) Boot
   ----------------------------------------------------- */

async function init() {
  try {
    await renderFromJSON();
  } catch (err) {
    console.warn('[local.js] JSON render failed:', err);
    // If JSON fails, still allow accordion/filter to exist without crashing.
  }

  setupAccordion();

  const townFilter = document.getElementById('town-filter');
  const resetBtn = document.getElementById('reset-town-filter');

  if (townFilter) {
    townFilter.addEventListener('change', (e) => filterByTown(e.target.value));
  }

  if (resetBtn && townFilter) {
    resetBtn.addEventListener('click', () => {
      townFilter.value = 'all';
      filterByTown('all');
      resetBtn.style.display = 'none';
    });
  }

  // Initial filter
  filterByTown('all');
}

init();
