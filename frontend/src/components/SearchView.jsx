import { useState } from 'react';
import { Search, Globe, FileText, Clipboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SearchView() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('web');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      if (searchType === 'web') {
        // Open Google search in new tab
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        setResults([
          {
            type: 'web',
            title: 'Search results opened in new tab',
            description: `Searching for "${query}" on Google`,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
          }
        ]);
      } else if (searchType === 'clips' && user) {
        const res = await axios.get(`${API}/clips`, { withCredentials: true });
        const filtered = res.data.filter(clip => 
          clip.content.toLowerCase().includes(query.toLowerCase()) ||
          (clip.title && clip.title.toLowerCase().includes(query.toLowerCase()))
        );
        setResults(filtered.map(clip => ({
          type: 'clip',
          id: clip.clip_id,
          title: clip.title || 'Untitled Clip',
          description: clip.content,
          url: clip.url
        })));
      } else if (searchType === 'notes' && user) {
        const res = await axios.get(`${API}/notes`, { withCredentials: true });
        const filtered = res.data.filter(note => 
          note.content.toLowerCase().includes(query.toLowerCase()) ||
          (note.title && note.title.toLowerCase().includes(query.toLowerCase()))
        );
        setResults(filtered.map(note => ({
          type: 'note',
          id: note.note_id,
          title: note.title || 'Untitled Note',
          description: note.content,
          date: note.updated_at
        })));
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Search</h1>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              data-testid="search-type-web"
              onClick={() => setSearchType('web')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                searchType === 'web'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              Web
            </button>
            {user && (
              <>
                <button
                  data-testid="search-type-clips"
                  onClick={() => setSearchType('clips')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    searchType === 'clips'
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Clipboard className="w-4 h-4 inline mr-2" />
                  Clips
                </button>
                <button
                  data-testid="search-type-notes"
                  onClick={() => setSearchType('notes')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    searchType === 'notes'
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Notes
                </button>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <input
              data-testid="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={`Search ${searchType}...`}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
            <button
              data-testid="search-btn"
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-white/60 mb-3">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
            {results.map((result, index) => (
              <div
                key={result.id || index}
                data-testid={`search-result-${index}`}
                className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {result.type === 'web' && <Globe className="w-5 h-5 text-white/50 mt-0.5" />}
                  {result.type === 'clip' && <Clipboard className="w-5 h-5 text-white/50 mt-0.5" />}
                  {result.type === 'note' && <FileText className="w-5 h-5 text-white/50 mt-0.5" />}
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">{result.title}</h3>
                    <p className="text-sm text-white/70 mb-2 line-clamp-2">{result.description}</p>
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/50 hover:text-white transition-colors"
                      >
                        {result.url}
                      </a>
                    )}
                    {result.date && (
                      <div className="text-xs text-white/40 mt-1">
                        {new Date(result.date).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-12 text-white/40">
            No results found for "{query}"
          </div>
        )}

        {!query && !loading && (
          <div className="text-center py-12 text-white/40">
            Enter a search query to get started
          </div>
        )}
      </div>
    </div>
  );
}
