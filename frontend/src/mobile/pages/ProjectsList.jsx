import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { api } from '../../api/client';
import ProjectCard from '../components/ui/ProjectCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Projects List Screen
 * Displays all projects assigned to the foreman
 */
const ProjectsList = () => {
  const { navigateToScreen } = useMobileNavigationContext();

  // Fetch projects 
  const { 
    data: projects = [], 
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

  // Fetch estimates for statistics
  const { 
    data: estimates = [], 
    isLoading: estimatesLoading,
    error: estimatesError
  } = useQuery({
    queryKey: ['estimates'],
    queryFn: api.getEstimates,
    onError: (error) => {
      console.error('Failed to fetch estimates:', error);
    }
  });

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
    const totalAmount = projectEstimates.reduce((sum, estimate) => 
      sum + (estimate.total_cost || 0), 0
    );
    
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
          <div className="mobile-empty-icon">🏗️</div>
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
        {projects.map((project) => {
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
        })}
      </div>
    </div>
  );
};

export default ProjectsList;