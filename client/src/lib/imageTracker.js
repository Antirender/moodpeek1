// client/src/lib/imageTracker.js
/**
 * Image loading analytics and tracking utility
 * Collects metrics about image loading success, failures, and sources
 */

// Track loading performance and outcomes
const metrics = {
  totalLoaded: 0,
  totalErrors: 0,
  sources: {}, // Count of images by source
  loadTimes: [], // Load times in milliseconds
  errorTypes: {}, // Count of different error types
  corsErrors: 0,  // Count of CORS-specific errors
};

// Tracking for currently loading images
const activeLoads = new Map();

/**
 * Start tracking an image load
 * @param {string} id - Unique identifier for this image
 * @param {Object} metadata - Additional info about the image
 * @returns {string} - The tracking ID
 */
export function trackStart(id, metadata = {}) {
  const trackingId = id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  activeLoads.set(trackingId, {
    startTime: performance.now(),
    metadata,
    status: 'loading',
  });
  
  return trackingId;
}

/**
 * Register a successful image load
 * @param {string} trackingId - ID returned from trackStart
 * @param {Object} result - Information about the loaded image
 */
export function trackSuccess(trackingId, { source, url, size }) {
  const loadData = activeLoads.get(trackingId);
  if (!loadData) return;
  
  // Calculate load time
  const loadTime = performance.now() - loadData.startTime;
  
  // Update metrics
  metrics.totalLoaded++;
  metrics.loadTimes.push(loadTime);
  
  // Track source distribution
  const imageSource = source || 'unknown';
  metrics.sources[imageSource] = (metrics.sources[imageSource] || 0) + 1;
  
  // Log details
  console.log(
    `[ImageTracker] ✓ Loaded image from ${imageSource} in ${loadTime.toFixed(0)}ms`,
    url ? `(${url.substring(0, 30)}${url.length > 30 ? '...' : ''})` : ''
  );
  
  // Remove from active tracking
  activeLoads.delete(trackingId);
}

/**
 * Register an image loading error
 * @param {string} trackingId - ID returned from trackStart
 * @param {Object} error - Error information
 */
export function trackError(trackingId, { errorType, message, isCors }) {
  const loadData = activeLoads.get(trackingId);
  if (!loadData) return;
  
  // Update metrics
  metrics.totalErrors++;
  
  // Track error types
  const type = errorType || 'unknown';
  metrics.errorTypes[type] = (metrics.errorTypes[type] || 0) + 1;
  
  // Track CORS errors specifically
  if (isCors) {
    metrics.corsErrors++;
  }
  
  // Log error
  console.warn(`[ImageTracker] ✗ Failed to load image: ${message || type}`);
  
  // Remove from active tracking
  activeLoads.delete(trackingId);
}

/**
 * Get a summary of image loading metrics
 * @returns {Object} - Current metrics
 */
export function getMetrics() {
  return {
    ...metrics,
    activeLoads: activeLoads.size,
    successRate: metrics.totalLoaded 
      ? ((metrics.totalLoaded / (metrics.totalLoaded + metrics.totalErrors)) * 100).toFixed(1) + '%' 
      : 'N/A',
    averageLoadTime: metrics.loadTimes.length 
      ? (metrics.loadTimes.reduce((sum, time) => sum + time, 0) / metrics.loadTimes.length).toFixed(0) + 'ms'
      : 'N/A',
  };
}

// Expose a global method to check image stats from console
if (typeof window !== 'undefined') {
  window.__imageStats = getMetrics;
}

export default {
  trackStart,
  trackSuccess,
  trackError,
  getMetrics
};