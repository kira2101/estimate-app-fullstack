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
  const { user } = useMobileAuth();
  
  const screenData = getScreenData();
  const selectedProject = screenData?.selectedProject;
  
  // Отладочная информация
  console.log('🔍 ProjectInfo Debug:');
  console.log('- Текущий пользователь:', user);
  console.log('- Выбранный проект:', selectedProject);
  console.log('- Screen data:', screenData);

  // Fetch estimates for this project
  const { 
    data: estimates = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['estimates', selectedProject?.project_id || selectedProject?.id],
    queryFn: async () => {
      const projectId = selectedProject?.project_id || selectedProject?.id;
      console.log('📊 Запрос смет для проекта ID:', projectId);
      
      try {
        const data = await api.getEstimates();
        console.log('📋 Все сметы от API:', data);
        console.log('📋 Количество смет:', data?.length || 0);
        
        if (Array.isArray(data)) {
          data.forEach((estimate, index) => {
            console.log(`📄 Смета ${index + 1}:`, {
              estimate_id: estimate.estimate_id,
              name: estimate.name,
              project: estimate.project,
              project_id: estimate.project_id,
              creator: estimate.creator,
              foreman: estimate.foreman,
              status: estimate.status
            });
          });
        }
        
        // Дополнительная проверка роли и назначения
        console.log('👤 Роль пользователя:', user?.role);
        console.log('🆔 ID пользователя:', user?.user_id);  // ИСПРАВЛЕНО: правильное поле
        
        // Фильтруем по проекту
        const filtered = Array.isArray(data) ? data.filter(estimate => {
          const matches = estimate.project === projectId || 
                         estimate.project_id === projectId ||
                         estimate.project?.id === projectId ||
                         estimate.project?.project_id === projectId;
          
          if (matches) {
            console.log(`✅ Смета "${estimate.name}" подходит для проекта ${projectId}`);
            console.log(`  - Прораб сметы:`, estimate.foreman);
            console.log(`  - Создатель сметы:`, estimate.creator);
            console.log(`  - Текущий пользователь:`, user?.user_id);
          }
          
          return matches;
        }) : [];
        
        console.log('🎯 Отфильтрованные сметы для проекта:', filtered);
        console.log('🎯 Количество найденных смет:', filtered.length);
        
        return filtered;
      } catch (error) {
        console.error('❌ Ошибка загрузки смет:', error);
        throw error;
      }
    },
    enabled: !!(selectedProject?.project_id || selectedProject?.id),
    onError: (error) => {
      console.error('❌ React Query error:', error);
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

  const handleAddExpenses = () => {
    // TODO: Навигация к экрану внесения затрат
    console.log('Открытие экрана внесения затрат для проекта:', selectedProject);
    // navigateToScreen('add-expenses', true, { selectedProject });
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
    <div className="mobile-screen project-info-screen">
      {/* Fixed Header Section */}
      <div className="project-fixed-header">
        {/* Project Header */}
        <div className="project-header">
          <div className="project-name">{selectedProject.name || selectedProject.project_name}</div>
          <div className="project-address">{selectedProject.address || selectedProject.project_address || 'Не указан'}</div>
        </div>

        {/* Financial Statistics - отдельные карточки как на ui.jpg */}
        <div className="finance-cards-grid">
          <div className="finance-card-item">
            <div className="finance-card-value">{formatCurrency(advances)}</div>
            <div className="finance-card-label">Получено авансов</div>
          </div>
          <div className="finance-card-item">
            <div className="finance-card-value">{formatCurrency(expenses)}</div>
            <div className="finance-card-label">Мои затраты</div>
          </div>
          <div className="finance-card-item">
            <div className="finance-card-value">{formatCurrency(totalAmount)}</div>
            <div className="finance-card-label">Выполнено работ</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="project-actions">
          <button 
            className="mobile-btn mobile-btn-primary"
            onClick={handleCreateEstimate}
          >
            ➕ Создать смету
          </button>
          <button 
            className="mobile-btn mobile-btn-secondary"
            onClick={handleAddExpenses}
          >
            💰 Внести затраты
          </button>
        </div>
      </div>

      {/* Scrollable Estimates Section */}
      <div className="estimates-scrollable-section">
        <div className="mobile-card estimates-card">
          <div className="estimates-header">
            <h3 className="estimates-title">Сметы проекта ({estimates.length})</h3>
          </div>

          {estimates.length === 0 ? (
            <div className="mobile-empty">
              <div className="mobile-empty-icon">📋</div>
              <div className="mobile-empty-text">Нет смет для этого проекта</div>
              <div className="mobile-empty-subtext">
                Создайте первую смету для начала работы
              </div>
            </div>
          ) : (
            <div className="mobile-list estimates-list">
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
    </div>
  );
};

export default ProjectInfo;