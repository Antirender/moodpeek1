// src/lib/imageLoader.js
import SHA1 from 'crypto-js/sha1';
import { trackStart, trackSuccess, trackError } from './imageTracker';

// Keep track of ongoing image fetch requests to prevent duplicates
const pendingRequests = new Map();

// Unsplash API key
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

// Cache TTL configuration
const CACHE_TTL = {
  cover: 60 * 60 * 1000, // 1 hour in milliseconds
  hero: 6 * 60 * 60 * 1000 // 6 hours in milliseconds
};

// Log debug info once per session (prevent console spam)
const loggedUrls = new Set();

// Safe content filtering - avoid these terms in image results
const SAFE_BLOCKLIST = [
  "feet", "foot", "barefoot", "hand", "hands", "nude", "naked", 
  "sexy", "skin", "portrait", "people", "person", "model", 
  "body", "leg", "legs", "toe", "fingers"
];

/**
 * Builds queries based on city, mood and weather
 */
function buildQueries(query = '', { city, mood, weather } = {}) {
  const queries = [];
  const normalizedMood = (mood || '').toLowerCase().trim();
  const normalizedCity = (city || '').toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();
  
  // Add the main query if provided
  if (normalizedQuery && normalizedQuery !== normalizedMood) {
    queries.push(normalizedQuery);
  }
  
  // City-based queries
  if (normalizedCity) {
    queries.push(`${normalizedCity} ${normalizedMood || 'landscape'}`);
    queries.push(`${normalizedCity} skyline`);
  }
  
  // Mood-based queries
  if (normalizedMood) {
    switch (normalizedMood) {
      case 'happy':
        queries.push("sunrise golden hour landscape", "warm light nature");
        break;
      case 'calm':
        queries.push("misty lake minimal", "calm sea long exposure");
        break;
      case 'neutral':
        queries.push("soft gradient abstract", "neutral minimalist landscape");
        break;
      case 'sad':
        queries.push("rain window city night", "foggy forest dark");
        break;
      case 'stressed':
        queries.push("storm clouds ocean", "moody mountains minimal");
        break;
    }
  }
  
  // Add some generic safe fallbacks
  queries.push("landscape photography", "minimal architecture", "abstract nature");
  
  // Remove duplicates and return
  return [...new Set(queries)];
}

/**
 * Generate a consistent hash for a query string and dimensions
 */
function generateHash(query, size) {
  const input = `${query.toLowerCase().trim()}|${size.w}|${size.h}`;
  return SHA1(input).toString();
}

/**
 * Check if a photo contains content in the blocklist
 */
function containsBlockedContent(photo) {
  if (!photo) return true;
  
  // Create regex pattern for case-insensitive matching
  const pattern = new RegExp(SAFE_BLOCKLIST.join('|'), 'i');
  
  // Check alt_description
  if (photo.alt_description && pattern.test(photo.alt_description)) {
    return true;
  }
  
  // Check description
  if (photo.description && pattern.test(photo.description)) {
    return true;
  }
  
  // Check tags
  if (photo.tags && photo.tags.length > 0) {
    for (const tag of photo.tags) {
      if (pattern.test(tag.title)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Search for an image on Unsplash
 */
async function searchUnsplash(query, size) {
  try {
    if (!UNSPLASH_ACCESS_KEY) {
      console.error('[Unsplash] Missing API key');
      throw new Error('Missing Unsplash API key');
    }
    
    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=20&content_filter=high&client_id=${UNSPLASH_ACCESS_KEY}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }
    
    // Filter out unsafe content
    const safePhotos = data.results.filter(photo => !containsBlockedContent(photo));
    
    if (safePhotos.length === 0) {
      return null;
    }
    
    // Select the first safe photo
    const photo = safePhotos[0];
    
    // Get the appropriate URL and add sizing parameters
    const baseUrl = photo.urls.raw || photo.urls.regular;
    const url = `${baseUrl}&w=${size.w}&h=${size.h}&fit=crop`;
    
    return {
      url,
      source: 'unsplash',
      attribution: {
        name: photo.user.name,
        username: photo.user.username,
        link: `https://unsplash.com/@${photo.user.username}?utm_source=moodpeek&utm_medium=referral`
      }
    };
  } catch (error) {
    console.error(`[Unsplash] Error searching for "${query}":`, error);
    return null;
  }
}

/**
 * Get fallback from Picsum Photos
 */
async function getPicsumFallback(query, size) {
  const hash = generateHash(query, size);
  const url = `https://picsum.photos/${size.w}/${size.h}?random=${hash}`;
  
  return {
    url,
    source: 'picsum'
  };
}

/**
 * Get image from cache or fetch from external sources
 */
async function getImageFromCacheOrFetch(type, query, size) {
  // Generate cache key
  const hash = generateHash(query, size);
  const cacheKey = `img::${type}::${hash}`;
  
  // Check cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      
      // Check if cache is still valid
      if (data.url && data.savedAt && Date.now() - data.savedAt < CACHE_TTL[type]) {
        return data;
      }
    }
  } catch (e) {
    // Cache read error, continue to fetch
    console.warn('[ImageLoader] Cache read error:', e);
  }
  
  // Generate possible queries
  const queries = buildQueries(query, { 
    mood: query.match(/happy|calm|neutral|sad|stressed/i)?.[0] 
  });
  
  // Try each query until we get a result
  for (const searchQuery of queries) {
    const result = await searchUnsplash(searchQuery, size);
    if (result) {
      // Save to cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          ...result,
          savedAt: Date.now()
        }));
      } catch (e) {
        console.warn('[ImageLoader] Cache write error:', e);
      }
      
      // Log only once per session
      if (!loggedUrls.has(result.url)) {
        console.info('[img]', type, query, '→', result.source, result.url);
        loggedUrls.add(result.url);
      }
      
      return result;
    }
  }
  
  // If all failed, use Picsum as fallback
  const fallback = await getPicsumFallback(query, size);
  
  // Save fallback to cache
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      ...fallback,
      savedAt: Date.now()
    }));
  } catch (e) {
    console.warn('[ImageLoader] Cache write error:', e);
  }
  
  // Log only once per session
  if (!loggedUrls.has(fallback.url)) {
    console.info('[img]', type, query, '→', fallback.source, fallback.url);
    loggedUrls.add(fallback.url);
  }
  
  return fallback;
}

/**
 * Main function to load image URL with caching and duplicate request prevention
 */
async function loadImageURL(type, query, size) {
  if (!query || query.trim() === '') {
    query = type === 'hero' ? 'calm sky aurora' : 'landscape';
  }
  
  // Normalize the query to reduce unique API calls
  const normalizedQuery = query.toLowerCase().trim();
  
  // Start tracking this image load
  const trackingId = trackStart(`${type}_${normalizedQuery}`, {
    type,
    query: normalizedQuery,
    size
  });

  // Check if there's already a request in progress for this image
  const requestKey = `${type}:${normalizedQuery}:${size.w}x${size.h}`;
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  // Create a promise that will be resolved with the image data
  const imagePromise = (async () => {
    try {
      const result = await getImageFromCacheOrFetch(type, normalizedQuery, size);
      
      trackSuccess(trackingId, {
        source: result.source,
        url: result.url,
        size
      });
      
      return result;
    } catch (error) {
      console.error('[ImageLoader] Error:', error);
      trackError(trackingId, {
        errorType: 'fetch_error',
        message: error.message
      });
      
      // Create a fallback data URI
      const dataUri = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 ${size.w} ${size.h}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23ccc" /><stop offset="100%" stop-color="%23999" /></linearGradient></defs><rect width="${size.w}" height="${size.h}" fill="url(%23g)" /></svg>`;
      
      return { url: dataUri, source: 'data-uri-fallback' };
    }
  })();
  
  // Store the request promise and remove it when completed
  pendingRequests.set(requestKey, imagePromise);
  
  try {
    return await imagePromise;
  } finally {
    // Clean up the pending request
    pendingRequests.delete(requestKey);
  }
}

/**
 * Purges all localStorage entries with /imgcache/ URLs
 * Should be called once on app initialization
 */
function purgeExternalUrls() {
  const imgKeys = [];
  
  // Find all image cache keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('img::')) {
      imgKeys.push(key);
    }
  }
  
  console.log(`[imgLoader] Found ${imgKeys.length} cached images to check`);
  let purgedCount = 0;
  
  // Check each key for imgcache URLs and other external URLs
  imgKeys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && data.url) {
        // Check if URL is from imgcache
        if (data.url.includes('/imgcache/')) {
          console.log(`[imgLoader] Purging imgcache URL: ${data.url}`);
          localStorage.removeItem(key);
          purgedCount++;
        }
      }
    } catch (e) {
      // If we can't parse the data, remove it
      console.warn(`[imgLoader] Invalid cache entry for key ${key}, removing`);
      localStorage.removeItem(key);
      purgedCount++;
    }
  });
  
  console.log(`[imgLoader] Purged ${purgedCount} /imgcache/ URLs from cache`);
}

// Export functions as named exports
export {
  loadImageURL,
  purgeExternalUrls
};
