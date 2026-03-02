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

    allRows = rows.map(normalizeRow).filter(r => r.src);
    shownRows = allRows.slice();

    render(shownRows);
    setStatus("");
    updateCount(shownRows.length, allRows.length);

    searchEl.addEventListener("input", onSearch);

    modalClose.addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });

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
  masonryEl.innerHTML = rows.map((r, idx) => `
    <div class="image-item">
      <button class="image-btn" type="button" data-idx="${idx}" aria-label="Open image">
        <img
          src="${escapeAttr(r.src)}"
          alt="${escapeAttr(r.description || r.location_card || "Archive image")}"
          loading="lazy"
          decoding="async"
        />
      </button>
    </div>
  `).join("");
}

// click delegation
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

  const title = r.location_card || "";
  const sub = [r.date, r.medium, r.artist].filter(Boolean).join(" • ");

  modalMeta.innerHTML = `
    ${title ? `<div class="meta-title">${escapeHTML(title)}</div>` : ""}
    ${sub ? `<div class="meta-muted">${escapeHTML(sub)}</div>` : ""}
    ${r.description ? `<div style="margin-top:10px;">${escapeHTML(r.description)}</div>` : ""}
    ${r.keywords ? `<div class="meta-muted" style="margin-top:10px;">${escapeHTML(r.keywords)}</div>` : ""}
    ${r.coordinates ? `<div class="meta-muted" style="margin-top:10px;">coords: ${escapeHTML(r.coordinates)}</div>` : ""}
  `;

  modalEl.classList.add("active");
  modalEl.setAttribute("aria-hidden", "false");

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalEl.classList.remove("active");
  modalEl.setAttribute("aria-hidden", "true");

  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";

  modalImg.src = "";
  currentIndex = -1;
}

function nextModal() {
  if (!shownRows.length) return;
  openModal((currentIndex + 1) % shownRows.length);
}

function prevModal() {
  if (!shownRows.length) return;
  openModal((currentIndex - 1 + shownRows.length) % shownRows.length);
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

// ---------- Helpers ----------
function normalizeRow(r) {
  return {
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
}

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
