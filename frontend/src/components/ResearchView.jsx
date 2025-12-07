import { useState } from 'react';
import { Search, BookOpen, ExternalLink } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResearchView({ onChangeView }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Use Google search API or similar
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      // For now, we'll just navigate to search results
      // In a full implementation, you'd parse search results
      setResults([{
        title: `Search results for: ${query}`,
        url: searchUrl,
        snippet: `View search results for "${query}"`
      }]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black text-white">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-semibold mb-4">Research</h1>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter research topic..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <h3 className="text-lg font-semibold mb-2">{result.title}</h3>
                <p className="text-white/60 mb-3">{result.snippet}</p>
                <button
                  onClick={() => onChangeView('browser')}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Browser
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <p className="text-white/60">Enter a research topic to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



