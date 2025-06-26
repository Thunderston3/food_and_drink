// Foursquare API Configuration
const FOURSQUARE_BASE_URL = '/api/places'; // Using local proxy to avoid CORS

// DOM Elements
const searchView = document.getElementById('searchView');
const resultsView = document.getElementById('resultsView');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const customLocationBtn = document.getElementById('customLocationBtn');
const customLocationGroup = document.getElementById('customLocationGroup');
const locationInput = document.getElementById('locationInput');
const searchQuery = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const backToSearchBtn = document.getElementById('backToSearchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const noResults = document.getElementById('noResults');
const distanceSlider = document.getElementById('distanceSlider');
const distanceValue = document.getElementById('distanceValue');
const sortBy = document.getElementById('sortBy');
const minRatingSlider = document.getElementById('minRatingSlider');
const minRatingValue = document.getElementById('minRatingValue');
const sortByDistanceBtn = document.getElementById('sortByDistance');
const sortByRatingBtn = document.getElementById('sortByRating');
const mapContainer = document.getElementById('mapContainer');
const toggleMapViewBtn = document.getElementById('toggleMapViewBtn');

// State
let useCurrentLocation = true;
let lastResults = [];
let lastUserLocation = null;
let lastCustomLocation = null;
let map = null;
let markers = [];
let isMapView = false;

// Update slider values on input
if (distanceSlider && distanceValue) {
    distanceSlider.addEventListener('input', () => {
        distanceValue.textContent = parseFloat(distanceSlider.value).toFixed(1);
    });
}
if (minRatingSlider && minRatingValue) {
    minRatingSlider.addEventListener('input', () => {
        minRatingValue.textContent = parseFloat(minRatingSlider.value).toFixed(1);
    });
}

// Event Listeners
currentLocationBtn.addEventListener('click', () => {
    useCurrentLocation = true;
    currentLocationBtn.classList.add('active');
    customLocationBtn.classList.remove('active');
    customLocationGroup.style.display = 'none';
});

customLocationBtn.addEventListener('click', () => {
    useCurrentLocation = false;
    customLocationBtn.classList.add('active');
    currentLocationBtn.classList.remove('active');
    customLocationGroup.style.display = 'block';
});

searchBtn.addEventListener('click', performSearch);
backToSearchBtn.addEventListener('click', showSearchView);

// Sort by option selector logic
if (sortByDistanceBtn && sortByRatingBtn && sortBy) {
    sortByDistanceBtn.addEventListener('click', () => {
        sortBy.value = 'DISTANCE';
        sortByDistanceBtn.classList.add('active');
        sortByRatingBtn.classList.remove('active');
    });
    sortByRatingBtn.addEventListener('click', () => {
        sortBy.value = 'RATING';
        sortByRatingBtn.classList.add('active');
        sortByDistanceBtn.classList.remove('active');
    });
}

if (toggleMapViewBtn) {
    toggleMapViewBtn.addEventListener('click', () => {
        isMapView = !isMapView;
        if (isMapView) {
            showMapView();
        } else {
            showListView();
        }
    });
}

// Add Search for: buttons under the Location chooser
let searchForBtnGroup = document.createElement('div');
searchForBtnGroup.id = 'searchForBtnGroup';
searchForBtnGroup.style = 'margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;';
searchForBtnGroup.innerHTML = `
    <div style="font-weight: 500; margin-bottom: 2px; width: 100%;">Search for:</div>
    <button type="button" id="searchForRestaurants" class="sort-btn active" style="">Restaurants</button>
    <button type="button" id="searchForBars" class="sort-btn" style="">Bars</button>
`;
if (searchView && !document.getElementById('searchForBtnGroup')) {
    // Insert after customLocationGroup
    if (customLocationGroup && customLocationGroup.parentNode) {
        customLocationGroup.parentNode.insertBefore(searchForBtnGroup, customLocationGroup.nextSibling);
    } else {
        searchView.insertBefore(searchForBtnGroup, searchView.firstChild.nextSibling);
    }
}
const searchForRestaurantsBtn = document.getElementById('searchForRestaurants');
const searchForBarsBtn = document.getElementById('searchForBars');
let searchForValue = 'RESTAURANTS';
if (searchForRestaurantsBtn && searchForBarsBtn) {
    searchForRestaurantsBtn.addEventListener('click', () => {
        searchForValue = 'RESTAURANTS';
        searchForRestaurantsBtn.classList.add('active');
        searchForBarsBtn.classList.remove('active');
    });
    searchForBarsBtn.addEventListener('click', () => {
        searchForValue = 'BARS';
        searchForBarsBtn.classList.add('active');
        searchForRestaurantsBtn.classList.remove('active');
    });
}

// Add shared style for sort and search-for buttons
(function ensureSortAndSearchForBtnStyles() {
    let style = document.createElement('style');
    style.innerHTML = `
        .search-for-btn, .sort-by-btn {
            padding: 6px 18px;
            border-radius: 6px;
            border: 1.5px solid #1976d2;
            background: #fff;
            color: #1976d2;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s, color 0.15s;
        }
        .search-for-btn.active, .sort-by-btn.active {
            background: #1976d2;
            color: #fff;
        }
    `;
    document.head.appendChild(style);
})();

// Main search function
async function performSearch() {
    try {
        showLoading(true);
        
        let latitude, longitude;
        let customLocation = null;
        let userLocation = null;
        
        if (useCurrentLocation) {
            // Get current location from device
            const position = await getCurrentPosition();
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
            userLocation = { latitude, longitude };
        } else {
            // Convert location string to coordinates
            const locationString = locationInput.value.trim();
            if (!locationString) {
                throw new Error('Please enter a location');
            }
            
            const coords = await geocodeLocation(locationString);
            latitude = coords.latitude;
            longitude = coords.longitude;
            customLocation = { latitude, longitude };
        }
        
        // Get search parameters from UI
        const query = searchQuery.value.trim();
        const maxDistanceMiles = parseFloat(distanceSlider.value);
        const maxDistanceMeters = Math.round(maxDistanceMiles * 1609.34);
        const sort = sortBy.value;
        const minRating = parseFloat(minRatingSlider.value);
        let categoryId = '4d4b7105d754a06374d81259'; // Default: Restaurants
        if (searchForValue === 'BARS') {
            categoryId = '4bf58dd8d48988d116941735';
        }
        
        const results = await searchPlaces(latitude, longitude, query, maxDistanceMeters, sort, categoryId);
        // Filter by min rating client-side
        const filteredResults = results.filter(place => {
            if (typeof place.rating === 'number') {
                return place.rating >= minRating;
            }
            // If no rating, only show if minRating is 0
            return minRating === 0;
        });
        
        // Store for map view
        lastResults = filteredResults;
        lastUserLocation = userLocation;
        lastCustomLocation = customLocation;
        
        displayResults(filteredResults);
        showResultsView();
        isMapView = false;
        showListView();
        
    } catch (error) {
        console.error('Search error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Get current position from device
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        });
    });
}

// Geocode location string to coordinates using server endpoint
async function geocodeLocation(locationString) {
    try {
        const response = await fetch(`/api/geocode?query=${encodeURIComponent(locationString)}`);
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        const data = await response.json();
        if (!data.latitude || !data.longitude) {
            throw new Error('Location not found. Please try a different location.');
        }
        return {
            latitude: data.latitude,
            longitude: data.longitude
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        throw new Error('Failed to find location. Please check your input and try again.');
    }
}

// Search for places using Foursquare API
async function searchPlaces(latitude, longitude, query = '', radius = 3219, sort = 'DISTANCE', categoryId = '4d4b7105d754a06374d81259') {
    try {
        // Build the search URL
        const params = new URLSearchParams({
            ll: `${latitude},${longitude}`,
            radius: radius.toString(),
            fsq_category_ids: categoryId,
            sort: sort,
            limit: '50',
            fields: 'name,distance,rating,location,latitude,longitude,description'
        });
        
        if (query) {
            params.append('query', query);
        }
        
        const response = await fetch(`${FOURSQUARE_BASE_URL}/search?${params}`);
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }
        
        const data = await response.json();
        return data.results || [];
        
    } catch (error) {
        console.error('Search API error:', error);
        throw new Error('Failed to search for places. Please try again.');
    }
}

// Interpolate between red, orange, yellowish green, and deep green based on rating
function getRatingColor(rating) {
    // Clamp rating between 0 and 10
    rating = Math.max(0, Math.min(10, rating));
    // Color stops: 0 (red), 5 (orange), 7 (yellow-green), 10 (deep green)
    const stops = [
        { val: 0, color: [229, 57, 53] },      // Red #e53935
        { val: 5, color: [255, 152, 0] },      // Orange #ff9800
        { val: 7, color: [221, 255, 119] },      // Yellowish #DDFF77
        { val: 10, color: [0, 128, 0] }        // Deep Green #008000
    ];
    // Find which two stops rating is between
    let lower = stops[0], upper = stops[stops.length-1];
    for (let i = 1; i < stops.length; i++) {
        if (rating <= stops[i].val) {
            lower = stops[i-1];
            upper = stops[i];
            break;
        }
    }
    // Linear interpolation
    const t = (rating - lower.val) / (upper.val - lower.val);
    const interp = lower.color.map((c, i) => Math.round(c + (upper.color[i] - c) * t));
    return `rgb(${interp[0]},${interp[1]},${interp[2]})`;
}

// Utility to get Google Maps URL for a place
function getGoogleMapsUrl(place) {
    const mapsQuery = encodeURIComponent(
        place.name + (place.location && place.location.formatted_address ? ' ' + place.location.formatted_address : '')
    );
    return `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
}

// Utility to get Google Maps icon SVG
function getGoogleMapsIcon(width = 20, height = 20) {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' width='${width}' height='${height}'><g><circle cx='24' cy='24' r='24' fill='#fff'/><path d='M24 8c-5.52 0-10 4.48-10 10 0 7.25 8.13 17.13 8.48 17.54.38.45 1.16.45 1.54 0C25.87 35.13 34 25.25 34 18c0-5.52-4.48-10-10-10zm0 13.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z' fill='#4285F4'/><path d='M24 8v13.5c1.93 0 3.5-1.57 3.5-3.5s-1.57-3.5-3.5-3.5V8z' fill='#34A853'/><path d='M24 8c-5.52 0-10 4.48-10 10 0 7.25 8.13 17.13 8.48 17.54.38.45 1.16.45 1.54 0C25.87 35.13 34 25.25 34 18c0-5.52-4.48-10-10-10zm0 13.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z' fill='none'/></g></svg>`;
}

// Utility to determine if a color is light or dark for contrast
function isColorLight(rgbString) {
    if (!rgbString || !rgbString.startsWith('rgb')) return false; // treat as dark for safety
    const rgb = rgbString.match(/\d+/g).map(Number);
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    return brightness > 170;
}

// Utility to escape HTML for safe rendering
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function (c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}

// Display search results
function displayResults(results) {
    if (!results || results.length === 0) {
        noResults.style.display = 'block';
        resultsContainer.innerHTML = '';
        return;
    }
    
    noResults.style.display = 'none';
    
    const resultsHTML = results.map(place => {
        const distance = place.distance ? `${(place.distance * 0.000621371).toFixed(1)} mi` : 'N/A';
        const rating = place.rating ? place.rating.toFixed(1) : 'N/A';
        const color = place.rating ? getRatingColor(place.rating) : 'rgb(204,204,204)';
        const ratingTextColor = isColorLight(color) ? '#222' : '#fff';
        // Compose Google Maps search query for popup
        const mapsUrl = getGoogleMapsUrl(place);
        // Google Maps icon SVG (inline, accessible)
        const mapsIcon = getGoogleMapsIcon(22, 22);
        // Description logic
        let descriptionHtml = '';
        if (place.description) {
            const descId = `desc-list-${Math.random().toString(36).substr(2, 9)}`;
            const escapedDesc = escapeHtml(place.description);
            descriptionHtml = `
                <div class="result-description" id="${descId}" style="margin-top:6px;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;white-space:normal;line-height:1.4;font-size:13px;color:#444;">
                    ${escapedDesc}
                </div>
                <a href="#" class="desc-toggle" data-target="${descId}" style="display:none;font-size:13px;color:#1976d2;cursor:pointer;">Show more</a>
            `;
        }
        // Popup HTML
        const popupHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-weight:bold;">${place.name}</span>
                <span style="display:inline-flex;align-items:center;gap:4px;">
                    <span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${color};color:${ratingTextColor};font-weight:600;min-width:38px;text-align:center;">
                        ★ ${rating}
                    </span>
                </span>
                <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;">
                    ${mapsIcon}
                </a>
            </div>
            ${descriptionHtml}
        `;
        
        return `
            <div class="result-item">
                <div class="result-header" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div class="result-name">${place.name}</div>
                    <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps" class="maps-icon-btn" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#fff;border:1.5px solid #e0e0e0;box-shadow:0 1px 3px rgba(0,0,0,0.07);transition:box-shadow 0.2s;cursor:pointer;">
                        ${mapsIcon}
                    </a>
                </div>
                <div class="result-details">
                    <div class="result-detail">
                        📍 ${distance}
                    </div>
                    <div class="result-detail rating">
                        <span style="display:inline-flex;align-items:center;gap:6px;">
                            <span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${color};color:${ratingTextColor};font-weight:600;min-width:38px;text-align:center;">
                                ★ ${rating}
                            </span>
                        </span>
                    </div>
                </div>
                ${descriptionHtml}
            </div>
        `;
    }).join('');
    
    resultsContainer.innerHTML = resultsHTML;
}

// View management functions
function showSearchView() {
    searchView.classList.add('active');
    resultsView.classList.remove('active');
}

function showResultsView() {
    searchView.classList.remove('active');
    resultsView.classList.add('active');
}

function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
    searchBtn.disabled = show;
}

function showMapView() {
    resultsContainer.style.display = 'none';
    mapContainer.style.display = 'block';
    toggleMapViewBtn.textContent = '📋 List View';
    renderMap(lastResults, lastUserLocation, lastCustomLocation);
}

function showListView() {
    resultsContainer.style.display = 'block';
    mapContainer.style.display = 'none';
    toggleMapViewBtn.textContent = '🗺️ Map View';
}

function renderMap(results, userLocation, customLocation) {
    if (!map) {
        map = L.map('mapContainer');
    }
    // Remove all markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Set map view to fit all points
    let latlngs = [];
    results.forEach(place => {
        let lat = place.latitude;
        let lng = place.longitude;
        console.log('Map marker coordinates:', { name: place.name, lat, lng, place });
        if (lat && lng) {
            latlngs.push([lat, lng]);
        }
    });
    if (userLocation) latlngs.push([userLocation.latitude, userLocation.longitude]);
    if (customLocation) latlngs.push([customLocation.latitude, customLocation.longitude]);
    console.log('All latlngs for map bounds:', latlngs);
    if (latlngs.length > 0) {
        map.fitBounds(latlngs, { padding: [40, 40] });
    } else {
        map.setView([37.7749, -122.4194], 12); // Default to SF
    }

    // Add tile layer if not present
    if (!map._tileLayer) {
        map._tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    }

    // Add pins for results
    results.forEach(place => {
        let lat = place.latitude;
        let lng = place.longitude;
        if (lat && lng) {
            const color = place.rating ? getRatingColor(place.rating) : 'rgb(204,204,204)';
            const resultMarker = L.circleMarker([lat, lng], {
                color: color, // Border color matches rating
                fillColor: color, // Fill color matches rating
                fillOpacity: 0.85,
                radius: 10, // Same as user location marker
                weight: 2
            }).addTo(map);
            // Description logic
            let descriptionHtml = '';
            if (place.description) {
                const descId = `desc-map-${Math.random().toString(36).substr(2, 9)}`;
                const escapedDesc = escapeHtml(place.description);
                descriptionHtml = `
                    <div class="popup-description" id="${descId}" style="margin-top:6px;max-width:320px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;white-space:normal;line-height:1.4;font-size:13px;color:#444;">
                        ${escapedDesc}
                    </div>
                    <a href="#" class="desc-toggle" data-target="${descId}" style="display:none;font-size:13px;color:#1976d2;cursor:pointer;">Show more</a>
                `;
            }
            // Popup HTML
            const ratingTextColor = isColorLight(color) ? '#222' : '#fff';
            const mapsUrl = getGoogleMapsUrl(place);
            const mapsIcon = getGoogleMapsIcon(20, 20);
            const distanceStr = place.distance !== undefined && place.distance !== null
                ? `${(place.distance * 0.000621371).toFixed(1)} mi`
                : '';
            const popupHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-weight:bold;">${place.name}</span>
                    <span style="display:inline-flex;align-items:center;gap:4px;">
                        <span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${color};color:${ratingTextColor};font-weight:600;min-width:38px;text-align:center;">
                            ★ ${place.rating !== undefined ? place.rating : 'N/A'}
                        </span>
                    </span>
                    <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;">
                        ${mapsIcon}
                    </a>
                </div>
                <div style="margin-top:2px;font-size:13px;color:#555;">
                    ${distanceStr}
                </div>
                ${descriptionHtml}
            `;
            resultMarker.bindPopup(popupHTML);
            markers.push(resultMarker);
        }
    });
    // User location pin (blue)
    if (userLocation) {
        const userMarker = L.circleMarker([userLocation.latitude, userLocation.longitude], {
            color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.8, radius: 10
        }).addTo(map);
        userMarker.bindPopup('Your Location');
        markers.push(userMarker);
    }
    // Custom location pin (orange)
    if (customLocation) {
        const customMarker = L.circleMarker([customLocation.latitude, customLocation.longitude], {
            color: '#ff9800', fillColor: '#ff9800', fillOpacity: 0.8, radius: 10
        }).addTo(map);
        customMarker.bindPopup('Search Location');
        markers.push(customMarker);
    }
}

// Dynamically set the height of #mapContainer to fill available vertical space
function setMapContainerHeight() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    // If you have a header, set its height here (e.g., 60px)
    const header = document.querySelector('header');
    let headerHeight = header ? header.offsetHeight : 0;
    mapContainer.style.height = `calc(100vh - ${headerHeight}px)`;
    mapContainer.style.top = header ? `${headerHeight}px` : '0';
}
window.addEventListener('resize', setMapContainerHeight);
document.addEventListener('DOMContentLoaded', setMapContainerHeight);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check if API key is configured
    if (FOURSQUARE_API_KEY === 'YOUR_FOURSQUARE_API_KEY') {
        alert('Please configure your Foursquare API key in script.js');
        searchBtn.disabled = true;
    }
});

// Add event delegation for show more/less toggles
if (!window._descToggleHandlerAdded) {
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('desc-toggle')) {
            e.preventDefault();
            const targetId = e.target.getAttribute('data-target');
            const descDiv = document.getElementById(targetId);
            if (!descDiv) return;
            const isCollapsed = descDiv.style.webkitLineClamp === '3' || descDiv.classList.contains('collapsed');
            if (isCollapsed) {
                descDiv.style.display = 'block';
                descDiv.style.webkitLineClamp = 'unset';
                descDiv.classList.remove('collapsed');
                e.target.textContent = 'Show less';
            } else {
                descDiv.style.display = '-webkit-box';
                descDiv.style.webkitLineClamp = '3';
                descDiv.classList.add('collapsed');
                e.target.textContent = 'Show more';
            }
        }
    });
    window._descToggleHandlerAdded = true;
}

// After rendering, show the toggle if needed
function showDescToggles() {
    document.querySelectorAll('.result-description, .popup-description').forEach(descDiv => {
        if (descDiv.scrollHeight > descDiv.clientHeight + 2) {
            const toggle = descDiv.parentElement.querySelector('.desc-toggle');
            if (toggle) toggle.style.display = 'inline';
        }
    });
}
setTimeout(showDescToggles, 0); 