(() => {
  const viewer = document.getElementById("viewer");
  const imgEl = document.getElementById("viewer-img");

  const titleEl = document.getElementById("viewer-title");
  const dateEl = document.getElementById("viewer-date");
  const locEl = document.getElementById("viewer-location");
  const photogEl = document.getElementById("viewer-photographer");
  const descEl = document.getElementById("viewer-description");

  let currentList = [];
  let currentIndex = -1;

  // Public API called by script.js
  window.openViewer = function openViewer(row, idx, list) {
    currentList = Array.isArray(list) ? list : [];
    currentIndex = Number.isFinite(idx) ? idx : -1;

    setViewer(row);
    showViewer();
  };

  function setViewer(row) {
    imgEl.src = row.src || "";
    imgEl.alt = row.title || row.description || "Photo";

    titleEl.textContent = row.title || "";
    dateEl.textContent = row.date || "";
    locEl.textContent = row.location_card || "";
    photogEl.textContent = row.photographer || "";
    descEl.textContent = row.description || "";
  }

  function showViewer() {
    viewer.classList.add("active");
    viewer.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function closeViewer() {
    viewer.classList.remove("active");
    viewer.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    // optional: drop src to reduce memory
    imgEl.src = "";

    currentIndex = -1;
    currentList = [];
  }

  function next() {
    if (!currentList.length) return;
    currentIndex = (currentIndex + 1) % currentList.length;
    setViewer(currentList[currentIndex]);
  }

  function prev() {
    if (!currentList.length) return;
    currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    setViewer(currentList[currentIndex]);
  }

  // Click-to-close on elements marked data-viewer-close
  viewer.addEventListener("click", (e) => {
    const closeTarget = e.target.closest("[data-viewer-close='1']");
    if (closeTarget) closeViewer();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (!viewer.classList.contains("active")) return;

    if (e.key === "Escape") closeViewer();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });
})();
