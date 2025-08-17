import React from 'react';
import MobileApp from './MobileApp';

/**
 * Mobile Device Detector Component
 * Automatically detects mobile devices and renders appropriate UI
 */
const MobileDetector = ({ children, currentUser, queryClient }) => {
  // Check if device is mobile
  const isMobile = () => {
    // User agent detection
    const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Screen size detection
    const screenSize = window.innerWidth <= 768;
    
    // Touch support detection
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return userAgent || (screenSize && touchSupport);
  };

  // Render mobile UI for mobile devices
  if (isMobile()) {
    // If no currentUser on mobile, show mobile login
    if (!currentUser) {
      return <MobileApp currentUser={currentUser} queryClient={queryClient}>{children}</MobileApp>;
    }
    
    // Mobile UI only for foremen ("прораб" role)
    if (currentUser.role === "прораб") {
      return <MobileApp currentUser={currentUser} queryClient={queryClient}>{children}</MobileApp>;
    }
    
    // Managers on mobile devices get desktop interface
    // (they need full functionality that mobile UI doesn't provide)
  }

  // Render desktop version for non-mobile devices
  return children;
};

export default MobileDetector;