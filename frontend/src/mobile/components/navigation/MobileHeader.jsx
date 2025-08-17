import React from 'react';
import { useMobileNavigationContext } from '../../context/MobileNavigationContext';
import './MobileHeader.css';

/**
 * Mobile Header Component
 * Features: Back/Forward navigation, dynamic title, role-based actions
 */
const MobileHeader = ({ title, actions }) => {
  const { 
    canGoBack, 
    canGoForward, 
    goBack, 
    goForward,
    currentScreen 
  } = useMobileNavigationContext();

  return (
    <header className="mobile-header">
      <button 
        className={`nav-btn ${!canGoBack ? 'disabled' : ''}`}
        onClick={goBack}
        disabled={!canGoBack}
        aria-label="Назад"
      >
        ‹
      </button>
      
      <h1 className="header-title">{title}</h1>
      
      <button 
        className={`nav-btn ${!canGoForward ? 'disabled' : ''}`}
        onClick={goForward}
        disabled={!canGoForward}
        aria-label="Вперед"
      >
        ›
      </button>
      
      {actions && (
        <div className="header-actions">
          {actions}
        </div>
      )}
    </header>
  );
};

export default MobileHeader;