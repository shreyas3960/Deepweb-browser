import { useState } from 'react';
import { X, ArrowLeft, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export default function RightSideNudge({ missingKeywords, onReturn, onSnooze, onIgnore }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed right-4 top-4 w-80 bg-black border border-white/20 rounded-lg shadow-2xl z-50 slide-in-right bounce-subtle pulse-border">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Focus Drift Detected</h3>
            <p className="text-xs text-white/60">
              This content seems off-topic from your focus session
            </p>
          </div>
          <button
            data-testid="nudge-close-btn"
            onClick={onIgnore}
            className="p-1 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-3">
          <button
            data-testid="nudge-return-btn"
            onClick={onReturn}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return
          </button>
          <button
            data-testid="nudge-snooze-btn"
            onClick={onSnooze}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Snooze 5m
          </button>
        </div>

        {/* Why details */}
        <button
          data-testid="nudge-why-btn"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          <span>Why am I seeing this?</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div data-testid="nudge-details" className="mt-3 p-3 bg-white/5 rounded-lg text-xs">
            <div className="text-white/70 mb-2">Missing key elements:</div>
            <ul className="space-y-1 text-white/50">
              {missingKeywords.slice(0, 3).map((keyword, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-white/30">•</span>
                  <span>{keyword}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}