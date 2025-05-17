let map;
let markers = [];
let toVisitList = [];
let visitedList = [];

const toVisitIcon = L.divIcon({
  html: '<i class="fa fa-map-marker-alt" style="color: yellow; font-size: 32px;"></i>',
  iconSize: [32, 32],
  className: 'leaflet-marker-icon'
});

const visitedIcon = L.divIcon({
  html: '<i class="fa fa-map-marker-alt" style="color: green; font-size: 32px;"></i>',
  iconSize: [32, 32],
  className: 'leaflet-marker-icon'
});

function initMap() {
  map = L.map('map').setView([19.1230, 72.8277], 15); // Mumbai
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  loadPlaces();

  // Fix map display inside flex containers
  setTimeout(() => map.invalidateSize(), 500);
}

function loadPlaces() {
  fetch('/api/places')
    .then(res => res.json())
    .then(data => {
      // reset everything
      removeAllMarkers();
      toVisitList = [];
      visitedList = [];

      data.forEach(p => {
        // sort into lists
        if (p.status === 'visited') visitedList.push(p);
        else toVisitList.push(p);

        // add marker
        const icon = (p.status === 'visited') ? visitedIcon : toVisitIcon;
        addMarkerToMap(p.name, p.lat, p.lon, icon, p.status === 'to_visit');
      });

      updateLists();
    });
}

function searchPlace() {
  const query = document.getElementById('search-input').value;
  if (!query) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=IN`)
    .then(r => r.json())
    .then(data => {
      if (!data.length) return;
      const r = data[0];
      const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
      map.setView([lat, lon], 13);
      addMarkerToMap(r.display_name, lat, lon, toVisitIcon, true);
    });
}

function addToVisit(name, lat, lon) {
  // prevent dupes
  if (toVisitList.some(p=>p.name===name && p.lat===lat && p.lon===lon)) return;
  if (visitedList.some(p=>p.name===name && p.lat===lat && p.lon===lon)) return;

  const place = { name, lat, lon, status: 'to_visit' };
  fetch('/api/places', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(place)
  })
  .then(()=>loadPlaces());
}

function markAsVisited(place) {
  place.status = 'visited';
  fetch('/api/places', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(place)
  })
  .then(()=>loadPlaces());
}

function deleteToVisit(place) {
  fetch('/api/places', {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(place)
  })
  .then(()=>loadPlaces());
}

function deleteVisited(place) {
  fetch('/api/places', {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(place)
  })
  .then(()=>loadPlaces());
}

function updateLists() {
  const toEl = document.getElementById('to-visit-list');
  const vEl = document.getElementById('visited-list');

  // To Visit
  toEl.innerHTML = '';
  toVisitList.forEach(place => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${place.name}
      <div style="display:flex;gap:6px;">
        <button class="visit-btn">Visited</button>
        <button class="delete-btn" style="background-color:#e74c3c">Delete</button>
      </div>
    `;
    li.querySelector('.visit-btn')
      .addEventListener('click', ()=>markAsVisited(place));
    li.querySelector('.delete-btn')
      .addEventListener('click', ()=>deleteToVisit(place));
    toEl.appendChild(li);
  });

  // Visited
  vEl.innerHTML = '';
  visitedList.forEach(place => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${place.name}
      <button class="delete-btn" style="background-color:#e74c3c">Delete</button>
    `;
    li.querySelector('.delete-btn')
      .addEventListener('click', ()=>deleteVisited(place));
    vEl.appendChild(li);
  });
}

function removeAllMarkers() {
  markers.forEach(m => map.removeLayer(m.marker));
  markers = [];
}

function addMarkerToMap(name, lat, lon, icon, allowBookmark = false) {
const marker = L.marker([lat, lon], { icon }).addTo(map);
markers.push({ name, marker });

// build the popup HTML
let html = `<b>${name}</b><br>`;
if (allowBookmark) {
    html += `<button id="bookmark-btn">Bookmark</button>`;
} else {
    html += (icon === visitedIcon ? 'Visited' : 'To Visit');
}

// bind, attach listener, then open if needed
marker.bindPopup(html);

marker.on('popupopen', () => {
    if (allowBookmark) {
    const btn = document.getElementById('bookmark-btn');
    if (btn) {
        btn.addEventListener('click', () => {
        addToVisit(name, lat, lon);
        marker.closePopup();
        });
    }
    }
});

// **this is the missing piece** — open the popup immediately
if (allowBookmark) {
    marker.openPopup();
}
}
  

window.onload = initMap;
