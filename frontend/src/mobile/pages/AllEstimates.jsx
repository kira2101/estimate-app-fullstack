import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import EstimateCard from '../components/ui/EstimateCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Все Сметы - Экран
 * Показывает все сметы прораба во всех проектах
 */
const AllEstimates = () => {
  const { navigateToScreen } = useMobileNavigationContext();
  const { user } = useMobileAuth();

  // Загружаем все сметы прораба
  const { 
    data: estimates = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['all-estimates', user?.id],
    queryFn: api.getEstimates,
    enabled: !!user,
    onError: (error) => {
      console.error('Ошибка загрузки смет:', error);
    }
  });

  const handleEstimateSelect = (estimate) => {
    // Переходим к экрану просмотра сметы
    navigateToScreen('works-summary', true, { 
      selectedEstimate: estimate,
      viewMode: true 
    });
  };

  // Группируем сметы по статусам
  const groupedEstimates = estimates.reduce((groups, estimate) => {
    const status = estimate.status?.name || 'Неизвестно';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(estimate);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем ваши сметы..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-screen">
        <ErrorMessage 
          message="Не удалось загрузить сметы" 
          onRetry={refetch}
        />
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <div className="mobile-screen">
        <div className="mobile-empty">
          <div className="mobile-empty-icon">📋</div>
          <div className="mobile-empty-text">У вас пока нет смет</div>
          <div className="mobile-empty-subtext">
            Перейдите в раздел проектов для создания первой сметы
          </div>
          <button 
            className="mobile-btn" 
            onClick={() => navigateToScreen('projects')}
            style={{ marginTop: '16px' }}
          >
            Перейти к проектам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      {/* Статистика */}
      <div className="mobile-card">
        <h2 className="section-title">Общая статистика</h2>
        <div className="mobile-grid-3">
          <div className="stat-item">
            <div className="stat-number">{estimates.length}</div>
            <div className="stat-label">Всего смет</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              {estimates.filter(e => e.status?.name === 'В работе').length}
            </div>
            <div className="stat-label">В работе</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              {estimates.filter(e => e.status?.name === 'Завершена').length}
            </div>
            <div className="stat-label">Завершено</div>
          </div>
        </div>
      </div>

      {/* Сметы по статусам */}
      {Object.entries(groupedEstimates).map(([status, statusEstimates]) => (
        <div key={status} className="mobile-card">
          <div className="status-group-header">
            <h3 className="status-group-title">{status}</h3>
            <span className="status-group-count">
              {statusEstimates.length}
            </span>
          </div>
          <div className="mobile-list">
            {statusEstimates.map((estimate) => (
              <EstimateCard
                key={estimate.estimate_id}
                estimate={estimate}
                onClick={() => handleEstimateSelect(estimate)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AllEstimates;