import { Entry } from '../../types';

/**
 * Calculates a rolling average for a series of entries
 * @param entries Array of entries sorted by date
 * @param window Window size for rolling average (default: 7 days)
 * @returns Array of objects with date and rolling average value
 */
export const calculateRollingAverage = (
  entries: Entry[],
  window: number = 7
): { date: Date; value: number }[] => {
  if (!entries.length) return [];

  // Sort entries by date ascending
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate rolling average
  return sortedEntries.map((entry, idx) => {
    const windowStart = Math.max(0, idx - window + 1);
    const windowEntries = sortedEntries.slice(windowStart, idx + 1);
    
    const sum = windowEntries.reduce(
      (total, e) => total + moodToScore(e.mood),
      0
    );
    
    return {
      date: new Date(entry.date),
      value: sum / windowEntries.length
    };
  });
};

/**
 * Bins temperature data into ranges for heatmap visualization
 * @param entries Array of entries with weather data
 * @param bins Number of bins to create (default: 5)
 * @returns Array of binned data with temperature range and average mood score
 */
export const binTemperatureData = (
  entries: Entry[],
  bins: number = 5
): { range: string; value: number; count: number }[] => {
  // Filter entries with temperature data
  const entriesWithTemp = entries.filter(e => e.weather?.tempC !== undefined);
  
  if (entriesWithTemp.length === 0) return [];
  
  // Find min and max temperature
  const temps = entriesWithTemp.map(e => e.weather!.tempC!);
  const minTemp = Math.floor(Math.min(...temps));
  const maxTemp = Math.ceil(Math.max(...temps));
  
  // Create bins
  const binSize = (maxTemp - minTemp) / bins;
  const binRanges = Array.from({ length: bins }, (_, i) => ({
    min: minTemp + i * binSize,
    max: minTemp + (i + 1) * binSize,
    entries: [] as Entry[]
  }));
  
  // Assign entries to bins
  entriesWithTemp.forEach(entry => {
    const temp = entry.weather!.tempC!;
    const binIndex = Math.min(
      bins - 1,
      Math.floor((temp - minTemp) / binSize)
    );
    binRanges[binIndex].entries.push(entry);
  });
  
  // Calculate average mood score for each bin
  return binRanges.map(bin => {
    if (bin.entries.length === 0) {
      return {
        range: `${bin.min.toFixed(1)}°C - ${bin.max.toFixed(1)}°C`,
        value: 0,
        count: 0
      };
    }
    
    const sum = bin.entries.reduce(
      (total, entry) => total + moodToScore(entry.mood),
      0
    );
    
    return {
      range: `${bin.min.toFixed(1)}°C - ${bin.max.toFixed(1)}°C`,
      value: sum / bin.entries.length,
      count: bin.entries.length
    };
  });
};

/**
 * Bins humidity data into ranges for heatmap visualization
 * @param entries Array of entries with weather data
 * @param bins Number of bins to create (default: 5)
 * @returns Array of binned data with humidity range and average mood score
 */
export const binHumidityData = (
  entries: Entry[],
  bins: number = 5
): { range: string; value: number; count: number }[] => {
  // Filter entries with humidity data
  const entriesWithHumidity = entries.filter(e => e.weather?.humidity !== undefined);
  
  if (entriesWithHumidity.length === 0) return [];
  
  // Find min and max humidity
  const humidities = entriesWithHumidity.map(e => e.weather!.humidity!);
  const minHumidity = Math.floor(Math.min(...humidities));
  const maxHumidity = Math.ceil(Math.max(...humidities));
  
  // Create bins
  const binSize = (maxHumidity - minHumidity) / bins;
  const binRanges = Array.from({ length: bins }, (_, i) => ({
    min: minHumidity + i * binSize,
    max: minHumidity + (i + 1) * binSize,
    entries: [] as Entry[]
  }));
  
  // Assign entries to bins
  entriesWithHumidity.forEach(entry => {
    const humidity = entry.weather!.humidity!;
    const binIndex = Math.min(
      bins - 1,
      Math.floor((humidity - minHumidity) / binSize)
    );
    binRanges[binIndex].entries.push(entry);
  });
  
  // Calculate average mood score for each bin
  return binRanges.map(bin => {
    if (bin.entries.length === 0) {
      return {
        range: `${bin.min.toFixed(0)}% - ${bin.max.toFixed(0)}%`,
        value: 0,
        count: 0
      };
    }
    
    const sum = bin.entries.reduce(
      (total, entry) => total + moodToScore(entry.mood),
      0
    );
    
    return {
      range: `${bin.min.toFixed(0)}% - ${bin.max.toFixed(0)}%`,
      value: sum / bin.entries.length,
      count: bin.entries.length
    };
  });
};

/**
 * Calculate tag contribution to mood scores
 * @param entries Array of entries
 * @returns Object with positive and negative tag influences
 */
export const calculateTagContributions = (entries: Entry[]) => {
  // Map of tag to [total score, occurrence count]
  const tagMap = new Map<string, [number, number]>();
  
  // Process each entry
  entries.forEach(entry => {
    const score = moodToScore(entry.mood);
    
    entry.tags.forEach(tag => {
      const [currentTotal, currentCount] = tagMap.get(tag) || [0, 0];
      tagMap.set(tag, [currentTotal + score, currentCount + 1]);
    });
  });
  
  // Convert to array of {tag, value} objects
  const tagContributions = Array.from(tagMap.entries()).map(([tag, [total, count]]) => ({
    tag,
    value: total / count
  }));
  
  // Sort by value
  const sortedTags = [...tagContributions].sort((a, b) => b.value - a.value);
  
  // Return top 5 positive and top 5 negative
  return {
    positive: sortedTags.filter(t => t.value > 0).slice(0, 5),
    negative: sortedTags.filter(t => t.value < 0).sort((a, b) => a.value - b.value).slice(0, 5)
  };
};

/**
 * Convert mood string to numeric score
 * @param mood Mood string
 * @returns Numeric score
 */
const moodToScore = (mood: string): number => {
  switch (mood) {
    case 'happy': return 2;
    case 'calm': return 1;
    case 'neutral': return 0;
    case 'sad': return -1;
    case 'stressed': return -2;
    default: return 0;
  }
};

/**
 * Format a date for display
 * @param date Date object or string
 * @returns Formatted date string (e.g., "Oct 15")
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};