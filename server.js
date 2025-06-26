const FOURSQUARE_API_KEY = '0ZTY1MZ302GH4MX2PUAB52CPDGC401NGST04M3DX0TKCAKA3'; // Replace with your actual API key
const GOOGLE_MAPS_API_KEY = 'AIzaSyBTvza_VUjwum7vAFlaqu8tbJEjgxqPS5Y';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Shared function to call Foursquare Places Search API with logging
async function callFoursquarePlacesSearch(url)  {
    const requestOptions = {
        headers: {
            'Authorization': 'Bearer ' + FOURSQUARE_API_KEY,
            'X-Places-Api-Version': '2025-06-17',
            'Accept': 'application/json'
        }
    };

    // Log the outgoing request
    console.log('Calling Foursquare Places API with URL:', url);
    console.log('Request Options:', requestOptions);

    const response = await fetch(url, requestOptions);

    // Clone the response to read a snippet of the body without consuming the stream
    const clonedResponse = response.clone();
    let snippet = '';
    try {
        const text = await clonedResponse.text();
        snippet = text.substring(0, 300); // Log first 300 chars
    } catch (err) {
        snippet = '[Could not read response body]';
    }
    console.log('Foursquare API Response Status:', response.status);
    console.log('Foursquare API Response Snippet:', snippet);

    return response;
}

// Proxy endpoint for Foursquare API calls
app.get('/api/places/*', async (req, res) => {
    try {
        const foursquarePath = req.path.replace('/api/places', '');
        const queryString = req.url.split('?')[1] || '';
        const foursquareUrl = `https://places-api.foursquare.com/places${foursquarePath}${queryString ? '?' + queryString : ''}`;

        // Log the incoming request and proxied URL
        console.log('--- Proxying Foursquare API Request ---');
        console.log('Request URL:', req.originalUrl);
        console.log('Proxied Foursquare URL:', foursquareUrl);

        const response = await callFoursquarePlacesSearch(foursquareUrl);
        console.log('Foursquare Response Status:', response.status);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Foursquare' });
    }
});

// Geocode endpoint for lat/long lookup from a location string
app.get('/api/geocode', async (req, res) => {
    console.log('--- /api/geocode endpoint called ---');
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ error: 'Missing query parameter' });
    }
    try {
        // Use Google Maps Geocoding API instead of Foursquare
        if (!GOOGLE_MAPS_API_KEY) {
            return res.status(500).json({ error: 'Google Maps API key not configured on server' });
        }
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
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
        res.json({
            latitude: first.geometry.location.lat,
            longitude: first.geometry.location.lng
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to geocode location' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📱 Open your browser and navigate to: http://localhost:${PORT}`);
}); 