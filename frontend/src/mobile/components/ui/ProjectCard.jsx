import React from 'react';

/**
 * Project Card Component
 * Displays project information in a card format for mobile list
 */
const ProjectCard = ({ project, onClick, estimatesCount = 0, totalAmount = 0 }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(project);
    }
  };

  // Определяем иконку проекта на основе типа или названия
  const getProjectIcon = (project) => {
    const name = project.name?.toLowerCase() || project.project_name?.toLowerCase() || '';
    if (name.includes('жилой') || name.includes('дом') || name.includes('квартир')) return '🏠';
    if (name.includes('офис') || name.includes('бизнес')) return '🏢';
    if (name.includes('торговый') || name.includes('магазин') || name.includes('центр')) return '🏪';
    if (name.includes('склад') || name.includes('производство')) return '🏭';
    if (name.includes('школа') || name.includes('образование')) return '🏫';
    if (name.includes('больница') || name.includes('клиника')) return '🏥';
    return '🏗️'; // По умолчанию
  };

  // Форматирование суммы в гривнах
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="project-card" onClick={handleClick}>
      <span className="project-icon">{getProjectIcon(project)}</span>
      <div className="project-title">{project.name || project.project_name}</div>
      {(project.address || project.project_address) && (
        <div className="project-subtitle">{project.address || project.project_address}</div>
      )}
      <div className="project-stats">
        <span>📊 {estimatesCount} смет</span>
        <span>💰 {formatAmount(totalAmount)}</span>
      </div>
    </div>
  );
};

export default ProjectCard;