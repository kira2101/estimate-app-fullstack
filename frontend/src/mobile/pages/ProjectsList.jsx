import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { api } from '../../api/client';
import { normalizeApiResponse } from '../utils/apiHelpers';
import ProjectCard from '../components/ui/ProjectCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import { useEventBusListener } from '../../hooks/useEventBus';
import { PROJECT_EVENTS, ESTIMATE_EVENTS } from '../../utils/EventTypes';

/**
 * Projects List Screen
 * Displays all projects assigned to the foreman
 */
const ProjectsList = () => {
  const { navigateToScreen } = useMobileNavigationContext();
  const queryClient = useQueryClient();

  // Fetch projects 
  const { 
    data: projectsResponse, 
    isLoading: projectsLoading, 
    error: projectsError,
    refetch: refetchProjects 
  } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
    onError: (error) => {
      console.error('Failed to fetch projects:', error);
    }
  });
  
  // Normalize projects data
  const projects = normalizeApiResponse(projectsResponse);

  console.log('🏗️ ProjectsList Debug:', {
    projects: projects,
    projectsCount: Array.isArray(projects) ? projects.length : 'not array',
    projectsType: typeof projects,
    isLoading: projectsLoading,
    error: projectsError
  });

  // Fetch estimates for statistics
  const { 
    data: estimatesResponse, 
    isLoading: estimatesLoading,
    error: estimatesError
  } = useQuery({
    queryKey: ['estimates-mobile'],
    queryFn: () => api.getEstimates(), // ИСПРАВЛЕНИЕ: убираем mobile_sum - прорабы везде видят только свои работы
    onError: (error) => {
      console.error('Failed to fetch estimates:', error);
    }
  });
  
  // Normalize estimates data
  const estimates = normalizeApiResponse(estimatesResponse);

  // Подписываемся на SSE события для обновления списка проектов и смет
  useEventBusListener(
    [PROJECT_EVENTS.CREATED, PROJECT_EVENTS.UPDATED, PROJECT_EVENTS.DELETED],
    async () => {
      console.log('📨 [Mobile ProjectsList] Получено SSE событие проекта');
      await refetchProjects();
      console.log('✅ [Mobile ProjectsList] Проекты обновлены');
    },
    []
  );
  
  useEventBusListener(
    [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED, ESTIMATE_EVENTS.DELETED],
    async () => {
      console.log('📨 [Mobile ProjectsList] Получено SSE событие сметы');
      // Обновляем сметы для статистики
      queryClient.invalidateQueries(['estimates-mobile']);
      console.log('✅ [Mobile ProjectsList] Статистика обновлена');
    },
    []
  );

  const isLoading = projectsLoading || estimatesLoading;
  const error = projectsError || estimatesError;

  const handleProjectSelect = (project) => {
    // Store selected project in navigation context
    navigateToScreen('project-info', true, { selectedProject: project });
  };

  // Рассчитываем статистику для каждого проекта
  const getProjectStats = (project) => {
    const projectId = project.project_id || project.id;
    const projectEstimates = estimates.filter(estimate => 
      estimate.project === projectId || estimate.project_id === projectId
    );
    
    const estimatesCount = projectEstimates.length;
    const totalAmount = projectEstimates.reduce((sum, estimate) => {
      const amount = estimate.totalAmount || estimate.total_cost || 0;
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : Number(amount) || 0;
      return sum + numericAmount;
    }, 0);
    
    return { estimatesCount, totalAmount };
  };

  if (isLoading) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем проекты..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-screen">
        <ErrorMessage 
          message="Не удалось загрузить проекты" 
          onRetry={refetch}
        />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="mobile-screen">
        <div className="mobile-empty">
          <div className="mobile-empty-text">Нет доступных проектов</div>
          <div className="mobile-empty-subtext">
            Обратитесь к менеджеру для назначения на проекты
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      <div className="project-grid">
        {Array.isArray(projects) ? projects.map((project) => {
          const { estimatesCount, totalAmount } = getProjectStats(project);
          return (
            <ProjectCard
              key={project.project_id || project.id}
              project={project}
              estimatesCount={estimatesCount}
              totalAmount={totalAmount}
              onClick={() => handleProjectSelect(project)}
            />
          );
        }) : null}
      </div>
    </div>
  );
};

export default ProjectsList;