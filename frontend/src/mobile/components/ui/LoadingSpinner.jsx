import React from 'react';

/**
 * Loading Spinner Component
 * Shows loading state with optional message
 */
const LoadingSpinner = ({ message = 'Загрузка...' }) => {
  return (
    <div className="mobile-loading">
      <div className="mobile-spinner" role="status" aria-label="Загрузка"></div>
      <span className="loading-message">{message}</span>
    </div>
  );
};

export default LoadingSpinner;