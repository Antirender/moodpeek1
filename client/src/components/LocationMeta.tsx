import React from 'react';

interface LocationMetaProps {
  city: string;
  tempC?: number;
  condition?: string;
}

const LocationMeta: React.FC<LocationMetaProps> = ({ city, tempC, condition }) => {
  return (
    <p className="entry-meta">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="icon-18" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
        />
      </svg>
      <span>{city}</span>
      
      {tempC !== undefined && (
        <span className="weather-data">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="icon-18" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" 
            />
          </svg>
          <span>{tempC}°C</span>
          {condition && <span className="condition">{condition}</span>}
        </span>
      )}
    </p>
  );
};

export default LocationMeta;