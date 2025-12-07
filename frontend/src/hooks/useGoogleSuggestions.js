import { useState, useEffect, useRef } from 'react';

export const useGoogleSuggestions = (query, enabled = true) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query || query.trim().length < 1 || !enabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Only fetch if it looks like a search query (not a URL)
    const isUrl = query.includes('.') || query.startsWith('http://') || query.startsWith('https://') || query.startsWith('localhost');
    if (isUrl) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const fetchSuggestions = async () => {
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      try {
        const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
        
        // Use backend proxy to avoid CORS issues
        const response = await fetch(`${API}/suggestions?q=${encodeURIComponent(query)}`, {
          signal: abortControllerRef.current.signal,
          credentials: 'include'
        });
        
        if (response.ok && !abortControllerRef.current.signal.aborted) {
          const data = await response.json();
          const suggestionsData = data[1] || [];
          setSuggestions(suggestionsData.slice(0, 10));
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return; // Request was cancelled
        }
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    };

    // Debounce with shorter delay for more responsive feel
    const timeoutId = setTimeout(fetchSuggestions, 150);
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, enabled]);

  return { suggestions, loading };
};