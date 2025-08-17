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
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['mobile-projects'],
    queryFn: api.getProjects,
    onError: (error) => {
      console.error('Failed to fetch projects:', error);
    }
  });

  const handleProjectSelect = (project) => {
    // Store selected project in navigation context
    navigateToScreen('project-info', true, { selectedProject: project });
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
        {projects.map((project) => (
          <ProjectCard
            key={project.project_id}
            project={project}
            onClick={() => handleProjectSelect(project)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectsList;