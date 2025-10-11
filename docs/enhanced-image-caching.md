# Enhanced Image Caching System

## Overview

The enhanced image caching system provides a comprehensive solution for safe, efficient image loading with multiple fallback mechanisms. This system includes:

1. **Query Builder** - Generates safe, relevant search queries based on city, mood, and weather
2. **Content Filtering** - Prevents inappropriate images using a blocklist
3. **Multiple Fallback Mechanisms** - Cascading from Unsplash → Seed Library → Picsum
4. **Disk Caching** - Images stored locally with 1-hour TTL
5. **Memory Caching** - In-memory cache for recent requests
6. **Client-side Caching** - LocalStorage for repeated image requests

## Server-Side Components

### Query Building (`buildCoverQueries`)

Creates safe, relevant image queries from context:

- **City-based queries**: "[city] skyline", "[city] cityscape", etc.
- **Mood-based queries**: Maps moods to appropriate visual themes
- **Weather-based queries**: Adds relevant weather conditions
- **Fallbacks**: Includes safe generic queries if specifics fail

### Content Filtering (`pickBestPhoto`)

Filters out inappropriate images using:

- **Blocklist**: Rejects images with certain tags/descriptions
- **Scoring System**: Ranks photos by preferred topics, quality, and relevance
- **Topic Preferences**: Prioritizes nature, wallpapers, travel, etc.

### Fallback Mechanisms

Multiple layers ensure reliable image delivery:

1. **Unsplash API** with improved parameters
2. **Seed Library** with curated safe images per mood
3. **Picsum Photos** as final fallback

### Caching

- **Disk Cache**: Images stored in `/img-cache` with SHA1 keys
- **Memory Cache**: Recent requests cached in memory
- **Headers**: Proper `Cache-Control` headers set

## Client-Side Components

The `imageLoader.js` provides:

- **LocalStorage Caching**: 24-hour client-side caching
- **Unified Interface**: Common API for different image types
- **Source Tracking**: Tracks where images came from
- **Error Handling**: Graceful fallbacks

## API Usage

### Cover Images

```javascript
// Basic usage
fetch('/api/images/cover?q=mountains&w=800&h=520')

// With mood and city
fetch('/api/images/cover?city=Tokyo&mood=calm&w=800&h=520')

// With weather condition
fetch('/api/images/cover?mood=happy&weather=sunny&w=800&h=520')
```

### Hero Images

```javascript
// Basic usage
fetch('/api/images/hero?q=landscape&w=1600&h=900')

// With mood
fetch('/api/images/hero?mood=calm&w=1600&h=900')
```

## Response Format

```javascript
{
  "url": "/imgcache/a1b2c3d4e5f6.jpg",
  "source": "unsplash|seed|picsum|disk",
  "key": "a1b2c3d4e5f6",
  "meta": {
    // Optional metadata (photo ID, photographer, etc)
  }
}
```

## Security and Performance Considerations

- All user inputs are sanitized
- Rate limiting prevents API abuse
- Blocklist prevents inappropriate content
- Multiple caching layers improve performance
- Stable hash generation ensures consistent image selection