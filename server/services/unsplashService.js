// server/services/unsplashService.js
const fetch = require('node-fetch');

// In-memory cache for Unsplash images
const cache = {
  images: {},
  expiryTime: 3600 * 1000 // 1 hour in milliseconds (TTL: 3600s)
};

/**
 * Search for images using Unsplash API
 * @param {string} query - Search query
 * @returns {Promise<{url: string|null, cached: boolean}>} - Image URL or null if not found
 */
async function searchImage(query) {
  if (!query) {
    console.warn('[Unsplash] Empty search query');
    return { url: null };
  }

  // Normalize query for cache lookup
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check cache first
  const cachedItem = cache.images[normalizedQuery];
  if (cachedItem && cachedItem.timestamp > Date.now() - cache.expiryTime) {
    console.log(`[Unsplash] CACHE HIT for query: "${normalizedQuery}"`);
    return { 
      url: cachedItem.url,
      cached: true 
    };
  }

  try {
    // Use actual Unsplash API with proper authentication
    const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(normalizedQuery)}&per_page=1`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
        
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Get image URL from the response or return null if no results
    let imageUrl = null;
    if (data.results && data.results.length > 0) {
      imageUrl = data.results[0].urls.regular;
      
      // Store in cache
      cache.images[normalizedQuery] = {
        url: imageUrl,
        timestamp: Date.now()
      };
      
      console.log(`[Unsplash] CACHE MISS for query: "${normalizedQuery}"`);
    } else {
      console.log(`[Unsplash] No results found for query: "${normalizedQuery}"`);
    }
    
    return { url: imageUrl };
  } catch (error) {
    console.error(`[Unsplash] Error searching for image with query "${query}":`, error);
    // Return null gracefully on errors
    return { url: null };
  }
}

/**
 * Fetch image by mood (legacy support)
 */
async function fetchMoodImage(mood) {
  const result = await searchImage(mood);
  return {
    url: result.url,
    alt: `Image representing the mood: ${mood}`,
    mood
  };
}

// Clear the cache
function clearCache() {
  cache.images = {};
  console.log('[Unsplash] Image cache cleared');
}

module.exports = {
  searchImage,
  fetchMoodImage,
  clearCache
};