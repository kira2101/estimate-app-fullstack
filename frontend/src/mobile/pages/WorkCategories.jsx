import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { api } from '../../api/client';
import { normalizeApiResponse } from '../utils/apiHelpers';
import CategoryCard from '../components/ui/CategoryCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Work Categories Screen
 * Displays work categories for estimate creation workflow
 */
const WorkCategories = () => {
  const { navigateToScreen, getScreenData } = useMobileNavigationContext();
  
  const screenData = getScreenData();
  const selectedProject = screenData?.selectedProject;
  const selectedEstimate = screenData?.selectedEstimate;
  const createNewEstimate = screenData?.createNewEstimate;
  const editMode = screenData?.editMode; // ИСПРАВЛЕНО: Добавляем editMode

  // Fetch work categories
  const { 
    data: categoriesResponse, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['work-categories'],
    queryFn: api.getWorkCategories,
    onError: (error) => {
      console.error('Failed to fetch work categories:', error);
    }
  });
  
  // Normalize categories data
  const categories = normalizeApiResponse(categoriesResponse);

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
      createNewEstimate,
      editMode // ИСПРАВЛЕНО: Добавляем editMode
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

      {/* Categories Grid */}
      <div className="category-list">
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