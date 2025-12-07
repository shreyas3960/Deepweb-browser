import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { useDriftDetection } from '../hooks/useDriftDetection';
import ControlPanel from './ControlPanel';
import BrowserShell from './BrowserShell';
import FocusSession from './FocusSession';
import ClipsList from './ClipsList';
import NotesList from './NotesList';
import TasksList from './TasksList';
import SearchView from './SearchView';
import ReaderView from './ReaderView';
import ResearchView from './ResearchView';
import ActivityView from './ActivityView';
import WorkspaceView from './WorkspaceView';
import PageSummarizer from './PageSummarizer';
import RightSideNudge from './RightSideNudge';
import BrowserPanel from './BrowserPanel';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('browser');
  const { currentSession } = useSession();
  const [pageContent, setPageContent] = useState('');
  const { isDrifting, missingKeywords, resetDrift } = useDriftDetection(
    currentSession,
    pageContent
  );

  // Listen for view change and reader mode messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'change_view' && event.data?.view) {
        setActiveView(event.data.view);
      }
      if (event.data?.type === 'reader_mode' && event.data?.url) {
        setActiveView('reader');
        // URL will be handled by ReaderView component
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSnooze = () => {
    resetDrift();
    setTimeout(() => {
      // Re-enable after 5 minutes (simplified for demo)
    }, 5 * 60 * 1000);
  };

  const handleReturn = () => {
    resetDrift();
    setActiveView('focus');
  };

  const renderView = () => {
    switch (activeView) {
      case 'browser':
        return <BrowserShell onChangeView={setActiveView} />;
      case 'focus':
        return <FocusSession />;
      case 'clips':
        return <ClipsList />;
      case 'notes':
        return <NotesList />;
      case 'search':
        return <SearchView />;
      case 'tasks':
        return <TasksList />;
      case 'reader':
        return <ReaderView onChangeView={setActiveView} initialUrl={null} />;
      case 'summarize':
        return <BrowserShell onChangeView={setActiveView} />; // Summarize opens via assistive menu
      case 'research':
        return <ResearchView onChangeView={setActiveView} />;
      case 'activity':
        return <ActivityView onChangeView={setActiveView} />;
      case 'workspace':
        return <WorkspaceView onChangeView={setActiveView} />;
      case 'settings':
        return (
          <div className="h-full flex flex-col bg-black text-white">
            <div className="p-6 border-b border-white/10">
              <h1 className="text-2xl font-semibold">Settings</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <BrowserPanel onClose={() => setActiveView('browser')} />
            </div>
          </div>
        );
      case 'library':
        return (
          <div className="h-full flex flex-col bg-black text-white">
            <div className="p-6 border-b border-white/10">
              <h1 className="text-2xl font-semibold">Library</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4">
              <div onClick={() => setActiveView('clips')} className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer">
                <h3 className="font-semibold mb-2">Clips</h3>
                <p className="text-white/60 text-sm">View saved clips</p>
              </div>
              <div onClick={() => setActiveView('notes')} className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer">
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-white/60 text-sm">View saved notes</p>
              </div>
            </div>
          </div>
        );
      case 'explore':
        return <ActivityView onChangeView={setActiveView} />;
      case 'projects':
        return (
          <div className="h-full flex flex-col bg-black text-white">
            <div className="p-6 border-b border-white/10">
              <h1 className="text-2xl font-semibold">Projects</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FocusSession /> {/* Focus sessions act as projects */}
            </div>
          </div>
        );
      default:
        return <BrowserShell onChangeView={setActiveView} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">DeepBrowser</span>
          <span className="text-xs text-white/40">v1.0</span>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-white/70">{user.name}</span>
            </div>
            <button
              data-testid="logout-btn"
              onClick={logout}
              className="p-2 text-white/50 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-white/10">
          <ControlPanel
            activeView={activeView}
            setActiveView={setActiveView}
            onNewTab={() => setActiveView('browser')}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
      </div>

      {/* Drift Nudge */}
      {isDrifting && currentSession && (
        <RightSideNudge
          missingKeywords={missingKeywords}
          onReturn={handleReturn}
          onSnooze={handleSnooze}
          onIgnore={resetDrift}
        />
      )}
    </div>
  );
}
