import React, { createContext, useContext } from 'react';
import { useMobileNavigation } from '../hooks/useMobileNavigation';

/**
 * Mobile Navigation Context
 * Provides navigation state and methods throughout the mobile app
 */
const MobileNavigationContext = createContext();

export const MobileNavigationProvider = ({ children }) => {
  const navigationState = useMobileNavigation();

  return (
    <MobileNavigationContext.Provider value={navigationState}>
      {children}
    </MobileNavigationContext.Provider>
  );
};

export const useMobileNavigationContext = () => {
  const context = useContext(MobileNavigationContext);
  if (!context) {
    throw new Error('useMobileNavigationContext must be used within MobileNavigationProvider');
  }
  return context;
};

// Re-export for convenience
export { useMobileNavigation } from '../hooks/useMobileNavigation';