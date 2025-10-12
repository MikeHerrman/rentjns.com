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
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function renderThumbs(listEl, items) {
  listEl.innerHTML = items
    .map(
      (r, i) => `
      <button class="thumb" data-index="${i}" aria-label="${r.name}">
        <img src="${r.img}" alt="${r.alt}">
        <span class="thumb-title">${r.name}</span>
      </button>`
    )
    .join('');
}

function loadRental(i) {
  const r = rentals[i];
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

  // active state on thumb
  $$('.thumb').forEach((el) => el.classList.toggle('is-active', Number(el.dataset.index) === i));
}

function initCarousel() {
  const track = $('#thumbs-list');
  const prev = $('.thumbs .prev');
  const next = $('.thumbs .next');

  const cardWidth = () => {
    const first = track.firstElementChild;
    return first
      ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 0)
      : 0;
  };

  prev.addEventListener('click', () => {
    track.parentElement.scrollBy({ left: -cardWidth(), behavior: 'smooth' });
  });
  next.addEventListener('click', () => {
    track.parentElement.scrollBy({ left: cardWidth(), behavior: 'smooth' });
  });

  track.addEventListener('click', (e) => {
    const btn = e.target.closest('.thumb');
    if (!btn) return;
    const i = Number(btn.dataset.index);
    loadRental(i);
  });
}

function initPanelToggle() {
  const primary = $('.rentals .primary');
  const btn = $('.rentals .info-toggle');
  const panel = $('#rental-info');

  let animating = false;
  const DURATION = 520; // keep in sync with CSS

  const setAria = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
  };

  const open = (wantOpen) => {
    if (animating) return;

    animating = true;

    if (wantOpen) {
      // Ensure the browser captures the "before" state, then apply end state.
      primary.classList.add('will-open'); // no visual effect; helps style flush
      // Force reflow so transitions definitely apply:
      void primary.offsetWidth;
      primary.classList.add('is-open');
      setAria(true);
      // Focus the panel after it’s visible to avoid scroll jumps
      setTimeout(() => panel.focus({ preventScroll: true }), DURATION * 0.75);
    } else {
      primary.classList.remove('is-open');
      setAria(false);
      primary.classList.remove('will-open');
    }

    // Clear flags after the transition window
    setTimeout(() => {
      animating = false;
      primary.classList.remove('will-open');
    }, DURATION + 60);
  };

  btn.addEventListener('click', () => open(!primary.classList.contains('is-open')));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && primary.classList.contains('is-open')) open(false);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Thumbs
  const listEl = $('#thumbs-list');
  renderThumbs(listEl, rentals);

  // Initial load
  loadRental(0); // Coastal Cottage

  // Init interactions
  initCarousel();
  initPanelToggle();

  // Fallback placeholder if an image 404s
  const img = $('#rental-image');
  img.addEventListener('error', () => {
    img.src = '/assets/images/rentals/placeholder.jpg';
  });
});
