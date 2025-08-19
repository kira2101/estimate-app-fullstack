import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { api } from '../../api/client';
import WorkCard from '../components/ui/WorkCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Work Selection Screen
 * Displays and allows selection of specific works within a category
 */
const WorkSelection = () => {
  const { navigateToScreen, getScreenData, addWorksToScreen } = useMobileNavigationContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorks, setSelectedWorks] = useState([]);
  
  const screenData = getScreenData();
  const selectedProject = screenData?.selectedProject;
  const selectedEstimate = screenData?.selectedEstimate;
  const selectedCategory = screenData?.selectedCategory;
  const createNewEstimate = screenData?.createNewEstimate;
  const editMode = screenData?.editMode;

  // Fetch all work types for search functionality
  const { 
    data: allWorks = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['all-work-types'],
    queryFn: api.getAllWorkTypes,
    onError: (error) => {
      console.error('Failed to fetch work types:', error);
    }
  });

  // В режиме редактирования загружаем существующие работы из сметы
  React.useEffect(() => {
    if (editMode && selectedEstimate && selectedEstimate.items && allWorks.length > 0) {
      console.log('🔄 WorkSelection: Загружаем существующие работы из сметы', selectedEstimate);
      
      const existingWorks = selectedEstimate.items.map(item => {
        const workId = item.work_type?.work_type_id || item.work_type_id || item.work_type;
        const work = allWorks.find(w => 
          (w.work_type_id || w.id) === workId
        );
        
        if (work) {
          return {
            ...work,
            quantity: item.quantity || 1,
            cost_price_per_unit: item.cost_price_per_unit,
            client_price_per_unit: item.client_price_per_unit
          };
        }
        return null;
      }).filter(Boolean);
      
      console.log('✅ WorkSelection: Загружены работы:', existingWorks);
      setSelectedWorks(existingWorks);
    }
  }, [editMode, selectedEstimate, allWorks]);

  // Filter works by category and search term
  const filteredWorks = useMemo(() => {
    let works = allWorks;
    
    // Filter by category if selected
    if (selectedCategory) {
      const categoryId = selectedCategory.id || selectedCategory.category_id;
      works = works.filter(work => {
        const workCategoryId = work.category?.category_id || work.category_id || work.category;
        return workCategoryId === categoryId;
      });
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      works = works.filter(work => {
        const workName = (work.name || work.work_name || '').toLowerCase();
        const workUnit = (work.unit || work.unit_of_measurement || '').toLowerCase();
        return workName.includes(searchLower) || workUnit.includes(searchLower);
      });
    }
    
    return works;
  }, [allWorks, selectedCategory, searchTerm]);

  // Redirect if no context - в режиме редактирования категория необязательна
  if (!selectedProject || (!selectedCategory && !editMode)) {
    React.useEffect(() => {
      navigateToScreen('projects');
    }, [navigateToScreen]);
    return null;
  }

  const handleWorkToggle = (work) => {
    const workId = work.id || work.work_type_id;
    setSelectedWorks(prev => {
      const isSelected = prev.find(w => (w.id || w.work_type_id) === workId);
      if (isSelected) {
        return prev.filter(w => (w.id || w.work_type_id) !== workId);
      } else {
        return [...prev, { ...work, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (workId, quantity) => {
    setSelectedWorks(prev => 
      prev.map(work => 
        (work.id || work.work_type_id) === workId 
          ? { ...work, quantity: Math.max(0, quantity) }
          : work
      ).filter(work => work.quantity > 0)
    );
  };

  const handleContinue = () => {
    if (selectedWorks.length === 0) return;
    
    console.log('🔧 WorkSelection: Добавляем выбранные работы в смету:', {
      selectedWorksCount: selectedWorks.length,
      createNewEstimate,
      editMode,
      selectedCategory: selectedCategory?.name
    });
    
    // НОВАЯ ЛОГИКА: Накопительное добавление работ
    addWorksToScreen('estimate-editor', selectedWorks);
    
    // Переходим в редактор сметы с флагом возврата
    navigateToScreen('estimate-editor', true, {
      selectedProject,
      selectedEstimate,
      selectedCategory,
      createNewEstimate,
      editMode: true,
      returnFromWorkSelection: true // Флаг успешного добавления работ
    });
  };

  if (isLoading) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем каталог работ..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-screen">
        <ErrorMessage 
          message="Не удалось загрузить каталог работ" 
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      {/* Context Header */}
      <div className="mobile-card context-header">
        <div className="context-header-top">
          <button 
            className="back-button"
            onClick={() => {
              // Если пришли из редактора, возвращаемся в редактор
              const screenData = getScreenData();
              if (screenData?.returnToEditor) {
                navigateToScreen('estimate-editor', true, screenData);
              } else if (editMode) {
                navigateToScreen('estimate-editor', true, screenData);
              } else {
                navigateToScreen('categories', true, screenData);
              }
            }}
            aria-label="Назад"
          >
            ←
          </button>
          <h2 className="context-title">{editMode ? 'Редактор сметы' : 'Выбор работ'}</h2>
        </div>
        <div className="context-details">
          {!editMode && selectedCategory && (
            <div className="context-item">
              <span className="context-label">Категория:</span>
              <span className="context-value">{selectedCategory.name || selectedCategory.category_name}</span>
            </div>
          )}
          {editMode && selectedEstimate && (
            <div className="context-item">
              <span className="context-label">Смета:</span>
              <span className="context-value">{selectedEstimate.estimate_number || `#${selectedEstimate.estimate_id}`}</span>
            </div>
          )}
          <div className="context-item">
            <span className="context-label">Выбрано:</span>
            <span className="context-value">{selectedWorks.length} работ</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mobile-search">
        <input
          type="text"
          placeholder="Поиск работ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mobile-input search-input"
        />
      </div>

      {/* Works List */}
      {filteredWorks.length === 0 ? (
        <div className="mobile-empty">
          <div className="mobile-empty-icon">🔍</div>
          <div className="mobile-empty-text">
            {searchTerm ? 'Ничего не найдено' : 'Нет работ в категории'}
          </div>
          <div className="mobile-empty-subtext">
            {searchTerm 
              ? 'Попробуйте изменить поисковый запрос'
              : 'Обратитесь к менеджеру для добавления работ'
            }
          </div>
        </div>
      ) : (
        <div className="mobile-list">
          {filteredWorks.map((work) => {
            const workId = work.id || work.work_type_id;
            const selectedWork = selectedWorks.find(w => (w.id || w.work_type_id) === workId);
            return (
              <WorkCard
                key={workId}
                work={work}
                isSelected={!!selectedWork}
                quantity={selectedWork?.quantity || 1}
                onToggle={() => handleWorkToggle(work)}
                onQuantityChange={(quantity) => handleQuantityChange(workId, quantity)}
              />
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mobile-action-buttons">
        <button 
          className="mobile-btn secondary categories-btn"
          onClick={() => navigateToScreen('categories', false, { selectedProject, createNewEstimate, editMode })}
        >
          Выбор категорий
        </button>
        
        {selectedWorks.length > 0 && (
          <button 
            className="mobile-btn continue-btn"
            onClick={handleContinue}
          >
            {editMode ? `Добавить в смету (${selectedWorks.length})` : `Продолжить (${selectedWorks.length})`}
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkSelection;