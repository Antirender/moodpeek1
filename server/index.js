require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the img-cache directory statically under /imgcache
app.use('/imgcache', express.static(path.join(__dirname, '../img-cache')));

// routes
const entriesRouter = require('./routes/entries');
const insightsRouter = require('./routes/insights');
const imagesRouter = require('./routes/images');

app.use('/api/entries', entriesRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/images', imagesRouter);

const PORT = process.env.PORT || 8787;
const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI not set in environment; skipping mongoose connect for now.');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message || err);
  }
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Development routes
const { seedEntries } = require('./devSeed');
app.post('/dev/seed', async (_req, res) => {
  try { 
    await seedEntries(); 
    res.json({ ok: true, message: 'Seed data created successfully' }); 
  } catch(e) { 
    console.error('Seed error:', e);
    res.status(500).json({ error: String(e) }); 
  }
});

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  await connectDB();
});

module.exports = app;
