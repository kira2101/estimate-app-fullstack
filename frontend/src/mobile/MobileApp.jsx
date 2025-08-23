import React, { createContext, useContext, useEffect, useState } from 'react';
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

/**
 * Main Mobile Application
 * Entry point for mobile UI
 */
const MobileApp = ({ children, currentUser, queryClient, onLogout }) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Enhanced logout function for mobile
  const logout = React.useCallback(() => {
    localStorage.removeItem('authToken');
    if (onLogout) {
      onLogout(); // Call parent logout handler
    } else {
      window.location.reload(); // Fallback to page reload
    }
  }, [onLogout]);

  // Handle browser back/forward navigation
  useEffect(() => {
    // Only set up browser navigation if we have a user
    if (!currentUser) return;

    const handlePopState = (event) => {
      const mobileNavigation = window.mobileNavigationRef?.current;
      
      if (!mobileNavigation) {
        return;
      }

      console.log('🔄 Browser navigation event:', {
        currentScreen: mobileNavigation.currentScreen,
        historyLength: mobileNavigation.navigationHistory?.length || 0,
        canGoBack: mobileNavigation.navigationHistory?.length > 0
      });

      // If we can go back in app navigation, do that
      if (mobileNavigation.navigationHistory?.length > 0 && mobileNavigation.goBack) {
        console.log('📱 Going back within app');
        mobileNavigation.goBack();
      } 
      // If we're at root and no history, show exit confirmation
      else if (mobileNavigation.currentScreen === 'projects') {
        console.log('🚪 At root screen, showing exit confirmation');
        setShowExitConfirm(true);
        // Push state back to prevent actual navigation
        window.history.pushState({ screen: 'projects' }, '', window.location.href);
      }
      // Fallback
      else {
        console.log('🔄 Fallback: show exit confirmation');
        setShowExitConfirm(true);
        window.history.pushState({ screen: mobileNavigation.currentScreen }, '', window.location.href);
      }
    };

    // Handle page refresh/reload
    const handleBeforeUnload = (event) => {
      console.log('🔄 Page refresh detected');
      event.preventDefault();
      // Modern browsers require returnValue to be set
      event.returnValue = 'Вы уверены, что хотите покинуть страницу? Несохраненные данные могут быть потеряны.';
      return event.returnValue;
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // Always create authValue to avoid conditional hook rendering
  const authValue = React.useMemo(() => ({
    user: currentUser,
    isAuthenticated: !!currentUser,
    logout
  }), [currentUser, logout]);

  // If no user, show children (login page) - but keep hooks consistent
  if (!currentUser) {
    return children;
  }

  return (
    <MobileAuthContext.Provider value={authValue}>
      <QueryClientProvider client={queryClient}>
        <MobileNavigationProvider>
          <MobileLayout>
            <MobileRouter />
          </MobileLayout>
          
          {/* Exit confirmation modal */}
          {showExitConfirm && (
            <div className="modal-overlay">
              <div className="logout-modal">
                <div className="logout-modal-content">
                  <div className="logout-modal-icon">🚪</div>
                  <h3 className="logout-modal-title">Выход из приложения</h3>
                  <p className="logout-modal-text">
                    Вы уверены, что хотите выйти из приложения?
                  </p>
                </div>
                <div className="logout-modal-actions">
                  <button 
                    className="logout-btn-cancel"
                    onClick={() => setShowExitConfirm(false)}
                  >
                    Остаться
                  </button>
                  <button 
                    className="logout-btn-confirm"
                    onClick={logout}
                  >
                    Выйти
                  </button>
                </div>
              </div>
            </div>
          )}
        </MobileNavigationProvider>
      </QueryClientProvider>
    </MobileAuthContext.Provider>
  );
};

export default MobileApp;