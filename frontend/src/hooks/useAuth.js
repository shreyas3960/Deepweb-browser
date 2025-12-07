import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize axios headers if token exists
  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token');
      if (!token) {
        console.log('checkAuth: No token found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('checkAuth: Token found, verifying with backend');
      // Ensure header is set
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      
      if (response.data) {
        console.log('checkAuth: User authenticated:', response.data.email);
        setUser(response.data);
      } else {
        console.warn('checkAuth: No user data in response');
        setUser(null);
        localStorage.removeItem('session_token');
        delete axios.defaults.headers.common['Authorization'];
      }
    } catch (error) {
      console.error('checkAuth: Authentication check failed:', error.response?.status, error.message);
      setUser(null);
      // Clear token if it was invalid (401) or any other error
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('checkAuth: Clearing invalid token');
        localStorage.removeItem('session_token');
        delete axios.defaults.headers.common['Authorization'];
      }
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - uses setUser, setLoading which are stable

  useEffect(() => {
    // Check auth on mount
    checkAuth();
  }, [checkAuth]); // Run when checkAuth changes (which should be stable)

  const login = () => {
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('session_token');
      delete axios.defaults.headers.common['Authorization'];
      window.location.href = '/';
    }
  };

  const setSession = (user, token) => {
    if (token) {
      localStorage.setItem('session_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    if (user) {
      setUser(user);
    }
    setLoading(false); // Ensure loading is false after setting session
  };

  // Re-export checkAuth so it can be called manually if needed
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, setSession, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};