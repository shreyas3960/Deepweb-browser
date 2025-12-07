import { useState, useEffect } from 'react';
import { X, Clock, Bookmark, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BrowserPanel({ onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'history') {
        const res = await axios.get(`${API}/history`, { withCredentials: true });
        setHistory(res.data);
      } else if (activeTab === 'bookmarks') {
        const res = await axios.get(`${API}/bookmarks`, { withCredentials: true });
        setBookmarks(res.data);
      } else if (activeTab === 'settings') {
        const res = await axios.get(`${API}/settings`, { withCredentials: true });
        setSettings(res.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
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

  const deleteBookmark = async (bookmarkId) => {
    try {
      await axios.delete(`${API}/bookmarks/${bookmarkId}`, { withCredentials: true });
      setBookmarks(bookmarks.filter(b => b.bookmark_id !== bookmarkId));
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const updateSettings = async (updates) => {
    try {
      const res = await axios.put(`${API}/settings`, updates, { withCredentials: true });
      setSettings(res.data);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const tabs = [
    { id: 'history', label: 'History', icon: Clock },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="font-semibold">Browser Panel</h2>
        <button
          data-testid="panel-close-btn"
          onClick={onClose}
          className="p-1 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            data-testid={`panel-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-white text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!user ? (
          <div className="text-center py-8 text-white/60 text-sm">
            Please sign in to access {activeTab}
          </div>
        ) : (
          <>
            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Recent History</h3>
                  {history.length > 0 && (
                    <button
                      data-testid="clear-history-btn"
                      onClick={clearHistory}
                      className="text-xs text-white/50 hover:text-white transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-white/40 text-sm">
                    No browsing history yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div
                        key={item.history_id}
                        data-testid={`history-item-${item.history_id}`}
                        className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="text-sm text-white/90 mb-1 truncate">{item.title}</div>
                        <div className="text-xs text-white/40 truncate">{item.url}</div>
                        <div className="text-xs text-white/30 mt-1">
                          {new Date(item.visited_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bookmarks' && (
              <div>
                <h3 className="text-sm font-medium mb-4">Saved Bookmarks</h3>
                {bookmarks.length === 0 ? (
                  <div className="text-center py-8 text-white/40 text-sm">
                    No bookmarks saved yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.bookmark_id}
                        data-testid={`bookmark-item-${bookmark.bookmark_id}`}
                        className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white/90 mb-1 truncate">{bookmark.title}</div>
                            <div className="text-xs text-white/40 truncate">{bookmark.url}</div>
                          </div>
                          <button
                            data-testid={`delete-bookmark-${bookmark.bookmark_id}`}
                            onClick={() => deleteBookmark(bookmark.bookmark_id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-white/50 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {bookmark.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {bookmark.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 bg-white/10 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && settings && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Theme</label>
                  <select
                    data-testid="settings-theme"
                    value={settings.theme}
                    onChange={(e) => updateSettings({ ...settings, theme: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Font Size</label>
                  <select
                    data-testid="settings-font-size"
                    value={settings.font_size}
                    onChange={(e) => updateSettings({ ...settings, font_size: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Spacing Density</label>
                  <select
                    data-testid="settings-spacing"
                    value={settings.spacing_density}
                    onChange={(e) => updateSettings({ ...settings, spacing_density: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Default Search Engine</label>
                  <select
                    data-testid="settings-search-engine"
                    value={settings.default_search_engine}
                    onChange={(e) => updateSettings({ ...settings, default_search_engine: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="google">Google</option>
                    <option value="bing">Bing</option>
                    <option value="duckduckgo">DuckDuckGo</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
