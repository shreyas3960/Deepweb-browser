import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Globe, Sparkles, Shield, Zap } from 'lucide-react';

export default function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGuestMode = () => {
    // Allow guest access by navigating to dashboard without authentication
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <span className="font-semibold">DeepBrowser</span>
            <span className="text-xs text-white/40 ml-2">v1.0</span>
          </div>
          <button
            data-testid="landing-login-btn"
            onClick={login}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-8">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-white/80" />
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-light mb-6 tracking-tight">
          What's on your mind today?
        </h1>
        <p className="text-white/60 text-lg md:text-xl mb-12 max-w-2xl">
          Browse, research, and explore with AI assistance
        </p>

        <div className="flex gap-4 justify-center mb-8">
          <button
            data-testid="hero-get-started-btn"
            onClick={handleGuestMode}
            className="px-8 py-4 bg-white text-black rounded-lg font-medium text-base hover:bg-white/90 transition-colors"
          >
            Continue as Guest
          </button>
          <button
            data-testid="hero-signin-btn"
            onClick={login}
            className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-lg font-medium text-base hover:bg-white/20 transition-colors"
          >
            Sign in with Google
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 justify-center mb-16">
          <button 
            data-testid="search-web-btn"
            onClick={() => window.open('https://www.google.com/search?q=latest+news', '_blank')}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
          >
            Search the web
          </button>
          <button 
            data-testid="browse-privately-btn"
            onClick={handleGuestMode}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
          >
            Browse privately
          </button>
          <button 
            data-testid="ai-research-btn"
            onClick={handleGuestMode}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
          >
            AI Research
          </button>
          <button 
            data-testid="take-notes-btn"
            onClick={handleGuestMode}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
          >
            Take notes
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
            <Shield className="w-8 h-8 mb-4" />
            <h3 className="font-semibold mb-2">Privacy First</h3>
            <p className="text-sm text-white/60">
              No tracking, no ads. Your browsing stays private.
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
            <Sparkles className="w-8 h-8 mb-4" />
            <h3 className="font-semibold mb-2">AI Powered</h3>
            <p className="text-sm text-white/60">
              Focus sessions, drift detection, and smart research.
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
            <Zap className="w-8 h-8 mb-4" />
            <h3 className="font-semibold mb-2">Distraction Free</h3>
            <p className="text-sm text-white/60">
              Minimal design for maximum productivity.
            </p>
          </div>
        </div>

        <div className="mt-16 text-xs text-white/40">
          Privacy-first browsing · No tracking · Open source
        </div>
      </main>
    </div>
  );
}