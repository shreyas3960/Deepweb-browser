import { useState, useEffect } from 'react';
import { Clock, ExternalLink, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ActivityView({ onChangeView }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/history`, { withCredentials: true });
      setHistory(res.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${API}/history`, { withCredentials: true });
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const openInBrowser = (url) => {
    onChangeView('browser');
    // URL will be handled by BrowserShell
    window.postMessage({ type: 'navigate', url }, '*');
  };

  return (
    <div className="h-full flex flex-col bg-black text-white">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Activity</h1>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <p className="text-white/60">No browsing history yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.history_id}
                className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white/90 font-medium mb-1 truncate">{item.title}</h3>
                    <p className="text-white/50 text-sm truncate mb-2">{item.url}</p>
                    <p className="text-white/40 text-xs">
                      {new Date(item.visited_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => openInBrowser(item.url)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



