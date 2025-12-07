import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    const processAuth = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get('session_id');

      console.log('AuthCallback: Processing auth with session_id:', sessionId ? 'present' : 'missing');

      if (!sessionId) {
        console.warn('AuthCallback: No session_id in URL hash, redirecting to home');
        navigate('/', { replace: true });
        return;
      }

      try {
        console.log('AuthCallback: Calling backend to create session');
        const response = await axios.post(
          `${API}/auth/session`,
          {},
          {
            headers: { 'X-Session-ID': sessionId },
            withCredentials: true
          }
        );

        const { user, session_token } = response.data;
        
        if (!user || !session_token) {
          console.error('AuthCallback: Invalid response from backend', response.data);
          throw new Error('Invalid session response');
        }

        console.log('AuthCallback: Session created successfully for user:', user.email);
        
        // Set session storage flag BEFORE calling setSession to ensure ProtectedRoute sees it
        sessionStorage.setItem('just_authenticated', 'true');
        
        // Update auth state
        setSession(user, session_token);
        
        // Clear the hash from URL before navigating
        window.history.replaceState(null, '', window.location.pathname);
        
        console.log('AuthCallback: Navigating to dashboard');
        // Navigate with user in state for immediate access
        navigate('/dashboard', { replace: true, state: { user } });
      } catch (error) {
        console.error('AuthCallback: Authentication failed:', error.response?.data || error.message);
        navigate('/', { replace: true });
      }
    };

    processAuth();
  }, [navigate, setSession]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-sm">Authenticating...</div>
    </div>
  );
}