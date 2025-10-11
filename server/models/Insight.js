const mongoose = require('mongoose');

const weatherCorrSchema = new mongoose.Schema({
  temp: { type: Number },
  humidity: { type: Number },
}, { _id: false });

const insightSchema = new mongoose.Schema({
  range: { type: String, required: true },
  topMood: { type: String },
  avgHappiness: { type: Number },
  topPositiveTags: { type: [String], default: [] },
  topStressTags: { type: [String], default: [] },
  weatherCorrelation: { type: weatherCorrSchema, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Insight', insightSchema);
