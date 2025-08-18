import React from 'react';

/**
 * Estimate Card Component
 * Displays estimate information in a card format for mobile list
 */
const EstimateCard = ({ estimate, onClick, showProject = false }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(estimate);
    }
  };

  const getStatusColor = (statusName) => {
    switch (statusName) {
      case 'Завершена':
        return 'success';
      case 'В работе':
        return 'warning';
      case 'Черновик':
        return 'info';
      default:
        return 'info';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="estimate-card" onClick={handleClick}>
      <div className="estimate-header">
        <div className="estimate-name">
          {estimate.estimate_number || `Смета #${estimate.estimate_id}`}
        </div>
      </div>
      <div className="estimate-details">
        <div className="estimate-info-row">
          <span className="estimate-foreman">
            {showProject ? 
              `${estimate.project_name || 'Проект не указан'}` : 
              `${estimate.foreman_name || 'Не назначен'}`
            }
          </span>
          <span className="estimate-amount">{formatCurrency(estimate.totalAmount)}</span>
        </div>
        <div className="estimate-bottom-row">
          <div className="estimate-date">{new Date(estimate.created_at).toLocaleDateString('uk-UA')}</div>
          <div className={`estimate-status ${getStatusColor(estimate.status?.status_name || estimate.status)}`}>
            {estimate.status?.status_name || estimate.status || 'Неизвестно'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateCard;