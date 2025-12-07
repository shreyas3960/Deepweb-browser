import { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Focus, 
  Move,
  BookOpen,
  X,
  Maximize2,
  Minimize2,
  Settings
} from 'lucide-react';

export default function AssistiveMenu({ 
  onGoHome, 
  onGoBack, 
  canGoBack, 
  onGoForward, 
  canGoForward,
  onSummarize,
  onFocusMode,
  isFocusMode,
  currentUrl
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    // Initialize position from localStorage or use default (bottom right)
    const saved = localStorage.getItem('assistiveMenuPosition');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { x: window.innerWidth - 100, y: window.innerHeight - 100 };
      }
    }
    return { x: window.innerWidth - 100, y: window.innerHeight - 100 };
  });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const ballRef = useRef(null);
  const menuRef = useRef(null);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (position.x && position.y) {
      localStorage.setItem('assistiveMenuPosition', JSON.stringify(position));
    }
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 56));
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 56));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 56),
        y: Math.min(prev.y, window.innerHeight - 56)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e) => {
    if (ballRef.current) {
      const rect = ballRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      });
      setIsDragging(true);
    }
  };

  const menuItems = [
    { 
      icon: Home, 
      label: 'Go Home', 
      action: onGoHome,
      show: true
    },
    { 
      icon: ArrowLeft, 
      label: 'Back', 
      action: onGoBack,
      show: canGoBack,
      disabled: !canGoBack
    },
    { 
      icon: ArrowRight, 
      label: 'Forward', 
      action: onGoForward,
      show: canGoForward,
      disabled: !canGoForward
    },
    { 
      icon: FileText, 
      label: 'Summarize Page', 
      action: onSummarize,
      show: !!currentUrl
    },
    { 
      icon: Focus, 
      label: isFocusMode ? 'Exit Focus Mode' : 'Focus Mode', 
      action: onFocusMode,
      show: !!currentUrl
    },
    { 
      icon: BookOpen, 
      label: 'Reader Mode', 
      action: () => {
        if (onReaderMode) {
          onReaderMode(currentUrl);
        }
      },
      show: !!currentUrl
    }
  ].filter(item => item.show);

  return (
    <>
      {/* Floating Assistive Ball */}
      <div
        ref={ballRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'grab',
          pointerEvents: 'auto'
        }}
        className="flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600
            shadow-lg hover:shadow-xl transition-all duration-200
            flex items-center justify-center text-white
            ${isOpen ? 'scale-110' : 'hover:scale-105'}
            ${isDragging ? 'opacity-80' : ''}
          `}
          title="Assistive Menu"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Move className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Menu Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              left: `${position.x + 60}px`,
              top: `${position.y}px`,
              zIndex: 9999
            }}
            className="bg-black border border-white/20 rounded-lg shadow-2xl p-2 min-w-[200px]"
          >
            <div className="flex flex-col gap-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (item.action && !item.disabled) {
                        item.action();
                        setIsOpen(false);
                      }
                    }}
                    disabled={item.disabled}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-md
                      text-white/90 hover:bg-white/10 transition-colors
                      text-sm font-medium
                      ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

