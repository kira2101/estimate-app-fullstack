import React, { createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MobileLayout from './MobileLayout';
import MobileRouter from './MobileRouter';
import { MobileNavigationProvider } from './context/MobileNavigationContext';

// Create mobile auth context
const MobileAuthContext = createContext();

export const useMobileAuth = () => {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within MobileApp');
  }
  return context;
};

// Create a separate query client for mobile
const mobileQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/**
 * Main Mobile Application
 * Entry point for mobile UI
 */
const MobileApp = ({ children, currentUser }) => {
  // If no user, show children (login page)
  if (!currentUser) {
    return children;
  }

  // Logout function for mobile
  const logout = () => {
    localStorage.removeItem('authToken');
    window.location.reload(); // Force page reload to trigger auth check
  };

  const authValue = {
    user: currentUser,
    isAuthenticated: !!currentUser,
    logout
  };

  return (
    <MobileAuthContext.Provider value={authValue}>
      <QueryClientProvider client={mobileQueryClient}>
        <MobileNavigationProvider>
          <MobileLayout>
            <MobileRouter />
          </MobileLayout>
        </MobileNavigationProvider>
      </QueryClientProvider>
    </MobileAuthContext.Provider>
  );
};

export default MobileApp;