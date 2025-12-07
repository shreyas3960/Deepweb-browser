import { useState } from 'react';
import { Target, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function FocusSession() {
  const { user } = useAuth();
  const { currentSession, saveSession, clearSession } = useSession();
  const [topicText, setTopicText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startSession = async () => {
    if (!topicText.trim()) {
      setError('Please enter a topic or project description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API}/session_init`,
        {
          topicSourceText: topicText,
          sensitivity: 'balanced'
        },
        { withCredentials: true }
      );

      saveSession(response.data);
      setTopicText('');
    } catch (err) {
      console.error('Session init error:', err);
      setError('Failed to initialize session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const endSession = () => {
    clearSession();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-white/60">
        Please sign in to use Focus Sessions
      </div>
    );
  }

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Focus Session</h1>
        </div>

        {!currentSession ? (
          <div className="space-y-6">
            <p className="text-white/70 text-sm">
              Start a monitored focus session to stay on track with your research or project.
              The AI will analyze your topic and help detect when you drift off-topic.
            </p>

            <div>
              <label className="text-sm font-medium mb-2 block">
                What are you working on?
              </label>
              <textarea
                data-testid="focus-topic-input"
                value={topicText}
                onChange={(e) => setTopicText(e.target.value)}
                placeholder="Describe your project, research topic, or what you want to focus on..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm" data-testid="focus-error">
                {error}
              </div>
            )}

            <button
              data-testid="start-focus-session-btn"
              onClick={startSession}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Start Monitored Session
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-xs text-white/50 mb-2">Active Session</div>
              <h2 className="text-lg font-semibold mb-2">{currentSession.topic?.title}</h2>
              <p className="text-sm text-white/70 mb-4">{currentSession.topic?.summarySeed}</p>
              
              <div className="flex flex-wrap gap-2">
                {currentSession.topic?.tagSuggestions?.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-white/10 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <div className="text-sm font-medium mb-3">Tracking Keywords</div>
              <div className="flex flex-wrap gap-2">
                {currentSession.topic?.keywords?.map((kw, i) => (
                  <div key={i} className="text-xs px-3 py-1.5 bg-white/10 rounded-full">
                    {kw.kw}
                    <span className="ml-1.5 text-white/50">
                      {Math.round(kw.weight * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              data-testid="end-focus-session-btn"
              onClick={endSession}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg font-medium transition-colors"
            >
              End Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}