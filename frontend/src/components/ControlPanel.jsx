import { Globe, Search, BookOpen, Sparkles, Clipboard, Target, Activity, CheckSquare, Settings as SettingsIcon, FolderOpen, FileText } from 'lucide-react';

export default function ControlPanel({ activeView, setActiveView, onNewTab }) {
  const menuItems = [
    { id: 'browser', label: 'Browser', icon: Globe, action: onNewTab },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'focus', label: 'Focus Session', icon: Target },
    { id: 'clips', label: 'Clips', icon: Clipboard },
  ];

  const productivitySection = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'workspace', label: 'Workspace', icon: FolderOpen },
    { id: 'reader', label: 'Reader', icon: BookOpen },
    { id: 'summarize', label: 'Summarize', icon: Sparkles },
    { id: 'research', label: 'Research', icon: Search },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="h-full bg-black border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-white/10 flex items-center gap-2">
        <Globe className="w-5 h-5" />
        <span className="font-semibold text-sm">DeepBrowser</span>
      </div>

      {/* Main Menu */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            data-testid={`menu-${item.id}`}
            onClick={() => item.action ? item.action() : setActiveView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
              activeView === item.id
                ? 'bg-white text-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}

        <div className="pt-4 pb-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-3 mb-2">
            Productivity
          </div>
          {productivitySection.map(item => (
            <button
              key={item.id}
              data-testid={`productivity-${item.id}`}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                activeView === item.id
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="p-3 border-t border-white/10">
        <button
          data-testid="menu-settings"
          onClick={() => setActiveView('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
            activeView === 'settings'
              ? 'bg-white text-black'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
