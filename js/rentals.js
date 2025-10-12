// /js/rentals.js
// ---------- Data ----------
const rentals = [
  {
    id: 'p1',
    slug: 'rental-1',
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
    gallery: [
      'deck-1a.jpg',
      'kitchen-1a.jpg',
      'living-1a.jpg',
      'living-1b.jpg',
      'living-1c.jpg',
      'kitchen-1b.jpg',
      'kitchen-1c.jpg',
      'kitchen-1d.jpg',
      'kitchen-1e.jpg',
      'kitchen-coffee.jpg',
      'dining-1a.jpg',
      'deco-1.jpg',
      'deco-2.jpg',
      'deco-3.jpg',
      'hall-1a.jpg',
      'hall-1b.jpg',
      'hall-1c.jpg',
      'bed-1a.jpg',
      'bed-1b.jpg',
      'bed-1c.jpg',
      'bed-2a.jpg',
      'bed-2b.jpg',
      'bed-3a.jpg',
      'bed-3b.jpg',
      'bath-1a.jpg',
      'bath-1b.jpg',
      'bath-1c.jpg',
      'home-1a.jpg',
      'home-1b.jpg',
    ],
  },
  {
    id: 'p2',
    slug: 'property-2',
    name: 'Property 2',
    img: '/assets/images/rentals/property-2.jpg',
    alt: 'Property 2 exterior near the coast',
    sleeps: 0,
    beds: 0,
    baths: 0,
    sqft: 0,
    pets: false,
    blurb: 'Under renovation currently about a block from the coastal cottage',
    gallery: ['placeholder.jpg'],
  },
  {
    id: 'p3',
    slug: 'property-3',
    name: 'Property 3',
    img: '/assets/images/rentals/property-3.jpg',
    alt: 'Property 3 with deck and trees',
    sleeps: 0,
    beds: 0,
    baths: 0,
    sqft: 0,
    pets: false,
    blurb: 'Home is ready, final touches to open for rental',
    gallery: ['placeholder.jpg'],
  },
  {
    id: 'p4',
    slug: 'property-4',
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
    gallery: ['placeholder.jpg'],
  },
];

const $ = (sel, root = document) => root.querySelector(sel);

// ---------- State ----------
let listEl, trackEl, prevBtn, nextBtn;
let primaryEl, infoBtn, infoPanel;

let currentIndex = 0;
let stepPx = 0;
let isAnimatingCarousel = false;
const DURATION = 280;

// ---------- Helpers ----------
const mod = (n, m) => ((n % m) + m) % m;
const stripIndices = (center, total) => [-2, -1, 0, 1, 2].map((d) => mod(center + d, total));

function getVisibleCount() {
  const track = document.querySelector('.thumbs-track');
  const first = listEl?.firstElementChild;
  if (!track || !first) return 3;
  const trackW = track.getBoundingClientRect().width;
  const cardW = first.getBoundingClientRect().width;
  return Math.max(1, Math.round(trackW / cardW)); // 1, 2, or 3
}

// turn a rental’s gallery filenames into URLs; fallback to cover image
function galleryUrlsFor(rental) {
  if (Array.isArray(rental.gallery) && rental.gallery.length) {
    return rental.gallery.map((f) => `/assets/images/rentals/${rental.slug}/${f}`);
  }
  return [rental.img];
}

// current translateX (px) from style/computed matrix
function getTranslateX(el) {
  const st = getComputedStyle(el).transform || 'none';
  if (st === 'none') return 0;
  const m = st.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const parts = m[1].split(',').map(Number);
  // matrix(a,b,c,d,tx,ty) → tx = parts[4]
  return parts[4] || 0;
}

// ---------- Render strip ----------
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
          <img src="${r.img}" alt="${r.alt}" decoding="async" loading="lazy">
          <span class="thumb-title">${r.name}</span>
        </button>`;
    })
    .join('');
}

// ---------- Load active into primary panel ----------
function loadActive() {
  const r = rentals[currentIndex];
  const img = $('#rental-image');
  const title = $('#rental-title');
  const blurb = $('#rental-blurb');

  if (img) {
    img.src = r.img;
    img.alt = r.alt;
  }
  if (title) title.textContent = `${r.name}`;

  const sSleeps = $('#stat-sleeps');
  const sBeds = $('#stat-beds');
  const sBaths = $('#stat-baths');
  const sSqft = $('#stat-sqft');
  const sPets = $('#stat-pets');

  if (sSleeps) sSleeps.textContent = r.sleeps;
  if (sBeds) sBeds.textContent = r.beds;
  if (sBaths) sBaths.textContent = r.baths;
  if (sSqft) sSqft.textContent = typeof r.sqft === 'number' ? r.sqft.toLocaleString() : r.sqft;
  if (sPets) sPets.textContent = r.pets ? 'Allowed' : 'Not allowed';
  if (blurb) blurb.textContent = r.blurb;

  // ensure we have a handle even if initPanelToggle hasn’t run yet
  if (!infoPanel) infoPanel = document.getElementById('rental-info');
  if (infoPanel) {
    infoPanel.setAttribute('aria-live', 'polite');
    infoPanel.setAttribute('aria-atomic', 'true');
  }

  preloadNeighbors();
}

function preloadNeighbors() {
  const prev = mod(currentIndex - 1, rentals.length);
  const next = mod(currentIndex + 1, rentals.length);
  [prev, next].forEach((i) => {
    const im = new Image();
    im.decoding = 'async';
    im.loading = 'eager';
    im.src = rentals[i].img;
  });
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

function snapToCenter(noTransition = false) {
  if (noTransition) listEl.style.transition = 'none';
  const nVis = getVisibleCount(); // 1, 2, or 3
  const offset = 2 - Math.floor(nVis / 2); // center tile index in our 5-tile strip
  listEl.style.transform = `translateX(${-stepPx * offset}px)`;
  if (noTransition) {
    void listEl.offsetHeight; // reflow
    listEl.style.transition = `transform ${DURATION}ms ease`;
  }
}

// ---------- Panel open/close ----------
function setPanelOpen(open) {
  if (!primaryEl || !infoBtn || !infoPanel) return;
  primaryEl.classList.toggle('is-open', open);
  infoBtn.setAttribute('aria-expanded', String(open));
  infoPanel.setAttribute('aria-hidden', String(!open));
  const icon = infoBtn.querySelector('.icon');
  if (icon) icon.textContent = open ? '−' : '＋';

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

// ---------- Carousel motion ----------
function slide(dir, steps = 1) {
  if (isAnimatingCarousel || !stepPx) return;

  // Close details when carousel moves
  setPanelOpen(false);

  isAnimatingCarousel = true;
  prevBtn.disabled = true;
  nextBtn.disabled = true;

  // Animate RELATIVE to current translateX so it works for 1/2/3 visible tiles
  const currentTx = getTranslateX(listEl);
  const delta = dir * -steps * stepPx; // left = negative, right = positive
  const targetTx = currentTx + delta;

  listEl.style.transform = `translateX(${targetTx}px)`;

  const onDone = () => {
    listEl.removeEventListener('transitionend', onDone);
    currentIndex = mod(currentIndex + dir * steps, rentals.length);
    renderStrip(currentIndex);
    computeStep();
    snapToCenter(true);
    loadActive();
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    isAnimatingCarousel = false;
  };

  listEl.addEventListener('transitionend', onDone, { once: true });
}

// ---------- Init carousel ----------
function initCarousel() {
  listEl = $('#thumbs-list');
  trackEl = $('.thumbs-track');
  prevBtn = document.querySelector('.thumbs-nav.prev');
  nextBtn = document.querySelector('.thumbs-nav.next');
  if (!listEl || !trackEl || !prevBtn || !nextBtn) return;

  renderStrip(currentIndex);
  computeStep();
  listEl.style.transition = `transform ${DURATION}ms ease`;
  snapToCenter(true);
  loadActive();

  prevBtn.addEventListener('click', () => slide(-1, 1));
  nextBtn.addEventListener('click', () => slide(+1, 1));

  // Click thumbs (buffer = 2 steps, prev/next = 1 step, center = no-op)
  trackEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.thumb');
    if (!btn) return;
    const pos = btn.getAttribute('data-pos');
    if (pos === 'prev') slide(-1, 1);
    else if (pos === 'next') slide(+1, 1);
    else if (pos === 'bufferL') slide(-1, 2);
    else if (pos === 'bufferR') slide(+1, 2);
  });

  // Responsive safety: recompute and re-enable buttons if a prior anim was interrupted
  window.addEventListener('resize', () => {
    computeStep();
    snapToCenter(true);
    isAnimatingCarousel = false;
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  });
}

// ---------- Init panel toggle ----------
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

// ---------- Gallery ----------
let galleryRoot, galleryImg, galleryCaption, galleryPrev, galleryNext, galleryClose;
let galleryImages = [];
let galleryAt = 0;

function buildGalleryOnce() {
  if (galleryRoot) return;

  const wrap = document.createElement('div');
  wrap.className = 'gallery';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <div class="gallery-backdrop"></div>
    <div class="gallery-frame" role="dialog" aria-modal="true" aria-label="Image gallery">
      <img id="gallery-image" alt="">
      <div class="gallery-caption"></div>
      <div class="gallery-controls">
        <button class="gallery-nav prev" aria-label="Previous image">‹</button>
        <button class="gallery-close" aria-label="Close gallery">×</button>
        <button class="gallery-nav next" aria-label="Next image">›</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  galleryRoot = wrap;
  galleryImg = wrap.querySelector('#gallery-image');
  galleryCaption = wrap.querySelector('.gallery-caption');
  galleryPrev = wrap.querySelector('.gallery-nav.prev');
  galleryNext = wrap.querySelector('.gallery-nav.next');
  galleryClose = wrap.querySelector('.gallery-close');

  galleryPrev.addEventListener('click', () =>
    showGallery(mod(galleryAt - 1, galleryImages.length))
  );
  galleryNext.addEventListener('click', () =>
    showGallery(mod(galleryAt + 1, galleryImages.length))
  );
  galleryClose.addEventListener('click', closeGallery);

  wrap.querySelector('.gallery-backdrop')?.addEventListener('click', closeGallery);

  galleryImg.addEventListener('click', () => {
    galleryRoot.classList.toggle('is-zoomed');
  });

  window.addEventListener('keydown', (e) => {
    if (wrap.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape') closeGallery();
    else if (e.key === 'ArrowLeft') galleryPrev.click();
    else if (e.key === 'ArrowRight') galleryNext.click();
  });
}

function openGalleryForActive() {
  const r = rentals[currentIndex];
  galleryImages = galleryUrlsFor(r);
  galleryAt = 0;
  buildGalleryOnce();
  document.body.style.overflow = 'hidden';
  galleryRoot.setAttribute('aria-hidden', 'false');
  galleryRoot.classList.add('is-open');
  showGallery(0);
  galleryClose?.focus();
}

function showGallery(i) {
  galleryAt = i;
  const url = galleryImages[i];
  galleryImg.src = url;
  galleryCaption.textContent = `${rentals[currentIndex].name} — ${i + 1} / ${galleryImages.length}`;
}

function closeGallery() {
  if (!galleryRoot) return;
  galleryRoot.classList.remove('is-open');
  galleryRoot.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  galleryRoot.classList.remove('is-zoomed');
  try {
    infoBtn?.focus();
  } catch {}
}

// openers delegate
function initGalleryOpeners() {
  const panelActions = document.querySelector('.panel-actions');
  if (!panelActions) return;
  panelActions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="open-gallery"], .btn-gallery, .view-gallery');
    if (!btn) return;
    openGalleryForActive();
  });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
  initPanelToggle();
  initGalleryOpeners();

  const img = document.getElementById('rental-image');
  img?.addEventListener('error', () => {
    img.src = '/assets/images/rentals/placeholder.jpg';
  });
});
