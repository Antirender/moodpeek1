// services/insightsService.js
const Entry = require('../models/Entry');
const Insight = require('../models/Insight');

/**
 * Convert mood to numeric score
 * @param {string} mood 
 * @returns {number} Score from -2 to +2
 */
const moodToScore = (mood) => {
  switch (mood) {
    case 'VERY_GOOD': return 2;
    case 'GOOD': return 1;
    case 'NEUTRAL': return 0;
    case 'BAD': return -1;
    case 'VERY_BAD': return -2;
    // Legacy mappings
    case 'happy': return 2;
    case 'calm': return 1;
    case 'neutral': return 0;
    case 'sad': return -1;
    case 'stressed': return -2;
    default: return 0;
  }
};

/**
 * Convert score to letter grade
 * @param {number} score 
 * @returns {string} Letter grade from A to F
 */
const scoreToGrade = (score) => {
  if (score >= 1.5) return 'A';
  if (score >= 0.5) return 'B';
  if (score >= -0.5) return 'C';
  if (score >= -1.5) return 'D';
  return 'F';
};

/**
 * Find correlations between activities and moods
 * @param {Array} entries Array of entries
 * @returns {Object} Activities correlated with positive or negative moods
 */
function findMoodActivityCorrelations(entries) {
  if (!entries || entries.length < 5) {
    return { positiveActivities: [], negativeActivities: [] };
  }
  
  const activityMoodMap = {};
  
  // First pass: collect all activities and their associated mood scores
  entries.forEach(entry => {
    const moodScore = moodToScore(entry.mood);
    
    if (entry.activities && entry.activities.length) {
      entry.activities.forEach(activity => {
        if (!activityMoodMap[activity]) {
          activityMoodMap[activity] = {
            totalScore: 0,
            count: 0,
            averageScore: 0
          };
        }
        
        activityMoodMap[activity].totalScore += moodScore;
        activityMoodMap[activity].count += 1;
      });
    }
  });
  
  // Second pass: calculate average mood score per activity
  Object.keys(activityMoodMap).forEach(activity => {
    const data = activityMoodMap[activity];
    if (data.count >= 2) { // Only consider activities that appear at least twice
      data.averageScore = data.totalScore / data.count;
    }
  });
  
  // Find strong positive and negative correlations
  const positiveActivities = [];
  const negativeActivities = [];
  
  Object.keys(activityMoodMap).forEach(activity => {
    const data = activityMoodMap[activity];
    if (data.count >= 2) {
      if (data.averageScore >= 0.5) {
        positiveActivities.push({
          activity,
          score: parseFloat(data.averageScore.toFixed(2)),
          occurrences: data.count
        });
      } else if (data.averageScore <= -0.5) {
        negativeActivities.push({
          activity,
          score: parseFloat(data.averageScore.toFixed(2)),
          occurrences: data.count
        });
      }
    }
  });
  
  // Sort by strongest correlation (absolute value)
  positiveActivities.sort((a, b) => b.score - a.score);
  negativeActivities.sort((a, b) => a.score - b.score);
  
  return { positiveActivities, negativeActivities };
}

/**
 * Compute weekly insights for a given start date
 * @param {Date|string} startDate - Start date of the week in local time (YYYY-MM-DD)
 * @returns {Promise<object>} Computed insights
 */
async function computeWeeklyReport(startDate) {
  // Parse and validate start date in local time
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0); // Set to start of day in local time
  
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start date');
  }
  
  // Calculate end date (7 days from start)
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  
  // Create a date range for logging
  const dateRange = {
    start: start.toISOString(),
    end: end.toISOString()
  };
  
  // Make the query robust to handle both Date and string date formats
  const pipeline = [
    {
      $addFields: {
        // Create a dateISO field that will be a Date object whether the original is string or Date
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
  const currentWeekEntries = await Entry.aggregate(pipeline);
  
  // Get entries from the previous week for comparison
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - 7);
  const previousEnd = new Date(previousStart);
  previousEnd.setDate(previousEnd.getDate() + 7);
  
  const previousPipeline = [
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
        dateISO: { $gte: previousStart, $lt: previousEnd }
      }
    },
    {
      $sort: { dateISO: 1 }
    }
  ];
  
  const previousWeekEntries = await Entry.aggregate(previousPipeline);
  
  // If no entries for current week, log debug info and return a minimal report
  if (!currentWeekEntries.length) {
    // Get the latest 3 entries for debugging
    const latestEntries = await Entry.find({})
      .sort({ date: -1 })
      .limit(3)
      .select('_id date city mood');
    
    // Log debug info but don't leak to client
    console.log(`[DEBUG] No entries found in range ${start.toISOString()} - ${end.toISOString()}. Latest entries:`, 
      latestEntries.map(e => ({ 
        id: e._id.toString(), 
        date: e.date instanceof Date ? e.date.toISOString() : e.date, 
        city: e.city, 
        mood: e.mood 
      }))
    );
    
    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        totalEntries: 0
      },
      avgMood: 0,
      grade: 'N/A',
      moodDistribution: {},
      activityCorrelations: {
        positive: [],
        negative: []
      },
      dayPatterns: null,
      tips: ['Start tracking your moods to see insights here.']
    };
  }
  
  // Group entries by day of week for day pattern analysis
  const dayGroups = {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []};
  currentWeekEntries.forEach(entry => {
    const date = new Date(entry.date);
    const dayOfWeek = date.getDay();
    dayGroups[dayOfWeek].push(entry);
  });
  
  // Calculate scores for each day
  const dayScores = Object.keys(dayGroups).map(day => {
    const entries = dayGroups[day];
    if (!entries.length) return null;
    
    const dayScore = entries.reduce((sum, entry) => sum + moodToScore(entry.mood), 0) / entries.length;
    return {
      day: parseInt(day),
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)],
      score: parseFloat(dayScore.toFixed(2)),
      entryCount: entries.length
    };
  }).filter(item => item !== null);
  
  // Sort days by score to find best and worst
  dayScores.sort((a, b) => b.score - a.score);
  const bestDay = dayScores.length > 0 ? dayScores[0] : null;
  const worstDay = dayScores.length > 0 ? dayScores[dayScores.length - 1] : null;
  
  // Calculate average mood scores
  const currentWeekScore = currentWeekEntries.reduce((sum, entry) => 
    sum + moodToScore(entry.mood), 0) / currentWeekEntries.length;
  
  const previousWeekScore = previousWeekEntries.length ? 
    previousWeekEntries.reduce((sum, entry) => sum + moodToScore(entry.mood), 0) / previousWeekEntries.length : null;
  
  // Calculate trend
  let trend = 'stable';
  let trendValue = 0;
  
  if (previousWeekScore !== null && Math.abs(currentWeekScore - previousWeekScore) > 0.3) {
    trend = currentWeekScore > previousWeekScore ? 'improved' : 'worsened';
    trendValue = parseFloat((currentWeekScore - previousWeekScore).toFixed(2));
  }
  
  const grade = scoreToGrade(currentWeekScore);
  
  // Calculate mood distribution
  const moodDistribution = {};
  currentWeekEntries.forEach(entry => {
    moodDistribution[entry.mood] = (moodDistribution[entry.mood] || 0) + 1;
  });
  
  // Find activity correlations
  const correlations = findMoodActivityCorrelations(currentWeekEntries);
  
  // Generate tips based on insights
  const tips = [];
  
  // Add tips based on positive activities
  if (correlations.positiveActivities.length > 0) {
    const activities = correlations.positiveActivities
      .slice(0, 2)
      .map(a => a.activity)
      .join(' and ');
    
    tips.push(`Your mood seems to improve when you ${activities}. Consider doing more of these activities.`);
  }
  
  // Add tips based on negative activities
  if (correlations.negativeActivities.length > 0) {
    const activities = correlations.negativeActivities
      .slice(0, 2)
      .map(a => a.activity)
      .join(' and ');
    
    tips.push(`Your mood tends to be lower when you ${activities}. Consider how these activities impact you.`);
  }
  
  // Add tips based on trend
  if (trend === 'worsened' && currentWeekScore < 0) {
    tips.push('Your mood has decreased this week. Consider scheduling activities you enjoy or reaching out to friends.');
  } else if (trend === 'improved' && currentWeekScore > 0) {
    tips.push('Great job! Your mood has improved this week. Try to maintain the positive changes you\'ve made.');
  } else if (trend === 'stable' && Math.abs(currentWeekScore) < 0.5) {
    tips.push('Your mood has been steady. This is a good time to try new activities that might boost your well-being.');
  }
  
  // If we don't have enough tips, add a generic one
  if (tips.length < 2) {
    tips.push('Regular mood tracking can help you identify patterns over time.');
  }
  
  // Create the final report with finite numbers and non-null arrays
  const weeklyInsights = {
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      totalEntries: currentWeekEntries.length
    },
    moodScore: {
      current: Number.isFinite(currentWeekScore) ? parseFloat(currentWeekScore.toFixed(2)) : 0,
      previous: previousWeekScore !== null && Number.isFinite(previousWeekScore) ? parseFloat(previousWeekScore.toFixed(2)) : null,
      trend,
      trendValue: Number.isFinite(trendValue) ? trendValue : 0,
      grade
    },
    moodDistribution: moodDistribution || {},
    dayPatterns: {
      bestDay,
      worstDay
    },
    correlations: {
      positiveActivities: correlations.positiveActivities ? correlations.positiveActivities.slice(0, 3) : [],
      negativeActivities: correlations.negativeActivities ? correlations.negativeActivities.slice(0, 3) : []
    },
    tips: tips || []
  };
  
  // Save insight to database
  try {
    await Insight.findOneAndUpdate(
      { range: `${start.toISOString().split('T')[0]}_weekly` },
      {
        range: `${start.toISOString().split('T')[0]}_weekly`,
        topMood: Object.entries(moodDistribution)
          .sort((a, b) => b[1] - a[1])[0][0],
        avgMood: currentWeekScore,
        grade,
        positiveActivities: correlations.positiveActivities.slice(0, 3).map(a => a.activity),
        negativeActivities: correlations.negativeActivities.slice(0, 3).map(a => a.activity),
        bestDay: bestDay ? bestDay.dayName : null,
        worstDay: worstDay ? worstDay.dayName : null,
        trend,
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error saving insight:', error);
  }
  
  return weeklyInsights;
}

/**
 * Generate weekly insights for current week
 */
async function generateCurrentWeeklyInsights() {
  // Calculate the start of the current week (Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  
  return await computeWeeklyReport(startOfWeek);
}

/**
 * Get insights for a specific date range
 * @param {Date} startDate Start date
 * @param {Date} endDate End date
 * @returns {Promise<Object>} Insights data
 */
async function getInsightsForRange(startDate, endDate) {
  try {
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date range');
    }
    
    // Fetch entries for the range
    const entries = await Entry.find({
      date: { $gte: start, $lt: end }
    }).sort({ date: 1 });
    
    if (entries.length === 0) {
      return {
        error: 'No entries found for this date range'
      };
    }
    
    // Calculate mood scores
    const scores = entries.map(entry => moodToScore(entry.mood));
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Find activity correlations
    const correlations = findMoodActivityCorrelations(entries);
    
    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        totalEntries: entries.length
      },
      moodScore: {
        average: parseFloat(avgScore.toFixed(2)),
        grade: scoreToGrade(avgScore)
      },
      correlations
    };
  } catch (error) {
    console.error('Error getting insights for range:', error);
    throw error;
  }
}
module.exports = {
  moodToScore,
  scoreToGrade,
  findMoodActivityCorrelations,
  computeWeeklyReport,
  generateCurrentWeeklyInsights,
  getInsightsForRange
};