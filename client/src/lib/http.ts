// src/lib/http.ts

// Get API base URL from environment variable
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5174/api';

/**
 * Build full URL from relative path or return absolute URL as-is
 */
const buildUrl = (url: string): string => {
  // If URL is already absolute (starts with http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL is relative (starts with /api/), prepend API_BASE after removing /api
  if (url.startsWith('/api/')) {
    return `${API_BASE}${url.substring(4)}`; // Remove '/api' prefix since API_BASE already includes it
  }
  
  // If URL is just a path, prepend API_BASE
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`;
  }
  
  // Otherwise assume it's a relative path
  return `${API_BASE}/${url}`;
};

export const fetchJSON = async (url: string) => {
  try {
    const fullUrl = buildUrl(url);
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      // Create a custom error with status and statusText
      const error = new Error(`${response.status} ${response.statusText}`);
      // Add response details to the error object
      (error as any).info = await response.json().catch(() => ({}));
      (error as any).status = response.status;
      throw error;
    }
    
    return response.json();
  } catch (error) {
    // Re-throw fetch errors or network errors
    console.error('Fetch error:', error);
    throw error;
  }
};