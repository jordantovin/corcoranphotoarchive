// Corcoran Photo Archive — images-only masonry + click-for-metadata modal

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAysWFQwQwy2jXfGpQuceY5bmewB_4ix6kBknK_7BVEFlwuOS9WBtRqvcfEAe3jYjOGsa7y8wAkmCU/pub?output=csv";

const masonryEl = document.getElementById("masonry");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const countEl = document.getElementById("count");

const modalEl = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const modalMeta = document.getElementById("modal-meta");
const modalClose = document.getElementById("modal-close");

let allRows = [];
let shownRows = [];
let currentIndex = -1;

init();

async function init() {
  setStatus("Loading archive…");

  try {
    const csvText = await fetchText(CSV_URL);
    const rows = csvToObjects(csvText);

    allRows = rows
      .map(normalizeRow)
      .filter(r => r.src);

    shownRows = allRows.slice();

    render(shownRows);
    setStatus("");
    updateCount(shownRows.length, allRows.length);

    searchEl.addEventListener("input", onSearch);

    // Modal events
    modalClose.addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => {
      // clicking the dark backdrop closes
      if (e.target === modalEl) closeModal();
    });

    // ESC closes modal
    document.addEventListener("keydown", (e) => {
      if (!modalEl.classList.contains("active")) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") nextModal();
      if (e.key === "ArrowLeft") prevModal();
    });

  } catch (err) {
    console.error(err);
    setStatus("Couldn’t load the CSV. Check the link + permissions.");
  }
}

function onSearch() {
  const q = (searchEl.value || "").trim().toLowerCase();

  if (!q) {
    shownRows = allRows.slice();
    render(shownRows);
    updateCount(shownRows.length, allRows.length);
    return;
  }

  shownRows = allRows.filter(r => {
    const haystack = [
      r.location_card,
      r.description,
      r.medium,
      r.artist,
      r.keywords,
      r.feed,
      r.date,
      r.coordinates,
    ].join(" ").toLowerCase();

    return haystack.includes(q);
  });

  render(shownRows);
  updateCount(shownRows.length, allRows.length);
}

function render(rows) {
  masonryEl.innerHTML = rows.map((r, idx) => imageHTML(r, idx)).join("");
}

function imageHTML(r, idx) {
  const alt = r.description || r.location_card || "Archive image";
  return `
    <div class="image-item">
      <button class="image-btn" type="button" data-idx="${idx}" aria-label="Open image">
        <img
          src="${escapeAttr(r.src)}"
          alt="${escapeAttr(alt)}"
          loading="lazy"
          decoding="async"
        />
      </button>
    </div>
  `;
}

// Delegate click events (faster than binding per-image)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".image-btn");
  if (!btn) return;

  const idx = Number(btn.dataset.idx);
  if (Number.isNaN(idx)) return;

  openModal(idx);
});

function openModal(idx) {
  currentIndex = idx;
  const r = shownRows[idx];
  if (!r) return;

  modalImg.src = r.src;

  // Build clean metadata block (only visible on click)
  const lines = [];

  const title = [r.location_card].filter(Boolean).join("");
  if (title) lines.push(title);

  const sub = [r.date, r.medium, r.artist].filter(Boolean).join(" • ");
  if (sub) lines.push(sub);

  if (r.description) {
    lines.push("");
    lines.push(r.description);
  }

  const tags = [r.keywords].filter(Boolean).join("");
  if (tags) {
    lines.push("");
    lines.push(tags);
  }

  if (r.coordinates) {
    lines.push("");
    lines.push(`coords: ${r.coordinates}`);
  }

  modalMeta.innerHTML = `
    ${title ? `<div class="meta-title">${escapeHTML(title)}</div>` : ""}
    ${sub ? `<div class="meta-muted">${escapeHTML(sub)}</div>` : ""}
    ${r.description ? `<div class="meta-line" style="margin-top:10px;">${escapeHTML(r.description)}</div>` : ""}
    ${tags ? `<div class="meta-muted" style="margin-top:10px;">${escapeHTML(tags)}</div>` : ""}
    ${r.coordinates ? `<div class="meta-muted" style="margin-top:10px;">coords: ${escapeHTML(r.coordinates)}</div>` : ""}
  `;

  modalEl.classList.add("active");
  modalEl.setAttribute("aria-hidden", "false");

  // prevent page scroll behind modal
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalEl.classList.remove("active");
  modalEl.setAttribute("aria-hidden", "true");

  // allow scrolling again
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";

  // optional: clear src so you don't keep downloading giant images in memory
  modalImg.src = "";
  currentIndex = -1;
}

function nextModal() {
  if (shownRows.length === 0) return;
  const next = (currentIndex + 1) % shownRows.length;
  openModal(next);
}

function prevModal() {
  if (shownRows.length === 0) return;
  const prev = (currentIndex - 1 + shownRows.length) % shownRows.length;
  openModal(prev);
}

// ---------- Fetch ----------
async function fetchText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.text();
}

// ---------- CSV parsing ----------
function csvToObjects(csvText) {
  const rows = parseCSV(csvText);
  if (!rows.length) return [];

  const headers = rows[0].map(h => normalizeHeader(h));
  const out = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(cell => !cell || !cell.trim())) continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] ?? "").trim();
    });

    out.push(obj);
  }
  return out;
}

function normalizeHeader(h) {
  return (h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;

      row.push(field);
      rows.push(row);

      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  while (rows.length && rows[rows.length - 1].every(c => !c || !c.trim())) {
    rows.pop();
  }

  return rows;
}

// ---------- Helpers ----------
function normalizeRow(r) {
  // keep original columns, but guarantee strings
  const out = {
    src: safe(r.src),
    date: safe(r.date),
    location_card: safe(r.location_card),
    description: safe(r.description),
    medium: safe(r.medium),
    artist: safe(r.artist),
    keywords: safe(r.keywords),
    feed: safe(r.feed),
    coordinates: safe(r.coordinates),
  };

  // Some sheets may have slightly different header casing; fallbacks:
  if (!out.src && r.SRC) out.src = safe(r.SRC);
  return out;
}

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function updateCount(shown, total) {
  countEl.textContent = total === shown ? `${total} items` : `${shown} / ${total}`;
}

function safe(v) {
  return (v ?? "").toString().trim();
}

function escapeHTML(str) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(str) {
  return escapeHTML(str).replaceAll('"', "&quot;");
}
