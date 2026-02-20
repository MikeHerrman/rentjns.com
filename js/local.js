/* =====================================================
   local.js — accordion + filtering logic
   ===================================================== */

/* -----------------------------------------------------
   1. ELEMENT HOOKS
   ----------------------------------------------------- */

const accordionRoot = document.querySelector('[data-accordion]');
const sections = accordionRoot ? accordionRoot.querySelectorAll('.local-section') : [];
const townFilter = document.getElementById('town-filter');
const resetBtn = document.getElementById('reset-town-filter');

// If something critical is missing, bail out safely
if (!accordionRoot || !sections.length || !townFilter) {
  console.warn('[local.js] Missing accordion root, sections, or town filter.');
}

/* -----------------------------------------------------
   2. SINGLE-OPEN ACCORDION (default: Food open)
   ----------------------------------------------------- */

sections.forEach((section) => {
  const header = section.querySelector('.local-section__header');
  const body = section.querySelector('.local-section__body');

  if (!header || !body) return;

  header.addEventListener('click', () => {
    const isOpen = section.classList.contains('is-open');

    // Collapse all
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

    // Re-open if it was previously closed
    if (!isOpen) {
      section.classList.add('is-open');
      header.setAttribute('aria-expanded', 'true');
      body.hidden = false;

      const c = section.querySelector('.local-section__chevron');
      if (c) c.textContent = '▾';
    }
  });
});

/* -----------------------------------------------------
   3. FILTERING RECOMMENDATIONS BY TOWN
   ----------------------------------------------------- */

function filterByTown(value) {
  if (!sections.length) return;

  // Auto-hide / show Reset button
  if (value === 'all') {
    resetBtn.style.display = 'none';
  } else {
    resetBtn.style.display = 'inline-flex';
  }

  sections.forEach((section) => {
    const lists = section.querySelectorAll('.local-list');
    const emptyNote = section.querySelector('.local-empty-note');

    let totalVisible = 0;

    // FOOD SECTION (two sub-lists: all ages + 21+)
    if (section.dataset.section === 'food') {
      lists.forEach((list) => {
        const items = list.querySelectorAll('.local-item');

        items.forEach((item) => {
          const town = (item.dataset.town || '').trim();
          const match = value === 'all' || town === value;

          // Explicitly control display instead of using [hidden]
          item.style.display = match ? '' : 'none';
          if (match) totalVisible++;
        });
      });

      if (emptyNote) {
        emptyNote.hidden = totalVisible !== 0;
      }
    }

    // SHOPS + ACTIVITIES (single list)
    else {
      const items = section.querySelectorAll('.local-item');
      let visible = 0;

      items.forEach((item) => {
        const town = (item.dataset.town || '').trim();
        const match = value === 'all' || town === value;

        item.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      totalVisible = visible;

      if (emptyNote) {
        emptyNote.hidden = totalVisible !== 0;
      }
    }
  });
}

/* -----------------------------------------------------
   4. FILTER SELECT → APPLY
   ----------------------------------------------------- */

if (townFilter) {
  townFilter.addEventListener('change', (e) => {
    filterByTown(e.target.value);
  });
}

/* -----------------------------------------------------
   5. RESET FILTER BUTTON
   ----------------------------------------------------- */

resetBtn.addEventListener('click', () => {
  townFilter.value = 'all';
  filterByTown('all');
  resetBtn.style.display = 'none';
});

/* -----------------------------------------------------
   6. INITIAL LOAD BEHAVIOR
   ----------------------------------------------------- */

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

// Run filter once at startup (default = "all")
filterByTown('all');
