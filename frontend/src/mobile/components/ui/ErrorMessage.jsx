import React from 'react';

/**
 * Error Message Component
 * Displays error state with retry option
 */
const ErrorMessage = ({ message = 'Произошла ошибка', onRetry }) => {
  return (
    <div className="mobile-error">
      <div className="error-icon">⚠️</div>
      <div className="error-text">{message}</div>
      {onRetry && (
        <button 
          className="mobile-btn secondary" 
          onClick={onRetry}
          style={{ marginTop: '12px' }}
        >
          Повторить
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;