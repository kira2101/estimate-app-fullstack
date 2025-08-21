import React from 'react';

/**
 * Work Card Component
 * Displays work information with selection and quantity controls
 */
const WorkCard = ({ work, isSelected, quantity, onToggle, onQuantityChange }) => {
  const handleToggle = () => {
    console.log('🔧 WorkCard: Клик по работе:', {
      workId: work.id || work.work_type_id,
      workName: work.name || work.work_name,
      isSelected: isSelected,
      onToggle: typeof onToggle
    });
    if (onToggle) {
      onToggle();
    } else {
      console.error('❌ WorkCard: onToggle не передан!');
    }
  };

  const handleQuantityInput = (e) => {
    const value = e.target.value;
    // Разрешаем пустое поле или число больше 0
    if (value === '' || (parseInt(value) && parseInt(value) > 0)) {
      onQuantityChange(value === '' ? '' : parseInt(value));
    }
  };

  const handleQuantityBlur = (e) => {
    // При потере фокуса, если поле пустое, устанавливаем 1
    if (e.target.value === '' || parseInt(e.target.value) < 1) {
      onQuantityChange(1);
    }
  };

  const handleQuantityFocus = (e) => {
    // Выделить весь текст при получении фокуса для удобного редактирования
    setTimeout(() => {
      e.target.select();
    }, 100);
  };

  const formatPrice = (price) => {
    return price ? new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price) : 'Цена не указана';
  };

  return (
    <div className={`mobile-list-item work-card ${isSelected ? 'selected' : ''}`}>
      <div className="work-card-header" onClick={handleToggle}>
        <div className="work-card-checkbox">
          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && 'V'}
          </div>
        </div>
        <div className="work-card-info">
          <h4 className="work-card-title">{work.name || work.work_name}</h4>
          <div className="work-card-details">
            <div className="work-detail">
              <span className="detail-label">Ед. изм.:</span>
              <span className="detail-value">{work.unit || work.unit_of_measurement}</span>
            </div>
            <div className="work-detail">
              <span className="detail-label">Цена:</span>
              <span className="detail-value">{formatPrice(work.cost_price || work.prices?.cost_price)}</span>
            </div>
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="work-card-quantity-section">
          <span className="quantity-label">Количество:</span>
          <div className="quantity-input-area">
            <input
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={handleQuantityInput}
              onBlur={handleQuantityBlur}
              onFocus={handleQuantityFocus}
              className="quantity-input-touch"
              min="1"
              placeholder="1"
            />
            <span className="quantity-unit">{work.unit || work.unit_of_measurement}</span>
          </div>
        </div>
      )}

      {isSelected && (
        <div className="work-card-total">
          <span className="total-label">Итого:</span>
          <span className="total-value">
            {formatPrice((work.cost_price || work.prices?.cost_price || 0) * quantity)}
          </span>
        </div>
      )}
    </div>
  );
};

export default WorkCard;