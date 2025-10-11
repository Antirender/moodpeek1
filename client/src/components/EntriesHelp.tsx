// src/components/EntriesHelp.tsx
import React, { useState } from 'react';

interface EntriesHelpProps {
  defaultOpen?: boolean;
}

export default function EntriesHelp({ defaultOpen = false }: EntriesHelpProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <details className="entries-help" open={isOpen}>
      <summary onClick={(e) => {
        e.preventDefault();
        setIsOpen(!isOpen);
      }} style={{ cursor: 'pointer' }}>
        <strong>📝 How to Use Mood Entries</strong>
      </summary>
      <div style={{ marginTop: '0.75rem' }}>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Recording Your Mood:</strong> Select your current mood state and add optional details like weather conditions, 
          activities, and notes. The more consistently you track, the better insights you'll gain.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Mood States:</strong> Choose from Happy (😊), Calm (😌), Neutral (😐), Sad (😔), or Stressed (😖). 
          Each mood is associated with a happiness score used for trend analysis.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Activity Tags:</strong> Add tags to categorize activities or events (e.g., "exercise", "work", "social"). 
          These tags help identify patterns in what affects your mood positively or negatively.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Managing Entries:</strong> View your recent entries on the right. Click any entry to edit or delete it. 
          You can update your mood or add missing details at any time.
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.8 }}>
          💡 <em>Tip: Try to record your mood at consistent times each day for the most accurate trends.</em>
        </p>
      </div>
    </details>
  );
}
