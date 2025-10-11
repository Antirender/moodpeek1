// src/components/EntryCover.tsx
import React, { useState, useEffect } from 'react';
import { loadImageURL } from '../lib/imageLoader';
import { trackStart, trackError } from '../lib/imageTracker';
import '../styles/entry-cover.css';

interface EntryCoverProps {
  url?: string | null;
  alt?: string;
  query?: string; // Optional search query for Unsplash images
  className?: string;
}

// Placeholder shown when no image is available
const EntryPlaceholder: React.FC = () => (
  <div className="entry-cover--placeholder" aria-hidden="true">
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      width="128"
      height="128"
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </div>
);

// For crediting Unsplash images as required by their API
const UnsplashAttribution: React.FC = () => (
  <a 
    href="https://unsplash.com" 
    target="_blank" 
    rel="noopener noreferrer"
    className="unsplash-attribution"
    aria-label="Photos provided by Unsplash"
  >
    <svg aria-hidden="true" width="32" height="10" viewBox="0 0 32 10" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 0h11a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5zm5.5 7a2 2 0 100-4 2 2 0 000 4zM21 0h11v10H21V0zM0 0h10v3H0V0zm0 7h10v3H0V7z" />
    </svg>
  </a>
);

const EntryCover: React.FC<EntryCoverProps> = ({ 
  url, 
  alt = 'Entry image',
  query,
  className = ''
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(url || null);
  const [isUnsplash, setIsUnsplash] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
    // If a direct URL is provided, use it
    if (url) {
      setImageUrl(url);
      setIsUnsplash(false);
      return;
    }
    
    // If we have a query, try to fetch from Unsplash
    if (query) {
      const fetchImage = async () => {
        setIsLoading(true);
        setLoadError(false);
        
        try {
          // Build normalized query from {city} {mood} {weather.condition}
          const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
          
          // Load image from cache or server
          const result = await loadImageURL('cover', normalizedQuery, { w: 800, h: 520 });
          setImageUrl(result.url);
          setIsUnsplash(result.source === 'unsplash'); 
        } catch (error) {
          console.error(`[EntryCover] Error fetching image for "${query}":`, error);
          setLoadError(true);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchImage();
    }
  }, [url, query]);
  
  if (isLoading) {
    return (
      <div className={`entry-cover ${className} entry-cover--loading`} aria-busy="true">
        <span className="visually-hidden">Loading image...</span>
      </div>
    );
  }
  
  if (!imageUrl || loadError) {
    return <EntryPlaceholder />;
  }
  
  return (
    <div className={`entry-cover-container ${className}`}>
      <img 
        src={imageUrl} 
        alt={alt}
        className="entry-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        data-source={isUnsplash ? 'unsplash' : 'other'}
        onError={(e) => {
          // If image fails to load, try refreshing once
          console.warn('[EntryCover] Image failed to load:', imageUrl);
          
          // Track this error for analytics
          trackError(`display_${imageUrl}`, {
            errorType: 'load_error',
            message: 'Image failed to load'
          });
          
          // Try to fetch a new image if we have a query
          if (query) {
            console.log('[EntryCover] Attempting to refresh image');
            
            // Force a fresh fetch (bypass cache)
            loadImageURL('cover', query, { w: 800, h: 520 })
              .then((result: { url: string, source: string }) => {
                if (result.url !== imageUrl) {
                  console.log('[EntryCover] Got new image URL:', result.url);
                  setImageUrl(result.url);
                  setIsUnsplash(result.source === 'unsplash');
                } else {
                  console.warn('[EntryCover] Failed to get new image, showing placeholder');
                  setLoadError(true);
                }
              })
              .catch(() => {
                setLoadError(true);
              });
          } else {
            setLoadError(true);
          }
        }}
      />
      {isUnsplash && <UnsplashAttribution />}
    </div>
  );
};

export default EntryCover;