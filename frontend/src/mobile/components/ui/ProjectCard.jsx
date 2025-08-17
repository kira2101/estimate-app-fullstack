import React from 'react';

/**
 * Project Card Component
 * Displays project information in a card format for mobile list
 */
const ProjectCard = ({ project, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(project);
    }
  };

  // Определяем иконку проекта на основе типа или названия
  const getProjectIcon = (project) => {
    const name = project.project_name?.toLowerCase() || '';
    if (name.includes('жилой') || name.includes('дом') || name.includes('квартир')) return '🏠';
    if (name.includes('офис') || name.includes('бизнес')) return '🏢';
    if (name.includes('торговый') || name.includes('магазин') || name.includes('центр')) return '🏪';
    if (name.includes('склад') || name.includes('производство')) return '🏭';
    if (name.includes('школа') || name.includes('образование')) return '🏫';
    if (name.includes('больница') || name.includes('клиника')) return '🏥';
    return '🏗️'; // По умолчанию
  };

  return (
    <div className="project-card" onClick={handleClick}>
      <span className="project-icon">{getProjectIcon(project)}</span>
      <div className="project-title">{project.project_name}</div>
      {project.address && (
        <div className="project-subtitle">{project.address}</div>
      )}
      <div className="project-stats">
        <span>📊 0 смет</span>
        <span>💰 0 ₽</span>
      </div>
    </div>
  );
};

export default ProjectCard;