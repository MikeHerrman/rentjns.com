/* =====================================================
   events.js — Fetch Google Calendar ICS + dynamic filters
   ===================================================== */

const ICS_URL = 'https://rentjnscom.netlify.app/.netlify/functions/fetch-ics';

const listEl = document.getElementById('events-list');
const tagsSelect = document.getElementById('filter-tags');
const townSelect = document.getElementById('filter-town');
const clearTagsBtn = document.getElementById('clear-tags');

if (!listEl || !tagsSelect || !townSelect) {
  console.warn('[events.js] Required DOM nodes missing — aborting.');
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
  const m = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
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

  const knownTowns = ['Ocean Shores', 'Hoquiam', 'Seabrook', 'Pacific Beach', 'Moclips', 'Aberdeen'];

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

  const dateStr = start.toLocaleDateString(undefined, optsDate);
  const startTime = start.toLocaleTimeString(undefined, optsTime);

  if (!end) return `${dateStr} • ${startTime}`;

  const same = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();

  const endTime = end.toLocaleTimeString(undefined, optsTime);

  if (same) return `${dateStr} • ${startTime}–${endTime}`;

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
   3. RENDER + FILTERS
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
      desc.textContent = ev.description;
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
  placeholder.selected = true;
  placeholder.value = '';
  placeholder.textContent = 'Filter by tags…  (Ctrl/Cmd+click)';
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

  const cards = listEl.querySelectorAll('.event-card');

  cards.forEach((card) => {
    const cardTown = card.dataset.town;
    const cardTags = card.dataset.tags.split(',').filter(Boolean);

    const townMatch = selectedTown === 'all' || cardTown === selectedTown;
    const tagMatch = selectedTags.length === 0 || selectedTags.every((t) => cardTags.includes(t));

    card.style.display = townMatch && tagMatch ? '' : 'none';
  });
}

/* -----------------------------------------------------
   4. INIT
----------------------------------------------------- */

async function init() {
  try {
    const res = await fetch(ICS_URL);
    const icsText = await res.text();
    const events = parseEventsFromICS(icsText);

    renderEvents(events);
    buildFilters(events);
    applyFilters();

    tagsSelect.addEventListener('change', applyFilters);
    townSelect.addEventListener('change', applyFilters);

    clearTagsBtn.addEventListener('click', () => {
      Array.from(tagsSelect.options).forEach((opt) => (opt.selected = false));
      applyFilters();
    });
  } catch (err) {
    console.error('[events.js] Error:', err);
    listEl.innerHTML = `<p>We’re having trouble loading events right now. Please try again later.</p>`;
  }
}

init();
