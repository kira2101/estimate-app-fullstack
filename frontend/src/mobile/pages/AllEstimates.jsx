import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import { normalizeApiResponse } from '../utils/apiHelpers';
import EstimateCard from '../components/ui/EstimateCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Все Сметы - Экран
 * Показывает все сметы прораба во всех проектах
 */
const AllEstimates = () => {
  const { navigateToScreen, clearWorksFromScreen } = useMobileNavigationContext();
  const { user } = useMobileAuth();
  const queryClient = useQueryClient();
  
  // Состояние фильтра по проектам
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Загружаем все сметы прораба
  const { 
    data: estimatesResponse, 
    isLoading: estimatesLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['all-estimates', user?.user_id],
    queryFn: api.getEstimates,
    enabled: !!user,
    onError: (error) => {
      console.error('Ошибка загрузки смет:', error);
    }
  });
  
  // Normalize estimates data
  const estimates = normalizeApiResponse(estimatesResponse);

  // Загружаем проекты для получения названий
  const { 
    data: projectsResponse, 
    isLoading: projectsLoading 
  } = useQuery({
    queryKey: ['projects', user?.user_id],
    queryFn: api.getProjects,
    enabled: !!user
  });
  
  // Normalize projects data
  const projects = normalizeApiResponse(projectsResponse);

  console.log('👤 User Debug:', user);
  console.log('📊 Estimates Debug:', estimates?.length || 0);
  console.log('🏗️ Projects Debug:', projects?.length || 0);
  
  if (estimates?.length > 0) {
    console.log('📄 Первая смета структура:', estimates[0]);
    console.log('📄 Статус первой сметы:', estimates[0]?.status);
  }

  const isLoading = estimatesLoading || projectsLoading;

  const handleEstimateSelect = (estimate) => {
    console.log('🖱️ AllEstimates: Клик по смете, переходим к estimate-summary (таблица работ сметы)', estimate);
    // Открываем экран с итоговой таблицей работ сметы для просмотра/редактирования
    const relatedProject = projects.find(p => 
      (p.project_id || p.id) === (estimate.project?.project_id || estimate.project_id || estimate.project)
    );
    
    console.log('🔗 AllEstimates: Найден связанный проект', relatedProject);
    
    navigateToScreen('estimate-summary', true, { 
      selectedEstimate: estimate,
      selectedProject: relatedProject,
      createNewEstimate: false, // Открываем существующую смету
      editMode: true, // Указываем, что это режим редактирования существующей сметы
      viewMode: true // Режим просмотра таблицы работ
    });
  };

  const handleDeleteEstimate = async (estimate) => {
    console.log('🗑️ AllEstimates: Начинаем удаление сметы:', estimate);
    
    try {
      await api.deleteEstimate(estimate.estimate_id);
      console.log('✅ AllEstimates: Смета успешно удалена');
      
      // Обновляем список смет и данные проекта
      refetch();
      
      // КРИТИЧНО: Обновляем кэш проектов для корректного отображения количества смет
      queryClient.invalidateQueries(['projects']);
      setTimeout(() => {
        queryClient.refetchQueries(['projects']);
        console.log('🔄 AllEstimates: Обновлен кэш проектов после удаления сметы');
      }, 300);
      
      // Очищаем navigation context для удаленной сметы
      clearWorksFromScreen('estimate-summary', estimate.estimate_id);
      
    } catch (error) {
      console.error('❌ AllEstimates: Ошибка удаления сметы:', error);
      throw new Error(`Не удалось удалить смету: ${error.message}`);
    }
  };

  // Вычисляем статистику по статусам
  const calculateStatistics = () => {
    const inProgressEstimates = estimates.filter(e => 
      (e.status?.status_name || e.status) === 'В работе'
    );
    const completedEstimates = estimates.filter(e => 
      (e.status?.status_name || e.status) === 'Завершена'
    );
    const pendingEstimates = estimates.filter(e => 
      (e.status?.status_name || e.status) === 'На согласовании'
    );

    return {
      inProgress: inProgressEstimates.length,
      completed: completedEstimates.length,
      pending: pendingEstimates.length,
      total: estimates.length
    };
  };

  // Обогащаем сметы данными о проектах
  const enrichedEstimates = Array.isArray(estimates) ? estimates.map(estimate => {
    const project = projects.find(p => 
      p.project_id === estimate.project || 
      p.id === estimate.project ||
      p.project_id === estimate.project_id
    );
    
    return {
      ...estimate,
      project_name: project?.name || project?.project_name || 'Проект не найден',
      project_obj: project
    };
  }) : [];

  // Фильтруем сметы по выбранному проекту
  const filteredEstimates = selectedProjectFilter === 'all' 
    ? enrichedEstimates 
    : enrichedEstimates.filter(estimate => {
        const projectId = estimate.project_obj?.project_id || estimate.project_obj?.id;
        return String(projectId) === String(selectedProjectFilter);
      });

  // Получаем список проектов для фильтра
  const projectsForFilter = Array.isArray(projects) ? projects.filter(project => {
    return enrichedEstimates.some(estimate => 
      estimate.project_obj?.project_id === project.project_id || 
      estimate.project_obj?.id === project.id
    );
  }) : [];

  console.log('🔍 Фильтрация Debug:');
  console.log('- selectedProjectFilter:', selectedProjectFilter);
  console.log('- enrichedEstimates:', enrichedEstimates.length);
  console.log('- filteredEstimates:', filteredEstimates.length);
  console.log('- projectsForFilter:', projectsForFilter.length);

  // Убираем группировку - просто отфильтрованные сметы
  const displayEstimates = filteredEstimates;

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

  const statistics = calculateStatistics();

  return (
    <div className="mobile-screen">
      {/* Статистика по статусам - тот же дизайн как в ProjectInfo */}
      <div className="finance-cards-grid">
        <div className="finance-card-item">
          <div className="finance-card-value">{statistics.inProgress}</div>
          <div className="finance-card-label">В работе</div>
        </div>
        <div className="finance-card-item">
          <div className="finance-card-value">{statistics.completed}</div>
          <div className="finance-card-label">Завершено</div>
        </div>
        <div className="finance-card-item">
          <div className="finance-card-value">{statistics.pending}</div>
          <div className="finance-card-label">На согласовании</div>
        </div>
      </div>

      {/* Фильтр по проектам - Dropdown */}
      <div className="mobile-card">
        <div className="filter-dropdown">
          <div 
            className="filter-dropdown-header"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <div className="filter-dropdown-label">
              <span className="filter-text">
                {selectedProjectFilter === 'all' 
                  ? `Все объекты • ${enrichedEstimates.length} смет` 
                  : (() => {
                      const selectedProject = projectsForFilter.find(p => 
                        String(p.project_id || p.id) === String(selectedProjectFilter)
                      );
                      const count = enrichedEstimates.filter(estimate => 
                        String(estimate.project_obj?.project_id || estimate.project_obj?.id) === String(selectedProjectFilter)
                      ).length;
                      return `${selectedProject?.name || selectedProject?.project_name || 'Объект'} • ${count} смет`;
                    })()
                }
              </span>
            </div>
            <div className={`filter-arrow ${isFilterOpen ? 'open' : ''}`}>▼</div>
          </div>
          
          {isFilterOpen && (
            <div className="filter-dropdown-menu">
              <div 
                className={`filter-dropdown-item ${selectedProjectFilter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedProjectFilter('all');
                  setIsFilterOpen(false);
                }}
              >
                <span>Все объекты</span>
                <span className="filter-count">{enrichedEstimates.length} смет</span>
              </div>
              
              {projectsForFilter.map(project => {
                const projectEstimatesCount = enrichedEstimates.filter(estimate => 
                  String(estimate.project_obj?.project_id || estimate.project_obj?.id) === String(project.project_id || project.id)
                ).length;
                const projectId = project.project_id || project.id;
                
                return (
                  <div 
                    key={projectId}
                    className={`filter-dropdown-item ${String(selectedProjectFilter) === String(projectId) ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedProjectFilter(projectId);
                      setIsFilterOpen(false);
                    }}
                  >
                    <span>{project.name || project.project_name}</span>
                    <span className="filter-count">{projectEstimatesCount} смет</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Все сметы без группировки */}
      {displayEstimates.length === 0 ? (
        <div className="mobile-card">
          <div className="mobile-empty">
            <div className="mobile-empty-text">Нет смет для выбранного объекта</div>
            <div className="mobile-empty-subtext">
              Попробуйте выбрать другой проект или создайте новую смету
            </div>
          </div>
        </div>
      ) : (
        <div className="mobile-card">
          <div className="mobile-list">
            {displayEstimates.map((estimate) => (
              <EstimateCard
                key={estimate.estimate_id}
                estimate={estimate}
                onClick={() => handleEstimateSelect(estimate)}
                onDelete={handleDeleteEstimate}
                showProject={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllEstimates;