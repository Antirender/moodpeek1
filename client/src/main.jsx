import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@picocss/pico/css/pico.min.css"
import "./styles/mood.css"
import "./styles/semantic.css"
import "./styles/pico-overrides.css"
import "./styles/print.css" // Import print styles for PDF export
import "./styles/responsive.css" // Import responsive utilities
import App from './App.jsx'
import { getTheme, applyTheme } from './lib/theme'
import { loadImageURL, purgeExternalUrls } from './lib/imageLoader'

// Apply saved theme on initial load
applyTheme(getTheme())

// Purge any external image URLs from localStorage
purgeExternalUrls()

// Create and add the persistent background element
function setupHeroBackground() {
  // Check if the element already exists
  let bgElement = document.getElementById('bg-premade');
  
  if (!bgElement) {
    bgElement = document.createElement('div');
    bgElement.id = 'bg-premade';
    bgElement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bgElement);
  }
  
  // Add CSS for the background
  const style = document.createElement('style');
  style.textContent = `
    #bg-premade {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: -1;
      background-size: cover;
      background-position: center;
      opacity: 0.18;
      transition: background-image 1s ease, opacity 0.5s ease;
    }
    
    @media (prefers-color-scheme: dark) {
      #bg-premade {
        opacity: 0.1;
      }
    }
  `;
  document.head.appendChild(style);

  // Load the hero image
  loadImageURL('hero', 'calm sky aurora', { w: 1600, h: 900 })
    .then(result => {
      bgElement.style.backgroundImage = `url(${result.url})`;
      // Track the success for analytics if needed
      console.log('Hero image loaded from:', result.source);
    })
    .catch(err => {
      console.error('Failed to load hero image:', err);
      // Fallback to direct Picsum URL
      const fallbackUrl = `https://picsum.photos/1600/900?random=${Math.random()}`;
      bgElement.style.backgroundImage = `url(${fallbackUrl})`;
    });
}

// Set up the hero background when the page loads
setupHeroBackground();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
