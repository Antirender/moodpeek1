// src/api/insights.ts
import useSWR from 'swr';

const API_URL = 'http://localhost:5174/api/insights';

/**
 * Fetch weekly insights for a given start date
 */
export function useWeeklyInsights(startDate?: string) {
  const url = startDate 
    ? `${API_URL}/weekly?start=${startDate}`
    : `${API_URL}/weekly`;
    
  const { data, error, isLoading, mutate } = useSWR(url);
  
  return {
    data,
    error,
    isLoading,
    mutate
  };
}

/**
 * Format date string to YYYY-MM-DD
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}