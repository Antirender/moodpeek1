const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');

const fetch = require('node-fetch');

// Simple in-memory city -> lat/lon map (extend as needed)
const CITY_COORDS = {
  'Toronto': { lat: 43.6532, lon: -79.3832 },
  'Vancouver': { lat: 49.2827, lon: -123.1207 },
  'Montreal': { lat: 45.5017, lon: -73.5673 },
  'London': { lat: 51.5074, lon: -0.1278 },
  'New York': { lat: 40.7128, lon: -74.0060 },
};

async function fetchWeather(city) {
  if (!city) return null;
  const coords = CITY_COORDS[city] || null;
  if (!coords) return null; // could fall back to Nominatim if desired
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=relativehumidity_2m&timezone=UTC`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // current_weather contains temperature and weathercode
    const tempC = data.current_weather?.temperature ?? null;
    // relative humidity is hourly; pick the latest hourly value if present
    let humidity = null;
    if (data.hourly && Array.isArray(data.hourly.relativehumidity_2m)) {
      const arr = data.hourly.relativehumidity_2m;
      humidity = arr.length ? arr[arr.length - 1] : null;
    }
    const weatherCode = data.current_weather?.weathercode ?? null;
    const condition = weatherCode !== null ? String(weatherCode) : null;
    return { tempC, humidity, condition };
  } catch (err) {
    console.error('fetchWeather error', err);
    return null;
  }
}

// Helper: sanitize tags array
function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(t => String(t).trim())
    .filter(t => t.length > 0);
}

// Create entry
router.post('/', async (req, res) => {
  try {
    const { date, mood, city, tags, note, weather } = req.body;
    if (!date || !mood) return res.status(400).json({ error: 'date and mood are required' });

    const entryDate = new Date(date);
    const existing = await Entry.findOne({ date: entryDate });
    if (existing) return res.status(409).json({ error: 'Entry for this date already exists' });

    const entryData = {
      date: entryDate,
      mood,
      city,
      tags: sanitizeTags(tags),
      note,
    };

    // if client didn't provide weather, try to fetch from Open-Meteo using city map
    if (!weather) {
      const snapshot = await fetchWeather(city);
      if (snapshot) entryData.weather = snapshot;
    } else {
      entryData.weather = weather;
    }

    const entry = new Entry(entryData);
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// List with filters: from, to, mood, city
router.get('/', async (req, res) => {
  try {
    const { from, to, mood, city } = req.query;
    const filter = {};
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
    if (mood) filter.mood = mood;
    if (city) filter.city = city;

    const entries = await Entry.find(filter).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Update entry by id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, mood, city, tags, note, weather } = req.body;

    const update = {};
    if (date) update.date = new Date(date);
    if (mood) update.mood = mood;
    if (city) update.city = city;
    if (tags) update.tags = sanitizeTags(tags);
    if (note !== undefined) update.note = note;
    if (weather !== undefined) update.weather = weather;

    // If updating date, ensure uniqueness
    if (update.date) {
      const conflict = await Entry.findOne({ date: update.date, _id: { $ne: id } });
      if (conflict) return res.status(409).json({ error: 'Another entry for this date already exists' });
    }

    const updated = await Entry.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Entry not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Delete entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Entry.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Entry not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
