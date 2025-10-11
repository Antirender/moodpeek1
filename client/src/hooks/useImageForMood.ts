// src/hooks/useImageForMood.ts
import { useState, useEffect } from 'react';
import { fetchJSON } from '../lib/http';
import { getFromCache, saveToCache, cleanupExpiredEntries } from '../lib/imageCache';

interface ImageData {
  url: string;
  alt: string;
  mood: string;
}

interface UseImageForMoodResult {
  image: ImageData | null;
  loading: boolean;
  error: Error | null;
}

/**
 * A hook to fetch an image for a specific mood with dual-layer caching
 * (localStorage client-side and server-side caching)
 */
export function useImageForMood(mood: string): UseImageForMoodResult {
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Clean up expired entries when the hook is first used
    cleanupExpiredEntries();
    
    async function fetchImage() {
      if (!mood) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // First, try to get from client cache
        const cachedImage = getFromCache(mood);
        
        if (cachedImage) {
          // Use cached image immediately
          setImage({
            url: cachedImage.url,
            alt: cachedImage.alt,
            mood: cachedImage.mood
          });
          setLoading(false);
          return;
        }
        
        // If not in cache, fetch from API
        const imageData = await fetchJSON(`/api/images/mood/${encodeURIComponent(mood)}`);
        
        // Save to client cache
        saveToCache(mood, imageData);
        
        setImage(imageData);
      } catch (err) {
        console.error('Error fetching mood image:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchImage();
  }, [mood]);

  return { image, loading, error };
}