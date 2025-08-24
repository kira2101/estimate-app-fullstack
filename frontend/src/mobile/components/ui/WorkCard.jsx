import React from 'react';

/**
 * Work Card Component
 * Displays work information with selection and quantity controls
 */
const WorkCard = ({ 
  work, 
  isSelected, 
  quantity, 
  onToggle, 
  onQuantityChange, 
  isAlreadyInEstimate = false,
  isFocused = false,
  onFocus,
  onBlur,
  onRemove // Новая функция для удаления работы
}) => {
  const handleToggle = () => {
    console.log('🔧 WorkCard: Клик по работе:', {
      workId: work.id || work.work_type_id,
      workName: work.name || work.work_name,
      isSelected: isSelected,
      onToggle: typeof onToggle
    });
    
    if (onToggle) {
      if (isSelected) {
        // Если работа уже выбрана, активируем режим ввода количества
        if (onFocus) {
          onFocus();
        }
      } else {
        // Если работа не выбрана, сначала выбираем её, затем активируем ввод
        onToggle();
        setTimeout(() => {
          if (onFocus) {
            onFocus();
          }
        }, 50); // Небольшая задержка для обновления состояния
      }
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
    // Убираем фокус с карточки после завершения ввода количества
    if (onBlur) {
      setTimeout(() => onBlur(), 100); // Небольшая задержка для завершения обновления
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

  const handleCheckboxClick = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    
    console.log('🔍 WorkCard: handleCheckboxClick ВЫЗВАН для работы:', work.name || work.work_name, {
      isSelected,
      onRemove: typeof onRemove,
      hasOnRemove: !!onRemove
    });
    
    if (isSelected && onRemove) {
      console.log('✅ WorkCard: Снятие чекбокса - удаление работы:', work.name || work.work_name);
      onRemove(); // Убираем работу из выбранных
      if (onBlur) {
        onBlur(); // Убираем фокус
      }
    } else if (!isSelected) {
      console.log('✅ WorkCard: Установка чекбокса - добавление работы:', work.name || work.work_name);
      // Если работа не выбрана, выбираем её через обычный механизм
      handleToggle();
    } else if (isSelected && !onRemove) {
      console.error('❌ WorkCard: Работа выбрана, но onRemove не передан!');
    }
  };

  return (
    <div className={`mobile-list-item work-card ${isSelected ? 'selected' : ''} ${isAlreadyInEstimate ? 'already-in-estimate' : ''}`}>
      <div className="work-card-header" onClick={handleToggle}>
        <div className="work-card-checkbox" onClick={handleCheckboxClick}>
          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && '✓'}
          </div>
        </div>
        <div className="work-card-info">
          <div className="work-card-title-row">
            <h4 className="work-card-title">{work.name || work.work_name}</h4>
            <div className="work-card-right">
              {isAlreadyInEstimate && (
                <div className="work-card-badge">
                  ✓ Уже в смете
                </div>
              )}
            </div>
          </div>
          <div className="work-card-details">
            <div className="work-detail">
              <span className="detail-label">Цена:</span>
              <span className="detail-value">{formatPrice(work.cost_price || work.prices?.cost_price)}</span>
            </div>
            <div className="work-detail">
              <span className="detail-value">{(quantity || 1)} {work.unit || work.unit_of_measurement}</span>
            </div>
            {isSelected && (
              <div className="work-total-sum">
                <span className="total-sum-label">Сумма:</span>
                <span className="total-sum-value">
                  {formatPrice((work.cost_price || work.prices?.cost_price || 0) * (quantity || 1))}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSelected && isFocused && (
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
              autoFocus
            />
            <span className="quantity-unit">{work.unit || work.unit_of_measurement}</span>
          </div>
        </div>
      )}

      {isSelected && isFocused && (
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