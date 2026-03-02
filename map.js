// ============================================================================
// CORCORAN PHOTO ARCHIVE - MAP MODULE
// Interactive map with clickable markers showing images and metadata
// ============================================================================

(function() {
  'use strict';

  let map = null;
  let markers = [];
  let mapVisible = false;
  let currentMapLayer = 'standard';
  let currentRows = []; // Store current rows locally

  // Map layers
  let standardLayer = null;
  let satelliteLayer = null;

  // ============================================================================
  // LAYER TOGGLE
  // ============================================================================

  function toggleMapLayer() {
    if (!map) return;
    
    if (currentMapLayer === 'standard') {
      map.removeLayer(standardLayer);
      satelliteLayer.addTo(map);
      currentMapLayer = 'satellite';
      
      const layerBtn = document.getElementById('mapLayerBtn');
      if (layerBtn) {
        layerBtn.textContent = 'SAT';
      }
    } else {
      map.removeLayer(satelliteLayer);
      standardLayer.addTo(map);
      currentMapLayer = 'standard';
      
      const layerBtn = document.getElementById('mapLayerBtn');
      if (layerBtn) {
        layerBtn.innerHTML = `
          <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
            <path d="M 13 1.188 L 2.094 6.688 L 13 12.219 L 23.906 6.688 Z M 13 14.813 L 2.094 9.313 L 2 19.688 L 13 25.219 L 24 19.688 L 23.906 9.313 Z" fill="currentColor"/>
          </svg>
        `;
      }
    }
  }

  // ============================================================================
  // MAP INITIALIZATION
  // ============================================================================

  function initMap() {
    if (map) return;

    console.log('Initializing map...');

    map = L.map('map', {
      center: [38.9072, -77.0369], // Washington DC
      zoom: 12,
      zoomControl: true
    });

    standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    });

    satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 19
    });

    standardLayer.addTo(map);
    console.log('Map initialized successfully');
  }

  // ============================================================================
  // COORDINATE PARSING
  // ============================================================================

  function parseCoordinates(coordString) {
    if (!coordString || typeof coordString !== 'string') return null;

    coordString = coordString.trim();

    const patterns = [
      /^([-+]?\d+\.?\d*)[,\s]+([-+]?\d+\.?\d*)$/,
      /^([-+]?\d+\.?\d*)\s*[,;]\s*([-+]?\d+\.?\d*)$/
    ];

    for (const pattern of patterns) {
      const match = coordString.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return { lat, lon };
        }
      }
    }

    return null;
  }

  // ============================================================================
  // MARKER CREATION
  // ============================================================================

  function createMarker(items, coords) {
    const itemsArray = Array.isArray(items) ? items : [items];
    let currentIndex = 0;

    const marker = L.circleMarker([coords.lat, coords.lon], {
      radius: 8,
      fillColor: '#2a81d6',
      color: '#2a81d6',
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0.9
    });

    function updatePopup() {
      const item = itemsArray[currentIndex];
      const popupContent = createPopupContent(item, currentIndex, itemsArray.length);
      
      if (marker.getPopup()) {
        marker.getPopup().setContent(popupContent);
      } else {
        marker.bindPopup(popupContent, {
          maxWidth: 400,
          minWidth: 300,
          className: 'map-popup'
        });
      }
    }

    function attachNavigationListeners() {
      if (itemsArray.length > 1) {
        const prevBtn = document.querySelector('.popup-prev-btn');
        const nextBtn = document.querySelector('.popup-next-btn');
        
        if (prevBtn) {
          prevBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            currentIndex = (currentIndex - 1 + itemsArray.length) % itemsArray.length;
            updatePopup();
            
            setTimeout(() => {
              attachPopupEventListeners(itemsArray, currentIndex);
              attachNavigationListeners();
            }, 100);
          };
        }
        
        if (nextBtn) {
          nextBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            currentIndex = (currentIndex + 1) % itemsArray.length;
            updatePopup();
            
            setTimeout(() => {
              attachPopupEventListeners(itemsArray, currentIndex);
              attachNavigationListeners();
            }, 100);
          };
        }
      }
    }

    updatePopup();

    marker.on('popupopen', function(e) {
      updatePopup();
      
      setTimeout(() => {
        attachPopupEventListeners(itemsArray, currentIndex);
        attachNavigationListeners();
      }, 100);
    });

    marker.addTo(map);

    return marker;
  }

  function attachPopupEventListeners(itemsArray, currentIndex) {
    const popupImg = document.querySelector('.map-popup-image');
    if (popupImg) {
      const item = itemsArray[currentIndex];
      const index = currentRows.findIndex(r => r.src === item.src);
      
      if (index !== -1) {
        popupImg.style.cursor = 'pointer';
        popupImg.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          if (map) {
            map.closePopup();
          }
          
          // Close the map view first
          toggleMap();
          
          // Then open the viewer
          if (typeof window.openViewer === 'function') {
            window.openViewer(item, index, currentRows);
          }
        };
      }
    }
  }

  function createPopupContent(item, currentIndex, totalItems) {
    const div = document.createElement('div');
    div.className = 'map-popup-content';
    div.style.cssText = 'text-align: center;';

    if (totalItems > 1) {
      const nav = document.createElement('div');
      nav.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding: 8px;
        background: #f5f5f5;
        border: 1px solid #000;
      `;
      
      const prevBtn = document.createElement('button');
      prevBtn.className = 'popup-prev-btn';
      prevBtn.innerHTML = '←';
      prevBtn.style.cssText = `
        background: white;
        border: 2px solid #000;
        padding: 4px 12px;
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        transition: background-color 0.2s, color 0.2s;
      `;
      prevBtn.onmouseover = function() {
        this.style.backgroundColor = '#000';
        this.style.color = 'white';
      };
      prevBtn.onmouseout = function() {
        this.style.backgroundColor = 'white';
        this.style.color = '#000';
      };
      
      const counter = document.createElement('span');
      counter.textContent = `${currentIndex + 1} of ${totalItems}`;
      counter.style.cssText = 'font-weight: bold; font-size: 14px;';
      
      const nextBtn = document.createElement('button');
      nextBtn.className = 'popup-next-btn';
      nextBtn.innerHTML = '→';
      nextBtn.style.cssText = `
        background: white;
        border: 2px solid #000;
        padding: 4px 12px;
        cursor: pointer;
        font-size: 18px;
        font-weight: bold;
        transition: background-color 0.2s, color 0.2s;
      `;
      nextBtn.onmouseover = function() {
        this.style.backgroundColor = '#000';
        this.style.color = 'white';
      };
      nextBtn.onmouseout = function() {
        this.style.backgroundColor = 'white';
        this.style.color = '#000';
      };
      
      nav.appendChild(prevBtn);
      nav.appendChild(counter);
      nav.appendChild(nextBtn);
      div.appendChild(nav);
    }

    const img = document.createElement('img');
    img.src = item.src;
    img.className = 'map-popup-image';
    img.style.cssText = `
      width: 100%;
      max-height: 250px;
      object-fit: contain;
      margin-bottom: 12px;
      border: 2px solid #000;
    `;
    div.appendChild(img);

    const metadata = document.createElement('div');
    metadata.style.cssText = `
      text-align: left;
      font-size: 14px;
      line-height: 1.6;
      font-family: Helvetica, sans-serif;
      padding: 8px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    `;

    let metadataHTML = '';
    
    if (item.title) {
      metadataHTML += `<div style="margin-bottom: 6px; font-weight: bold;">${item.title}</div>`;
    }
    
    if (item.date) {
      metadataHTML += `<div style="margin-bottom: 6px;"><strong>Date:</strong> ${item.date}</div>`;
    }
    
    if (item.location_card) {
      metadataHTML += `<div style="margin-bottom: 6px;"><strong>Location:</strong><br>${item.location_card.replace(/\n/g, '<br>')}</div>`;
    }
    
    if (item.photographer) {
      metadataHTML += `<div><strong>Photographer:</strong> ${item.photographer}</div>`;
    }

    metadata.innerHTML = metadataHTML;
    div.appendChild(metadata);

    const hint = document.createElement('div');
    hint.style.cssText = `
      margin-top: 10px;
      font-size: 12px;
      color: #666;
      font-style: italic;
    `;
    hint.textContent = 'Click image to view full size';
    div.appendChild(hint);

    return div;
  }

  // ============================================================================
  // LOAD MAP DATA
  // ============================================================================

  function loadMapData(rows) {
    console.log('=== loadMapData called ===');
    console.log('Total rows:', rows.length);
    
    // Debug: log first few rows to see structure
    if (rows.length > 0) {
      console.log('Sample row:', rows[0]);
      console.log('Row keys:', Object.keys(rows[0]));
    }
    
    if (!map) {
      console.log('Map not initialized, initializing now...');
      initMap();
    }

    // Store rows for later use
    currentRows = rows;

    markers.forEach(marker => marker.remove());
    markers = [];

    const locationGroups = {};
    let validCount = 0;
    let invalidCount = 0;

    rows.forEach((item, index) => {
      const coordString = item.coordinates || '';
      
      if (coordString) {
        console.log(`Row ${index}: coordinates = "${coordString}"`);
        const coords = parseCoordinates(coordString);
        
        if (coords) {
          console.log(`  ✓ Parsed: ${coords.lat}, ${coords.lon}`);
          const coordKey = `${coords.lat.toFixed(6)},${coords.lon.toFixed(6)}`;
          
          if (!locationGroups[coordKey]) {
            locationGroups[coordKey] = {
              coords: coords,
              items: []
            };
          }
          
          locationGroups[coordKey].items.push(item);
          validCount++;
        } else {
          console.log(`  ✗ Failed to parse coordinates: "${coordString}"`);
          invalidCount++;
        }
      } else {
        // Only log first few empty ones to avoid spam
        if (index < 5) {
          console.log(`Row ${index}: no coordinates`);
        }
      }
    });

    console.log('Location groups:', Object.keys(locationGroups).length);

    Object.values(locationGroups).forEach(location => {
      const marker = createMarker(location.items, location.coords);
      markers.push(marker);
    });

    console.log(`Map loaded: ${validCount} items at ${markers.length} unique locations, ${invalidCount} invalid coordinates`);

    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    } else {
      console.warn('No markers to display on map!');
    }

    return validCount;
  }

  // ============================================================================
  // MAP TOGGLE
  // ============================================================================

  function toggleMap() {
    const mapContainer = document.getElementById('mapContainer');
    const mapToggleBtn = document.getElementById('mapToggleBtn');
    
    console.log('toggleMap called', { 
      mapContainer: !!mapContainer, 
      mapToggleBtn: !!mapToggleBtn, 
      mapVisible,
      currentRows: currentRows.length 
    });
    
    if (!mapContainer || !mapToggleBtn) {
      console.error('Required elements not found');
      return;
    }

    mapVisible = !mapVisible;

    if (mapVisible) {
      mapContainer.style.display = 'block';
      mapToggleBtn.classList.add('active');
      
      if (!map) {
        console.log('Initializing map...');
        initMap();
      }
      
      // Get current data from global scope
      if (typeof window.getShownRows === 'function') {
        const rows = window.getShownRows();
        console.log('Got', rows.length, 'rows from window.getShownRows()');
        loadMapData(rows);
      } else {
        console.warn('window.getShownRows() not available');
      }
      
      setTimeout(() => {
        if (map) {
          console.log('Invalidating map size...');
          map.invalidateSize();
        }
      }, 100);
    } else {
      console.log('Hiding map');
      mapContainer.style.display = 'none';
      mapToggleBtn.classList.remove('active');
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  window.toggleMap = toggleMap;
  window.loadMapData = loadMapData;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function initMapModule() {
    console.log('Map module initializing...');
    
    const mapToggleBtn = document.getElementById('mapToggleBtn');
    if (mapToggleBtn) {
      console.log('Found map toggle button, attaching listener');
      mapToggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Map button clicked!');
        toggleMap();
      });
    } else {
      console.error('Map toggle button not found!');
    }

    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
      const layerBtn = document.createElement('button');
      layerBtn.id = 'mapLayerBtn';
      layerBtn.innerHTML = `
        <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <path d="M 13 1.188 L 2.094 6.688 L 13 12.219 L 23.906 6.688 Z M 13 14.813 L 2.094 9.313 L 2 19.688 L 13 25.219 L 24 19.688 L 23.906 9.313 Z" fill="currentColor"/>
        </svg>
      `;
      layerBtn.onclick = toggleMapLayer;
      mapContainer.appendChild(layerBtn);
    }

    const style = document.createElement('style');
    style.textContent = `
      .leaflet-popup-content-wrapper {
        border-radius: 0 !important;
        border: 2px solid #000 !important;
      }
      
      .leaflet-popup-tip {
        border: 2px solid #000 !important;
      }
      
      .map-popup-content {
        padding: 8px;
      }
      
      .map-popup-image {
        transition: opacity 0.2s;
      }
      
      .map-popup-image:hover {
        opacity: 0.8;
      }

      #mapLayerBtn {
        position: absolute;
        top: 10px;
        right: 20px;
        width: 45px;
        height: 45px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        border-radius: 0;
        border: 2px solid #000;
        background: white;
        color: #000;
        cursor: pointer;
        font-family: Helvetica, sans-serif;
        transition: background-color 0.2s, color 0.2s;
        z-index: 1001;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }

      #mapLayerBtn:hover {
        background-color: #000;
        color: white;
      }

      #mapLayerBtn svg {
        display: block;
      }

      .leaflet-control-zoom {
        border: 2px solid #000 !important;
        border-radius: 0 !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
      }

      .leaflet-control-zoom a {
        border-radius: 0 !important;
        border-bottom: 1px solid #000 !important;
        border-left: none !important;
        border-right: none !important;
        border-top: none !important;
        color: #000 !important;
        background: white !important;
        width: 45px !important;
        height: 45px !important;
        line-height: 45px !important;
        font-size: 18px !important;
      }

      .leaflet-control-zoom a:last-child {
        border-bottom: none !important;
      }

      .leaflet-control-zoom a:hover {
        background: #000 !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
    
    console.log('Map module initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMapModule);
  } else {
    initMapModule();
  }

})();
