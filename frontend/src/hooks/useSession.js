import { useState, useEffect } from 'react';

const SESSION_KEY = 'deepbrowser_current_session';

export const useSession = () => {
  const [currentSession, setCurrentSession] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        setCurrentSession(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse session:', e);
      }
    }
  }, []);

  const saveSession = (session) => {
    setCurrentSession(session);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const clearSession = () => {
    setCurrentSession(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return { currentSession, saveSession, clearSession };
};