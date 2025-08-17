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
    queryKey: ['estimates', selectedProject?.project_id || selectedProject?.id],
    queryFn: () => api.getEstimates().then(data => {
      const projectId = selectedProject?.project_id || selectedProject?.id;
      console.log('Фильтруем сметы для проекта ID:', projectId);
      console.log('Все сметы:', data);
      
      const filtered = data.filter(estimate => 
        estimate.project === projectId || 
        estimate.project_id === projectId ||
        estimate.project?.id === projectId ||
        estimate.project?.project_id === projectId
      );
      
      console.log('Отфильтрованные сметы:', filtered);
      return filtered;
    }),
    enabled: !!(selectedProject?.project_id || selectedProject?.id),
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
    console.log('Создание сметы для проекта:', selectedProject);
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

  // Calculate project statistics for foreman
  const completedEstimates = estimates.filter(e => e.status?.name === 'Завершена');
  const inProgressEstimates = estimates.filter(e => e.status?.name === 'В работе');
  const totalEstimatesValue = estimates.reduce((sum, e) => sum + (e.total_cost || 0), 0);
  
  // Статистика для прораба
  const advances = completedEstimates.reduce((sum, e) => sum + (e.total_cost || 0) * 0.3, 0); // 30% аванс
  const expenses = estimates.reduce((sum, e) => sum + (e.expenses || 0), 0); // Затраты
  const totalAmount = totalEstimatesValue; // Общая сумма смет

  // Форматирование в гривнах
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

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
      {/* Project Header - точная копия прототипа */}
      <div className="project-header">
        <div className="project-name">{selectedProject.name || selectedProject.project_name}</div>
        <div className="project-address">{selectedProject.address || selectedProject.project_address || 'Не указан'}</div>
      </div>

      {/* Financial Statistics - точная копия прототипа */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(advances)}</div>
          <div className="stat-label">Получено авансов</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(expenses)}</div>
          <div className="stat-label">Мои затраты</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(totalAmount)}</div>
          <div className="stat-label">Выполнено работ</div>
        </div>
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