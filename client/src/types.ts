// src/types.ts - Type definitions and constants for MoodPeek app

// Mood enum as a union type for type safety
export type Mood = 'happy' | 'calm' | 'neutral' | 'sad' | 'stressed';

// Map mood values to numeric scores for calculations
export const moodScoreMap: Record<Mood, number> = {
  happy: 2,
  calm: 1,
  neutral: 0,
  sad: -1,
  stressed: -2,
};

// Helper functions
export const scoreFromMood = (mood: Mood): number => moodScoreMap[mood] || 0;

export const getMoodColor = (mood: Mood): string => {
  switch (mood) {
    case 'happy': return '#4ade80'; // green-400
    case 'calm': return '#60a5fa'; // blue-400
    case 'neutral': return '#a1a1aa'; // zinc-400
    case 'sad': return '#94a3b8'; // slate-400
    case 'stressed': return '#f87171'; // red-400
    default: return '#a1a1aa'; // default gray
  }
};

// Entry type matching the backend model
export interface Entry {
  _id?: string;
  date: Date | string;
  mood: Mood;
  city?: string;
  tags: string[];
  note?: string;
  weather?: {
    tempC?: number;
    humidity?: number;
    condition?: string;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Insight type matching the backend model
export interface Insight {
  _id?: string;
  range: string;
  topMood?: string;
  avgHappiness?: number;
  topPositiveTags: string[];
  topStressTags: string[];
  weatherCorrelation: {
    temp?: number;
    humidity?: number;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ReportCard for weekly/monthly reports
export interface ReportCard {
  period: {
    start: Date | string;
    end: Date | string;
  };
  avgHappiness: number;
  grade: string;
  moodDistribution?: Record<string, number>;
  moodSummary: {
    average: number;
    dominant: Mood;
    trend: 'improving' | 'declining' | 'stable';
  };
  tags: {
    positive: string[];
    negative: string[];
  };
  weatherEffects?: {
    bestTemp?: {
      range: string;
      score: number;
    };
    worstTemp?: {
      range: string;
      score: number;
    };
    bestHumidity?: {
      range: string;
      score: number;
    };
  };
  weatherInsight?: string;
  recommendation?: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Weekly Report type
export interface WeeklyReport {
  start: string; 
  end: string;
  avgHappiness: number; 
  grade: 'A'|'B'|'C'|'D'|'F';
  moodPie: Record<Mood, number>;
  topPositiveTags: string[]; 
  topStressTags: string[];
  weatherEffects: { 
    temp: 'up'|'down'|'none'; 
    humidity: 'up'|'down'|'none' 
  };
}