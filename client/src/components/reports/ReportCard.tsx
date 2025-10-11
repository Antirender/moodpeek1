import React from 'react';
import MapPinIcon from '../icons/MapPinIcon';

const gradeColors: Record<string, string> = {
  'A': 'text-green-500',
  'B': 'text-green-400',
  'C': 'text-yellow-500',
  'D': 'text-orange-500',
  'F': 'text-red-500',
};

const trendIcons = {
  improved: (
    <div className="row">
      <svg xmlns="http://www.w3.org/2000/svg" className="icon-18" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586l3.293-3.293A1 1 0 0112 7z" clipRule="evenodd" />
      </svg>
      <span>Improved</span>
    </div>
  ),
  worsened: (
    <div className="row">
      <svg xmlns="http://www.w3.org/2000/svg" className="icon-18" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414l3.293 3.293A1 1 0 0012 13z" clipRule="evenodd" />
      </svg>
      <span>Worsened</span>
    </div>
  ),
  stable: (
    <div className="row">
      <svg xmlns="http://www.w3.org/2000/svg" className="icon-18" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 10a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
      <span>Stable</span>
    </div>
  ),
};

interface Activity {
  activity: string;
  score: number;
  occurrences: number;
}

interface Report {
  period?: {
    start: string;
    end: string;
    totalEntries: number;
  };
  moodScore?: {
    current: number;
    previous: number | null;
    trend: 'improved' | 'worsened' | 'stable';
    trendValue: number;
    grade: string;
  };
  moodDistribution?: Record<string, number>;
  dayPatterns?: {
    bestDay: { day: number; dayName: string; score: number; entryCount: number } | null;
    worstDay: { day: number; dayName: string; score: number; entryCount: number } | null;
  };
  correlations?: {
    positiveActivities: Array<Activity>;
    negativeActivities: Array<Activity>;
  };
  tips?: string[];
}

interface ReportCardProps {
  report: Report;
  isLoading: boolean;
  error?: string;
}

function getMoodEmoji(mood: string) {
  const moodMap: {[key: string]: string} = {
    'happy': '😄',
    'calm': '😌',
    'neutral': '😐',
    'sad': '😔',
    'stressed': '😫',
    'VERY_GOOD': '😄',
    'GOOD': '😌',
    'NEUTRAL': '😐',
    'BAD': '😔',
    'VERY_BAD': '😫',
  };
  return moodMap[mood] || '❓';
}

export default function ReportCard({ report, isLoading, error }: ReportCardProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse gap-m">
        <div className="h-8 w-3/4"></div>
        <div className="h-24"></div>
        <div className="h-16"></div>
        <div className="h-32"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card">
        {error}
      </div>
    );
  }
  
  if (!report || Object.keys(report).length === 0) {
    return (
      <div className="card">
        No report data available for this week.
      </div>
    );
  }
  
  const { moodScore, period, dayPatterns, correlations, tips } = report;
  
  const totalEntries = period?.totalEntries || 0;
  
  // Calculate most frequent mood from moodDistribution
  const moodDistribution = report?.moodDistribution || {};
  let topMood = { mood: 'none', count: 0 };
  
  Object.entries(moodDistribution).forEach(([mood, count]) => {
    if ((count as number) > topMood.count) {
      topMood = { mood, count: count as number };
    }
  });
  
  return (
    <div className="card">
      {/* Overall Grade */}
      <div className="row">
        <div className={`text-5xl font-bold ${moodScore?.grade ? gradeColors[moodScore.grade] || 'muted' : 'muted'}`}>
          {moodScore?.grade || 'C'}
        </div>
        <div className="ml-m">
          <h3 className="font-medium">Mood Score</h3>
          <div className="row text-sm">
            <span>{moodScore?.current ? moodScore.current.toFixed(1) : '0.0'}</span>
            {moodScore?.trend && trendIcons[moodScore.trend]}
          </div>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-m">
        <div className="card">
          <div className="text-sm muted">Entries</div>
          <div className="text-xl font-semibold">{totalEntries}</div>
        </div>
        <div className="card">
          <div className="text-sm muted">Top Mood</div>
          <div className="text-xl font-semibold row">
            {topMood.mood !== 'none' && (
              <>
                <span>{getMoodEmoji(topMood.mood)}</span>
                <span className="capitalize">{topMood.mood.toLowerCase()}</span>
              </>
            )}
            {topMood.mood === 'none' && 'None'}
          </div>
        </div>
      </div>
      
      {/* Best/Worst Days */}
      <div>
        <h3 className="font-medium mb-m">Day Patterns</h3>
        {dayPatterns?.bestDay && (
          <p className="entry-meta mb-s">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Best: <strong>{dayPatterns.bestDay.dayName}</strong></span>
          </p>
        )}
        
        {dayPatterns?.worstDay && (
          <p className="entry-meta">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>Worst: <strong>{dayPatterns.worstDay.dayName}</strong></span>
          </p>
        )}
        
        {(!dayPatterns?.bestDay && !dayPatterns?.worstDay) && (
          <div className="text-sm muted italic">
            Not enough data to determine day patterns
          </div>
        )}
      </div>
      
      {/* Tips */}
      {tips && tips.length > 0 && (
        <div>
          <h3 className="font-medium mb-m">Tips</h3>
          <ul className="gap-m">
            {tips.map((tip, index) => (
              <li key={index} className="row gap-s text-sm">
                <span>•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Activities */}
      {correlations && (correlations.positiveActivities?.length > 0 || correlations.negativeActivities?.length > 0) && (
        <div>
          <h3 className="font-medium mb-m">Activity Effects</h3>
          
          {correlations.positiveActivities?.length > 0 && (
            <div className="mb-m">
              <div className="text-sm font-medium">Positive</div>
              <ul>
                {correlations.positiveActivities.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="entry-meta">
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon-18" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>{item.activity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {correlations.negativeActivities?.length > 0 && (
            <div>
              <div className="text-sm font-medium">Negative</div>
              <ul>
                {correlations.negativeActivities.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="entry-meta">
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon-18" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.707-8.707l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 9.414V13a1 1 0 11-2 0V9.414L7.707 10.707a1 1 0 01-1.414-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>{item.activity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}