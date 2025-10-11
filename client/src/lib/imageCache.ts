// src/lib/imageCache.ts

// Type definitions for cache entries
interface CacheEntry {
  url: string;
  alt: string;
  mood: string;
  timestamp: number;
}

interface ImageCache {
  [key: string]: CacheEntry;
}

// Default cache expiry time: 1 hour in milliseconds
const DEFAULT_CACHE_EXPIRY = 60 * 60 * 1000;

// Storage key for localStorage
const STORAGE_KEY = 'moodpeek_image_cache';

/**
 * Get an image from cache if it exists and is not expired
 * @param mood The mood to get an image for
 * @param expiryTime Optional custom expiry time in ms
 * @returns The cached image or null if not found or expired
 */
export function getFromCache(mood: string, expiryTime = DEFAULT_CACHE_EXPIRY): CacheEntry | null {
  try {
    // Get cache from localStorage
    const cacheStr = localStorage.getItem(STORAGE_KEY);
    if (!cacheStr) return null;
    
    const cache: ImageCache = JSON.parse(cacheStr);
    const entry = cache[mood];
    
    // Check if entry exists and is not expired
    if (entry && (Date.now() - entry.timestamp < expiryTime)) {
      return entry;
    }
    
    return null;
  } catch (error) {
    console.error('Error reading from image cache:', error);
    return null;
  }
}

/**
 * Save an image to cache
 * @param mood The mood associated with the image
 * @param imageData The image data to cache
 */
export function saveToCache(mood: string, imageData: { url: string; alt: string; mood: string }): void {
  try {
    // Get existing cache or create new one
    const cacheStr = localStorage.getItem(STORAGE_KEY);
    const cache: ImageCache = cacheStr ? JSON.parse(cacheStr) : {};
    
    // Add entry to cache with current timestamp
    cache[mood] = {
      ...imageData,
      timestamp: Date.now()
    };
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving to image cache:', error);
  }
}

/**
 * Clear the entire image cache
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing image cache:', error);
  }
}

/**
 * Remove expired entries from the cache
 * @param expiryTime Optional custom expiry time in ms
 */
export function cleanupExpiredEntries(expiryTime = DEFAULT_CACHE_EXPIRY): void {
  try {
    const cacheStr = localStorage.getItem(STORAGE_KEY);
    if (!cacheStr) return;
    
    const cache: ImageCache = JSON.parse(cacheStr);
    let hasChanges = false;
    
    // Check each entry for expiration
    Object.keys(cache).forEach(key => {
      if (Date.now() - cache[key].timestamp > expiryTime) {
        delete cache[key];
        hasChanges = true;
      }
    });
    
    // Only save if we actually removed items
    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.error('Error cleaning up expired cache entries:', error);
  }
}