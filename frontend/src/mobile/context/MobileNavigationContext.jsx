import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useMobileNavigation } from '../hooks/useMobileNavigation';

/**
 * Mobile Navigation Context
 * Provides navigation state and methods throughout the mobile app
 */
const MobileNavigationContext = createContext();

export const MobileNavigationProvider = ({ children }) => {
  const navigationState = useMobileNavigation();
  const navigationRef = useRef(navigationState);

  // Update ref when navigation state changes
  useEffect(() => {
    navigationRef.current = navigationState;
    // Make navigation available globally for browser back button handling
    window.mobileNavigationRef = navigationRef;
  }, [navigationState]);

  // Initialize browser history on mount
  useEffect(() => {
    // Set initial browser history state
    window.history.replaceState({ screen: navigationState.currentScreen }, '', window.location.href);
    console.log('🏠 Initial browser history set to:', navigationState.currentScreen);
  }, []); // Only run once on mount

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