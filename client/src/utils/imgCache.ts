/**
 * Helper for caching and retrieving images from Unsplash
 * Uses both local storage (client-side) and server-side caching
 */

interface CachedImage {
  url: string;
  timestamp: number;
}

interface ImageResponse {
  url: string | null;
  cached?: boolean;
}

// TTL for localStorage cache - 24 hours in milliseconds
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Get image URL for a search query, with caching
 * 
 * @param query The search query for the image
 * @returns The image URL or null if not found
 */
export async function getImageURL(query: string): Promise<string | null> {
  // Check localStorage first
  const cachedImage = checkLocalCache(query);
  if (cachedImage) {
    console.log(`[Image] Using cached image for "${query}"`);
    return cachedImage;
  }
  
  try {
    // If not in localStorage, fetch from server
    const response = await fetch(`/api/images/search?q=${encodeURIComponent(query)}`);
    const data: ImageResponse = await response.json();
    
    // Save to localStorage if we got a URL
    if (data.url) {
      console.log(`[Image] Fetched ${data.cached ? 'server-cached' : 'new'} image for "${query}"`);
      saveToLocalCache(query, data.url);
    } else {
      console.log(`[Image] No image found for "${query}"`);
    }
    
    return data.url;
  } catch (error) {
    console.error(`[Image] Error fetching image for "${query}":`, error);
    return null;
  }
}

/**
 * Check if we have a cached image in localStorage
 */
function checkLocalCache(query: string): string | null {
  try {
    const key = `img_${query.toLowerCase().replace(/\s+/g, '_')}`;
    const item = localStorage.getItem(key);
    
    if (item) {
      const cached: CachedImage = JSON.parse(item);
      // Check if the cache entry is still valid
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.url;
      }
      // Remove expired cache entry
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('[Image] Error accessing localStorage:', e);
  }
  
  return null;
}

/**
 * Save an image URL to localStorage cache
 */
function saveToLocalCache(query: string, url: string): void {
  try {
    const key = `img_${query.toLowerCase().replace(/\s+/g, '_')}`;
    const item: CachedImage = {
      url,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    console.warn('[Image] Error saving to localStorage:', e);
  }
}