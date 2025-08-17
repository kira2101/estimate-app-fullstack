import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { api } from '../../api/client';
import CategoryCard from '../components/ui/CategoryCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Work Categories Screen
 * Displays work categories for estimate creation workflow
 */
const WorkCategories = () => {
  const { navigateToScreen, navigationData } = useMobileNavigationContext();
  
  const selectedProject = navigationData?.selectedProject;
  const selectedEstimate = navigationData?.selectedEstimate;
  const createNewEstimate = navigationData?.createNewEstimate;

  // Fetch work categories
  const { 
    data: categories = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['mobile-work-categories'],
    queryFn: api.getWorkCategories,
    onError: (error) => {
      console.error('Failed to fetch work categories:', error);
    }
  });

  // Redirect if no project context
  if (!selectedProject) {
    React.useEffect(() => {
      navigateToScreen('projects');
    }, [navigateToScreen]);
    return null;
  }

  const handleCategorySelect = (category) => {
    navigateToScreen('works', true, { 
      selectedProject,
      selectedEstimate,
      selectedCategory: category,
      createNewEstimate 
    });
  };

  if (isLoading) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем категории работ..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-screen">
        <ErrorMessage 
          message="Не удалось загрузить категории работ" 
          onRetry={refetch}
        />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="mobile-screen">
        <div className="mobile-empty">
          <div className="mobile-empty-icon">📂</div>
          <div className="mobile-empty-text">Нет доступных категорий</div>
          <div className="mobile-empty-subtext">
            Обратитесь к менеджеру для настройки каталога работ
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      {/* Context Header */}
      <div className="mobile-card context-header">
        <h2 className="context-title">
          {createNewEstimate ? 'Создание сметы' : 'Добавление работ'}
        </h2>
        <div className="context-details">
          <div className="context-item">
            <span className="context-label">Проект:</span>
            <span className="context-value">{selectedProject.name}</span>
          </div>
          {selectedEstimate && (
            <div className="context-item">
              <span className="context-label">Смета:</span>
              <span className="context-value">
                {selectedEstimate.name || `Смета #${selectedEstimate.id}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mobile-card instructions">
        <div className="instruction-text">
          {createNewEstimate 
            ? 'Выберите категорию работ для начала создания сметы'
            : 'Выберите категорию для добавления работ в смету'
          }
        </div>
      </div>

      {/* Categories Grid */}
      <div className="mobile-grid">
        {categories.map((category) => (
          <CategoryCard
            key={category.category_id}
            category={category}
            onClick={() => handleCategorySelect(category)}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkCategories;