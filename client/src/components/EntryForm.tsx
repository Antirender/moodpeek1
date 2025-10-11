import React, { useState } from 'react';
import { Mood, moodScoreMap } from '../types';
import { entriesApi } from '../api/entries';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
}

const TagInput: React.FC<TagInputProps> = ({ tags, setTags }) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmedValue = inputValue.trim();
      
      if (trimmedValue && !tags.includes(trimmedValue)) {
        setTags([...tags, trimmedValue]);
        setInputValue('');
      }
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  return (
    <div>
      <label>
        Tags (press Enter or comma to add)
      </label>
      
      <div className="tags-container mb-m">
        {tags.map(tag => (
          <span 
            key={tag}
            className="tag"
          >
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(tag)}
              className="tag-remove-btn"
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add tags..."
      />
    </div>
  );
};

// Main Entry Form Component
interface EntryFormProps {
  onSuccess?: () => void;
  initialEntry?: {
    _id?: string;
    date?: string;
    mood?: Mood;
    city?: string;
    tags?: string[];
    note?: string;
  };
  isEditing?: boolean;
}

export default function EntryForm({ onSuccess, initialEntry, isEditing = false }: EntryFormProps) {
  const today = new Date().toISOString().split('T')[0];
  
  // Form state
  const [date, setDate] = useState(initialEntry?.date || today);
  const [mood, setMood] = useState<Mood | ''>((initialEntry?.mood as Mood) || '');
  const [city, setCity] = useState(initialEntry?.city || '');
  const [tags, setTags] = useState<string[]>(initialEntry?.tags || []);
  const [note, setNote] = useState(initialEntry?.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const cityOptions = ['Toronto', 'Vancouver', 'Montreal', 'London', 'New York'];
  const moodOptions: Mood[] = ['happy', 'calm', 'neutral', 'sad', 'stressed'];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!date || !mood) {
      setError('Date and mood are required');
      return;
    }
    
    const entryData = {
      date,
      mood,
      city: city || undefined,
      tags,
      note: note || undefined,
    };
    
    setIsSubmitting(true);
    
    try {
      if (isEditing && initialEntry?._id) {
        await entriesApi.update(initialEntry._id, entryData);
      } else {
        await entriesApi.create(entryData);
      }
      
      // Reset form after successful submission (if not editing)
      if (!isEditing) {
        setDate(today);
        setMood('');
        setCity('');
        setTags([]);
        setNote('');
      }
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getMoodEmoji = (moodValue: Mood) => {
    switch (moodValue) {
      case 'happy': return '😄';
      case 'calm': return '😌';
      case 'neutral': return '😐';
      case 'sad': return '😔';
      case 'stressed': return '😫';
      default: return '';
    }
  };
  
  const getMoodColor = (moodValue: Mood) => {
    switch (moodValue) {
      case 'happy': return 'bg-green-100 border-green-300 text-green-800';
      case 'calm': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'neutral': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'sad': return 'bg-slate-100 border-slate-300 text-slate-800';
      case 'stressed': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-white border-gray-300';
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <article aria-busy="false" aria-label="Error notification">
          <div role="alert">{error}</div>
        </article>
      )}
      
      <div className="grid">
        {/* Date */}
        <label htmlFor="date">
          Date
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        
        {/* City */}
        <label htmlFor="city">
          City
          <input
            type="text"
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            list="city-options"
            placeholder="Enter your city"
          />
          <datalist id="city-options">
            {cityOptions.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </label>
      </div>
      
      {/* Mood */}
      <fieldset>
        <legend>How are you feeling today?</legend>
        {moodOptions.map((moodOption) => (
          <label key={moodOption}>
            <input
              type="radio"
              name="mood"
              value={moodOption}
              checked={mood === moodOption}
              onChange={() => setMood(moodOption)}
              required
            />
            <span>{getMoodEmoji(moodOption)} {moodOption}</span>
          </label>
        ))}
      </fieldset>
      
      {/* Tags */}
      <TagInput tags={tags} setTags={setTags} />
      
      {/* Note */}
      <label htmlFor="note">
        Note
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Add any notes about your day..."
        ></textarea>
      </label>
      
      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting 
          ? 'Saving...' 
          : isEditing 
            ? 'Update Entry' 
            : 'Save Entry'
        }
      </button>
    </form>
  );
}