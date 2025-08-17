import React from 'react';

/**
 * Category Card Component
 * Displays work category information in a card format
 */
const CategoryCard = ({ category, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(category);
    }
  };

  // Icon mapping for different categories
  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('кровел')) return '🏠';
    if (name.includes('фундамент')) return '🏗️';
    if (name.includes('стен')) return '🧱';
    if (name.includes('отделоч')) return '🎨';
    if (name.includes('электр')) return '⚡';
    if (name.includes('сантехн')) return '🚿';
    if (name.includes('отоплен')) return '🔥';
    if (name.includes('земл')) return '⛏️';
    if (name.includes('бетон')) return '🏗️';
    if (name.includes('изолят')) return '🛡️';
    return '🔧'; // Default icon
  };

  return (
    <div className="mobile-card category-card" onClick={handleClick}>
      <div className="category-card-icon">
        {getCategoryIcon(category.name)}
      </div>
      <div className="category-card-content">
        <h3 className="category-card-title">{category.name}</h3>
        {category.description && (
          <div className="category-card-description">
            {category.description}
          </div>
        )}
        <div className="category-card-footer">
          <span className="category-card-arrow">→</span>
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;