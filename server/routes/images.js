// server/routes/images.js
const express = require('express');
const router = express.Router();
const unsplashService = require('../services/unsplashService');
const { getOrDownloadImage } = require('../services/imageService');

// GET /api/images/search?q=query - Searches Unsplash for images
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query (q) is required', url: null });
    }

    const result = await unsplashService.searchImage(query);
    res.json(result);
  } catch (error) {
    console.error('Error in /search endpoint:', error);
    res.status(500).json({ error: 'Failed to search for image', url: null });
  }
});

// GET /api/images/mood/:mood (legacy endpoint)
router.get('/mood/:mood', async (req, res) => {
  try {
    const mood = req.params.mood;
    if (!mood) {
      return res.status(400).json({ error: 'Mood parameter is required' });
    }

    const imageData = await unsplashService.fetchMoodImage(mood);
    res.json(imageData);
  } catch (error) {
    console.error('Error in /mood/:mood endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch mood image' });
  }
});

// POST /api/images/clear-cache (admin only, in real app would have auth)
router.post('/clear-cache', (req, res) => {
  try {
    unsplashService.clearCache();
    res.json({ message: 'Image cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear image cache' });
  }
});

/**
 * GET /api/images/cover - Get a cover image for entries
 * @param {string} q - Search query
 * @param {string} city - City name
 * @param {string} mood - Mood name
 * @param {string} weather - Weather condition
 * @param {number} w - Width (default: 800)
 * @param {number} h - Height (default: 520)
 */
router.get('/cover', async (req, res) => {
  try {
    const q = req.query.q;
    const city = req.query.city;
    const mood = req.query.mood;
    const weather = req.query.weather ? { condition: req.query.weather } : undefined;
    const w = parseInt(req.query.w) || 800;
    const h = parseInt(req.query.h) || 520;
    
    const result = await getOrDownloadImage({ q, city, mood, weather, w, h });
    
    // Apply any headers from the result
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching cover image:', error.message);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

/**
 * GET /api/images/hero - Get a hero image for homepage
 * @param {string} q - Search query
 * @param {string} mood - Mood name for theme
 * @param {number} w - Width (default: 1600)
 * @param {number} h - Height (default: 900)
 */
router.get('/hero', async (req, res) => {
  try {
    const q = req.query.q || 'landscape sky nature';
    const mood = req.query.mood;
    const w = parseInt(req.query.w) || 1600;
    const h = parseInt(req.query.h) || 900;
    
    const result = await getOrDownloadImage({ 
      q, 
      mood,
      w, 
      h 
    });
    
    // Apply any headers from the result
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching hero image:', error.message);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

module.exports = router;