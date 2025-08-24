import React from 'react';

/**
 * Estimate Card Component
 * Displays estimate information in a card format for mobile list with swipe-to-delete
 * Поддерживает отображение как полной суммы (desktop), так и мобильной суммы (mobile)
 */
const EstimateCard = ({ estimate, onClick, onDelete, showProject = false, useMobileSum = false }) => {
  const [touchStart, setTouchStart] = React.useState(null);
  const [swipeDistance, setSwipeDistance] = React.useState(0);
  const [isSwipeDeleteActive, setIsSwipeDeleteActive] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleClick = () => {
    if (onClick && swipeDistance === 0) {
      onClick(estimate);
    }
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setSwipeDistance(0);
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = Math.abs(touchStart.y - touch.clientY);
    
    // Только горизонтальный свайп вправо
    if (deltaY < 50 && deltaX > 0) {
      const distance = Math.min(deltaX, 120); // Максимум 120px
      setSwipeDistance(distance);
      setIsSwipeDeleteActive(distance > 60); // Активируем при свайпе больше 60px
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    
    if (swipeDistance < 60) {
      // Возвращаем карточку в исходное положение
      setSwipeDistance(0);
      setIsSwipeDeleteActive(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (isDeleting) return;
    setIsDeleting(true);
    
    try {
      if (onDelete) {
        await onDelete(estimate);
      }
    } catch (error) {
      console.error('Ошибка удаления сметы:', error);
    } finally {
      setIsDeleting(false);
      setSwipeDistance(0);
      setIsSwipeDeleteActive(false);
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
    <div 
      className="estimate-card-container"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Кнопка удаления (фон) */}
      <div 
        className="delete-background"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '120px',
          backgroundColor: '#f44336',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateX(${120 - swipeDistance}px)`,
          transition: touchStart ? 'none' : 'transform 0.3s ease'
        }}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '10px'
          }}
        >
          {isDeleting ? '⏳' : '🗑️'}
        </button>
      </div>
      
      {/* Основная карточка */}
      <div 
        className="estimate-card" 
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${swipeDistance}px)`,
          transition: touchStart ? 'none' : 'transform 0.3s ease',
          backgroundColor: isSwipeDeleteActive ? '#ffebee' : undefined,
          position: 'relative',
          zIndex: 1
        }}
      >
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
            <span className="estimate-amount">
              {formatCurrency(useMobileSum ? estimate.mobile_total_amount : estimate.totalAmount)}
            </span>
          </div>
          <div className="estimate-bottom-row">
            <div className="estimate-date">{new Date(estimate.created_at).toLocaleDateString('uk-UA')}</div>
            <div className={`estimate-status ${getStatusColor(estimate.status?.status_name || estimate.status)}`}>
              {estimate.status?.status_name || estimate.status || 'Неизвестно'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateCard;