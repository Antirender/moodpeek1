// server/services/rateLimiter.js
/**
 * Simple rate limiting utility for API requests
 * Implements token bucket algorithm to limit requests to external APIs
 */
class RateLimiter {
  /**
   * Create a new rate limiter
   * @param {Object} config Configuration options
   * @param {number} config.maxRequestsPerHour Maximum requests allowed per hour
   * @param {number} config.maxBurst Maximum burst of requests allowed
   * @param {number} config.refreshInterval Time in ms to refresh tokens (default: 3600000ms / 1hr)
   */
  constructor({
    maxRequestsPerHour = 50,
    maxBurst = 10,
    refreshInterval = 3600000 // 1 hour in ms
  } = {}) {
    this.maxTokens = maxBurst;
    this.tokens = maxBurst; // Start with max burst capacity
    this.lastRefill = Date.now();
    this.refillRate = maxRequestsPerHour / (refreshInterval / 1000); // tokens per second
    this.requestLog = [];
    this.hourlyQuota = maxRequestsPerHour;
    
    // Set up token refill interval
    setInterval(() => this.refillTokens(), Math.min(60000, refreshInterval / 10)); // Refill more frequently for smooth token allocation
    
    console.log(`[RateLimiter] Initialized with ${maxRequestsPerHour} requests/hour (${this.refillRate.toFixed(4)} tokens/sec), max burst: ${maxBurst}`);
  }
  
  /**
   * Refill tokens based on elapsed time and rate
   * @private
   */
  refillTokens() {
    const now = Date.now();
    const timeSinceRefill = (now - this.lastRefill) / 1000; // in seconds
    const tokensToAdd = timeSinceRefill * this.refillRate;
    
    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
    
    // Clean up old request logs (older than 1 hour)
    const hourAgo = now - 3600000;
    this.requestLog = this.requestLog.filter(time => time > hourAgo);
  }
  
  /**
   * Check if a request can be made
   * @returns {boolean} True if request is allowed
   */
  canMakeRequest() {
    this.refillTokens(); // Ensure tokens are up to date
    
    // Check against burst limit (token bucket)
    if (this.tokens >= 1) {
      // Also check against absolute hourly limit
      if (this.requestLog.length < this.hourlyQuota) {
        return true;
      }
      
      // Hourly quota exceeded
      console.warn(`[RateLimiter] Hourly quota of ${this.hourlyQuota} requests exceeded`);
      return false;
    }
    
    // Out of tokens
    console.warn(`[RateLimiter] Rate limit reached (0 tokens available)`);
    return false;
  }
  
  /**
   * Make a request if allowed
   * @returns {boolean} True if request was allowed and token was consumed
   */
  consumeToken() {
    if (this.canMakeRequest()) {
      this.tokens -= 1;
      this.requestLog.push(Date.now());
      return true;
    }
    return false;
  }
  
  /**
   * Get current limiter status
   * @returns {Object} Current status
   */
  getStatus() {
    this.refillTokens();
    return {
      availableTokens: this.tokens,
      requestsInLastHour: this.requestLog.length,
      hourlyQuota: this.hourlyQuota,
      isLimited: this.tokens < 1 || this.requestLog.length >= this.hourlyQuota
    };
  }
}

// Create a singleton instance for Unsplash
const unsplashLimiter = new RateLimiter({
  maxRequestsPerHour: process.env.UNSPLASH_RATE_LIMIT || 50,
  maxBurst: 5
});

module.exports = {
  unsplashLimiter
};