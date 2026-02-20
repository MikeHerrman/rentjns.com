/* =====================================================
   events.js — Fetch Google Calendar ICS + dynamic filters
   ===================================================== */

const ICS_URL = 'https://rentjnscom.netlify.app/.netlify/functions/fetch-ics';

const listEl = document.getElementById('events-list');
const tagsSelect = document.getElementById('filter-tags');
const townSelect = document.getElementById('filter-town');
const clearTagsBtn = document.getElementById('clear-tags');
const startInput = document.getElementById('filter-start');
const endInput = document.getElementById('filter-end');
const clearDatesBtn = document.getElementById('clear-dates');

if (!listEl || !tagsSelect || !townSelect) {
  console.warn('[events.js] Required DOM nodes missing — aborting.');
  throw new Error('Missing required DOM nodes for events page');
}

/* -----------------------------------------------------
   1. HELPERS
----------------------------------------------------- */

function normalizeFoldedLines(icsText) {
  return icsText.replace(/\r?\n[ \t]/g, '');
}

function getProp(block, name) {
  const regex = new RegExp(`${name}(?:;[^:]*)?:(.*)`, 'i');
  const match = block.match(regex);
  if (!match) return '';

  return match[1].trim().replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\/g, '');
}

function parseICSDate(value) {
  if (!value) return null;

  // date-time: 20260501T183000Z (Z optional)
  let m = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/);
  if (m) {
    // If original had Z, treat as UTC; otherwise treat as local (don’t force Z).
    const hasZ = /Z$/.test(value);
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${hasZ ? 'Z' : ''}`;
    return new Date(iso);
  }

  // date-only (all-day): 20260501
  m = value.match(/(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    // Create as local date at midnight to avoid timezone shifting the calendar day
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  return null;
}

/* ---------- Improved Tag Parser ---------- */
function parseTags(text) {
  if (!text) return { clean: text, tags: [] };

  const tagRegex = /\[([^\]]+)\]/g;
  const tags = [];
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const raw = match[1];
    raw
      .split(',')
      .map((t) => t.replace(/\\/g, '').trim())
      .filter(Boolean)
      .forEach((t) => tags.push(t));
  }

  const clean = text.replace(/\[[^\]]+\]/g, '').trim();
  return { clean, tags };
}

/* ---------- SMART TOWN DETECTION ---------- */
function deriveTown(location) {
  if (!location) return 'Other';

  // const knownTowns = ['Ocean Shores', 'Hoquiam', 'Seabrook', 'Pacific Beach', 'Moclips', 'Aberdeen', 'Grays Harbor'];
  const knownTowns = [
    // Core
    'Ocean Shores',
    'Aberdeen',
    'Hoquiam',
    'Cosmopolis',

    // Inland-but-still-in-range event hubs
    'Montesano',
    'Elma',
    'McCleary',

    // North Beach corridor (your existing perimeter)
    'Seabrook',
    'Pacific Beach',
    'Moclips',

    // Beach-area labels that appear in addresses
    'Ocean City',
    'Oyehut',
    'Cohassett Beach',
    'Copalis Beach',

    // South beach / harbor events (often within the same “guest radius”)
    'Westport',
    'Grayland',

    // Region tags
    'Grays Harbor',
    'Grays Harbor County',
  ];

  const lower = location.toLowerCase();

  for (const town of knownTowns) {
    if (lower.includes(town.toLowerCase())) return town;
  }

  // fallback
  const cleaned = location.replace(/\\/g, '');
  return cleaned.split(',')[0].trim() || 'Other';
}

function formatDateRange(start, end) {
  if (!start) return '';

  const optsDate = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const optsTime = { hour: 'numeric', minute: '2-digit' };

  const isMidnight = (d) => d && d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const dateStr = start.toLocaleDateString(undefined, optsDate);

  // all-day (date-only) handling — DTEND is commonly exclusive in ICS
  if (end && isMidnight(start) && isMidnight(end)) {
    const endInclusive = new Date(end);
    endInclusive.setDate(endInclusive.getDate() - 1);

    if (sameDay(start, endInclusive)) return dateStr;

    const endDateStr = endInclusive.toLocaleDateString(undefined, optsDate);
    return `${dateStr} → ${endDateStr}`;
  }

  const startTime = start.toLocaleTimeString(undefined, optsTime);

  if (!end) return `${dateStr} • ${startTime}`;

  const endTime = end.toLocaleTimeString(undefined, optsTime);

  if (sameDay(start, end)) return `${dateStr} • ${startTime}–${endTime}`;

  const endDateStr = end.toLocaleDateString(undefined, optsDate);
  return `${dateStr} ${startTime} → ${endDateStr} ${endTime}`;
}

/* -----------------------------------------------------
   2. ICS PARSER
----------------------------------------------------- */

function parseEventsFromICS(icsRaw) {
  const ics = normalizeFoldedLines(icsRaw);
  const blocks = ics.split('BEGIN:VEVENT').slice(1);

  const events = [];

  for (const raw of blocks) {
    const block = raw.split('END:VEVENT')[0];

    const summaryRaw = getProp(block, 'SUMMARY');
    const descriptionRaw = getProp(block, 'DESCRIPTION');
    const locationRaw = getProp(block, 'LOCATION');
    const startRaw = getProp(block, 'DTSTART');
    const endRaw = getProp(block, 'DTEND');
    const uid = getProp(block, 'UID') || crypto.randomUUID?.() || String(events.length);

    const { clean: cleanSummary, tags: tagsFromSummary } = parseTags(summaryRaw);
    const { clean: cleanDescription, tags: tagsFromDesc } = parseTags(descriptionRaw);

    const allTags = Array.from(new Set([...tagsFromSummary, ...tagsFromDesc])).sort();

    events.push({
      id: uid,
      title: cleanSummary,
      description: cleanDescription.replace(/\\n/g, '\n'),
      location: locationRaw,
      town: deriveTown(locationRaw),
      tags: allTags,
      start: parseICSDate(startRaw),
      end: parseICSDate(endRaw),
    });
  }

  return events.sort((a, b) => (a.start && b.start ? a.start - b.start : 0));
}

/* -----------------------------------------------------
   3. ADD LINKS
----------------------------------------------------- */

function convertLinks(text) {
  if (!text) return text;

  return text.replace(/\{Link:\s*([^|]+?)\s*\|\s*(https?:\/\/[^\s}]+)\s*\}/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

/* -----------------------------------------------------
   4. RENDER + FILTERS
----------------------------------------------------- */

function renderEvents(events) {
  listEl.innerHTML = '';

  if (!events.length) {
    listEl.innerHTML = '<p>No upcoming events found. Check back soon!</p>';
    return;
  }

  for (const ev of events) {
    const card = document.createElement('article');
    card.className = 'event-card';
    card.dataset.town = ev.town;
    card.dataset.tags = ev.tags.join(',');
    card.dataset.start = ev.start ? ev.start.toISOString() : '';
    card.dataset.end = ev.end ? ev.end.toISOString() : '';

    const header = document.createElement('header');
    header.className = 'event-card__header';

    const title = document.createElement('h2');
    title.className = 'event-card__title';
    title.textContent = ev.title;

    const date = document.createElement('p');
    date.className = 'event-card__date';
    date.textContent = formatDateRange(ev.start, ev.end);

    header.appendChild(title);
    header.appendChild(date);
    card.appendChild(header);

    if (ev.location) {
      const loc = document.createElement('p');
      loc.className = 'event-card__location';
      loc.textContent = ev.location;
      card.appendChild(loc);
    }

    if (ev.description) {
      const desc = document.createElement('p');
      desc.className = 'event-card__description';
      desc.innerHTML = convertLinks(ev.description);
      card.appendChild(desc);
    }

    const meta = document.createElement('div');
    meta.className = 'event-card__meta';

    const townBadge = document.createElement('span');
    townBadge.className = 'event-badge event-badge--town';
    townBadge.textContent = ev.town;
    meta.appendChild(townBadge);

    for (const tag of ev.tags) {
      const t = document.createElement('span');
      t.className = 'event-badge event-badge--tag';
      t.textContent = tag;
      meta.appendChild(t);
    }

    card.appendChild(meta);
    listEl.appendChild(card);
  }
}

function buildFilters(events) {
  const allTags = Array.from(new Set(events.flatMap((ev) => ev.tags))).sort();
  const allTowns = Array.from(new Set(events.map((ev) => ev.town))).sort();

  /* ----- TAGS (with 2-line placeholder) ------ */
  tagsSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.disabled = true;
  placeholder.selected = false;
  placeholder.value = '';
  placeholder.textContent = 'Single or Multi select';
  tagsSelect.appendChild(placeholder);

  for (const tag of allTags) {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = tag;
    tagsSelect.appendChild(opt);
  }

  /* ----- TOWNS ------ */
  townSelect.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All Areas';
  townSelect.appendChild(allOpt);

  for (const town of allTowns) {
    const opt = document.createElement('option');
    opt.value = town;
    opt.textContent = town;
    townSelect.appendChild(opt);
  }
}

function getSelectedTags() {
  return Array.from(tagsSelect.options)
    .filter((opt) => opt.selected && opt.value)
    .map((opt) => opt.value);
}

function applyFilters() {
  const selectedTown = townSelect.value;
  const selectedTags = getSelectedTags();

  const rangeStart = startInput ? parseDateInput(startInput.value) : null;
  const rangeEnd = endInput ? parseDateInput(endInput.value) : null;

  const cards = listEl.querySelectorAll('.event-card');

  cards.forEach((card) => {
    const cardTown = card.dataset.town;
    const cardTags = card.dataset.tags.split(',').filter(Boolean);

    const townMatch = selectedTown === 'all' || cardTown === selectedTown;
    const tagMatch = selectedTags.length === 0 || selectedTags.every((t) => cardTags.includes(t));

    const evStartISO = card.dataset.start;
    const evEndISO = card.dataset.end;

    const evStart = evStartISO ? new Date(evStartISO) : null;
    const evEnd = evEndISO ? new Date(evEndISO) : null;

    const dateMatch = eventInRange(evStart, evEnd, rangeStart, rangeEnd);

    card.style.display = townMatch && tagMatch && dateMatch ? '' : 'none';
  });
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseDateInput(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function eventInRange(evStart, evEnd, rangeStart, rangeEnd) {
  if (!rangeStart && !rangeEnd) return true;
  if (!evStart) return false;

  const s = evStart;
  const e = evEnd || evStart;

  const rs = rangeStart ? startOfDay(rangeStart) : null;
  const re = rangeEnd ? endOfDay(rangeEnd) : null;

  if (rs && e < rs) return false;
  if (re && s > re) return false;

  return true;
}

/* -----------------------------------------------------
   5. INIT
----------------------------------------------------- */

async function init() {
  try {
    const res = await fetch(ICS_URL);
    const icsText = await res.text();
    let events = parseEventsFromICS(icsText);

    /* -----------------------------------------
   AUTO HIDE EXPIRED EVENTS (3-day buffer)
------------------------------------------ */
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 3);

    const isMidnight = (d) => d && d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;

    events = events.filter((ev) => {
      if (!ev.start) return false;

      let end = ev.end || ev.start;

      // If it's an all-day style event (both at midnight), treat DTEND as exclusive
      if (ev.end && isMidnight(ev.start) && isMidnight(ev.end)) {
        end = new Date(ev.end);
        end.setDate(end.getDate() - 1);
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
      }

      return end >= cutoff;
    });

    renderEvents(events);
    buildFilters(events);
    applyFilters();

    tagsSelect.addEventListener('change', applyFilters);
    townSelect.addEventListener('change', applyFilters);
    startInput?.addEventListener('change', applyFilters);
    endInput?.addEventListener('change', applyFilters);

    clearDatesBtn?.addEventListener('click', () => {
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      applyFilters();
    });

    clearTagsBtn.addEventListener('click', () => {
      Array.from(tagsSelect.options).forEach((opt) => (opt.selected = false));
      applyFilters();
    });

    /* --------------------------------------------
       MOBILE FILTER PANEL TOGGLE
       -------------------------------------------- */
    const filterPanel = document.querySelector('.events-filter');
    const filterToggle = document.getElementById('filters-toggle');

    if (filterToggle && filterPanel) {
      filterToggle.addEventListener('click', () => {
        const isOpen = filterPanel.style.display === 'block';

        filterPanel.style.display = isOpen ? 'none' : 'block';
        filterToggle.textContent = isOpen ? 'Show Filters' : 'Hide Filters';
      });
    }
  } catch (err) {
    console.error('[events.js] Error:', err);
    listEl.innerHTML = `<p>We’re having trouble loading events right now. Please try again later.</p>`;
  }
}

init();
