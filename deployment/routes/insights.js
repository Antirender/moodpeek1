// routes/insights.js
const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');
const { 
  computeWeeklyReport, 
  generateCurrentWeeklyInsights,
  getInsightsForRange
} = require('../services/insightsService');

// GET /api/insights/weekly - Get weekly insights
router.get('/weekly', async (req, res) => {
  try {
    // Default to current week if no start date provided
    let report;
    if (req.query.start) {
      const startDate = req.query.start;
      report = await computeWeeklyReport(startDate);
    } else {
      report = await generateCurrentWeeklyInsights();
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error getting weekly insights:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/insights/weekly/debug - Debug endpoint for local testing
router.get('/weekly/debug', async (req, res) => {
  try {
    if (!req.query.start) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    // Parse the start date in local time
    const start = new Date(req.query.start);
    start.setHours(0, 0, 0, 0);
    
    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }
    
    // Calculate end date (7 days from start)
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    
    // Create a pipeline to handle both Date and string date formats
    const pipeline = [
      {
        $addFields: {
          dateISO: { 
            $cond: {
              if: { $eq: [{ $type: "$date" }, "string"] },
              then: { $dateFromString: { dateString: "$date" } },
              else: "$date"
            }
          }
        }
      },
      {
        $match: {
          dateISO: { $gte: start, $lt: end }
        }
      },
      {
        $sort: { dateISO: 1 }
      }
    ];
    
    // Get entries for this week
    const entriesInRange = await Entry.aggregate(pipeline);
    
    // Get a sample of the latest entries (no secrets) for debugging
    const latestEntries = await Entry.find({})
      .sort({ date: -1 })
      .limit(3)
      .select('_id date city mood');
    
    // Return debug info
    res.json({
      range: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      found: entriesInRange.length,
      sample: latestEntries.map(e => ({
        id: e._id.toString(),
        date: e.date instanceof Date ? e.date.toISOString() : e.date,
        city: e.city,
        mood: e.mood
      }))
    });
  } catch (error) {
    console.error('Error in weekly debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/insights/range - Get insights for a specific date range
router.get('/range', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    const insights = await getInsightsForRange(new Date(start), new Date(end));
    res.json(insights);
  } catch (error) {
    console.error('Error getting insights for range:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;