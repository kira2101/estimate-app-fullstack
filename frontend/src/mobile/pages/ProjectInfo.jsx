import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import EstimateCard from '../components/ui/EstimateCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Project Info Screen
 * Displays detailed project information with estimates list and statistics
 */
const ProjectInfo = () => {
  const { navigateToScreen, getScreenData } = useMobileNavigationContext();
  
  const screenData = getScreenData();
  const selectedProject = screenData?.selectedProject;

  // Fetch estimates for this project
  const { 
    data: estimates = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['mobile-estimates', selectedProject?.project_id],
    queryFn: () => api.getEstimates().then(data => 
      data.filter(estimate => estimate.project === selectedProject?.project_id)
    ),
    enabled: !!selectedProject?.project_id,
    onError: (error) => {
      console.error('Failed to fetch estimates:', error);
    }
  });

  // Redirect if no project selected
  if (!selectedProject) {
    React.useEffect(() => {
      navigateToScreen('projects');
    }, [navigateToScreen]);
    return null;
  }

  const handleCreateEstimate = () => {
    navigateToScreen('categories', true, { 
      selectedProject,
      createNewEstimate: true 
    });
  };

  const handleEstimateSelect = (estimate) => {
    navigateToScreen('works-summary', true, { 
      selectedProject,
      selectedEstimate: estimate 
    });
  };

  // Calculate project statistics
  const completedEstimates = estimates.filter(e => e.status?.name === 'Завершена');
  const inProgressEstimates = estimates.filter(e => e.status?.name === 'В работе');
  const totalEstimatesValue = estimates.reduce((sum, e) => sum + (e.total_cost || 0), 0);

  if (isLoading) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем информацию о проекте..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-screen">
        <ErrorMessage 
          message="Не удалось загрузить информацию о проекте" 
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      {/* Project Header */}
      <div className="mobile-card">
        <h2 className="project-title">{selectedProject.name}</h2>
        <div className="project-details">
          <div className="project-detail-item">
            <span className="detail-label">Клиент:</span>
            <span className="detail-value">{selectedProject.client?.name || 'Не указан'}</span>
          </div>
          <div className="project-detail-item">
            <span className="detail-label">Адрес:</span>
            <span className="detail-value">{selectedProject.address || 'Не указан'}</span>
          </div>
          <div className="project-detail-item">
            <span className="detail-label">Описание:</span>
            <span className="detail-value">{selectedProject.description || 'Нет описания'}</span>
          </div>
        </div>
      </div>

      {/* Project Statistics */}
      <div className="mobile-card">
        <h3 className="stats-title">Статистика проекта</h3>
        <div className="mobile-grid-3">
          <div className="stat-item">
            <div className="stat-number">{estimates.length}</div>
            <div className="stat-label">Всего смет</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{inProgressEstimates.length}</div>
            <div className="stat-label">В работе</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{completedEstimates.length}</div>
            <div className="stat-label">Завершено</div>
          </div>
        </div>
        {totalEstimatesValue > 0 && (
          <div className="total-value">
            <span className="value-label">Общая стоимость:</span>
            <span className="value-amount">{totalEstimatesValue.toLocaleString('ru-RU')} ₽</span>
          </div>
        )}
      </div>

      {/* Estimates List */}
      <div className="mobile-card">
        <div className="estimates-header">
          <h3 className="estimates-title">Сметы проекта</h3>
          <button 
            className="mobile-btn mobile-btn-sm"
            onClick={handleCreateEstimate}
          >
            ➕ Создать смету
          </button>
        </div>

        {estimates.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty-icon">📋</div>
            <div className="mobile-empty-text">Нет смет для этого проекта</div>
            <div className="mobile-empty-subtext">
              Создайте первую смету для начала работы
            </div>
            <button 
              className="mobile-btn" 
              onClick={handleCreateEstimate}
              style={{ marginTop: '16px' }}
            >
              Создать смету
            </button>
          </div>
        ) : (
          <div className="mobile-list">
            {estimates.map((estimate) => (
              <EstimateCard
                key={estimate.estimate_id}
                estimate={estimate}
                onClick={() => handleEstimateSelect(estimate)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectInfo;