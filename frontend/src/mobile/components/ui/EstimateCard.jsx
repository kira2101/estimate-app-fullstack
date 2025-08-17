import React from 'react';

/**
 * Estimate Card Component
 * Displays estimate information in a card format for mobile list
 */
const EstimateCard = ({ estimate, onClick }) => {
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
    return amount ? amount.toLocaleString('ru-RU') + ' ₽' : '0 ₽';
  };

  return (
    <div className="estimate-card" onClick={handleClick}>
      <div className="estimate-header">
        <div className="estimate-name">
          {estimate.estimate_number || `Смета #${estimate.estimate_id}`}
        </div>
        <div className={`estimate-status ${getStatusColor(estimate.status?.status_name)}`}>
          {estimate.status?.status_name || 'Неизвестно'}
        </div>
      </div>
      <div className="estimate-details">
        <div>👷 {estimate.foreman?.full_name || 'Не назначен'}</div>
        <div>📅 {new Date(estimate.created_at).toLocaleDateString('ru-RU')}</div>
        <div>💰 {formatCurrency(estimate.total_cost)} • {estimate.items?.length || 0} позиций</div>
      </div>
    </div>
  );
};

export default EstimateCard;