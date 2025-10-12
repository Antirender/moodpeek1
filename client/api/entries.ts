import useSWR, { mutate } from 'swr';
import { Entry } from '../types';

const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5174/api';

// Reusable fetch function with error handling
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'An error occurred');
  }
  return res.json();
};

// Custom hook for fetching entries with filters
export function useEntries(filters?: {
  from?: string;
  to?: string;
  mood?: string;
  city?: string;
}) {
  let url = `${API_URL}/entries`;

  // Add query parameters if filters are provided
  if (filters) {
    const params = new URLSearchParams();
    
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.mood) params.append('mood', filters.mood);
    if (filters.city) params.append('city', filters.city);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
  }

  const { data, error, isLoading } = useSWR<Entry[]>(url, fetcher);

  return {
    entries: data || [],
    isLoading,
    isError: error,
  };
}

// CRUD operations for entries
export const entriesApi = {
  // Create a new entry
  async create(entry: Omit<Entry, '_id'>) {
    try {
      const res = await fetch(`${API_URL}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create entry');
      }

      const newEntry = await res.json();
      
      // Revalidate the entries list
      mutate(`${API_URL}/entries`);
      return newEntry;
    } catch (error) {
      console.error('Error creating entry:', error);
      throw error;
    }
  },

  // Update an entry
  async update(id: string, updates: Partial<Entry>) {
    try {
      const res = await fetch(`${API_URL}/entries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update entry');
      }

      const updatedEntry = await res.json();
      
      // Revalidate the entries list
      mutate(`${API_URL}/entries`);
      return updatedEntry;
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  },

  // Delete an entry
  async delete(id: string) {
    try {
      const res = await fetch(`${API_URL}/entries/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete entry');
      }

      // Revalidate the entries list
      mutate(`${API_URL}/entries`);
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  },
};