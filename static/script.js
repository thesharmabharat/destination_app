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
    map = L.map('map').setView([19.1230, 72.8277], 15); // Mumbai default

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Load saved places without altering view
    fetch('/api/places')
        .then(res => res.json())
        .then(data => {
            data.forEach(place => {
                const icon = place.status === 'visited' ? visitedIcon : toVisitIcon;
                addMarkerToMap(place.name, place.lat, place.lon, icon);
                if (place.status === 'visited') visitedList.push(place);
                else toVisitList.push(place);
            });
            updateLists();
        });

    setTimeout(() => {
        map.invalidateSize();  // recalculate map size after render
    }, 500);
}

function searchPlace() {
    const query = document.getElementById('search-input').value;
    if (!query) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=IN`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);

                map.setView([19, 100], 5);
                addMarkerToMap(result.display_name, lat, lon, toVisitIcon, true);
            }
        });
}

function addToVisit(name, lat, lon) {
    if (toVisitList.some(item => item.name === name)) return;

    const place = { name, lat, lon, status: "to_visit" };
    toVisitList.push(place);
    updateLists();

    // Save to backend
    fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(place)
    });
}

function markAsVisited(index) {
    const place = toVisitList.splice(index, 1)[0];

    // avoid re-adding if already in visited
    if (!visitedList.some(p => p.name === place.name && p.lat === place.lat && p.lon === place.lon)) {
        place.status = "visited";
        visitedList.push(place);
    }

    updateMarker(place.name, visitedIcon);
    updateLists();

    fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(place)
    });
}

function updateLists() {
    const toVisitListElement = document.getElementById('to-visit-list');
    const visitedListElement = document.getElementById('visited-list');

    toVisitListElement.innerHTML = toVisitList.map((place, index) => `
        <li>
            ${place.name}
            <button onclick="markAsVisited(${index})">Mark as Visited</button>
        </li>
    `).join('');

    visitedListElement.innerHTML = visitedList.map(place => `
        <li>${place.name}</li>
    `).join('');
}

function addMarkerToMap(name, lat, lon, icon, allowBookmark = false) {
    const marker = L.marker([lat, lon], { icon }).addTo(map);
    markers.push({ name, marker });

    const content = `
        <b>${name}</b><br>
        ${allowBookmark ? `<button onclick="addToVisit('${name}', ${lat}, ${lon})">Bookmark</button>` : icon === visitedIcon ? 'Visited' : 'To Visit'}
    `;
    marker.bindPopup(content).openPopup();
}

function updateMarker(name, newIcon) {
    const markerObj = markers.find(m => m.name === name);
    if (markerObj) {
        markerObj.marker.setIcon(newIcon);
        markerObj.marker.getPopup().setContent(`<b>${name}</b><br>Visited`);
    }
}

window.onload = initMap;
