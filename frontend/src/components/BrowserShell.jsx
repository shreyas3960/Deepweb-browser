import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, X, Menu } from 'lucide-react';
import BrowserSearchBar from './BrowserSearchBar';
import BrowserPanel from './BrowserPanel';
import AssistiveMenu from './AssistiveMenu';
import PageSummarizer from './PageSummarizer';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BrowserShell({ onChangeView }) {
  const { user } = useAuth();
  const [currentUrl, setCurrentUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [iframeKey, setIframeKey] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showSummarizer, setShowSummarizer] = useState(false);

  const handleReaderMode = (url) => {
    if (url && onChangeView) {
      onChangeView('reader');
      // Send URL to reader view
      setTimeout(() => {
        window.postMessage({ type: 'reader_mode', url }, '*');
      }, 100);
    }
  };

  // Listen for navigation messages from other views
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'navigate' && event.data?.url) {
        navigate(event.data.url);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = async (url) => {
    // Ensure URL has protocol
    let finalUrl = url.trim();
    
    // Handle localhost URLs
    const isLocalhost = finalUrl.includes('localhost') || finalUrl.includes('127.0.0.1') || finalUrl.startsWith('localhost');
    
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      // Use http for localhost, https for everything else
      finalUrl = isLocalhost ? `http://${finalUrl}` : `https://${finalUrl}`;
    } else if (finalUrl.startsWith('https://localhost') || finalUrl.startsWith('https://127.0.0.1')) {
      // Convert https localhost to http
      finalUrl = finalUrl.replace('https://', 'http://');
    }

    setCurrentUrl(finalUrl);
    setIframeKey(prev => prev + 1);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(finalUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Save to browsing history (works for both logged in and guest users)
    try {
      await axios.post(
        `${API}/history`,
        {
          url: finalUrl,
          title: finalUrl.includes('localhost') ? 'Local Server' : new URL(finalUrl).hostname
        },
        { withCredentials: true }
      );
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  };

  const handleSearch = (query) => {
    // Check if it's actually a URL first
    const trimmedQuery = query.trim();
    if (trimmedQuery.includes('.') && !trimmedQuery.includes(' ')) {
      // Looks like a domain, navigate directly
      const url = trimmedQuery.startsWith('http') ? trimmedQuery : `https://${trimmedQuery}`;
      navigate(url);
    } else {
      // Only use Google search for actual search queries
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedQuery)}`;
      navigate(searchUrl);
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentUrl(history[historyIndex - 1]);
      setIframeKey(prev => prev + 1);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentUrl(history[historyIndex + 1]);
      setIframeKey(prev => prev + 1);
    }
  };

  const reload = () => {
    setIframeKey(prev => prev + 1);
  };

  const closeTab = () => {
    setCurrentUrl('');
    setIframeKey(prev => prev + 1);
    setIsFocusMode(false);
  };

  const goHome = () => {
    setCurrentUrl('');
    setIsFocusMode(false);
  };

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Navigation Bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <button
          data-testid="browser-back-btn"
          onClick={goBack}
          disabled={historyIndex <= 0}
          className="p-2 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          data-testid="browser-forward-btn"
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          className="p-2 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          data-testid="browser-reload-btn"
          onClick={reload}
          className="p-2 text-white/50 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="flex-1 mx-4">
          <BrowserSearchBar onSearch={handleSearch} onNavigate={navigate} />
        </div>

        {currentUrl && (
          <button
            data-testid="browser-close-tab-btn"
            onClick={closeTab}
            className="p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          data-testid="browser-panel-toggle-btn"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="p-2 text-white/50 hover:text-white transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Browser Content */}
      <div className={`flex-1 relative ${isFocusMode ? 'focus-mode' : ''}`}>
        {isFocusMode && (
          <div className="absolute inset-0 bg-black/90 z-[9997] pointer-events-none" />
        )}
        {currentUrl ? (
          <div className={`relative w-full h-full ${isFocusMode ? 'blur-sm' : ''}`}>
            <iframe
              key={iframeKey}
              src={`${API}/proxy?url=${encodeURIComponent(currentUrl)}`}
              data-testid="browser-iframe"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="w-full h-full border-0"
              title="Browser Content"
            />
            {isFocusMode && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/80 border border-white/20 rounded-lg p-8 max-w-2xl mx-4 pointer-events-auto">
                  <h3 className="text-xl font-semibold mb-4 text-white">Focus Mode Active</h3>
                  <p className="text-white/70 mb-6">
                    The page is dimmed to help you focus. Click "Exit Focus Mode" in the assistive menu to return to normal view.
                  </p>
                  <button
                    onClick={toggleFocusMode}
                    className="px-4 py-2 bg-white text-black rounded-lg text-sm hover:bg-white/90 transition-colors"
                  >
                    Exit Focus Mode
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light mb-4 tracking-tight">
              What's on your mind today?
            </h1>
            <p className="text-white/60 text-base md:text-lg mb-8">
              Browse, research, and explore with AI assistance
            </p>
            <div className="w-full max-w-2xl">
              <BrowserSearchBar onSearch={handleSearch} onNavigate={navigate} />
            </div>
            <div className="flex gap-3 mt-8">
              <button
                data-testid="search-web-btn"
                onClick={() => handleSearch('latest news')}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
              >
                Search the web
              </button>
              <button
                data-testid="browse-privately-btn"
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
              >
                Browse privately
              </button>
              <button
                data-testid="ai-research-btn"
                onClick={() => onChangeView && onChangeView('focus')}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
              >
                AI Research
              </button>
              <button
                data-testid="take-notes-btn"
                onClick={() => onChangeView && onChangeView('notes')}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
              >
                Take notes
              </button>
            </div>
            <div className="mt-12 text-xs text-white/40">
              Privacy-first browsing · No tracking · Open source
            </div>
          </div>
        )}

        {/* Right Side Panel */}
        {isPanelOpen && (
          <>
            <div
              className="absolute inset-0 bg-black/50 z-40"
              onClick={() => setIsPanelOpen(false)}
            />
            <div className="absolute top-0 right-0 h-full w-full md:w-[400px] bg-black border-l border-white/10 z-50 slide-in-right">
              <BrowserPanel onClose={() => setIsPanelOpen(false)} />
            </div>
          </>
        )}

        {/* Assistive Floating Menu */}
        <AssistiveMenu
          onGoHome={goHome}
          onGoBack={goBack}
          canGoBack={historyIndex > 0}
          onGoForward={goForward}
          canGoForward={historyIndex < history.length - 1}
          onSummarize={() => setShowSummarizer(true)}
          onFocusMode={toggleFocusMode}
          isFocusMode={isFocusMode}
          currentUrl={currentUrl}
          onReaderMode={handleReaderMode}
        />

        {/* Page Summarizer Modal */}
        {showSummarizer && (
          <PageSummarizer
            url={currentUrl}
            onClose={() => setShowSummarizer(false)}
          />
        )}
      </div>
    </div>
  );
}
