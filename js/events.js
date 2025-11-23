/* =====================================================
   events.js — Fetch Google Calendar ICS + dynamic filters
   ===================================================== */

const ICS_URL =
  'https://calendar.google.com/calendar/ical/0841982bf57ed3d9d6c39aacece5b0f25bc7bc5894b1c6750218d64a047c96f4%40group.calendar.google.com/public/basic.ics';

const listEl = document.getElementById('events-list');
const tagsSelect = document.getElementById('filter-tags');
const townSelect = document.getElementById('filter-town');

if (!listEl || !tagsSelect || !townSelect) {
  console.warn('[events.js] Required DOM nodes missing — aborting.');
}

/* ---------- 1. Helpers ---------- */

function normalizeFoldedLines(icsText) {
  // ICS spec: lines that continue start with a space; join them back
  return icsText.replace(/\r?\n[ \t]/g, '');
}

function getProp(block, name) {
  // Matches things like "SUMMARY:Title" or "DTSTART;TZID=...:value"
  const regex = new RegExp(`${name}(?:;[^:]*)?:(.*)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

function parseICSDate(value) {
  if (!value) return null;
  // Expect format like 20251124T200000Z or 20251124T200000
  const m = value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  return new Date(iso);
}

function parseTags(text) {
  if (!text) return { clean: '', tags: [] };
  const tags = [];
  const tagRegex = /\[([^\]]+)\]/g;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const tag = match[1].trim();
    if (tag) tags.push(tag);
  }

  const clean = text.replace(/\[[^\]]+\]/g, '').trim();
  return { clean, tags };
}

function deriveTown(location) {
  if (!location) return 'Other';
  const first = location.split(',')[0].trim();
  return first || 'Other';
}

function formatDateRange(start, end) {
  if (!start) return '';

  const optsDate = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const optsTime = { hour: 'numeric', minute: '2-digit' };

  const dateStr = start.toLocaleDateString(undefined, optsDate);

  if (!end) {
    const timeStr = start.toLocaleTimeString(undefined, optsTime);
    return `${dateStr} • ${timeStr}`;
  }

  const sameDay = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();

  const startTime = start.toLocaleTimeString(undefined, optsTime);
  const endTime = end.toLocaleTimeString(undefined, optsTime);

  if (sameDay) {
    return `${dateStr} • ${startTime}–${endTime}`;
  }

  const endDateStr = end.toLocaleDateString(undefined, optsDate);
  return `${dateStr} ${startTime} → ${endDateStr} ${endTime}`;
}

/* ---------- 2. ICS → Event Objects ---------- */

function parseEventsFromICS(icsRaw) {
  const ics = normalizeFoldedLines(icsRaw);

  const blocks = ics.split('BEGIN:VEVENT').slice(1); // first chunk is preamble
  const events = [];

  for (const blockRaw of blocks) {
    const block = blockRaw.split('END:VEVENT')[0];

    const summaryRaw = getProp(block, 'SUMMARY');
    const descriptionRaw = getProp(block, 'DESCRIPTION');
    const locationRaw = getProp(block, 'LOCATION');
    const startRaw = getProp(block, 'DTSTART');
    const endRaw = getProp(block, 'DTEND');
    const uid = getProp(block, 'UID') || crypto.randomUUID?.() || String(events.length + 1);

    const { clean: cleanSummary, tags: tagsFromSummary } = parseTags(summaryRaw);
    const { clean: cleanDescription, tags: tagsFromDesc } = parseTags(descriptionRaw);

    const allTags = Array.from(new Set([...tagsFromSummary, ...tagsFromDesc]));

    const start = parseICSDate(startRaw);
    const end = parseICSDate(endRaw);
    const town = deriveTown(locationRaw);

    events.push({
      id: uid,
      title: cleanSummary || '(Untitled event)',
      description: cleanDescription,
      location: locationRaw,
      town,
      tags: allTags,
      start,
      end,
    });
  }

  // Sort by start date ascending
  events.sort((a, b) => {
    if (!a.start || !b.start) return 0;
    return a.start - b.start;
  });

  return events;
}

/* ---------- 3. Render + Filters ---------- */

function renderEvents(events) {
  listEl.innerHTML = '';

  if (!events.length) {
    const p = document.createElement('p');
    p.textContent = 'No upcoming events found. Check back soon!';
    listEl.appendChild(p);
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
    if (ev.start) {
      date.textContent = formatDateRange(ev.start, ev.end);
    }

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

    if (ev.tags && ev.tags.length) {
      for (const tag of ev.tags) {
        const t = document.createElement('span');
        t.className = 'event-badge event-badge--tag';
        t.textContent = tag;
        meta.appendChild(t);
      }
    }

    card.appendChild(meta);
    listEl.appendChild(card);
  }
}

function buildFilters(events) {
  // Tags
  const allTags = Array.from(new Set(events.flatMap((ev) => ev.tags || []))).sort((a, b) => a.localeCompare(b));

  tagsSelect.innerHTML = '';
  // Optional placeholder (non-selectable)
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Filter by tags… (Ctrl/Cmd+click)';
  tagsSelect.appendChild(placeholder);

  for (const tag of allTags) {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = tag;
    tagsSelect.appendChild(opt);
  }

  // Towns
  const allTowns = Array.from(new Set(events.map((ev) => ev.town || 'Other'))).sort((a, b) => a.localeCompare(b));

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
  // ignore placeholder
  return Array.from(tagsSelect.options)
    .filter((opt) => opt.selected && opt.value)
    .map((opt) => opt.value);
}

function applyFilters() {
  const selectedTown = townSelect.value;
  const selectedTags = getSelectedTags();

  const cards = listEl.querySelectorAll('.event-card');
  cards.forEach((card) => {
    const cardTown = card.dataset.town || 'Other';
    const cardTags = (card.dataset.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const matchesTown = selectedTown === 'all' || cardTown === selectedTown;

    const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => cardTags.includes(tag));

    card.style.display = matchesTown && matchesTags ? '' : 'none';
  });
}

/* ---------- 4. Wire up + Init ---------- */

async function init() {
  if (!listEl || !tagsSelect || !townSelect) return;

  try {
    const res = await fetch(ICS_URL);
    if (!res.ok) {
      throw new Error(`ICS fetch failed: ${res.status}`);
    }
    const icsText = await res.text();
    const events = parseEventsFromICS(icsText);

    renderEvents(events);
    buildFilters(events);
    applyFilters(); // initial

    tagsSelect.addEventListener('change', applyFilters);
    townSelect.addEventListener('change', applyFilters);
  } catch (err) {
    console.error('[events.js] Error loading events:', err);
    listEl.innerHTML = '<p>We’re having trouble loading events right now. Please try again later.</p>';
  }
}

init();
