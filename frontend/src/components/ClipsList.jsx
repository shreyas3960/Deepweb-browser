import { useState, useEffect } from 'react';
import { Clipboard, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ClipsList() {
  const { user } = useAuth();
  const [clips, setClips] = useState([]);
  const [newClip, setNewClip] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadClips();
  }, [user]);

  const loadClips = async () => {
    try {
      const res = await axios.get(`${API}/clips`, { withCredentials: true });
      setClips(res.data);
    } catch (error) {
      console.error('Failed to load clips:', error);
    } finally {
      setLoading(false);
    }
  };

  const addClip = async () => {
    if (!newClip.trim()) return;

    try {
      const res = await axios.post(
        `${API}/clips`,
        { content: newClip },
        { withCredentials: true }
      );
      setClips([res.data, ...clips]);
      setNewClip('');
    } catch (error) {
      console.error('Failed to add clip:', error);
    }
  };

  const deleteClip = async (clipId) => {
    try {
      await axios.delete(`${API}/clips/${clipId}`, { withCredentials: true });
      setClips(clips.filter(c => c.clip_id !== clipId));
    } catch (error) {
      console.error('Failed to delete clip:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-white/60">
        Please sign in to access clips
      </div>
    );
  }

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Clipboard className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Clips</h1>
        </div>

        {/* Add Clip */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              data-testid="new-clip-input"
              type="text"
              value={newClip}
              onChange={(e) => setNewClip(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addClip()}
              placeholder="Add a new clip..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
            <button
              data-testid="add-clip-btn"
              onClick={addClip}
              className="px-4 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clips List */}
        {loading ? (
          <div className="text-center py-8 text-white/60">Loading...</div>
        ) : clips.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            No clips yet. Start collecting content!
          </div>
        ) : (
          <div className="space-y-3">
            {clips.map(clip => (
              <div
                key={clip.clip_id}
                data-testid={`clip-${clip.clip_id}`}
                className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
              >
                <div className="flex justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm">{clip.content}</p>
                    {clip.url && (
                      <a
                        href={clip.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/50 hover:text-white mt-2 inline-block"
                      >
                        {clip.url}
                      </a>
                    )}
                  </div>
                  <button
                    data-testid={`delete-clip-${clip.clip_id}`}
                    onClick={() => deleteClip(clip.clip_id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-white/50 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
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