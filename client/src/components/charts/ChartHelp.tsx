// src/components/charts/ChartHelp.tsx
import React, { useState } from 'react';

interface ChartHelpProps {
  defaultOpen?: boolean;
}

export default function ChartHelp({ defaultOpen = false }: ChartHelpProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
// AI Assistance: Content and explanations were generated/refined with ChatGPT (OpenAI, 2025)
// Reference: https://chatgpt.com/share/68fae879-9770-800c-b09b-b242fb0d0f1c
// Add/remove/refine more details by myself

  return (
    <details className="chart-help" open={isOpen}>
      <summary onClick={(e) => {
        e.preventDefault();
        setIsOpen(!isOpen);
      }} style={{ cursor: 'pointer' }}>
        <strong>📊 How to Read These Charts</strong>
      </summary>
      <div style={{ marginTop: '0.75rem' }}>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Temperature × Mood Heatmap:</strong> Shows the relationship between temperature ranges and your mood states. 
          Brighter colors indicate higher frequency of that mood at that temperature.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Mood Over Time:</strong> Displays your average happiness score over time using a 7-day rolling average. 
          Higher values indicate better mood.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Tag Analysis:</strong> Shows how different tags (activities, events) correlate with your mood. 
          Green bars indicate positive impact, red bars indicate negative impact on your happiness score.
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.8 }}>
          💡 <em>Tip: Hover over chart elements to see detailed values.</em>
        </p>
      </div>
    </details>
  );
}
