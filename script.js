const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAysWFQwQwy2jXfGpQuceY5bmewB_4ix6kBknK_7BVEFlwuOS9WBtRqvcfEAe3jYjOGsa7y8wAkmCU/pub?output=csv";
const masonryEl = document.getElementById("masonry");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const countEl = document.getElementById("count");
let allRows = [];
let shownRows = [];

// Expose shownRows to other modules
window.getShownRows = function() {
  return shownRows;
};

init();

async function init() {
  setStatus("Loading archive...");
  try {
    const csvText = await fetchText(CSV_URL);
    const rows = csvToObjects(csvText);
    allRows = rows.map(normalizeRow).filter(r => r.src);
    shownRows = allRows.slice();
    render(shownRows);
    setStatus("");
    updateCount(shownRows.length, allRows.length);
    searchEl.addEventListener("input", onSearch);
  } catch (err) {
    console.error(err);
    setStatus("Couldn't load the CSV. Check the link + permissions.");
  }
}

function onSearch() {
  const q = (searchEl.value || "").trim().toLowerCase();
  if (!q) {
    shownRows = allRows.slice();
    render(shownRows);
    updateCount(shownRows.length, allRows.length);
    // Reload map with all data
    if (typeof window.loadMapData === 'function') {
      window.loadMapData(shownRows);
    }
    return;
  }
  shownRows = allRows.filter(r => {
    const haystack = [
      r.title,
      r.date,
      r.location_card,
      r.photographer,
      r.description,
      r.keywords,
      r.coordinates,
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  });
  render(shownRows);
  updateCount(shownRows.length, allRows.length);
  // Reload map with filtered data
  if (typeof window.loadMapData === 'function') {
    window.loadMapData(shownRows);
  }
}

function render(rows) {
  masonryEl.innerHTML = rows.map((r, idx) => `
    <div class="image-item">
      <button class="image-btn" type="button" data-idx="${idx}" aria-label="Open image">
        <img
          src="${escapeAttr(r.src)}"
          alt="${escapeAttr(r.title || r.description || r.location_card || "Archive image")}"
          loading="lazy"
          decoding="async"
        />
      </button>
    </div>
  `).join("");
}

/**
 * Click delegation:
 * We call `window.openViewer(row, idx, shownRows)` from viewer.js
 */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".image-btn");
  if (!btn) return;
  const idx = Number(btn.dataset.idx);
  if (Number.isNaN(idx)) return;
  const row = shownRows[idx];
  if (!row) return;
  if (typeof window.openViewer === "function") {
    window.openViewer(row, idx, shownRows);
  }
});

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
  return (h || "").trim().toLowerCase().replace(/\s+/g, "_");
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
      if (inQuotes && next === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (char === "," && !inQuotes) { row.push(field); field = ""; continue; }
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
  while (rows.length && rows[rows.length - 1].every(c => !c || !c.trim())) rows.pop();
  return rows;
}

// ---------- Row normalization (matches your new sheet) ----------
function normalizeRow(r) {
  return {
    src: safe(r.src),
    date: safe(r.date),
    location_card: safe(r.location_card),
    description: safe(r.description),
    title: safe(r.title),
    photographer: safe(r.photographer),
    keywords: safe(r.keywords),
    coordinates: safe(r.coordinates),
  };
}

// ---------- Helpers ----------
function setStatus(msg) { statusEl.textContent = msg || ""; }
function updateCount(shown, total) {
  countEl.textContent = (total === shown) ? `${total} items` : `${shown} / ${total}`;
}
function safe(v) { return (v ?? "").toString().trim(); }
function escapeHTML(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttr(str) {
  return escapeHTML(str).replaceAll('"', "&quot;");
}
