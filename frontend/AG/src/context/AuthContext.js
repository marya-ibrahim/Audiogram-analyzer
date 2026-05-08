// ============================================================
// AUTH CONTEXT — Share login state across all screens
//
// Wrap your app in <AuthProvider> and then use:
//   const { user, isLoggedIn, logout } = useAuthContext();
// ============================================================
import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Delegate all auth logic to useAuth hook and expose via context
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
};
