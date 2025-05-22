// static/script.js

let map,
    markers = [],
    toVisitList = [],
    visitedList = [];

// Marker icons (FontAwesome)
const toVisitIcon = L.divIcon({
  html: '<i class="fa fa-map-marker-alt" style="color:yellow;font-size:32px;"></i>',
  iconSize: [32,32],
  className: 'leaflet-marker-icon'
});
const visitedIcon = L.divIcon({
  html: '<i class="fa fa-map-marker-alt" style="color:green;font-size:32px;"></i>',
  iconSize: [32,32],
  className: 'leaflet-marker-icon'
});

// INITIALIZE
function initMap() {
  map = L.map('map').setView([19.0760, 72.8777], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  loadPlaces();
  // fix leaflet inside flex
  setTimeout(() => map.invalidateSize(), 300);

  // DELEGATED LISTENER for all future .bookmark-btn clicks
  document.body.addEventListener('click', e => {
    const btn = e.target.closest('.bookmark-btn');
    if (!btn) return;
    const name = btn.dataset.name;
    const lat  = parseFloat(btn.dataset.lat);
    const lon  = parseFloat(btn.dataset.lon);
    addToVisit({ name, lat, lon, status: 'to_visit' });
    map.closePopup();
  });
}

// LOAD & RENDER
function loadPlaces() {
  fetch('/api/places')
    .then(r => r.json())
    .then(data => {
      // clear markers & data
      markers.forEach(m => map.removeLayer(m.marker));
      markers = []; toVisitList = []; visitedList = [];

      data.forEach(p => {
        if (p.status === 'visited') visitedList.push(p);
        else toVisitList.push(p);
        addMarkerToMap(p, p.status === 'to_visit');
      });

      updateLists();
    });
}

// SEARCH
function searchPlace() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=IN`)
    .then(r => r.json())
    .then(results => {
      if (!results.length) return alert('No results found');
      const { display_name:name, lat, lon } = results[0];
      const la = parseFloat(lat), lo = parseFloat(lon);
      map.setView([la,lo], 13);
      // temporary marker with bookmark allowed
      addMarkerToMap({ name, lat:la, lon:lo }, true);
    });
}

// CRUD helpers
function addToVisit(place) {
  place.status = 'to_visit';
  fetch('/api/places', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(place)
  }).then(loadPlaces);
}

function markAsVisited(place) {
  place.status = 'visited';
  fetch('/api/places', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(place)
  }).then(loadPlaces);
}

function deletePlace(place) {
  fetch('/api/places', {
    method: 'DELETE',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(place)
  }).then(loadPlaces);
}

// LIST UI
function updateLists() {
  const toEl = document.getElementById('to-visit-list'),
        vEl  = document.getElementById('visited-list');
  toEl.innerHTML = '';
  vEl .innerHTML = '';

  toVisitList.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${p.name}
      <div class="btn-group">
        <button class="btn-visit">Visited</button>
        <button class="btn-delete">Delete</button>
      </div>
    `;
    li.querySelector('.btn-visit').onclick  = () => markAsVisited(p);
    li.querySelector('.btn-delete').onclick = () => deletePlace(p);
    toEl.appendChild(li);
  });

  visitedList.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${p.name}
      <div class="btn-group">
        <button class="btn-delete">Delete</button>
        <button class="btn-notes">Notes</button>
      </div>
    `;
    li.querySelector('.btn-delete').onclick = () => deletePlace(p);
    li.querySelector('.btn-notes').onclick  = () => openNotesModal(p);
    vEl.appendChild(li);
  });
}

// MARKERS
function addMarkerToMap(place, allowBookmark=false) {
  const { name, lat, lon, status } = place;
  const icon = (status==='visited') ? visitedIcon : toVisitIcon;
  const marker = L.marker([lat, lon], { icon }).addTo(map);
  markers.push({ name, marker });

  // Fancy popup with data attrs
  let html = `<b>${name}</b><br>`;
  if (allowBookmark) {
    html += `<button class="bookmark-btn"
                  data-name="${name}"
                  data-lat="${lat}"
                  data-lon="${lon}">
                Bookmark
             </button>`;
  } else {
    html += (status==='visited' ? 'Visited' : 'To Visit');
  }

  marker.bindPopup(html);
  if (allowBookmark) marker.openPopup();
}

// NOTES modal
function openNotesModal(p) {
  const note = prompt('Your notes:', p.note||'');
  const date = prompt('Visited on (YYYY-MM-DD):', p.visited_on||'');
  p.note = note; p.visited_on = date;
  fetch('/api/places',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(p)
  }).then(loadPlaces);
}

// GEOLOCATE
function useMyLocation() {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(
    ({coords}) => map.setView([coords.latitude, coords.longitude],14),
    () => alert('Permission denied')
  );
}

window.onload = initMap;
