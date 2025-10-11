import React, { useState, useRef, useEffect } from 'react';

/**
 * TagInput component for managing a collection of tags
 * 
 * @param {Object} props Component props
 * @param {Array<string>} props.value Array of tag strings
 * @param {Function} props.onChange Callback when tags change
 * @param {number} [props.maxTags=12] Maximum number of tags allowed
 * @param {RegExp} [props.pattern=/^[a-z0-9-_]{1,24}$/i] Validation pattern for tags
 * @param {string} [props.placeholder='Add tags...'] Placeholder text
 */
function TagInput({ 
  value = [], 
  onChange, 
  maxTags = 12,
  pattern = /^[a-z0-9-_]{1,24}$/i,
  placeholder = 'Add tags...',
  id = 'tag-input' 
}) {
  const [inputValue, setInputValue] = useState('');
  const [hint, setHint] = useState('');
  const [showCounter, setShowCounter] = useState(false);
  const inputRef = useRef(null);
  
  // Show the counter when approaching the limit
  useEffect(() => {
    // Show counter when at least 75% of max tags or within 3 tags of limit
    const shouldShowCounter = value.length >= Math.max(maxTags * 0.75, maxTags - 3);
    setShowCounter(shouldShowCounter);
    
    // Clear any validation hints when tags change
    if (hint && !hint.includes("already exists")) {
      setHint('');
    }
  }, [value.length, maxTags, hint]);
  
  // Normalize a tag: trim, lowercase, strip leading #, validate
  const normalizeTag = (tag) => {
    if (!tag) return '';
    
    // Trim whitespace, lowercase, and remove leading # if present
    let normalized = tag.trim().toLowerCase();
    if (normalized.startsWith('#')) {
      normalized = normalized.substring(1);
    }
    
    return normalized;
  };

  // Validate a single tag
  const validateTag = (tag) => {
    if (!tag) return false;
    
    // Check against pattern
    if (!pattern.test(tag)) {
      setHint('Tag should only contain letters, numbers, - or _ and be up to 24 chars');
      return false;
    }
    
    // Check if tag already exists
    if (value.includes(tag)) {
      setHint(`Tag "${tag}" already exists`);
      return false;
    }
    
    // Check max tags limit
    if (value.length >= maxTags) {
      setHint(`Maximum ${maxTags} tags allowed`);
      return false;
    }
    
    return true;
  };
  
  // Add multiple tags
  const addTags = (tagsToAdd) => {
    // Filter out empty strings and duplicates
    const validTags = tagsToAdd
      .filter(tag => tag && !value.includes(tag) && pattern.test(tag));
    
    // Check if adding would exceed max tags
    if (value.length + validTags.length > maxTags) {
      setHint(`Maximum ${maxTags} tags allowed`);
      // Add as many as we can up to the limit
      const remainingSlots = Math.max(0, maxTags - value.length);
      if (remainingSlots > 0) {
        onChange([...value, ...validTags.slice(0, remainingSlots)]);
      }
      return;
    }
    
    // Add all valid tags
    if (validTags.length > 0) {
      onChange([...value, ...validTags]);
      setHint(''); // Clear hint on successful add
    }
  };
  
  // Add a single tag
  const addTag = (tagText) => {
    const normalized = normalizeTag(tagText);
    if (!normalized) return;
    
    if (validateTag(normalized)) {
      addTags([normalized]);
      setInputValue('');
      
      // Announce tag added for screen readers
      const message = `Tag ${normalized} added.`;
      setHint(message);
      
      // Clear the message after 1.5 seconds
      setTimeout(() => {
        if (hint === message) {
          setHint('');
        }
      }, 1500);
      
      // Keep focus in the input field
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };
  
  // Remove a tag
  const removeTag = (tagToRemove) => {
    onChange(value.filter(tag => tag !== tagToRemove));
    
    // Announce tag removed for screen readers
    const message = `Tag ${tagToRemove} removed.`;
    setHint(message);
    
    // Clear the message after 1.5 seconds
    setTimeout(() => {
      if (hint === message) {
        setHint('');
      }
    }, 1500);
    
    // Return focus to input field
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const inputText = e.target.value;
    
    // Check if the last character is a delimiter (comma, space)
    if (inputText.endsWith(',') || inputText.endsWith(' ')) {
      // Get the tag without the delimiter
      const tagText = inputText.slice(0, -1);
      addTag(tagText);
    } else {
      setInputValue(inputText);
      // Clear hint when user types
      if (hint) setHint('');
    }
  };
  
  // Handle key down events
  const handleKeyDown = (e) => {
    // Enter key adds the current tag
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } 
    // Comma adds the current tag
    else if (e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
    // Tab with content should add the tag before moving focus
    else if (e.key === 'Tab' && inputValue.trim() !== '') {
      // Don't prevent default - we want normal tab behavior
      // But we do want to add the tag
      addTag(inputValue);
    }
    // Backspace on empty input removes the last tag
    else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      const newTags = [...value];
      newTags.pop();
      onChange(newTags);
    }
    // Escape clears the input
    else if (e.key === 'Escape') {
      e.preventDefault(); // Don't let Escape bubble up to dialog/modal handlers
      setInputValue('');
      setHint('');
      // Keep focus in the input after clearing
      inputRef.current?.focus();
    }
    // Down arrow with no text opens autocomplete/suggestion if we add that later
    else if (e.key === 'ArrowDown' && !inputValue) {
      // Future feature placeholder - could show a dropdown of popular tags
    }
  };
  
  // Handle blur event to add the current input as a tag
  const handleBlur = () => {
    if (inputValue) {
      addTag(inputValue);
    }
  };
  
  // Expose method to commit any pending tag
  // This can be called from a parent form's submit handler
  const commitPendingTag = () => {
    if (inputValue) {
      addTag(inputValue);
      return true;
    }
    return false;
  };
  
  // Handle paste event to add multiple tags
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;
    
    // Split by comma or whitespace
    const tagsToAdd = pasteData
      .split(/[,\s]+/)
      .map(normalizeTag)
      .filter(Boolean);
    
    if (tagsToAdd.length > 0) {
      addTags(tagsToAdd);
      setInputValue('');
    }
  };
  
  return (
    <div className="tag-input-container">
      <div 
        className="chips" 
        onClick={(e) => {
          // Only focus input if clicking directly on the chips container,
          // not on a chip or the input itself (which already has focus)
          if (e.target === e.currentTarget) {
            inputRef.current?.focus();
          }
        }}
        onKeyDown={(e) => {
          // Allow Space/Enter on container to focus the input
          if ((e.key === ' ' || e.key === 'Enter') && e.target === e.currentTarget) {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
        role="list"
        aria-label="Selected tags"
        tabIndex={value.length > 0 ? 0 : -1} // Make container focusable only when it has tags
      >
        {value.map((tag) => (
          <span key={tag} className="chip" role="listitem">
            {tag}
            <button 
              type="button"
              className="chip-remove"
              onClick={(e) => {
                e.stopPropagation(); // Prevent focusing input when removing tag
                removeTag(tag);
              }}
              aria-label={`Remove ${tag} tag`}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={id || "tags"} 
          className="chip-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={
            value.length >= maxTags 
              ? `Maximum ${maxTags} tags reached` 
              : value.length === 0 
                ? placeholder 
                : ''
          }
          aria-label={value.length >= maxTags ? "Maximum tags reached" : "Add tag"}
          aria-describedby={hint ? "tag-input-hint" : undefined}
          disabled={value.length >= maxTags}
        />
      </div>
      
      <div className="tag-feedback-container">
        {hint && (
          <small 
            id="tag-input-hint" 
            className="tag-hint" 
            aria-live="polite"
          >
            {hint}
          </small>
        )}
        
        {showCounter && (
          <small 
            className={`tag-counter ${value.length === maxTags ? 'tag-limit-reached' : ''}`}
            aria-live="polite"
          >
            {value.length}/{maxTags} tags
          </small>
        )}
      </div>
    </div>
  );
}

export default TagInput;