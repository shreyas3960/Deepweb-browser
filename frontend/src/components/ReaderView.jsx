import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import BrowserShell from './BrowserShell';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReaderView({ onChangeView, initialUrl }) {
  const [currentUrl, setCurrentUrl] = useState(initialUrl || '');
  const [readerContent, setReaderContent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for URL from browser
    const handleMessage = (event) => {
      if (event.data?.type === 'reader_mode' && event.data?.url) {
        setCurrentUrl(event.data.url);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (currentUrl) {
      extractReaderContent(currentUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  const extractReaderContent = async (url) => {
    if (!url) return;
    
    setLoading(true);
    try {
      // Use API endpoint for reader mode
      const response = await axios.post(
        `${API}/reader_mode`,
        { url },
        { withCredentials: true }
      );
      
      const data = response.data;
      const paragraphs = data.content?.split(/\n\n+/) || [data.content || 'No content available'];
      
      setReaderContent({
        title: data.title || 'Untitled',
        paragraphs: paragraphs.filter(p => p.trim().length > 20),
        summary: data.summary,
        url
      });
    } catch (error) {
      console.error('Failed to extract reader content:', error);
      setReaderContent({ 
        title: 'Error', 
        paragraphs: [error.response?.data?.detail || 'Failed to load content. Make sure the page is accessible.'], 
        url 
      });
    } finally {
      setLoading(false);
    }
  };

  // If no URL, show embedded browser
  if (!currentUrl) {
    return (
      <div className="h-full flex flex-col bg-black text-white">
        <div className="p-4 border-b border-white/10 flex items-center gap-4">
          <button
            onClick={() => onChangeView('browser')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Reader Mode</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <BrowserShell onChangeView={onChangeView} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">Loading reader content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white text-black overflow-hidden">
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
        <button
          onClick={() => onChangeView('browser')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <BookOpen className="w-5 h-5 text-gray-700" />
        <h1 className="text-lg font-semibold flex-1 truncate">{readerContent?.title || 'Reader Mode'}</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-4">{readerContent?.title}</h1>
        {readerContent?.summary && (
          <p className="text-gray-600 italic mb-6 border-l-4 border-gray-300 pl-4">{readerContent.summary}</p>
        )}
        {readerContent?.paragraphs.map((para, index) => (
          <p key={index} className="text-lg leading-relaxed mb-6 text-gray-800">
            {para.trim()}
          </p>
        ))}
      </div>
    </div>
  );
}

