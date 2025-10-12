// /js/rentals.js
const rentals = [
  {
    id: 'coastal',
    name: 'Coastal Cottage',
    img: '/assets/images/rentals/coastal.jpg',
    alt: 'Coastal Cottage exterior by the dunes',
    sleeps: 6,
    beds: 2,
    baths: 1.5,
    sqft: 1020,
    pets: true,
    blurb:
      'Steps from the dunes, this bright, easygoing cottage is set up for simple beach days and low-stress nights. Sleeps six across a king bedroom, queen bedroom, and a comfy queen sleeper. Full kitchen, fast Wi-Fi, smart TV, and a fenced yard for pups (up to 2; small pet fee). Park once and walk to coffee, games at Quinault Casino, and the shoreline for sunset. Great for families or two couples who want quiet mornings and sand-in-your-toes afternoons. No parties; local quiet hours after 10pm.',
  },
  {
    id: 'p2',
    name: 'Property 2',
    img: '/assets/images/rentals/property-2.jpg',
    alt: 'Property 2 exterior near the coast',
    sleeps: 4,
    beds: 2,
    baths: 1,
    sqft: 880,
    pets: false,
    blurb:
      'Cozy and simple—ideal for a small family or two friends. Easy parking, quick drive to the beach, and a bright living space for game nights.',
  },
  {
    id: 'p3',
    name: 'Property 3',
    img: '/assets/images/rentals/property-3.jpg',
    alt: 'Property 3 with deck and trees',
    sleeps: 8,
    beds: 3,
    baths: 2,
    sqft: 1420,
    pets: true,
    blurb:
      'Room for the crew with a big table for meals, a full kitchen, and a deck that catches the evening light. Pet-friendly with a small fee.',
  },
  {
    id: 'p4',
    name: 'Property 4',
    img: '/assets/images/rentals/property-4.jpg',
    alt: 'Property 4 modern interior',
    sleeps: 5,
    beds: 2,
    baths: 1.5,
    sqft: 1100,
    pets: false,
    blurb:
      'Clean lines, quiet street, and a short hop to coffee and the surf shop. Great Wi-Fi for remote work between beach walks.',
  },
];

const $ = (sel, root = document) => root.querySelector(sel);
let listEl, trackEl, prevBtn, nextBtn;

let currentIndex = 0; // Active rental (always the center thumb)
let stepPx = 0; // width of one thumb + gap (computed)
let isAnimating = false; // guard against spam clicks
const DURATION = 320; // ms (must match CSS)

/* ------------ Utilities ------------ */
const mod = (n, m) => ((n % m) + m) % m;

/** Return indices for 5-item strip around center: [i-2, i-1, i, i+1, i+2] */
function stripIndices(center, total) {
  return [-2, -1, 0, 1, 2].map((d) => mod(center + d, total));
}

/** Render the 5-item strip, mark center active */
function renderStrip(center) {
  const idxs = stripIndices(center, rentals.length);
  listEl.innerHTML = idxs
    .map((ri, j) => {
      const r = rentals[ri];
      const role =
        j === 0 ? 'bufferL' : j === 1 ? 'prev' : j === 2 ? 'center' : j === 3 ? 'next' : 'bufferR';
      const active = role === 'center' ? ' is-active' : '';
      const ariaCur = role === 'center' ? ' aria-current="true"' : '';
      return `
        <button class="thumb${active}" data-index="${ri}" data-pos="${role}"${ariaCur}>
          <img src="${r.img}" alt="${r.alt}">
          <span class="thumb-title">${r.name}</span>
        </button>`;
    })
    .join('');
}

/** Load the active rental into the large image + details panel */
function loadActive() {
  const r = rentals[currentIndex];
  const img = $('#rental-image');
  const title = $('#rental-title');
  const blurb = $('#rental-blurb');

  img.src = r.img;
  img.alt = r.alt;

  title.textContent = `${r.name} — ${r.beds}BR / ${r.baths}BA — Sleeps ${r.sleeps} — ${
    r.pets ? 'Pet-friendly' : 'No pets'
  } — ${r.sqft.toLocaleString()} sq ft`;
  $('#stat-sleeps').textContent = r.sleeps;
  $('#stat-beds').textContent = r.beds;
  $('#stat-baths').textContent = r.baths;
  $('#stat-sqft').textContent = r.sqft.toLocaleString();
  $('#stat-pets').textContent = r.pets ? 'Allowed' : 'Not allowed';
  blurb.textContent = r.blurb;
}

/** Measure one step (thumb width + gap) in pixels */
function computeStep() {
  const first = listEl.firstElementChild;
  if (!first) {
    stepPx = 0;
    return;
  }
  const style = getComputedStyle(listEl);
  const gap = parseFloat(style.gap) || 0;
  const w = first.getBoundingClientRect().width;
  stepPx = w + gap;
}

/** Position the strip so the center item is visually centered (offset -1 step) */
function snapToCenter(noTransition = false) {
  if (noTransition) listEl.style.transition = 'none';
  listEl.style.transform = `translateX(${-stepPx}px)`;
  if (noTransition) {
    // force reflow before restoring transition
    void listEl.offsetHeight;
    listEl.style.transition = `transform ${DURATION}ms ease`;
  }
}

/* ------------ Carousel motion ------------ */
function slide(dir, steps = 1) {
  if (isAnimating || !stepPx) return;
  isAnimating = true;

  // target transform: from -1 step (centered) to -2 (next) or 0 (prev), possibly 2 steps
  const target = -stepPx + dir * -steps * stepPx; // dir +1 => -2*step ... ; dir -1 => 0 or +step
  listEl.style.transform = `translateX(${target}px)`;

  const onDone = () => {
    listEl.removeEventListener('transitionend', onDone);
    currentIndex = mod(currentIndex + dir * steps, rentals.length);

    // re-render with new center, recompute step (width may change), snap back to centered without anim
    renderStrip(currentIndex);
    computeStep();
    snapToCenter(true);
    loadActive();
    isAnimating = false;
  };

  listEl.addEventListener('transitionend', onDone, { once: true });
}

/* ------------ Thumbs & arrows interactions ------------ */
function initCarousel() {
  listEl = $('#thumbs-list');
  trackEl = $('.thumbs-track');
  prevBtn = $('.thumbs .prev');
  nextBtn = $('.thumbs .next');

  if (!listEl || !trackEl || !prevBtn || !nextBtn) return;

  // initial render
  renderStrip(currentIndex);
  computeStep();
  // prepare transition
  listEl.style.transition = `transform ${DURATION}ms ease`;
  snapToCenter(true);
  loadActive();

  prevBtn.addEventListener('click', () => slide(-1, 1));
  nextBtn.addEventListener('click', () => slide(+1, 1));

  // Clicking visible left/right thumbs navigates one step; center does nothing
  trackEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.thumb');
    if (!btn) return;
    const pos = btn.getAttribute('data-pos');
    if (pos === 'prev') slide(-1, 1);
    else if (pos === 'next') slide(+1, 1);
    // optional: allow buffer clicks to jump two steps
    else if (pos === 'bufferL') slide(-1, 2);
    else if (pos === 'bufferR') slide(+1, 2);
  });

  // Keep centered on resize (recompute step and snap)
  window.addEventListener('resize', () => {
    computeStep();
    snapToCenter(true);
  });
}

/* ------------ Info panel toggle (unchanged) ------------ */
function initPanelToggle() {
  const primary = document.querySelector('.rentals .primary');
  const btn = document.querySelector('.rentals .info-toggle');
  const panel = document.getElementById('rental-info');
  if (!primary || !btn || !panel) return;

  const open = (setOpen) => {
    primary.classList.toggle('is-open', setOpen);
    btn.setAttribute('aria-expanded', String(setOpen));
    panel.setAttribute('aria-hidden', String(!setOpen));
    if (setOpen) panel.focus();
  };

  btn.addEventListener('click', () => open(!primary.classList.contains('is-open')));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && primary.classList.contains('is-open')) open(false);
  });
}

/* ------------ Boot ------------ */
document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
  initPanelToggle();

  // main image fallback
  const img = document.getElementById('rental-image');
  img?.addEventListener('error', () => {
    img.src = '/assets/images/rentals/placeholder.jpg';
  });
});
