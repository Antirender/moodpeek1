import React, { useRef } from 'react';
import EntryForm from '../components/EntryForm';
import EntryList from '../components/EntryList';
import EntriesHelp from '../components/EntriesHelp';
import '../styles/charts.css';

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