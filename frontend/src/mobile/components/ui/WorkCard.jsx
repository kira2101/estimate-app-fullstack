import React from 'react';

/**
 * Work Card Component
 * Displays work information with selection and quantity controls
 */
const WorkCard = ({ work, isSelected, quantity, onToggle, onQuantityChange }) => {
  const handleQuantityChange = (change) => {
    const newQuantity = Math.max(1, quantity + change);
    onQuantityChange(newQuantity);
  };

  const handleQuantityInput = (e) => {
    const value = parseInt(e.target.value) || 1;
    onQuantityChange(Math.max(1, value));
  };

  const formatPrice = (price) => {
    return price ? price.toLocaleString('ru-RU') + ' ₽' : 'Цена не указана';
  };

  return (
    <div className={`mobile-list-item work-card ${isSelected ? 'selected' : ''}`}>
      <div className="work-card-header" onClick={onToggle}>
        <div className="work-card-checkbox">
          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && '✓'}
          </div>
        </div>
        <div className="work-card-info">
          <h4 className="work-card-title">{work.name}</h4>
          <div className="work-card-details">
            <div className="work-detail">
              <span className="detail-label">Единица:</span>
              <span className="detail-value">{work.unit}</span>
            </div>
            <div className="work-detail">
              <span className="detail-label">Цена:</span>
              <span className="detail-value">{formatPrice(work.cost_price)}</span>
            </div>
            {work.usage_count > 0 && (
              <div className="work-detail">
                <span className="detail-label">Популярность:</span>
                <span className="detail-value">{work.usage_count}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="work-card-quantity">
          <span className="quantity-label">Количество:</span>
          <div className="quantity-controls">
            <button 
              className="quantity-btn"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={handleQuantityInput}
              className="quantity-input"
              min="1"
            />
            <button 
              className="quantity-btn"
              onClick={() => handleQuantityChange(1)}
            >
              +
            </button>
          </div>
          <span className="quantity-unit">{work.unit}</span>
        </div>
      )}

      {isSelected && (
        <div className="work-card-total">
          <span className="total-label">Итого:</span>
          <span className="total-value">
            {formatPrice((work.cost_price || 0) * quantity)}
          </span>
        </div>
      )}
    </div>
  );
};

export default WorkCard;