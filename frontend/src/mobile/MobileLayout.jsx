import React from 'react';
import MobileHeader from './components/navigation/MobileHeader';
import BottomNav from './components/navigation/BottomNav';
import { useMobileNavigationContext } from './context/MobileNavigationContext';
import './MobileLayout.css';

/**
 * Mobile Layout Component
 * Provides the main structure for mobile screens
 */
const MobileLayout = ({ children, headerActions }) => {
  const { getCurrentTitle } = useMobileNavigationContext();

  return (
    <div className="mobile-app-container">
      <MobileHeader 
        title={getCurrentTitle()} 
        actions={headerActions}
      />
      
      <main className="mobile-content">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default MobileLayout;