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


  return (
    <div className="mobile-card category-card" onClick={handleClick}>
      <div className="category-card-content">
        <h3 className="category-card-title">{category.name || category.category_name}</h3>
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