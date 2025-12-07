import { useState, useRef, useEffect } from 'react';
import { Search, Mic, Send } from 'lucide-react';
import { useGoogleSuggestions } from '../hooks/useGoogleSuggestions';

export default function BrowserSearchBar({ onSearch, onNavigate }) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, loading } = useGoogleSuggestions(query, showSuggestions);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const trimmedQuery = query.trim();
    
    // Check if it's a URL
    if (trimmedQuery.startsWith('http://') || trimmedQuery.startsWith('https://')) {
      onNavigate(trimmedQuery);
    } else if (trimmedQuery.includes('.') && !trimmedQuery.includes(' ')) {
      // Looks like a domain name
      const url = `https://${trimmedQuery}`;
      onNavigate(url);
    } else if (trimmedQuery.startsWith('localhost') || trimmedQuery.startsWith('127.0.0.1')) {
      // Handle localhost URLs
      const url = trimmedQuery.startsWith('http') ? trimmedQuery : `http://${trimmedQuery}`;
      onNavigate(url);
    } else {
      // It's a search query
      onSearch(trimmedQuery);
    }
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-3xl mx-auto" ref={inputRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-white/30 transition-colors">
          <Search className="w-4 h-4 ml-4 text-white/50" />
          <input
            data-testid="browser-search-input"
            type="text"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              // Show suggestions if user is typing (not for URLs)
              const isUrl = (value.includes('.') && !value.includes(' ')) || 
                           value.startsWith('http://') || 
                           value.startsWith('https://') ||
                           value.startsWith('localhost') ||
                           value.startsWith('127.0.0.1');
              setShowSuggestions(value.length > 0 && !isUrl);
            }}
            onFocus={() => {
              if (query.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                // Handle keyboard navigation for suggestions
                const suggestionsList = document.querySelectorAll('[data-suggestion-item]');
                const currentFocused = document.querySelector('[data-suggestion-item][data-focused="true"]');
                
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (currentFocused) {
                    currentFocused.setAttribute('data-focused', 'false');
                    const next = currentFocused.nextElementSibling;
                    if (next) {
                      next.setAttribute('data-focused', 'true');
                      next.focus();
                    } else if (suggestionsList[0]) {
                      suggestionsList[0].setAttribute('data-focused', 'true');
                      suggestionsList[0].focus();
                    }
                  } else if (suggestionsList[0]) {
                    suggestionsList[0].setAttribute('data-focused', 'true');
                    suggestionsList[0].focus();
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (currentFocused) {
                    currentFocused.setAttribute('data-focused', 'false');
                    const prev = currentFocused.previousElementSibling;
                    if (prev) {
                      prev.setAttribute('data-focused', 'true');
                      prev.focus();
                    }
                  }
                } else if (e.key === 'Enter' && currentFocused) {
                  e.preventDefault();
                  currentFocused.click();
                }
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            placeholder="Search or enter URL"
            className="flex-1 bg-transparent px-4 py-3 text-white placeholder:text-white/40 outline-none text-sm"
          />
          <button
            type="button"
            data-testid="voice-search-btn"
            className="p-3 text-white/50 hover:text-white transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            data-testid="search-submit-btn"
            className="p-3 text-white/50 hover:text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div
          data-testid="search-suggestions"
          className="absolute top-full mt-1 w-full bg-black border border-white/10 rounded-lg overflow-hidden z-50 shadow-lg"
        >
          {loading && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-white/50 text-sm">Loading suggestions...</div>
          ) : (
            suggestions.slice(0, 10).map((suggestion, index) => (
              <button
                key={index}
                data-testid={`suggestion-${index}`}
                data-suggestion-item
                data-focused="false"
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={(e) => {
                  // Clear all focused states
                  document.querySelectorAll('[data-suggestion-item]').forEach(el => {
                    el.setAttribute('data-focused', 'false');
                  });
                  e.currentTarget.setAttribute('data-focused', 'true');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-white/80 hover:bg-white/10 focus:bg-white/10 focus:outline-none transition-colors text-sm [&[data-focused=true]]:bg-white/10"
              >
                <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                <span className="truncate">{suggestion}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
