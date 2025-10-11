// src/components/ReportsHelp.tsx
import React, { useState } from 'react';

interface ReportsHelpProps {
  defaultOpen?: boolean;
}

export default function ReportsHelp({ defaultOpen = false }: ReportsHelpProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <details className="reports-help" open={isOpen}>
      <summary onClick={(e) => {
        e.preventDefault();
        setIsOpen(!isOpen);
      }} style={{ cursor: 'pointer' }}>
        <strong>📈 Understanding Your Weekly Report</strong>
      </summary>
      <div style={{ marginTop: '0.75rem' }}>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Weekly Summary:</strong> Get a comprehensive overview of your mood patterns for the selected week, 
          including your average happiness score, most common mood state, and total entries recorded.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Mood Trends:</strong> The line chart shows your daily average happiness score throughout the week. 
          Look for patterns or spikes that correlate with specific days or events.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Top Tags:</strong> The bar chart displays which activities or events had the biggest impact on your mood. 
          Positive values (green) boost happiness, negative values (red) correlate with lower mood scores.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Navigation:</strong> Use the arrow buttons to view reports from previous or future weeks. 
          You can also print or export your report for personal records or to share with healthcare providers.
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.8 }}>
          💡 <em>Tip: Compare multiple weeks to identify long-term patterns and seasonal mood changes.</em>
        </p>
      </div>
    </details>
  );
}
