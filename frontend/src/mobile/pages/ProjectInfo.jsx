import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import { apiWithEvents } from '../../api/apiWithEvents';
import { normalizeApiResponse } from '../utils/apiHelpers';
import EstimateCard from '../components/ui/EstimateCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { useEventBusListener } from '../../hooks/useEventBus';
import { ESTIMATE_EVENTS } from '../../utils/EventTypes';

/**
 * Project Info Screen
 * Displays detailed project information with estimates list and statistics
 */
const ProjectInfo = () => {
  const { navigateToScreen, getScreenData, clearWorksFromScreen } = useMobileNavigationContext();
  const { user } = useMobileAuth();
  const queryClient = useQueryClient();
  
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
        const response = await api.getEstimates(); // ИСПРАВЛЕНИЕ: убираем mobile_sum
        // Нормализуем ответ API перед обработкой
        const data = normalizeApiResponse(response);
        console.log('📋 Все сметы от API (нормализованные):', data);
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

  // Подписываемся на SSE события для обновления списка смет
  useEventBusListener(
    [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED, ESTIMATE_EVENTS.DELETED],
    async (eventData) => {
      console.log('📨 [Mobile ProjectInfo] Получено SSE событие:', eventData);
      console.log('   - Тип события:', eventData?.type);
      console.log('   - Данные события:', eventData?.data);
      console.log('   - Project ID из события:', eventData?.data?.project_id);
      console.log('   - Текущий проект:', selectedProject?.project_id || selectedProject?.id);
      
      // Проверяем, относится ли событие к текущему проекту
      const eventProjectId = eventData?.data?.project_id;
      const currentProjectId = selectedProject?.project_id || selectedProject?.id;
      
      if (eventProjectId && currentProjectId) {
        // Приводим к числу для корректного сравнения
        const eventProjIdNum = parseInt(eventProjectId);
        const currentProjIdNum = parseInt(currentProjectId);
        
        if (eventProjIdNum === currentProjIdNum) {
          console.log('✅ Событие относится к текущему проекту, обновляем данные');
          
          // Обновляем данные смет проекта
          await refetch();
          
          // Обновляем проекты для актуального количества смет
          queryClient.invalidateQueries(['projects']);
          console.log('✅ [Mobile ProjectInfo] Данные обновлены после SSE события');
        } else {
          console.log('⏭️ Событие для другого проекта, пропускаем');
        }
      } else {
        // Если не можем определить проект, всё равно обновляем на всякий случай
        console.log('⚠️ Не удалось определить проект из события, обновляем данные');
        await refetch();
        queryClient.invalidateQueries(['projects']);
      }
    },
    [selectedProject] // Добавляем зависимость от selectedProject
  );

  // Redirect if no project selected
  if (!selectedProject) {
    React.useEffect(() => {
      navigateToScreen('projects');
    }, [navigateToScreen]);
    return null;
  }

  const handleCreateEstimate = () => {
    console.log('Создание сметы для проекта:', selectedProject);
    
    // КРИТИЧНО: Очищаем navigation context от предыдущих работ перед созданием новой сметы
    clearWorksFromScreen('estimate-summary'); // Очищаем работы новой сметы (без estimateId)
    console.log('🧹 ProjectInfo: Navigation context очищен для новой сметы');
    
    navigateToScreen('categories', true, { 
      selectedProject,
      createNewEstimate: true 
    });
  };

  const handleEstimateSelect = (estimate) => {
    console.log('🖱️ ProjectInfo: Клик по смете, переходим к estimate-summary (таблица работ сметы)', estimate);
    // Открываем экран с итоговой таблицей работ сметы для просмотра/редактирования
    navigateToScreen('estimate-summary', true, { 
      selectedProject,
      selectedEstimate: estimate,
      createNewEstimate: false, // Открываем существующую смету
      editMode: true, // Указываем, что это режим редактирования существующей сметы
      viewMode: true // Режим просмотра таблицы работ
    });
  };

  const handleDeleteEstimate = async (estimate) => {
    console.log('🗑️ ProjectInfo: Начинаем удаление сметы:', estimate);
    
    try {
      await apiWithEvents.deleteEstimate(estimate.estimate_id);
      console.log('✅ ProjectInfo: Смета успешно удалена');
      
      // Обновляем список смет и данные проекта
      refetch();
      
      // КРИТИЧНО: Обновляем кэш проектов для корректного отображения количества смет
      queryClient.invalidateQueries(['projects']);
      setTimeout(() => {
        queryClient.refetchQueries(['projects']);
        console.log('🔄 ProjectInfo: Обновлен кэш проектов после удаления сметы');
      }, 300);
      
      // Очищаем navigation context для удаленной сметы
      clearWorksFromScreen('estimate-summary', estimate.estimate_id);
      
    } catch (error) {
      console.error('❌ ProjectInfo: Ошибка удаления сметы:', error);
      throw new Error(`Не удалось удалить смету: ${error.message}`);
    }
  };

  const handleAddExpenses = () => {
    // TODO: Навигация к экрану внесения затрат
    console.log('Открытие экрана внесения затрат для проекта:', selectedProject);
    // navigateToScreen('add-expenses', true, { selectedProject });
  };

  // Calculate project statistics for foreman
  const completedEstimates = estimates.filter(e => e.status?.name === 'Завершена');
  const inProgressEstimates = estimates.filter(e => e.status?.name === 'В работе');
  const totalEstimatesValue = estimates.reduce((sum, e) => {
    const amount = e.mobile_total_amount || e.totalAmount || e.total_cost || 0;
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : Number(amount) || 0;
    return sum + numericAmount;
  }, 0);
  
  // Статистика для прораба
  const advances = completedEstimates.reduce((sum, e) => {
    const amount = e.mobile_total_amount || e.totalAmount || e.total_cost || 0;
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : Number(amount) || 0;
    return sum + (numericAmount * 0.3);
  }, 0); // 30% аванс
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
            Создать смету
          </button>
          <button 
            className="mobile-btn mobile-btn-secondary"
            onClick={handleAddExpenses}
          >
            Внести затраты
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
                  onDelete={handleDeleteEstimate}
                  useMobileSum={true}
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