# Image Caching System Documentation

## Overview

This documentation covers the comprehensive image caching system implemented for MoodPeek. The system includes server-side disk caching, client-side localStorage caching, rate limiting, CORS handling, and analytics.

## Components

### Server-side Components

1. **imageService.js**
   - Handles disk-based caching with SHA-1 keys
   - Implements 1-hour TTL for cached images
   - Provides fallback mechanisms (Unsplash → Picsum)
   - Includes in-memory caching layer for performance

2. **rateLimiter.js**
   - Implements token bucket algorithm for API rate limiting
   - Prevents hitting Unsplash API limits
   - Tracks request history and enforces limits

3. **images.js (Routes)**
   - Provides `/api/images/cover` and `/api/images/hero` endpoints
   - Handles query normalization and parameter validation
   - Sets proper cache headers

### Client-side Components

1. **imageLoader.js**
   - Manages client-side localStorage caching
   - Normalizes queries for better cache hits
   - Provides deterministic fallback URLs
   - Implements 24-hour client cache TTL

2. **imageTracker.js**
   - Tracks image loading analytics
   - Monitors success rates and load times
   - Tracks CORS errors and other issues
   - Provides console debugging through `window.__imageStats`

3. **EntryCover Component**
   - Displays images with proper CORS attributes
   - Handles loading states and errors gracefully
   - Provides placeholders with dark mode support

4. **ReportCard Export**
   - Enhanced html2canvas configuration
   - Preloads images with CORS attributes
   - Handles image loading errors during export

## Usage

### Server-side

The image service automatically creates the cache directory and manages cached files. Images are stored with a SHA-1 key based on the query and dimensions.

### Client-side

Use the `loadImageURL` function to get image URLs:

```javascript
// Load a cover image
const { url, source } = await loadImageURL('cover', 'nature landscape', { w: 800, h: 520 });

// Load a hero image
const { url, source } = await loadImageURL('hero', 'calm sky', { w: 1600, h: 900 });
```

Use the `EntryCover` component to display images:

```jsx
// Direct URL
<EntryCover url="https://example.com/image.jpg" alt="Description" />

// Using query (will fetch from API)
<EntryCover query="beach sunny" alt="Beach on a sunny day" />
```

## Performance Considerations

- Server-side disk cache reduces Unsplash API calls
- Rate limiting prevents API quota exhaustion
- Client-side localStorage reduces server load
- Query normalization improves cache hit rates
- Multiple fallback layers ensure reliability

## Debugging

Access image loading statistics in the browser console:

```javascript
// Get current image metrics
window.__imageStats();
```