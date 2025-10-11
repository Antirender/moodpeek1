// src/lib/http.ts
export const fetchJSON = async (url: string) => {
  try {
    const response = await fetch(url);
    
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