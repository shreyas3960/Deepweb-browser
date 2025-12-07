import { useState, useEffect } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PageSummarizer({ url, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Extract page content from iframe
      const iframe = document.querySelector('iframe[data-testid="browser-iframe"]');
      let pageContent = '';
      let pageTitle = 'Untitled Page';
      
      try {
        if (iframe && iframe.contentWindow) {
          const iframeDoc = iframe.contentWindow.document;
          pageTitle = iframeDoc.title || 'Untitled Page';
          pageContent = iframeDoc.documentElement.outerHTML || iframeDoc.body?.innerHTML || '';
        }
      } catch (e) {
        console.warn('Could not access iframe content (cross-origin):', e);
      }

      const response = await axios.post(
        `${API}/summarize_page`,
        {
          url: url,
          content: pageContent,
          title: pageTitle
        },
        { withCredentials: true }
      );

      setSummary(response.data);
    } catch (err) {
      console.error('Failed to summarize page:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to summarize page');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url && !summary && !loading) {
      fetchSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className="fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4">
      <div className="bg-black border border-white/20 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white/80" />
            <h2 className="text-lg font-semibold">Page Summary</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-white/50 mb-4" />
              <p className="text-white/60">Analyzing page content...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={fetchSummary}
                className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {summary && !loading && (
            <div className="space-y-6">
              {/* Summary Overview */}
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2 uppercase tracking-wide">Overview</h3>
                <p className="text-white/90 leading-relaxed">{summary.summary}</p>
              </div>

              {/* Key Points */}
              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">Key Points</h3>
                  <ul className="space-y-2">
                    {summary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-blue-400 mt-1">•</span>
                        <span className="text-white/80 flex-1">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Main Topics */}
              {summary.mainTopics && summary.mainTopics.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">Main Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.mainTopics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Takeaways */}
              {summary.takeaways && summary.takeaways.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">Takeaways</h3>
                  <ul className="space-y-2">
                    {summary.takeaways.map((takeaway, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-purple-400 mt-1">→</span>
                        <span className="text-white/80 flex-1">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.wordCount && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40">Original content: ~{summary.wordCount} words</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 transition-colors"
          >
            Close
          </button>
          {summary && (
            <button
              onClick={() => {
                // Copy summary to clipboard
                const summaryText = `
Summary: ${summary.summary}

Key Points:
${summary.keyPoints?.map(p => `• ${p}`).join('\n') || 'N/A'}

Main Topics: ${summary.mainTopics?.join(', ') || 'N/A'}

Takeaways:
${summary.takeaways?.map(t => `→ ${t}`).join('\n') || 'N/A'}
                `.trim();
                navigator.clipboard.writeText(summaryText);
                alert('Summary copied to clipboard!');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
            >
              Copy Summary
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

