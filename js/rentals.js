// /js/rentals.js
const rentals = [
  {
    id: 'p1',
    name: 'Coastal Cottage',
    img: '/assets/images/rentals/property-1.jpg',
    alt: 'Coastal Cottage exterior by the dunes',
    sleeps: 4,
    beds: 3,
    baths: 1,
    sqft: 1300,
    pets: false,
    blurb:
      'Walkable to the beach, this bright, easygoing cottage is set up for simple beach days and low-stress nights. Sleeps six across a king bedroom, queen bedroom, and a comfy queen sleeper. Full kitchen, fast Wi-Fi, smart TV, and space to sit around to play some games. Park once and walk to coffee, games at Quinault Casino, and the shoreline for sunset. Great for families or two couples who want quiet mornings and sand-in-your-toes afternoons. No parties; local quiet hours after 10pm.',
  },
  {
    id: 'p2',
    name: 'Property 2',
    img: '/assets/images/rentals/property-2.jpg',
    alt: 'Property 2 exterior near the coast',
    sleeps: 0,
    beds: 0,
    baths: 0,
    sqft: 0,
    pets: false,
    blurb: 'Under renovation currently about a block from the coastal cottage',
  },
  {
    id: 'p3',
    name: 'Property 3',
    img: '/assets/images/rentals/property-3.jpg',
    alt: 'Property 3 with deck and trees',
    sleeps: 0,
    beds: 0,
    baths: 0,
    sqft: 0,
    pets: false,
    blurb: 'Home is ready, final touches to open for rental',
  },
  {
    id: 'p4',
    name: 'Property 4',
    img: '/assets/images/rentals/property-4.jpg',
    alt: 'Property 4 RV or Tent Camping',
    sleeps: 5,
    beds: 0,
    baths: 0,
    sqft: 'open lot',
    pets: true,
    blurb:
      'Open lot for RV or tent campers. Small fire pit. Quick drive to the coast and about mile from Quinault Casino. Puppies must remain on a leash.',
  },
];

const $ = (sel, root = document) => root.querySelector(sel);

// DOM refs
let listEl, trackEl, prevBtn, nextBtn;
let primaryEl, infoBtn, infoPanel;

let currentIndex = 0; // active (center) rental index
let stepPx = 0; // width of one thumb + gap
const DURATION = 280; // keep in sync with CSS

const mod = (n, m) => ((n % m) + m) % m;

// Render a 5-card strip: [bufferL, prev, center, next, bufferR]
const stripIndices = (center, total) => [-2, -1, 0, 1, 2].map((d) => mod(center + d, total));

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

function loadActive() {
  const r = rentals[currentIndex];
  const img = $('#rental-image');
  const title = $('#rental-title');
  const blurb = $('#rental-blurb');

  img.src = r.img;
  img.alt = r.alt;

  // Title kept simple per your latest structure
  title.textContent = `${r.name}`;

  // Safe display for sqft (can be number or string like "open lot")
  const sqftDisplay = typeof r.sqft === 'number' ? r.sqft.toLocaleString() : String(r.sqft);
  $('#stat-sleeps').textContent = r.sleeps;
  $('#stat-beds').textContent = r.beds;
  $('#stat-baths').textContent = r.baths;
  $('#stat-sqft').textContent = sqftDisplay;
  $('#stat-pets').textContent = r.pets ? 'Allowed' : 'Not allowed';
  blurb.textContent = r.blurb;
}

function computeStep() {
  const first = listEl.firstElementChild;
  if (!first) {
    stepPx = 0;
    return;
  }
  const style = getComputedStyle(listEl);
  const gap = parseFloat(style.gap) || 0;
  stepPx = first.getBoundingClientRect().width + gap;
}

// Cross-browser current translateX
function getTranslateX(el) {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return 0;
  // matrix(a,b,c,d,tx,ty) or matrix3d(...)
  const m3d = t.match(/matrix3d\(([^)]+)\)/);
  if (m3d) {
    const vals = m3d[1].split(',');
    return parseFloat(vals[12]) || 0;
  }
  const m2d = t.match(/matrix\(([^)]+)\)/);
  if (m2d) {
    const vals = m2d[1].split(',');
    return parseFloat(vals[4]) || 0;
  }
  return 0;
}

// Center the "center" thumb visually in the track regardless of viewport (1-up on mobile, 3-up on desktop)
function centerListOnCenterItem({ noTransition = false } = {}) {
  const scroller = trackEl; // .thumbs-track (the viewport)
  if (!scroller || !listEl) return;
  const center = listEl.querySelector('[data-pos="center"]');
  if (!center) return;

  const containerW = scroller.clientWidth;
  const itemRect = center.getBoundingClientRect();
  const listRect = listEl.getBoundingClientRect();
  const itemW = itemRect.width;

  // offsetLeft relative to list’s left edge:
  const leftWithinList = center.offsetLeft;

  // We want the center item’s left to be (containerW - itemW)/2
  const desiredLeft = (containerW - itemW) / 2;
  const translate = -(leftWithinList - desiredLeft);

  if (noTransition) listEl.style.transition = 'none';
  listEl.style.transform = `translateX(${translate}px)`;
  if (noTransition) {
    // force reflow then restore transition
    void listEl.offsetHeight;
    listEl.style.transition = `transform ${DURATION}ms ease`;
  }
}

/* ---------- Panel open/close helpers ---------- */
function setPanelOpen(open) {
  if (!primaryEl || !infoBtn || !infoPanel) return;

  primaryEl.classList.toggle('is-open', open);
  infoBtn.setAttribute('aria-expanded', String(open));
  infoPanel.setAttribute('aria-hidden', String(!open));
  const icon = infoBtn.querySelector('.icon');
  if (icon) icon.textContent = open ? '−' : '＋';

  // Defer focus until panel transform finishes (prevents mobile jank)
  if (open) {
    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;
      infoPanel.removeEventListener('transitionend', onEnd);
      try {
        infoPanel.focus({ preventScroll: true });
      } catch {}
    };
    infoPanel.addEventListener('transitionend', onEnd);
  }
}

/* ---------- Carousel motion ---------- */
let isAnimatingCarousel = false;

function slide(dir, steps = 1) {
  if (isAnimatingCarousel || !stepPx) return;

  // Close details whenever carousel moves
  setPanelOpen(false);

  isAnimatingCarousel = true;

  // Animate relative to current transform
  const currentX = getTranslateX(listEl);
  const target = currentX - dir * steps * stepPx;
  listEl.style.transform = `translateX(${target}px)`;

  const onDone = () => {
    listEl.removeEventListener('transitionend', onDone);
    // advance center index and re-render
    currentIndex = mod(currentIndex + dir * steps, rentals.length);
    renderStrip(currentIndex);
    computeStep();
    centerListOnCenterItem({ noTransition: true });
    loadActive();
    isAnimatingCarousel = false;
  };

  listEl.addEventListener('transitionend', onDone, { once: true });
}

/* ---------- Init carousel ---------- */
function initCarousel() {
  listEl = $('#thumbs-list');
  trackEl = $('.thumbs-track');
  prevBtn = $('.thumbs .prev');
  nextBtn = $('.thumbs .next');

  if (!listEl || !trackEl || !prevBtn || !nextBtn) return;

  renderStrip(currentIndex);
  computeStep();
  listEl.style.transition = `transform ${DURATION}ms ease`;
  centerListOnCenterItem({ noTransition: true });
  loadActive();

  prevBtn.addEventListener('click', () => slide(-1, 1));
  nextBtn.addEventListener('click', () => slide(+1, 1));

  // Click a thumb to move it into center
  trackEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.thumb');
    if (!btn) return;
    const pos = btn.getAttribute('data-pos');
    if (pos === 'prev') slide(-1, 1);
    else if (pos === 'next') slide(+1, 1);
    else if (pos === 'bufferL') slide(-1, 2);
    else if (pos === 'bufferR') slide(+1, 2);
    // if center: no-op
  });

  // Keep centered on resize/orientation changes
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      computeStep();
      centerListOnCenterItem({ noTransition: true });
    }, 100);
  });
}

/* ---------- Init panel toggle ---------- */
function initPanelToggle() {
  primaryEl = document.querySelector('.rentals .primary');
  infoBtn = document.querySelector('.rentals .info-toggle');
  infoPanel = document.getElementById('rental-info');
  if (!primaryEl || !infoBtn || !infoPanel) return;

  infoBtn.addEventListener('click', () => {
    const open = !primaryEl.classList.contains('is-open');
    setPanelOpen(open);
  });

  // Close when clicking panel body (ignore interactive controls)
  infoPanel.addEventListener('click', (e) => {
    const interactive = e.target.closest('a, button, input, select, textarea, label');
    if (!interactive) setPanelOpen(false);
  });

  // Escape closes
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && primaryEl.classList.contains('is-open')) setPanelOpen(false);
  });
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
  initPanelToggle();

  const img = document.getElementById('rental-image');
  img?.addEventListener('error', () => {
    img.src = '/assets/images/rentals/placeholder.jpg';
  });
});
