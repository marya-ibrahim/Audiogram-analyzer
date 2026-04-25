// ============================================================
// useAuth HOOK — Authentication state & actions
//
// Usage in any screen:
//   const { user, isLoggedIn, login, logout, loading } = useAuth();
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../api';
import Config from '../config';

export const useAuth = () => {
  const [user,      setUser]      = useState(null);
  const [isLoggedIn,setIsLoggedIn]= useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // Check login state on mount
  useEffect(() => {
    (async () => {
      try {
        const authenticated = await AuthService.isAuthenticated();
        if (authenticated) {
          // Try to get fresh profile — 401 here means token expired, try refresh first
          try {
            const profile = await AuthService.getMe();
            setUser(profile);
          } catch (err) {
            // If 401 after refresh attempt failed, still keep user logged in with cache
            try {
              const cached = localStorage.getItem('user_info');
              if (cached) {
                setUser(JSON.parse(cached));
              } else {
                // No cache and no valid token → logout
                setIsLoggedIn(false);
                setLoading(false);
                return;
              }
            } catch {}
          }
          setIsLoggedIn(true);
        }
      } catch (_) {
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    setError(null);
    setLoading(true);
    try {
      const profile = await AuthService.login({ identifier, password });
      setUser(profile);
      setIsLoggedIn(true);
      return profile;
    } catch (err) {
      setError(err.message ?? 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ name, identifier, password }) => {
    setError(null);
    setLoading(true);
    try {
      await AuthService.register({ name, identifier, password });
      // Auto-login after register
      const profile = await AuthService.login({ identifier, password });
      setUser(profile);
      setIsLoggedIn(true);
      return profile;
    } catch (err) {
      const msg = err.message ?? err.raw?.response?.data?.detail ?? 'Registration failed';
      setError(msg);
      throw { ...err, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await AuthService.logout();
    } finally {
      setUser(null);
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, []);

  return {
    user,
    isLoggedIn,
    loading,
    error,
    login,
    register,
    logout,
  };
};
