# 🍽️ Food & Drink Finder

A modern, mobile-friendly web application that helps users find bars and restaurants using location-based search powered by the Foursquare Places API.

## Features

- **Location-based Search**: Use current device location or enter a custom location
- **Smart Geocoding**: Automatically converts location strings to coordinates
- **Optional Search Queries**: Filter results by specific food types, cuisines, or keywords
- **2-Mile Radius Search**: Finds places within a 2-mile radius of the specified location
- **Rich Results Display**: Shows business names, distances, and customer ratings
- **Mobile-Optimized**: Responsive design that works great on mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations

## Setup Instructions

### 1. Get a Foursquare API Key

1. Visit the [Foursquare Developer Portal](https://developer.foursquare.com/)
2. Create an account and register your application
3. Get your API key from the dashboard
4. Make sure your API key has access to the Places API

### 2. Configure the Application

1. Open `script.js` in your code editor
2. Replace `'YOUR_FOURSQUARE_API_KEY'` on line 2 with your actual API key:

```javascript
const FOURSQUARE_API_KEY = 'your_actual_api_key_here';
```

### 3. Run the Application

Since this is a client-side application that makes API calls, you'll need to serve it from a web server due to CORS restrictions. Here are a few options:

#### Option A: Using Python (if you have Python installed)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option B: Using Node.js (if you have Node.js installed)
```bash
# Install a simple HTTP server globally
npm install -g http-server

# Run the server
http-server -p 8000
```

#### Option C: Using Live Server (VS Code extension)
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html` and select "Open with Live Server"

### 4. Access the Application

Open your web browser and navigate to:
- If using Python or Node.js: `http://localhost:8000`
- If using Live Server: The URL will be shown in your browser automatically

## How It Works

### Search Flow

1. **Location Selection**: User chooses between current location or custom location
2. **Location Processing**:
   - If current location: Uses device GPS
   - If custom location: Geocodes the location string using Foursquare API
3. **Search Execution**: Performs a search within 2 miles using the coordinates
4. **Results Display**: Shows businesses with names, distances, and ratings

### API Integration

The app uses the Foursquare Places API v3 with the following endpoints:
- **Place Search**: For finding businesses near a location
- **Geocoding**: For converting location strings to coordinates

### Key Parameters

- **Radius**: 2 miles (3219 meters)
- **Categories**: Food and Drink establishments (13065, 13002)
- **Sort**: By rating (highest first)
- **Limit**: 50 results maximum

## File Structure

```
food_and_drink/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── script.js           # JavaScript logic and API integration
└── README.md           # This file
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Geolocation API support for current location feature
- HTTPS required for geolocation (when deployed)

## Troubleshooting

### Common Issues

1. **"Please configure your Foursquare API key"**
   - Make sure you've replaced the placeholder API key in `script.js`

2. **"Geolocation is not supported"**
   - Try accessing the app via HTTPS
   - Ensure your browser supports geolocation

3. **"Search failed"**
   - Check your API key is valid
   - Verify you have the correct permissions for the Places API
   - Check your internet connection

4. **CORS errors**
   - Make sure you're serving the files from a web server, not opening the HTML file directly

### API Rate Limits

Foursquare has rate limits on their API. If you encounter rate limiting:
- Wait a few minutes before trying again
- Consider implementing request caching for better performance

## Customization

### Styling
- Modify `styles.css` to change colors, fonts, and layout
- The app uses CSS custom properties for easy theming

### Functionality
- Adjust the search radius by changing the `radius` parameter in `script.js`
- Modify the categories to search for different types of places
- Add additional result fields by updating the `displayResults` function

## License

This project is open source and available under the MIT License.

## Support

For issues related to:
- **Foursquare API**: Check the [Foursquare Developer Documentation](https://docs.foursquare.com/)
- **Application Logic**: Review the code comments in `script.js`
- **Styling**: Check the CSS classes and structure in `styles.css` 