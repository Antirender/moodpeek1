// services/imageService.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { pipeline } = require('stream/promises');
const { createWriteStream, existsSync } = require('fs');
const { unsplashLimiter } = require('./rateLimiter');

// Configuration
const CACHE_DIR = path.join(__dirname, '../../img-cache');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const SEED_PATH = path.join(__dirname, '../assets/cover-seeds.json');

// Mood-based query mapping
const MOOD_QUERY_MAP = {
  happy: [
    "sunrise golden hour landscape", 
    "warm light nature", 
    "bokeh city lights"
  ],
  calm: [
    "misty lake minimal", 
    "calm sea long exposure", 
    "blue tone mountains"
  ],
  neutral: [
    "soft gradient abstract", 
    "pastel texture background",
    "neutral minimalist landscape"
  ],
  sad: [
    "rain window city night", 
    "overcast street minimal",
    "foggy forest dark"
  ],
  stressed: [
    "storm clouds ocean long exposure", 
    "moody mountains minimal",
    "dramatic sky landscape"
  ]
};

// Safe content filtering
const SAFE_BLOCKLIST = [
  "feet", "foot", "barefoot", "hand", "hands", "nude", "naked", 
  "sexy", "skin", "portrait", "people", "person", "model", 
  "body", "leg", "legs", "toe", "fingers"
];

// Preferred topics (for scoring)
const PREFERRED_TOPICS = [
  "nature", "wallpapers", "travel", "architecture-interior", "textures-patterns"
];

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch (err) {
    // Directory doesn't exist, create it
    await fs.mkdir(CACHE_DIR, { recursive: true });
    console.log(`Created image cache directory: ${CACHE_DIR}`);
  }
}

/**
 * Build a list of safe queries based on city, mood and weather
 * @param {Object} options - Query options
 * @param {string} options.city - City name (optional)
 * @param {string} options.mood - Mood name (happy, calm, neutral, sad, stressed)
 * @param {Object} options.weather - Weather condition (optional)
 * @returns {string[]} Array of sanitized queries
 */
function buildCoverQueries({ city, mood, weather }) {
  const queries = [];
  const sanitizedMood = (mood || '').toLowerCase().trim();
  const sanitizedCity = (city || '').toLowerCase().trim();
  
  // City-based queries (if city is provided)
  if (sanitizedCity) {
    queries.push(
      `${sanitizedCity} skyline`,
      `${sanitizedCity} cityscape`,
      `${sanitizedCity} landmark`,
      `${sanitizedCity} night skyline`
    );
    
    // Add city + mood if both are provided
    if (sanitizedMood && MOOD_QUERY_MAP[sanitizedMood]) {
      queries.push(`${sanitizedCity} ${sanitizedMood} landscape`);
    }
  }
  
  // Add mood-based queries
  if (sanitizedMood && MOOD_QUERY_MAP[sanitizedMood]) {
    queries.push(...MOOD_QUERY_MAP[sanitizedMood]);
  } else {
    // Default to neutral queries if mood is invalid or not provided
    queries.push(...MOOD_QUERY_MAP.neutral);
  }
  
  // Weather-based queries (if weather is provided)
  if (weather && weather.condition) {
    const condition = weather.condition.toLowerCase().trim();
    
    // Only add if the condition is relevant for images
    if (['rain', 'snow', 'sunny', 'cloudy', 'foggy', 'storm'].includes(condition)) {
      queries.push(`${condition} landscape`);
      
      if (sanitizedCity) {
        queries.push(`${sanitizedCity} ${condition}`);
      }
    }
  }
  
  // Add some generic safe fallbacks
  queries.push(
    "landscape photography",
    "minimal architecture",
    "abstract nature"
  );
  
  // Remove duplicates and return
  return [...new Set(queries)];
}

/**
 * Generate a stable SHA-1 hash based on query and dimensions
 * @param {string} query - Search query
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} SHA-1 hash
 */
function generateKey(query, width, height) {
  const normalizedQuery = query.toLowerCase().trim();
  const input = `${normalizedQuery}|${width}|${height}`;
  return crypto.createHash('sha1').update(input).digest('hex');
}

/**
 * Check if a cached image exists and is fresh (less than TTL)
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} True if cache exists and is fresh
 */
async function isCacheFresh(key) {
  const cachePath = path.join(CACHE_DIR, `${key}.jpg`);
  
  try {
    const stats = await fs.stat(cachePath);
    const fileAge = Date.now() - stats.mtime.getTime();
    return fileAge < CACHE_TTL;
  } catch (err) {
    // File doesn't exist or other error
    return false;
  }
}

/**
 * Save image data to cache
 * @param {string} key - Cache key
 * @param {string} query - Original search query
 * @param {Buffer|Stream} imageData - Image data to save
 * @returns {Promise<void>}
 */
async function saveToCache(key, query, imageStream) {
  const cachePath = path.join(CACHE_DIR, `${key}.jpg`);
  const cacheMetaPath = path.join(CACHE_DIR, `${key}.json`);
  
  // Save the image file
  const writeStream = createWriteStream(cachePath);
  await pipeline(imageStream, writeStream);

  // Save metadata
  const metadata = {
    key,
    query,
    createdAt: new Date().toISOString()
  };
  
  await fs.writeFile(cacheMetaPath, JSON.stringify(metadata, null, 2));
}

/**
 * Check if a photo contains content in the blocklist
 * @param {Object} photo - Unsplash photo object
 * @returns {boolean} - True if photo contains blocked content
 */
function containsBlockedContent(photo) {
  if (!photo) return true;
  
  // Convert blocklist to regex pattern for case-insensitive matching
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
      if (tag.title && pattern.test(tag.title)) {
        return true;
      }
    }
  }
  
  // Check topic submissions
  if (photo.topic_submissions) {
    for (const topic in photo.topic_submissions) {
      if (pattern.test(topic)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Score a photo based on preferred topics and quality metrics
 * @param {Object} photo - Unsplash photo object
 * @param {number} targetWidth - Desired width
 * @param {number} targetHeight - Desired height
 * @returns {number} - Photo score
 */
function scorePhoto(photo, targetWidth, targetHeight) {
  if (!photo) return 0;
  
  let score = 0;
  
  // Base score from likes (capped at 10 points)
  score += Math.min(photo.likes / 10, 10);
  
  // Check for preferred topics (2 points each)
  if (photo.tags) {
    for (const tag of photo.tags) {
      if (tag.title && PREFERRED_TOPICS.includes(tag.title.toLowerCase())) {
        score += 2;
      }
    }
  }
  
  // Check topic submissions
  if (photo.topic_submissions) {
    for (const topic in photo.topic_submissions) {
      if (PREFERRED_TOPICS.includes(topic.toLowerCase())) {
        score += 2;
      }
    }
  }
  
  // Penalize sponsored photos
  if (photo.sponsored || photo.sponsored_by || photo.sponsored_impressions_id) {
    score -= 5;
  }
  
  // Score based on resolution similarity to target size
  const widthRatio = Math.min(photo.width, targetWidth) / Math.max(photo.width, targetWidth);
  const heightRatio = Math.min(photo.height, targetHeight) / Math.max(photo.height, targetHeight);
  score += 5 * (widthRatio + heightRatio) / 2;
  
  return score;
}

/**
 * Pick the best photo from search results based on safety and scoring
 * @param {Array} results - Array of Unsplash photo objects
 * @param {number} width - Desired width
 * @param {number} height - Desired height
 * @returns {Object|null} - Best photo or null if none are suitable
 */
function pickBestPhoto(results, width, height) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return null;
  }
  
  // Filter out blocked content
  const safePhotos = results.filter(photo => !containsBlockedContent(photo));
  
  if (safePhotos.length === 0) {
    return null; // No safe photos found
  }
  
  // Score and sort photos
  const scoredPhotos = safePhotos.map(photo => ({
    photo,
    score: scorePhoto(photo, width, height)
  }));
  
  scoredPhotos.sort((a, b) => b.score - a.score);
  
  // Return the highest-scored photo
  return scoredPhotos[0].photo;
}

/**
 * Fetch image from Unsplash
 * @param {string} query - Search query
 * @param {number} width - Desired width
 * @param {number} height - Desired height
 * @returns {Promise<{stream: Stream, source: string}>} Image stream and source
 */
async function fetchFromUnsplash(query, width, height) {
  try {
    // Check rate limits before making the request
    if (!unsplashLimiter.consumeToken()) {
      console.warn(`[Unsplash] Rate limited. Skipping Unsplash request for query: "${query}"`);
      throw new Error('Rate limited');
    }
    
    // Search for photos with enhanced parameters
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&order_by=relevant&content_filter=high&per_page=30`;
    
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
      }
    });
    
    // Check if we have results
    if (searchResponse.data.results && searchResponse.data.results.length > 0) {
      // Pick the best photo based on our criteria
      const bestPhoto = pickBestPhoto(searchResponse.data.results, width, height);
      
      if (!bestPhoto) {
        throw new Error('No safe photos found for query');
      }
      
      // Get the appropriate size url
      const imageUrl = bestPhoto.urls.raw + `&w=${width}&h=${height}&fit=crop`;
      
      // Fetch the actual image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'stream'
      });
      
      return {
        stream: imageResponse.data,
        source: 'unsplash',
        photo: bestPhoto
      };
    }
    
    // No results, fall back to picsum
    throw new Error('No results from Unsplash');
  } catch (error) {
    console.error(`Unsplash API error: ${error.message}`);
    throw error;
  }
}

/**
 * Pick a seed image based on city and mood
 * @param {Object} options - Options for seed selection
 * @param {string} options.city - City name (optional)
 * @param {string} options.mood - Mood name
 * @returns {Promise<Object|null>} - Selected seed image or null if not found
 */
async function pickSeed({ city, mood }) {
  try {
    // Load seed data
    const seedData = JSON.parse(await fs.readFile(SEED_PATH, 'utf8'));
    
    // Default to neutral if mood is not recognized
    const effectiveMood = (mood && seedData[mood.toLowerCase()]) ? mood.toLowerCase() : 'neutral';
    
    // Generate a stable hash based on city and mood
    const input = `${(city || '').toLowerCase()}|${effectiveMood}`;
    const hash = crypto.createHash('sha1').update(input).digest('hex');
    
    // Use the hash to pick a stable image from the array
    const moodSeeds = seedData[effectiveMood];
    const seedIndex = parseInt(hash.substring(0, 8), 16) % moodSeeds.length;
    
    return moodSeeds[seedIndex];
  } catch (error) {
    console.error('Error picking seed image:', error);
    return null;
  }
}

/**
 * Fetch an image from our seed library
 * @param {Object} seed - Seed image object
 * @param {number} width - Desired width
 * @param {number} height - Desired height
 * @returns {Promise<{stream: Stream, source: string}>} Image stream and source
 */
async function fetchFromSeed(seed, width, height) {
  if (!seed || !seed.id) {
    throw new Error('Invalid seed data');
  }
  
  try {
    // Use the Unsplash photo ID to fetch the image
    const imageUrl = `https://api.unsplash.com/photos/${seed.id}/download?w=${width}&h=${height}&fit=crop`;
    
    // This is a download API call, so we need to consume a token
    if (!unsplashLimiter.consumeToken()) {
      throw new Error('Rate limited');
    }
    
    const response = await axios.get(imageUrl, {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
      },
      responseType: 'stream'
    });
    
    return {
      stream: response.data,
      source: 'seed',
      description: seed.description
    };
  } catch (error) {
    console.error(`Seed image error: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch image from Picsum Photos as fallback
 * @param {string} key - Cache key for randomization
 * @param {number} width - Desired width
 * @param {number} height - Desired height
 * @returns {Promise<{stream: Stream, source: string}>} Image stream and source
 */
async function fetchFromPicsum(key, width, height) {
  try {
    const imageUrl = `https://picsum.photos/${width}/${height}?random=${key}`;
    const response = await axios.get(imageUrl, {
      responseType: 'stream'
    });
    
    return {
      stream: response.data,
      source: 'picsum'
    };
  } catch (error) {
    console.error(`Picsum API error: ${error.message}`);
    throw error;
  }
}

/**
 * Get or download an image based on query and dimensions
 * @param {Object} options
 * @param {string} options.q - Search query or mood
 * @param {string} options.city - City name (optional)
 * @param {string} options.mood - Mood name (optional)
 * @param {Object} options.weather - Weather condition (optional)
 * @param {number} options.w - Image width
 * @param {number} options.h - Image height
 * @returns {Promise<{url: string, source: string, key: string}>}
 */
async function getOrDownloadImage({ q, city, mood, weather, w, h }) {
  // Ensure cache directory exists
  await ensureCacheDir();
  
  // Parse mood and city from query if not explicitly provided
  const parsedMood = mood || q?.match(/happy|calm|neutral|sad|stressed/i)?.[0]?.toLowerCase();
  
  // Generate a stable key
  const normalizedQuery = (q || '').toLowerCase().trim();
  const key = generateKey(normalizedQuery, w, h);
  const cachePath = path.join(CACHE_DIR, `${key}.jpg`);
  const relativeUrl = `/imgcache/${key}.jpg`;
  
  // Set cache headers
  const cacheHeaders = { 'Cache-Control': 'public, max-age=3600' };
  
  // Check if cached version exists and is fresh
  if (await isCacheFresh(key)) {
    return { url: relativeUrl, source: 'disk', key, headers: cacheHeaders };
  }
  
  // Build list of queries to try
  const queries = buildCoverQueries({ 
    city: city || undefined, 
    mood: parsedMood || undefined, 
    weather: weather || undefined 
  });
  
  // Add the original query if not included and not empty
  if (normalizedQuery && !queries.includes(normalizedQuery)) {
    queries.unshift(normalizedQuery);
  }
  
  // Try each query until one works
  for (const query of queries) {
    try {
      const { stream, source, photo } = await fetchFromUnsplash(query, w, h);
      
      // Save to cache
      await saveToCache(key, query, stream);
      
      console.log(`[ImageService] Found image for "${query}" from ${source}`);
      return { 
        url: relativeUrl, 
        source, 
        key, 
        headers: cacheHeaders,
        meta: photo ? { 
          query,
          photoId: photo.id,
          photographer: photo.user?.name
        } : undefined
      };
    } catch (error) {
      // Continue to next query
      console.log(`[ImageService] Query "${query}" failed: ${error.message}`);
      continue;
    }
  }
  
  // If all queries failed, try seed library
  try {
    const seed = await pickSeed({ city, mood: parsedMood });
    if (seed) {
      const { stream, source, description } = await fetchFromSeed(seed, w, h);
      
      // Save to cache
      await saveToCache(key, `seed:${seed.id}`, stream);
      
      console.log(`[ImageService] Using seed image: ${seed.id}`);
      return { 
        url: relativeUrl, 
        source, 
        key, 
        headers: cacheHeaders,
        meta: { seedId: seed.id, description }
      };
    }
  } catch (seedError) {
    console.error('Seed library fallback failed:', seedError);
  }
  
  // Final fallback to Picsum
  try {
    const { stream, source } = await fetchFromPicsum(key, w, h);
    
    // Save to cache
    await saveToCache(key, `picsum:${key}`, stream);
    
    console.log(`[ImageService] Using Picsum fallback`);
    return { url: relativeUrl, source, key, headers: cacheHeaders };
  } catch (picsumError) {
    console.error('All image providers failed:', picsumError);
    throw new Error('Failed to fetch image from all providers');
  }
}

/**
 * In-memory LRU cache for recent queries to reduce API calls
 * Limited to 50 items
 */
const memoryCache = new Map();
const MAX_MEMORY_CACHE = 20;

/**
 * Wrapped version of getOrDownloadImage with memory cache
 * @param {Object} options
 * @returns {Promise<{url: string, source: string, key: string, headers: Object, meta?: Object}>}
 */
async function getOrDownloadImageCached(options) {
  // Create a cache key that includes all relevant parameters
  const { q, city, mood, w, h } = options;
  const cacheKey = `${q || ''}|${city || ''}|${mood || ''}|${w}|${h}`;
  
  // Check memory cache first
  if (memoryCache.has(cacheKey)) {
    const cachedResult = memoryCache.get(cacheKey);
    // Only use cache if it's less than 1 hour old
    if (Date.now() - cachedResult.timestamp < CACHE_TTL) {
      return cachedResult.data;
    }
    // Expired, delete from cache
    memoryCache.delete(cacheKey);
  }
  
  // Fetch the image
  const result = await getOrDownloadImage(options);
  
  // Store in memory cache
  memoryCache.set(cacheKey, {
    timestamp: Date.now(),
    data: result
  });
  
  // Prune cache if it grows too large
  if (memoryCache.size > MAX_MEMORY_CACHE) {
    // Remove oldest entry
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
  
  return result;
}

// Create cache directory when module is loaded
ensureCacheDir().catch(console.error);

module.exports = {
  getOrDownloadImage: getOrDownloadImageCached,
  generateKey,
  buildCoverQueries
};