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
      <div className="project-title" style={{ textAlign: 'center' }}>{project.name || project.project_name}</div>
      {(project.address || project.project_address) && (
        <div className="project-subtitle">{project.address || project.project_address}</div>
      )}
      <div className="project-stats">
        <span>{estimatesCount} смет</span>
        <span>{formatAmount(totalAmount)}</span>
      </div>
    </div>
  );
};

export default ProjectCard;