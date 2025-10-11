const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema({
  tempC: { type: Number },
  humidity: { type: Number },
  condition: { type: String },
}, { _id: false });

const entrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  mood: { type: String, required: true, enum: ['happy', 'sad', 'stressed', 'neutral', 'calm'] },
  city: { type: String },
  tags: { type: [String], default: [] },
  note: { type: String },
  weather: { type: weatherSchema, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Entry', entrySchema);
