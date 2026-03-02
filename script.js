// archive.js
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAysWFQwQwy2jXfGpQuceY5bmewB_4ix6kBknK_7BVEFlwuOS9WBtRqvcfEAe3jYjOGsa7y8wAkmCU/pub?output=csv";

const masonryEl = document.getElementById("masonry");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const countEl = document.getElementById("count");

let allRows = [];

init();

async function init() {
  setStatus("Loading archive…");

  try {
    const csvText = await fetchText(CSV_URL);
    const rows = csvToObjects(csvText);

    // Expecting columns like: src, date, location_card, description, medium, artist, keywords, feed, coordinates
    // Only keep rows with a src
    allRows = rows.filter(r => (r.src || "").trim().length > 0);

    render(allRows);
    setStatus("");
    updateCount(allRows.length, allRows.length);

    // Search
    searchEl.addEventListener("input", () => {
      const q = searchEl.value.trim().toLowerCase();
      if (!q) {
        render(allRows);
        updateCount(allRows.length, allRows.length);
        return;
      }

      const filtered = allRows.filter(r => {
        const haystack = [
          r.location_card,
          r.description,
          r.medium,
          r.artist,
          r.keywords,
          r.feed,
          r.date,
        ].join(" ").toLowerCase();

        return haystack.includes(q);
      });

      render(filtered);
      updateCount(filtered.length, allRows.length);
    });

  } catch (err) {
    console.error(err);
    setStatus("Couldn’t load the CSV. Check the link + permissions.");
  }
}

function render(rows) {
  masonryEl.innerHTML = rows.map(r => `
    <div class="image-item" onclick='openModal(${JSON.stringify(r)})'>
      <img src="${r.src}" loading="lazy" />
    </div>
  `).join("");
}
function cardHTML(r) {
  const src = safe(r.src);
  const date = safe(r.date);
  const location = safe(r.location_card);
  const desc = safe(r.description);
  const tags = safe(r.keywords);
  const artist = safe(r.artist);

  // If you want clicking to open the raw image:
  // wrap img in <a href="${src}" target="_blank" rel="noopener">
  return `
    <article class="card">
      <img
        src="${src}"
        alt="${escapeAttr(desc || location || "Archive image")}"
        loading="lazy"
        decoding="async"
        onerror="this.closest('.card').remove();"
      />
      <div class="meta">
        <div class="row1">
          <div class="location" title="${escapeAttr(location)}">${location || "—"}</div>
          <div class="date">${date || ""}</div>
        </div>

        ${desc ? `<div class="desc">${escapeHTML(desc)}</div>` : ""}

        <div class="tags" title="${escapeAttr([artist, tags].filter(Boolean).join(" • "))}">
          ${escapeHTML([artist, tags].filter(Boolean).join(" • "))}
        </div>
      </div>
    </article>
  `;
}

// ---------- Fetch ----------
async function fetchText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.text();
}

// ---------- CSV parsing (handles quotes + commas) ----------
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

// A small CSV parser that respects quoted fields
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' ) {
      if (inQuotes && next === '"') {
        field += '"';
        i++; // skip escaped quote
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
      // Handle CRLF / LF
      if (char === "\r" && next === "\n") i++;

      row.push(field);
      rows.push(row);

      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  // last field
  row.push(field);
  rows.push(row);

  // remove any fully-empty trailing row
  while (rows.length && rows[rows.length - 1].every(c => !c || !c.trim())) {
    rows.pop();
  }

  return rows;
}

// ---------- Helpers ----------
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
