import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: 'user-admin',
    full_name: 'مدير النظام',
    email: 'admin@qemat-alreef.com',
    role: 'admin'
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.warn('Auth load fallback:', err);
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }
  };

  const switchRole = (newRole) => {
    const updated = { ...user, role: newRole };
    setUser(updated);
    localStorage.setItem('qemat_alreef_user', JSON.stringify(updated));
  };

  const logout = (shouldRedirect = false) => {
    base44.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.reload();
    }
  };

  const loginAsAdmin = () => {
    const adminUser = {
      id: 'user-admin',
      full_name: 'مدير النظام',
      email: 'admin@qemat-alreef.com',
      role: 'admin'
    };
    setUser(adminUser);
    setIsAuthenticated(true);
    localStorage.setItem('qemat_alreef_user', JSON.stringify(adminUser));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      switchRole,
      loginAsAdmin,
      logout,
      navigateToLogin: () => loginAsAdmin(),
      checkAppState: loadUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
