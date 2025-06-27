// Import configuration
const config = require('./config');

// Geocode endpoint for lat/long lookup from a location string
async function google_geocode_reuest(req, res) {
    console.log('--- /api/geocode endpoint called ---');
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }
    try {
        // Use Google Maps Geocoding API instead of Foursquare
        if (!config.GOOGLE_MAPS_API_KEY) {
            return res.status(500).json({ error: 'Google Maps API key not configured on server' });
        }
        const url = config.GOOGLE_MAPS_GEOCODE_URL + `?address=${encodeURIComponent(query)}&key=${config.GOOGLE_MAPS_API_KEY}`;
        console.log('Geocode request URL (Google Maps):', url);

        let response;
        try {
            response = await fetch(url);
        } catch (err) {
            console.error('Error calling Google Maps Geocoding API:', err);
            return res.status(500).json({ error: 'Failed to call Google Maps Geocoding API' });
        }

        // Read a snippet of the response body for logging
        let snippet = '';
        try {
            const text = await response.clone().text();
            snippet = text.substring(0, 300);
        } catch (err) {
            snippet = '[Could not read response body]';
        }
        console.log('Google Maps Geocode API Response Snippet:', snippet);

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }
        const first = data.results[0];
        if (!first.geometry || !first.geometry.location) {
            return res.status(404).json({ error: 'No geocode found for location' });
        }
        return json({
            latitude: first.geometry.location.lat,
            longitude: first.geometry.location.lng
        });
    } catch (err) {
        return json({ error: 'Failed to geocode location' });
    }
};