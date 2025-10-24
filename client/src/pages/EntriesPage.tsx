import React, { useRef } from 'react';
import EntryForm from '../components/EntryForm';
import EntryList from '../components/EntryList';
import EntriesHelp from '../components/EntriesHelp';
import '../styles/charts.css';
// AI Assistance: Content and explanations were generated/refined with ChatGPT (OpenAI, 2025)
// Reference: https://chatgpt.com/share/68fb7b6c-bc20-800c-af73-9729ade1663c
// AI Assistance: Content and explanations were generated/refined with ChatGPT (OpenAI, 2025)
// Reference: https://chatgpt.com/share/68fae879-9770-800c-b09b-b242fb0d0f1c
// Add/remove/refine more details by myself

export default function EntriesPage() {
  return (
    <main className="container">
      <header style={{ marginBottom: '1.5rem' }}>
        <h2>Mood Entries</h2>
        <p style={{ color: 'var(--pico-muted-color)' }}>
          Track your daily mood, activities, and notes to understand your emotional patterns.
        </p>
      </header>
      
      <EntriesHelp defaultOpen={false} />
      
      <div className="grid-2 mt-m">
        <div>
          <article>
            <header>
              <h3>New Entry</h3>
            </header>
            <EntryForm />
          </article>
        </div>
        
        <div>
          <article>
            <header>
              <h3>Your Entries</h3>
            </header>
            <EntryList />
          </article>
        </div>
      </div>
    </main>
  );
}
