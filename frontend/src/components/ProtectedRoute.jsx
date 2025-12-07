import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // If user was passed via location state (from AuthCallback), set immediately
    if (location.state?.user) {
      setIsReady(true);
      return;
    }

    // If we just authenticated, wait a bit for state to update
    const justAuth = sessionStorage.getItem('just_authenticated');
    if (justAuth) {
      sessionStorage.removeItem('just_authenticated');
      // Wait for React to process the state update from setSession
      setTimeout(() => {
        setIsReady(true);
      }, 200);
      return;
    }

    // Wait for initial auth check to complete, then allow access (guest mode enabled)
    if (!loading) {
      setIsReady(true);
    }
  }, [user, loading, location.state]);

  // Allow access in guest mode - no authentication required
  if (!isReady && loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-sm">Loading...</div>
      </div>
    );
  }

  return children;
}