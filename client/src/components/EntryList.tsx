import React, { useState } from 'react';
import { useEntries, entriesApi } from '../api/entries';
import { Entry, Mood, getMoodColor } from '../types';
import ConfirmDialog from './ConfirmDialog';
import EntryForm from './EntryForm';
import FilterBar from './FilterBar';
import EntryCover from './EntryCover';
import EntryIcon from './EntryIcon';
import LocationMeta from './LocationMeta';

interface EntryListProps {
  onEdit?: (entry: Entry) => void;
}

export default function EntryList({ onEdit }: EntryListProps) {
  const [filters, setFilters] = useState<{from?: string; to?: string; mood?: string; city?: string}>({});
  const { entries, isLoading, isError } = useEntries(filters);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  
  // Extract unique cities for the filter dropdown
  const cities = Array.from(new Set(entries.map(entry => entry.city).filter(Boolean) as string[]));
  
  const handleDelete = async (id: string) => {
    try {
      await entriesApi.delete(id);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    }
  };
  
  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getMoodEmoji = (mood: Mood) => {
    switch (mood) {
      case 'happy': return '😄';
      case 'calm': return '😌';
      case 'neutral': return '😐';
      case 'sad': return '😔';
      case 'stressed': return '😫';
      default: return '';
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-8">Loading entries...</div>;
  }
  
  if (isError) {
    return (
      <div className="card">
        Failed to load entries. Please try again later.
      </div>
    );
  }
  
  if (entries.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="muted">No entries found.</p>
        <p className="muted mt-s">Add an entry or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div>
      <FilterBar 
        from={filters.from || ''} 
        to={filters.to || ''} 
        mood={filters.mood || ''} 
        city={filters.city || ''}
        cities={cities}
        onChange={changes => setFilters({...filters, ...changes})}
        onClear={() => setFilters({})}
        onApply={() => {}} // Apply happens on change
      />
      
      <div className="entry-list grid-2">
        {entries.map(entry => (
          <article
            key={entry._id}
            className={`entry-card card border-l-4 ${
              entry.mood ? getMoodColor(entry.mood as Mood) : 'border-gray-300'
            }`}
          >
            {editingEntryId === entry._id ? (
              <div className="p-4">
                <div className="row-between mb-m">
                  <h3>Edit Entry</h3>
                  <button
                    type="button"
                    onClick={() => setEditingEntryId(null)}
                    className="icon-btn"
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </button>
                </div>
                <EntryForm
                  initialEntry={{
                    _id: entry._id,
                    date: entry.date instanceof Date ? entry.date.toISOString().split('T')[0] : new Date(entry.date).toISOString().split('T')[0],
                    mood: entry.mood as Mood,
                    city: entry.city,
                    tags: entry.tags,
                    note: entry.note
                  }}
                  isEditing
                  onSuccess={() => setEditingEntryId(null)}
                />
              </div>
            ) : (
              <div className="p-4">
                <figure>
                  <EntryCover 
                    url={(entry as any).imageUrl ?? null} 
                    alt={`${entry.city} ${entry.mood}`} 
                    query={entry.city ? `${entry.city} ${entry.mood}` : entry.mood} 
                  />
                </figure>
                <header className="mb-3">
                  <div className="row-between">
                    <div className="row">
                      <span className="mood-emoji">{getMoodEmoji(entry.mood as Mood)}</span>
                      <h3 className="capitalize">{entry.mood}</h3>
                      <span className="separator">•</span>
                      <span className="text-sm muted">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                  </div>
                    
                  {entry.city && (
                    <div className="mt-s">
                      <LocationMeta 
                        city={entry.city}
                        tempC={entry.weather?.tempC}
                        condition={entry.weather?.condition}
                      />
                    </div>
                  )}
                </header>
                
                <div className="entry-actions">
                    <button 
                      type="button"
                      onClick={() => entry._id && setEditingEntryId(entry._id)}
                      className="icon-btn edit"
                      aria-label="Edit entry"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      type="button"
                      onClick={() => entry._id && (document.getElementById(`dlgDel-${entry._id}`) as HTMLDialogElement).showModal()}
                      className="icon-btn delete"
                      aria-label="Delete entry"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    {entry._id && (
                      <ConfirmDialog 
                        id={`dlgDel-${entry._id}`} 
                        message="Are you sure you want to delete this entry?" 
                        onConfirm={() => entry._id && handleDelete(entry._id)} 
                      />
                    )}
                </div>
                
                {entry.tags && entry.tags.length > 0 && (
                  <div className="tags-container">
                    {entry.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="chip"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {entry.note && (
                  <div className="mt-m">
                    {entry.note}
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
